"""
Monitor Integration Module
Connects the PJ HMM+Kalman model to the main betting monitor system
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional, List, Tuple
from pathlib import Path
from datetime import datetime
from loguru import logger
import pickle

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from src.team_profiles import TeamProfileManager, TeamProfile, get_team_profile_manager
from src.matchup_model import MatchupAdjuster, MatchupAdjustment, get_matchup_adjuster
from src.kalman_filter import TeamAdaptiveKalmanFilter, get_team_kalman_filter
from src.betting_signals import BettingSignal, BettingSignalCalculator, get_betting_signal_calculator


class PJModelIntegration:
    """
    Integration layer connecting PJ model to the main betting monitor.
    Provides live projections and betting signals for active games.
    """

    def __init__(
        self,
        profiles_path: str = None,
        hmm_model_path: str = None
    ):
        """
        Initialize the integration module

        Args:
            profiles_path: Path to saved team profiles CSV
            hmm_model_path: Path to saved HMM model (pickle)
        """
        self.profiles_path = profiles_path
        self.hmm_model_path = hmm_model_path

        # Initialize components
        self.profile_manager = get_team_profile_manager()
        self.matchup_adjuster = None  # Initialized after profiles loaded
        self.signal_calculator = get_betting_signal_calculator()

        # HMM model (optional, loaded if path provided)
        self.hmm_model = None
        self.scaler = None

        # Active game state (game_id -> state dict)
        self.active_games: Dict[str, Dict] = {}

        # Load pre-trained components if paths provided
        if profiles_path:
            self._load_profiles(profiles_path)
        if hmm_model_path:
            self._load_hmm_model(hmm_model_path)

    def _load_profiles(self, path: str):
        """Load team profiles from file"""
        try:
            self.profile_manager.load_profiles(path)
            self.matchup_adjuster = get_matchup_adjuster(self.profile_manager)
            logger.info(f"Loaded {len(self.profile_manager.profiles)} team profiles")
        except Exception as e:
            logger.warning(f"Could not load profiles from {path}: {e}")
            self.matchup_adjuster = get_matchup_adjuster(self.profile_manager)

    def _load_hmm_model(self, path: str):
        """Load HMM model from pickle file"""
        try:
            with open(path, 'rb') as f:
                saved = pickle.load(f)
                self.hmm_model = saved.get('hmm_model')
                self.scaler = saved.get('scaler')
            logger.info("Loaded HMM model")
        except Exception as e:
            logger.warning(f"Could not load HMM model from {path}: {e}")

    def initialize_game(
        self,
        game_id: str,
        home_team: str,
        away_team: str,
        ou_line: float
    ) -> Dict:
        """
        Initialize tracking for a new game

        Args:
            game_id: Unique game identifier
            home_team: Home team name
            away_team: Away team name
            ou_line: Opening over/under line

        Returns:
            Dict with initial game state and matchup analysis
        """
        # Get team profiles
        home_profile = self.profile_manager.get_team_baseline(home_team)
        away_profile = self.profile_manager.get_team_baseline(away_team)

        # Calculate matchup adjustment
        if self.matchup_adjuster:
            matchup = self.matchup_adjuster.calculate_matchup_adjustment(home_team, away_team)
        else:
            matchup = MatchupAdjustment(home_team=home_team, away_team=away_team)

        # Initialize Kalman filter with team adjustments
        kalman = get_team_kalman_filter()
        kalman.set_team_adjustments(
            home_q_mult=home_profile.get_q_multiplier(),
            home_r_mult=home_profile.get_r_multiplier(),
            away_q_mult=away_profile.get_q_multiplier(),
            away_r_mult=away_profile.get_r_multiplier(),
        )

        # Initialize with expected PPM based on matchup
        initial_ppm = matchup.expected_combined_ppm
        kalman.reset(x0=initial_ppm)

        # Store game state
        game_state = {
            "game_id": game_id,
            "home_team": home_team,
            "away_team": away_team,
            "ou_line": ou_line,
            "home_profile": home_profile,
            "away_profile": away_profile,
            "matchup": matchup,
            "kalman": kalman,
            "minute_history": [],
            "ppm_history": [],
            "projected_total_history": [],
            "current_minute": 0,
            "current_total": 0,
            "initialized_at": datetime.now().isoformat(),
        }

        self.active_games[game_id] = game_state

        logger.info(f"Initialized game {game_id}: {home_team} vs {away_team}, "
                   f"O/U: {ou_line}, Expected PPM: {initial_ppm:.2f}")

        return {
            "game_id": game_id,
            "matchup_type": matchup.matchup_type,
            "expected_ppm": matchup.expected_combined_ppm,
            "ppm_adjustment": matchup.ppm_adjustment,
            "home_pace": home_profile.pace_category,
            "away_pace": away_profile.pace_category,
            "pre_game_lean": self._get_pregame_lean(matchup, ou_line),
        }

    def _get_pregame_lean(
        self,
        matchup: MatchupAdjustment,
        ou_line: float,
        total_minutes: int = 40
    ) -> Dict:
        """Get pre-game lean based on matchup vs line"""
        expected_total = matchup.expected_combined_ppm * total_minutes
        edge = expected_total - ou_line
        edge_pct = (edge / ou_line) * 100 if ou_line > 0 else 0

        if edge_pct > 2.0:
            direction = "OVER"
        elif edge_pct < -2.0:
            direction = "UNDER"
        else:
            direction = "NO_LEAN"

        return {
            "direction": direction,
            "expected_total": expected_total,
            "edge_points": edge,
            "edge_pct": edge_pct,
        }

    def update_game(
        self,
        game_id: str,
        minute: int,
        points_this_minute: float,
        total_points: float = None,
        possessions_this_minute: float = None,
        fouls_this_minute: float = None,
        turnovers_this_minute: float = None
    ) -> Optional[BettingSignal]:
        """
        Update game state with new minute data and generate signal

        Args:
            game_id: Game identifier
            minute: Current game minute (1-40)
            points_this_minute: Points scored in this minute
            total_points: Optional cumulative total (calculated if not provided)
            possessions_this_minute: Optional possessions in this minute
            fouls_this_minute: Optional fouls in this minute
            turnovers_this_minute: Optional turnovers in this minute

        Returns:
            BettingSignal if actionable, None otherwise
        """
        if game_id not in self.active_games:
            logger.warning(f"Game {game_id} not initialized. Call initialize_game first.")
            return None

        state = self.active_games[game_id]
        kalman = state["kalman"]
        matchup = state["matchup"]

        # Update cumulative total
        if total_points is not None:
            state["current_total"] = total_points
        else:
            state["current_total"] += points_this_minute

        state["current_minute"] = minute
        state["ppm_history"].append(points_this_minute)

        # Determine HMM state if model available
        hmm_state = None
        if self.hmm_model and self.scaler and len(state["ppm_history"]) >= 1:
            hmm_state = self._predict_hmm_state(state, possessions_this_minute,
                                                 fouls_this_minute, turnovers_this_minute)

        # Update Kalman filter with team-adaptive adjustments
        minutes_remaining = 40 - minute
        filtered_ppm, covariance, kalman_gain, adjustments = kalman.filter_step_team_adaptive(
            z=points_this_minute,
            minutes_remaining=minutes_remaining,
            hmm_state=hmm_state
        )

        # Calculate projection
        projected_total = state["current_total"] + (filtered_ppm * minutes_remaining)
        state["projected_total_history"].append(projected_total)
        state["minute_history"].append(minute)

        # Generate betting signal
        matchup_info = {
            "matchup_type": matchup.matchup_type,
            "home_pace": state["home_profile"].pace_category,
            "away_pace": state["away_profile"].pace_category,
            "pace_agreement": matchup.pace_agreement,
        }

        signal = self.signal_calculator.generate_signal(
            game_id=game_id,
            home_team=state["home_team"],
            away_team=state["away_team"],
            minute=minute,
            current_total=state["current_total"],
            projected_total=projected_total,
            ou_line=state["ou_line"],
            kalman_covariance=covariance,
            matchup_info=matchup_info,
        )

        return signal

    def _predict_hmm_state(
        self,
        state: Dict,
        posm: float = None,
        foulm: float = None,
        tovm: float = None
    ) -> Optional[int]:
        """Predict HMM state from current minute data"""
        if not self.hmm_model or not self.scaler:
            return None

        try:
            # Build feature vector
            ppm = state["ppm_history"][-1] if state["ppm_history"] else 0
            posm = posm or ppm * 0.6  # Rough estimate if not provided
            foulm = foulm or 0.5
            tovm = tovm or 0.3

            features = np.array([[ppm, posm, foulm, tovm]])
            features_scaled = self.scaler.transform(features)

            # Predict state
            states = self.hmm_model.predict(features_scaled)
            return int(states[0])
        except Exception as e:
            logger.debug(f"HMM prediction failed: {e}")
            return None

    def get_live_projection(
        self,
        game_id: str,
        ou_line: float = None
    ) -> Optional[BettingSignal]:
        """
        Get current projection and signal for a game

        Args:
            game_id: Game identifier
            ou_line: Optional updated O/U line (uses original if not provided)

        Returns:
            BettingSignal with current projection
        """
        if game_id not in self.active_games:
            return None

        state = self.active_games[game_id]

        # Use updated line if provided
        current_line = ou_line or state["ou_line"]
        if ou_line:
            state["ou_line"] = ou_line

        # Get latest projection
        if not state["projected_total_history"]:
            return None

        projected_total = state["projected_total_history"][-1]
        minute = state["current_minute"]
        kalman = state["kalman"]

        matchup_info = {
            "matchup_type": state["matchup"].matchup_type,
            "home_pace": state["home_profile"].pace_category,
            "away_pace": state["away_profile"].pace_category,
            "pace_agreement": state["matchup"].pace_agreement,
        }

        return self.signal_calculator.generate_signal(
            game_id=game_id,
            home_team=state["home_team"],
            away_team=state["away_team"],
            minute=minute,
            current_total=state["current_total"],
            projected_total=projected_total,
            ou_line=current_line,
            kalman_covariance=kalman.get_covariance(),
            matchup_info=matchup_info,
        )

    def get_game_summary(self, game_id: str) -> Optional[Dict]:
        """Get summary of game state for display"""
        if game_id not in self.active_games:
            return None

        state = self.active_games[game_id]

        return {
            "game_id": game_id,
            "home_team": state["home_team"],
            "away_team": state["away_team"],
            "current_minute": state["current_minute"],
            "current_total": state["current_total"],
            "projected_total": state["projected_total_history"][-1] if state["projected_total_history"] else 0,
            "ou_line": state["ou_line"],
            "matchup_type": state["matchup"].matchup_type,
            "home_pace": state["home_profile"].pace_category,
            "away_pace": state["away_profile"].pace_category,
            "kalman_state": state["kalman"].get_state(),
            "kalman_covariance": state["kalman"].get_covariance(),
        }

    def end_game(self, game_id: str, final_total: float = None) -> Optional[Dict]:
        """
        End tracking for a game and return final summary

        Args:
            game_id: Game identifier
            final_total: Actual final total (if known)

        Returns:
            Final game summary dict
        """
        if game_id not in self.active_games:
            return None

        state = self.active_games[game_id]

        # Calculate final projection error if we have actual total
        final_projection = state["projected_total_history"][-1] if state["projected_total_history"] else 0
        projection_error = None
        if final_total is not None:
            projection_error = final_projection - final_total

        summary = {
            "game_id": game_id,
            "home_team": state["home_team"],
            "away_team": state["away_team"],
            "ou_line": state["ou_line"],
            "final_projection": final_projection,
            "final_total": final_total,
            "projection_error": projection_error,
            "minutes_tracked": len(state["minute_history"]),
            "matchup_type": state["matchup"].matchup_type,
        }

        # Clean up
        del self.active_games[game_id]
        logger.info(f"Ended game {game_id}. Final projection: {final_projection:.1f}, "
                   f"Actual: {final_total}")

        return summary

    def get_all_active_signals(self) -> List[BettingSignal]:
        """Get current signals for all active games"""
        signals = []
        for game_id in self.active_games:
            signal = self.get_live_projection(game_id)
            if signal:
                signals.append(signal)
        return signals


def get_pj_model_integration(
    profiles_path: str = None,
    hmm_model_path: str = None
) -> PJModelIntegration:
    """Factory function for PJModelIntegration"""
    return PJModelIntegration(
        profiles_path=profiles_path,
        hmm_model_path=hmm_model_path
    )

"""
PJ Engine V2 - Enhanced HMM + Kalman for Projected Total
Improvements:
1. Confidence-weighted predictions using HMM state probabilities
2. Score-differential aware projections
3. Minute-specific bias corrections (learned from data)
4. Ensemble with pace-adjusted baseline
5. Better last-5-minute handling
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from loguru import logger

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import config

from .data_loader import DataLoader, get_data_loader
from .hmm_model import HMMRegimeDetector, get_hmm_detector
from .kalman_filter import MultiFilterBank, get_filter_bank


class PJEngineV2:
    """
    Enhanced Projected Total Engine V2
    Target: Within 6 points accuracy at minute 35+
    """

    def __init__(
        self,
        n_states: int = None,
        kalman_metrics: List[str] = None
    ):
        self.n_states = n_states or config.HMM_CONFIG["n_states"]
        self.kalman_metrics = kalman_metrics or ["ppm", "posm"]

        # Components
        self.data_loader: Optional[DataLoader] = None
        self.hmm_detector: Optional[HMMRegimeDetector] = None
        self.filter_banks: Dict[str, MultiFilterBank] = {}

        # State
        self.is_fitted = False
        self.processed_data: Optional[pd.DataFrame] = None
        self.projections: Optional[pd.DataFrame] = None

        # V2 Enhancements
        self.minute_bias_corrections: Dict[int, float] = {}  # Learned biases
        self.state_ppm_cache: Dict[int, float] = {}  # Pre-computed state PPMs
        self.league_avg_ppm: float = 3.5  # Will be computed from data

    def load_data(self, csv_path: str) -> pd.DataFrame:
        """Load and preprocess data"""
        logger.info(f"Loading data from {csv_path}")

        self.data_loader = get_data_loader(csv_path)
        self.data_loader.load()
        self.data_loader.engineer_features()

        # Standardize features for HMM
        hmm_features = config.HMM_CONFIG["features"]
        core_features = config.HMM_CONFIG.get("core_features", ["ppm", "posm", "foulm", "tovm"])
        self.data_loader.standardize_features(hmm_features, fallback_features=core_features)

        self.hmm_features = getattr(self.data_loader, 'standardized_features', core_features)
        self.processed_data = self.data_loader.get_full_dataframe()

        # Compute league average PPM from data
        self.league_avg_ppm = self.processed_data['ppm'].mean()
        logger.info(f"League average PPM: {self.league_avg_ppm:.3f}")
        logger.info(f"Data loaded: {len(self.processed_data)} rows")

        return self.processed_data

    def fit_hmm(self) -> "PJEngineV2":
        """Fit HMM on loaded data"""
        if self.processed_data is None:
            raise ValueError("Must call load_data() first")

        logger.info(f"Fitting HMM with {self.n_states} states")

        hmm_features = getattr(self, 'hmm_features', config.HMM_CONFIG["features"])
        sequences = self.data_loader.get_game_sequences(hmm_features, standardized=True)

        self.hmm_detector = get_hmm_detector(n_states=self.n_states)
        self.hmm_detector.fit(sequences)

        # Pre-compute state PPMs for faster lookup
        ppm_mean = self.data_loader.feature_means.get("ppm", 3.5)
        ppm_std = self.data_loader.feature_stds.get("ppm", 1.0)

        for state_idx in range(self.n_states):
            profile = self.hmm_detector.get_state_profile(state_idx)
            regime_ppm_std = profile.get("means", {}).get("ppm", 0)
            self.state_ppm_cache[state_idx] = regime_ppm_std * ppm_std + ppm_mean

        self.is_fitted = True
        logger.info("HMM fitted successfully")

        return self

    def learn_minute_biases(self, validation_split: float = 0.3) -> Dict[int, float]:
        """
        Learn minute-specific bias corrections from training data.
        Split data, generate projections on train, measure bias on validation.
        """
        if not self.is_fitted:
            raise ValueError("Must call fit_hmm() first")

        logger.info("Learning minute-specific bias corrections...")

        # Get all game IDs and split
        game_ids = self.processed_data['game_id'].unique()
        np.random.seed(42)
        np.random.shuffle(game_ids)

        split_idx = int(len(game_ids) * (1 - validation_split))
        val_game_ids = set(game_ids[split_idx:])

        # Generate projections on validation set
        val_data = self.processed_data[self.processed_data['game_id'].isin(val_game_ids)]

        # Get actual totals for validation games
        game_totals = val_data.groupby('game_id')['points_so_far'].max().to_dict()

        # Generate projections and compute biases
        minute_errors = {m: [] for m in range(41)}

        for game_id, game_df in val_data.groupby("game_id"):
            actual_total = game_totals.get(game_id, 0)
            if actual_total == 0:
                continue

            game_df = game_df.sort_values("minute_index")

            for idx, (_, row) in enumerate(game_df.iterrows()):
                minute_idx = int(row["minute_index"])
                if minute_idx > 40:
                    continue

                # Simple projection for bias learning
                points_so_far = row["points_so_far"]
                minutes_remaining = row["minutes_remaining"]
                historical_ppm = points_so_far / max(minute_idx, 1)
                simple_proj = points_so_far + historical_ppm * minutes_remaining

                error = simple_proj - actual_total
                minute_errors[minute_idx].append(error)

        # Compute mean bias per minute
        for minute, errors in minute_errors.items():
            if len(errors) >= 10:
                self.minute_bias_corrections[minute] = np.mean(errors)
            else:
                self.minute_bias_corrections[minute] = 0.0

        logger.info(f"Learned bias corrections for {len(self.minute_bias_corrections)} minutes")
        return self.minute_bias_corrections

    def _get_or_create_filter_bank(self, game_id: str) -> MultiFilterBank:
        """Get or create a filter bank for a game"""
        if game_id not in self.filter_banks:
            self.filter_banks[game_id] = get_filter_bank(self.kalman_metrics)
        return self.filter_banks[game_id]

    def _get_adaptive_regime_weight(self, minute_idx: int, total_minutes: int) -> float:
        """Adaptive regime weight that increases with game time"""
        proj_config = config.PROJECTION_CONFIG
        if proj_config.get("use_adaptive_regime_weight", False):
            weight_min = proj_config.get("regime_weight_min", 0.2)
            weight_max = proj_config.get("regime_weight_max", 0.65)
            progress = min(minute_idx / max(total_minutes, 1), 1.0)
            return weight_min + (weight_max - weight_min) * progress
        return proj_config.get("regime_weight", 0.6)

    def _get_confidence_weighted_regime_ppm(
        self,
        state_probs: np.ndarray,
        confidence_threshold: float = 0.6
    ) -> Tuple[float, float]:
        """
        Get confidence-weighted regime PPM using all state probabilities.
        Returns (weighted_ppm, confidence_score)
        """
        weighted_ppm = 0.0
        for state_idx, prob in enumerate(state_probs):
            state_ppm = self.state_ppm_cache.get(state_idx, self.league_avg_ppm)
            weighted_ppm += prob * state_ppm

        # Confidence is the max probability (how sure the model is)
        confidence = np.max(state_probs)

        return weighted_ppm, confidence

    def _get_score_differential_adjustment(
        self,
        score_diff_abs: float,
        minutes_remaining: float,
        is_blowout: bool
    ) -> Tuple[float, float]:
        """
        Adjust predictions based on score differential.
        Close games: more variance expected, slightly conservative
        Blowouts: garbage time scoring patterns

        Returns (ppm_adjustment, weight_adjustment)
        """
        if minutes_remaining < 5:
            # Last 5 minutes are critical
            if is_blowout or score_diff_abs > 20:
                # Garbage time: pace often increases
                return 0.3, 0.8  # Add PPM, reduce weight on this
            elif score_diff_abs < 8:
                # Close game: intentional fouling, slower pace
                return -0.2, 1.0
            else:
                return 0.0, 1.0
        elif minutes_remaining < 10:
            if is_blowout:
                return 0.2, 0.9
            return 0.0, 1.0

        return 0.0, 1.0

    def _get_possession_based_projection(
        self,
        points_so_far: float,
        poss_so_far: float,
        minute_idx: int,
        minutes_remaining: float
    ) -> float:
        """
        Calculate possession-based projection using PPP * expected remaining possessions.
        """
        if poss_so_far <= 0 or minute_idx <= 0:
            return points_so_far + self.league_avg_ppm * minutes_remaining

        # Historical pace (possessions per minute)
        historical_pace = poss_so_far / minute_idx

        # Historical efficiency (points per possession)
        ppp = points_so_far / poss_so_far

        # Expected remaining possessions
        expected_remaining_poss = historical_pace * minutes_remaining

        # Projection
        return points_so_far + (ppp * expected_remaining_poss)

    def _get_ensemble_projection(
        self,
        points_so_far: float,
        minutes_remaining: float,
        minute_idx: int,
        historical_ppm: float,
        regime_ppm: float,
        filtered_ppm: float,
        confidence: float,
        score_diff_abs: float,
        poss_so_far: float = 0
    ) -> float:
        """
        Enhanced ensemble projection combining multiple methods:
        1. Historical PPM extrapolation
        2. Regime-based projection
        3. Kalman-filtered projection
        4. League average baseline
        5. Possession-based projection (NEW)
        """
        total_minutes = config.PROJECTION_CONFIG["total_minutes"]

        # Method 1: Historical extrapolation
        proj_historical = points_so_far + historical_ppm * minutes_remaining

        # Method 2: Regime-based
        proj_regime = points_so_far + regime_ppm * minutes_remaining

        # Method 3: Kalman-filtered
        proj_kalman = points_so_far + filtered_ppm * minutes_remaining

        # Method 4: League average baseline
        proj_league = points_so_far + self.league_avg_ppm * minutes_remaining

        # Method 5: Possession-based (PPP * expected remaining possessions)
        proj_poss = self._get_possession_based_projection(
            points_so_far, poss_so_far, minute_idx, minutes_remaining
        )

        # Dynamic weighting based on game progress
        progress = minute_idx / total_minutes

        # Weights: [historical, regime, kalman, league, possession]
        if progress < 0.25:
            # Very early: trust league and historical more
            weights = [0.35, 0.15, 0.15, 0.25, 0.10]
        elif progress < 0.5:
            # Mid-first half
            weights = [0.30, 0.20, 0.20, 0.15, 0.15]
        elif progress < 0.75:
            # Second half: start trusting Kalman more
            weights = [0.25, 0.25, 0.30, 0.05, 0.15]
        elif progress < 0.875:  # Before last 5 min
            # Late game: Kalman primary
            if confidence > 0.7:
                weights = [0.15, 0.30, 0.35, 0.05, 0.15]
            else:
                weights = [0.20, 0.20, 0.40, 0.05, 0.15]
        else:
            # Last 5 minutes: blend in possession-based more
            # Possession-based catches up to PPM in final minutes
            if minutes_remaining <= 2:
                # Final 2 minutes: possession-based most accurate
                weights = [0.25, 0.15, 0.30, 0.0, 0.30]
            else:
                weights = [0.20, 0.20, 0.35, 0.0, 0.25]

        # Adjust for close games (more conservative, trust historical)
        if score_diff_abs < 8 and minutes_remaining < 10:
            weights[0] += 0.10  # Trust historical more
            weights[2] -= 0.05  # Trust Kalman less
            weights[4] -= 0.05  # Trust possession less

        # Normalize weights
        weight_sum = sum(weights)
        weights = [w / weight_sum for w in weights]

        ensemble_proj = (
            weights[0] * proj_historical +
            weights[1] * proj_regime +
            weights[2] * proj_kalman +
            weights[3] * proj_league +
            weights[4] * proj_poss
        )

        return ensemble_proj

    def generate_projections(self) -> pd.DataFrame:
        """
        Generate enhanced per-minute projections with V2 improvements.
        """
        if not self.is_fitted:
            raise ValueError("Must call fit_hmm() first")

        # Learn minute biases if not already done
        if not self.minute_bias_corrections:
            self.learn_minute_biases()

        logger.info("Generating V2 enhanced projections...")

        results = []
        total_minutes = config.PROJECTION_CONFIG["total_minutes"]
        min_minutes = config.PROJECTION_CONFIG["min_minutes_for_projection"]

        for game_id, game_df in self.processed_data.groupby("game_id"):
            game_df = game_df.sort_values("minute_index")

            # Get HMM sequences
            hmm_features = getattr(self, 'hmm_features', config.HMM_CONFIG.get("core_features"))
            feature_cols = [f"{f}_std" for f in hmm_features if f"{f}_std" in game_df.columns]

            if len(feature_cols) == 0:
                continue

            sequence = game_df[feature_cols].values
            states = self.hmm_detector.predict_states(sequence)
            state_probs = self.hmm_detector.predict_state_probabilities(sequence)

            filter_bank = self._get_or_create_filter_bank(game_id)
            first_row = game_df.iloc[0]
            filter_bank.reset_all({"ppm": first_row["ppm"], "posm": first_row["posm"]})

            for idx, (_, row) in enumerate(game_df.iterrows()):
                minute_idx = int(row["minute_index"])
                minutes_remaining = row["minutes_remaining"]
                points_so_far = row["points_so_far"]
                hmm_state = states[idx]
                current_state_probs = state_probs[idx]

                blowout_factor = row.get("blowout_factor", 0.0)
                is_blowout = bool(row.get("is_blowout", 0))
                score_diff = row.get("score_diff", 0)
                score_diff_abs = abs(score_diff) if not pd.isna(score_diff) else 0

                # Kalman filtering
                measurements = {"ppm": row["ppm"], "posm": row["posm"]}
                filter_results = filter_bank.filter_step_all(
                    measurements, minutes_remaining, hmm_state, blowout_factor
                )

                filtered_ppm = filter_results["ppm"][0]
                kalman_gain_ppm = filter_results["ppm"][2]
                kalman_info = filter_results["ppm"][3]

                # V2 IMPROVEMENT 1: Confidence-weighted regime PPM
                regime_ppm, confidence = self._get_confidence_weighted_regime_ppm(
                    current_state_probs
                )

                # Historical PPM
                historical_ppm = points_so_far / max(minute_idx, 1)

                # V2 IMPROVEMENT 2: Score-differential adjustment
                ppm_adj, weight_adj = self._get_score_differential_adjustment(
                    score_diff_abs, minutes_remaining, is_blowout
                )

                # Get possession data for possession-based projection
                poss_so_far = row.get("poss_so_far", 0)
                if poss_so_far == 0:
                    # Calculate if not available
                    poss_so_far = row.get("posm", 1.8) * max(minute_idx, 1)

                # Calculate projection
                if minute_idx >= min_minutes:
                    # V2 IMPROVEMENT 4: Ensemble projection with possession blending
                    projected_total = self._get_ensemble_projection(
                        points_so_far,
                        minutes_remaining,
                        minute_idx,
                        historical_ppm,
                        regime_ppm + ppm_adj,
                        filtered_ppm + ppm_adj,
                        confidence,
                        score_diff_abs,
                        poss_so_far
                    )

                    # V2 IMPROVEMENT 3: Apply minute-specific bias correction
                    bias = self.minute_bias_corrections.get(minute_idx, 0.0)
                    projected_total -= bias * 0.5  # Apply 50% of learned bias

                    # V2 IMPROVEMENT 5: Last 5 minutes special handling
                    if minutes_remaining <= 5:
                        # Constrain projection to be within reasonable range
                        min_proj = points_so_far + 1.5 * minutes_remaining  # Min ~1.5 PPM
                        max_proj = points_so_far + 6.0 * minutes_remaining  # Max ~6 PPM
                        projected_total = np.clip(projected_total, min_proj, max_proj)

                        # Weight towards points_so_far + historical trend more heavily
                        simple_proj = points_so_far + historical_ppm * minutes_remaining
                        blend_weight = (5 - minutes_remaining) / 5 * 0.3
                        projected_total = (1 - blend_weight) * projected_total + blend_weight * simple_proj

                else:
                    # Early game: simple extrapolation
                    projected_total = points_so_far + historical_ppm * minutes_remaining

                # Calculate expected PPM (for logging)
                expected_ppm = (projected_total - points_so_far) / max(minutes_remaining, 0.1)

                result = {
                    "game_id": game_id,
                    "minute_index": minute_idx,
                    "minutes_remaining": minutes_remaining,
                    "points_so_far": points_so_far,
                    "poss_so_far": poss_so_far,
                    "raw_ppm": row["ppm"],
                    "filtered_ppm": filtered_ppm,
                    "expected_ppm": expected_ppm,
                    "projected_total": projected_total,
                    "hmm_state": hmm_state,
                    "hmm_state_label": self.hmm_detector.get_state_profile(hmm_state).get("label", "Unknown"),
                    "regime_weight": self._get_adaptive_regime_weight(minute_idx, total_minutes),
                    "blowout_factor": blowout_factor,
                    "is_blowout": is_blowout,
                    "score_diff_abs": score_diff_abs,
                    "hmm_confidence": confidence,
                    "regime_ppm": regime_ppm,
                    "bias_correction": self.minute_bias_corrections.get(minute_idx, 0.0),
                }

                # Add state probabilities
                if config.OUTPUT_CONFIG["include_state_probs"]:
                    for s in range(self.n_states):
                        result[f"state_{s}_prob"] = current_state_probs[s]

                # Add Kalman info
                if config.OUTPUT_CONFIG["include_kalman_state"]:
                    result["kalman_gain"] = kalman_gain_ppm
                    result["kalman_Q"] = kalman_info.get("Q_adjusted", 0)
                    result["kalman_R"] = kalman_info.get("R_adjusted", 0)
                    result["innovation_variance"] = kalman_info.get("innovation_variance", 0)
                    result["total_Q_mult"] = kalman_info.get("total_Q_mult", 1.0)
                    result["total_R_mult"] = kalman_info.get("total_R_mult", 1.0)

                results.append(result)

        self.projections = pd.DataFrame(results)
        logger.info(f"Generated {len(self.projections)} V2 projection rows")

        return self.projections

    def get_state_profiles_summary(self) -> pd.DataFrame:
        """Get HMM state profiles as summary DataFrame"""
        if not self.is_fitted:
            raise ValueError("Must call fit_hmm() first")
        return self.hmm_detector.get_all_state_profiles()

    def get_projections(self) -> pd.DataFrame:
        """Get generated projections"""
        if self.projections is None:
            raise ValueError("Must call generate_projections() first")
        return self.projections.copy()


def get_pj_engine_v2(n_states: int = None) -> PJEngineV2:
    """Factory function for PJEngineV2"""
    return PJEngineV2(n_states=n_states)

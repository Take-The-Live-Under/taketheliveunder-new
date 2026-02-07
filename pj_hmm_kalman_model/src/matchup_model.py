"""
Matchup Model
Calculates adjustments based on team matchup characteristics
"""

import numpy as np
from typing import Dict, Optional, Tuple
from dataclasses import dataclass
from loguru import logger

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from src.team_profiles import TeamProfile, TeamProfileManager


@dataclass
class MatchupAdjustment:
    """Contains matchup-specific adjustments for projections"""
    home_team: str
    away_team: str

    # PPM adjustments
    expected_combined_ppm: float = 0.0
    ppm_adjustment: float = 0.0  # Positive = expect higher scoring

    # Kalman adjustments
    q_multiplier: float = 1.0
    r_multiplier: float = 1.0

    # Matchup type classification
    matchup_type: str = "Normal"  # e.g., "Both Slow", "Both Fast", "Pace Mismatch"

    # Confidence factors
    pace_agreement: float = 1.0  # How similar the teams' paces are (0-1)
    variance_factor: float = 1.0  # Combined variance factor

    # Home court adjustment
    home_court_ppm_boost: float = 0.0

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "home_team": self.home_team,
            "away_team": self.away_team,
            "expected_combined_ppm": self.expected_combined_ppm,
            "ppm_adjustment": self.ppm_adjustment,
            "q_multiplier": self.q_multiplier,
            "r_multiplier": self.r_multiplier,
            "matchup_type": self.matchup_type,
            "pace_agreement": self.pace_agreement,
            "variance_factor": self.variance_factor,
            "home_court_ppm_boost": self.home_court_ppm_boost,
        }


class MatchupAdjuster:
    """
    Calculates matchup-specific adjustments for game projections
    """

    def __init__(self, profile_manager: Optional[TeamProfileManager] = None):
        """
        Initialize MatchupAdjuster

        Args:
            profile_manager: TeamProfileManager instance (creates one if not provided)
        """
        self.profile_manager = profile_manager or TeamProfileManager()

    def calculate_matchup_adjustment(
        self,
        home_team: str,
        away_team: str
    ) -> MatchupAdjustment:
        """
        Calculate matchup adjustment based on team profiles

        Args:
            home_team: Home team name
            away_team: Away team name

        Returns:
            MatchupAdjustment with all factors
        """
        home_profile = self.profile_manager.get_team_baseline(home_team)
        away_profile = self.profile_manager.get_team_baseline(away_team)

        # Calculate expected combined PPM
        # Use home team's home PPM and away team's away PPM
        home_ppm_contribution = home_profile.home_ppm
        away_ppm_contribution = away_profile.away_ppm
        expected_ppm = (home_ppm_contribution + away_ppm_contribution) / 2

        # Home court boost
        home_boost = config.TEAM_PROFILE_CONFIG.get("home_court_ppm_boost", 0.1)

        # Calculate PPM adjustment from baseline
        league_avg = config.TEAM_PROFILE_CONFIG.get("league_avg_ppm", 3.5)
        ppm_adjustment = expected_ppm - league_avg + home_boost

        # Classify matchup type and calculate adjustments
        matchup_type, pace_agreement, pace_adj = self._classify_matchup(
            home_profile, away_profile
        )

        # Apply pace adjustment
        ppm_adjustment += pace_adj

        # Calculate Kalman multipliers (combine team-specific adjustments)
        q_mult = (home_profile.get_q_multiplier() + away_profile.get_q_multiplier()) / 2
        r_mult = (home_profile.get_r_multiplier() + away_profile.get_r_multiplier()) / 2

        # Adjust for matchup type uncertainty
        if matchup_type == "Pace Mismatch":
            q_mult *= 1.2  # More uncertainty in mismatched games
            r_mult *= 0.9

        # Combined variance factor
        combined_variance = (home_profile.ppm_variance + away_profile.ppm_variance) / 2
        league_avg_var = config.TEAM_PROFILE_CONFIG.get("league_avg_variance", 2.0) ** 2
        variance_factor = combined_variance / league_avg_var if league_avg_var > 0 else 1.0

        return MatchupAdjustment(
            home_team=home_team,
            away_team=away_team,
            expected_combined_ppm=expected_ppm + home_boost,
            ppm_adjustment=ppm_adjustment,
            q_multiplier=q_mult,
            r_multiplier=r_mult,
            matchup_type=matchup_type,
            pace_agreement=pace_agreement,
            variance_factor=variance_factor,
            home_court_ppm_boost=home_boost,
        )

    def _classify_matchup(
        self,
        home_profile: TeamProfile,
        away_profile: TeamProfile
    ) -> Tuple[str, float, float]:
        """
        Classify the matchup type and calculate pace agreement

        Args:
            home_profile: Home team profile
            away_profile: Away team profile

        Returns:
            Tuple of (matchup_type, pace_agreement, ppm_adjustment)
        """
        home_pace = home_profile.pace_category
        away_pace = away_profile.pace_category

        # Calculate pace agreement (0-1, higher = more similar)
        pace_diff = abs(home_profile.avg_ppm - away_profile.avg_ppm)
        max_diff = 2.0  # Approximate max expected difference
        pace_agreement = max(0, 1 - (pace_diff / max_diff))

        # Classify and calculate adjustment
        if home_pace == "Slow" and away_pace == "Slow":
            return "Both Slow", pace_agreement, -0.15  # Lower total
        elif home_pace == "Fast" and away_pace == "Fast":
            return "Both Fast", pace_agreement, 0.15  # Higher total
        elif home_pace == "Slow" and away_pace == "Fast":
            return "Pace Mismatch", pace_agreement, 0.0
        elif home_pace == "Fast" and away_pace == "Slow":
            return "Pace Mismatch", pace_agreement, 0.0
        elif home_pace == "Normal" and away_pace == "Normal":
            return "Both Normal", pace_agreement, 0.0
        else:
            # One team normal, one extreme
            if "Slow" in [home_pace, away_pace]:
                return "Mixed (Slow)", pace_agreement, -0.05
            elif "Fast" in [home_pace, away_pace]:
                return "Mixed (Fast)", pace_agreement, 0.05
            else:
                return "Normal", pace_agreement, 0.0

    def get_expected_total(
        self,
        home_team: str,
        away_team: str,
        minutes: int = 40
    ) -> Tuple[float, float, float]:
        """
        Get expected game total based on matchup

        Args:
            home_team: Home team name
            away_team: Away team name
            minutes: Total game minutes

        Returns:
            Tuple of (expected_total, low_estimate, high_estimate)
        """
        adjustment = self.calculate_matchup_adjustment(home_team, away_team)

        expected_total = adjustment.expected_combined_ppm * minutes

        # Calculate range based on variance
        home_profile = self.profile_manager.get_team_baseline(home_team)
        away_profile = self.profile_manager.get_team_baseline(away_team)

        combined_std = np.sqrt(home_profile.ppm_variance + away_profile.ppm_variance)
        range_ppm = combined_std * 1.5  # ~90% confidence

        low_estimate = (adjustment.expected_combined_ppm - range_ppm) * minutes
        high_estimate = (adjustment.expected_combined_ppm + range_ppm) * minutes

        return expected_total, low_estimate, high_estimate

    def get_over_under_lean(
        self,
        home_team: str,
        away_team: str,
        ou_line: float,
        minutes: int = 40
    ) -> Tuple[str, float]:
        """
        Get over/under lean based on matchup vs line

        Args:
            home_team: Home team name
            away_team: Away team name
            ou_line: Over/under line
            minutes: Total game minutes

        Returns:
            Tuple of (direction ["OVER", "UNDER", "PUSH"], edge_pct)
        """
        expected, low, high = self.get_expected_total(home_team, away_team, minutes)

        edge = expected - ou_line
        edge_pct = (edge / ou_line) * 100 if ou_line > 0 else 0

        if edge_pct > 1.0:
            return "OVER", edge_pct
        elif edge_pct < -1.0:
            return "UNDER", abs(edge_pct)
        else:
            return "PUSH", abs(edge_pct)


def get_matchup_adjuster(profile_manager: Optional[TeamProfileManager] = None) -> MatchupAdjuster:
    """Factory function for MatchupAdjuster"""
    return MatchupAdjuster(profile_manager)

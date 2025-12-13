#!/usr/bin/env python3
"""
Model 1: Pure Pomeroy Predictor

Implements Ken Pomeroy's methodology for predicting game totals:
1. Predict tempo (possessions) using team season averages
2. Predict offensive efficiency using team ratings and opponent defensive ratings
3. Apply home court adjustment (+1.4% efficiency for home team)
4. Calculate total points

Formula:
    Tempo = (Team1_Tempo + Team2_Tempo) / 2
    Team1_Points = (Tempo × Team1_AdjOE_vs_Team2_AdjDE) / 100
    Team2_Points = (Tempo × Team2_AdjOE_vs_Team1_AdjDE) / 100
    Total = Team1_Points + Team2_Points

References:
- KenPom methodology: https://kenpom.com/blog/
- Home court adjustment: ±1.4% efficiency
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, Optional
from pathlib import Path


# ============================================================================
# CONFIGURATION
# ============================================================================

# Home court advantage (points per 100 possessions)
# Increased from 1.4 to 1.8 based on early season analysis showing 9.9 point home advantage
HOME_COURT_ADVANTAGE = 1.8

# Early season adjustment (first 10 games of season)
EARLY_SEASON_BONUS = 3.0  # Add to predictions (higher variance/inflated scoring)

# National averages (for missing data imputation)
NATIONAL_AVG_TEMPO = 68.0
NATIONAL_AVG_OE = 105.0
NATIONAL_AVG_DE = 105.0

# Tempo sweet spot for scoring (analysis shows 66-68 tempo scores highest)
TEMPO_SWEET_SPOT_MIN = 66.0
TEMPO_SWEET_SPOT_MAX = 68.0
TEMPO_SWEET_SPOT_BONUS = 2.0  # Extra points for games in this range


# ============================================================================
# PURE POMEROY PREDICTION
# ============================================================================

class PomeroyPredictor:
    """
    Pure Pomeroy predictor using only season ratings.

    No machine learning - just Ken Pomeroy's formula.
    """

    def __init__(
        self,
        home_advantage: float = HOME_COURT_ADVANTAGE,
        use_early_season_adjustment: bool = True,
        use_tempo_sweet_spot: bool = True
    ):
        """
        Args:
            home_advantage: Home court advantage in efficiency points
            use_early_season_adjustment: Apply +3 point bonus for early season variance
            use_tempo_sweet_spot: Apply bonus for games in 66-68 tempo range
        """
        self.home_advantage = home_advantage
        self.use_early_season_adjustment = use_early_season_adjustment
        self.use_tempo_sweet_spot = use_tempo_sweet_spot
        self.name = "Pure Pomeroy (Enhanced)"

    def predict_game(
        self,
        team1_tempo: float,
        team1_adjoe: float,
        team1_adjde: float,
        team2_tempo: float,
        team2_adjoe: float,
        team2_adjde: float,
        team1_is_home: bool = True
    ) -> Dict[str, float]:
        """
        Predict a single game using Pomeroy methodology.

        Args:
            team1_tempo: Team 1's adjusted tempo
            team1_adjoe: Team 1's adjusted offensive efficiency
            team1_adjde: Team 1's adjusted defensive efficiency
            team2_tempo: Team 2's adjusted tempo
            team2_adjoe: Team 2's adjusted offensive efficiency
            team2_adjde: Team 2's adjusted defensive efficiency
            team1_is_home: Whether team 1 is playing at home

        Returns:
            Dict with predicted values:
                - possessions: Predicted possessions
                - team1_points: Predicted team 1 points
                - team2_points: Predicted team 2 points
                - total_points: Predicted total
        """
        # Handle missing values
        team1_tempo = team1_tempo if not np.isnan(team1_tempo) else NATIONAL_AVG_TEMPO
        team2_tempo = team2_tempo if not np.isnan(team2_tempo) else NATIONAL_AVG_TEMPO
        team1_adjoe = team1_adjoe if not np.isnan(team1_adjoe) else NATIONAL_AVG_OE
        team2_adjoe = team2_adjoe if not np.isnan(team2_adjoe) else NATIONAL_AVG_OE
        team1_adjde = team1_adjde if not np.isnan(team1_adjde) else NATIONAL_AVG_DE
        team2_adjde = team2_adjde if not np.isnan(team2_adjde) else NATIONAL_AVG_DE

        # 1. Predict tempo (average of both teams)
        predicted_tempo = (team1_tempo + team2_tempo) / 2

        # 2. Predict offensive efficiency for each team
        # Team's offense vs opponent's defense, adjusted for home court

        # Team 1 offensive efficiency
        team1_oe = (team1_adjoe + team2_adjde) / 2
        if team1_is_home:
            team1_oe += self.home_advantage
        else:
            team1_oe -= self.home_advantage

        # Team 2 offensive efficiency
        team2_oe = (team2_adjoe + team1_adjde) / 2
        if not team1_is_home:
            team2_oe += self.home_advantage
        else:
            team2_oe -= self.home_advantage

        # 3. Calculate points
        # Points = (Possessions × Efficiency) / 100
        team1_points = (predicted_tempo * team1_oe) / 100
        team2_points = (predicted_tempo * team2_oe) / 100
        total_points = team1_points + team2_points

        # 4. Apply adjustments based on early season analysis
        adjustments = 0.0

        # Early season bonus (+3 points for higher variance/inflated scoring)
        if self.use_early_season_adjustment:
            adjustments += EARLY_SEASON_BONUS

        # Tempo sweet spot bonus (66-68 tempo scores 7-10 pts higher)
        if self.use_tempo_sweet_spot:
            if TEMPO_SWEET_SPOT_MIN <= predicted_tempo <= TEMPO_SWEET_SPOT_MAX:
                adjustments += TEMPO_SWEET_SPOT_BONUS

        total_points += adjustments

        return {
            'possessions': predicted_tempo,
            'team1_points': team1_points,
            'team2_points': team2_points,
            'total_points': total_points,
            'team1_efficiency': team1_oe,
            'team2_efficiency': team2_oe,
            'adjustments': adjustments,
            'early_season_bonus': EARLY_SEASON_BONUS if self.use_early_season_adjustment else 0,
            'tempo_bonus': TEMPO_SWEET_SPOT_BONUS if (self.use_tempo_sweet_spot and
                          TEMPO_SWEET_SPOT_MIN <= predicted_tempo <= TEMPO_SWEET_SPOT_MAX) else 0
        }

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict total points for a dataset.

        Expected columns in X:
            - team_1_adjtempo, team_1_adjoe, team_1_adjde
            - team_2_adjtempo, team_2_adjoe, team_2_adjde
            - Optional: team_1_is_home (defaults to True)

        Returns:
            Array of predicted total points
        """
        predictions = []

        for idx, row in X.iterrows():
            team1_tempo = row.get('team_1_adjtempo', row.get('team_1_tempo', NATIONAL_AVG_TEMPO))
            team1_adjoe = row.get('team_1_adjoe', NATIONAL_AVG_OE)
            team1_adjde = row.get('team_1_adjde', NATIONAL_AVG_DE)

            team2_tempo = row.get('team_2_adjtempo', row.get('team_2_tempo', NATIONAL_AVG_TEMPO))
            team2_adjoe = row.get('team_2_adjoe', NATIONAL_AVG_OE)
            team2_adjde = row.get('team_2_adjde', NATIONAL_AVG_DE)

            team1_is_home = row.get('team_1_is_home', True)

            result = self.predict_game(
                team1_tempo, team1_adjoe, team1_adjde,
                team2_tempo, team2_adjoe, team2_adjde,
                team1_is_home
            )

            predictions.append(result['total_points'])

        return np.array(predictions)

    def predict_with_details(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Predict with detailed breakdown for each game.

        Returns DataFrame with all prediction components.
        """
        results = []

        for idx, row in X.iterrows():
            team1_tempo = row.get('team_1_adjtempo', row.get('team_1_tempo', NATIONAL_AVG_TEMPO))
            team1_adjoe = row.get('team_1_adjoe', NATIONAL_AVG_OE)
            team1_adjde = row.get('team_1_adjde', NATIONAL_AVG_DE)

            team2_tempo = row.get('team_2_adjtempo', row.get('team_2_tempo', NATIONAL_AVG_TEMPO))
            team2_adjoe = row.get('team_2_adjoe', NATIONAL_AVG_OE)
            team2_adjde = row.get('team_2_adjde', NATIONAL_AVG_DE)

            team1_is_home = row.get('team_1_is_home', True)

            result = self.predict_game(
                team1_tempo, team1_adjoe, team1_adjde,
                team2_tempo, team2_adjoe, team2_adjde,
                team1_is_home
            )

            results.append(result)

        return pd.DataFrame(results)

    def fit(self, X: pd.DataFrame, y: pd.Series):
        """
        Fit method for sklearn compatibility.

        Pomeroy predictor is deterministic and doesn't need training,
        but we implement this for interface consistency.
        """
        # No training needed for pure formula
        return self

    def get_params(self, deep=True):
        """Get parameters (sklearn compatibility)"""
        return {'home_advantage': self.home_advantage}

    def set_params(self, **params):
        """Set parameters (sklearn compatibility)"""
        for key, value in params.items():
            setattr(self, key, value)
        return self


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def calculate_error_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculate prediction error metrics"""
    errors = y_pred - y_true
    abs_errors = np.abs(errors)

    return {
        'mae': np.mean(abs_errors),
        'rmse': np.sqrt(np.mean(errors ** 2)),
        'mean_error': np.mean(errors),
        'median_error': np.median(errors),
        'max_error': np.max(abs_errors),
        'std_error': np.std(errors)
    }


def test_pomeroy_predictor():
    """Test the Pomeroy predictor with sample data"""
    print("="*80)
    print("Testing Pure Pomeroy Predictor")
    print("="*80)

    # Create test data
    # Duke (strong team) vs UNC (strong team) at neutral site
    print("\nTest 1: Duke vs UNC (neutral court)")
    predictor = PomeroyPredictor()

    result = predictor.predict_game(
        team1_tempo=68.5,      # Duke tempo
        team1_adjoe=120.0,     # Duke offense (excellent)
        team1_adjde=95.0,      # Duke defense (excellent)
        team2_tempo=70.0,      # UNC tempo
        team2_adjoe=115.0,     # UNC offense (very good)
        team2_adjde=100.0,     # UNC defense (good)
        team1_is_home=False    # Neutral court
    )

    print(f"  Predicted tempo: {result['possessions']:.1f}")
    print(f"  Duke predicted: {result['team1_points']:.1f} points")
    print(f"  UNC predicted: {result['team2_points']:.1f} points")
    print(f"  Total predicted: {result['total_points']:.1f}")

    # Low-major matchup
    print("\nTest 2: Low-major matchup (slower pace)")
    result2 = predictor.predict_game(
        team1_tempo=65.0,      # Slow tempo
        team1_adjoe=100.0,     # Average offense
        team1_adjde=105.0,     # Below average defense
        team2_tempo=66.0,      # Slow tempo
        team2_adjoe=98.0,      # Below average offense
        team2_adjde=108.0,     # Poor defense
        team1_is_home=True     # Team 1 at home
    )

    print(f"  Predicted tempo: {result2['possessions']:.1f}")
    print(f"  Team 1 predicted: {result2['team1_points']:.1f} points")
    print(f"  Team 2 predicted: {result2['team2_points']:.1f} points")
    print(f"  Total predicted: {result2['total_points']:.1f}")
    print(f"  Home advantage: +{predictor.home_advantage} efficiency points")

    print("\n" + "="*80)
    print("Test complete!")
    print("="*80)


if __name__ == "__main__":
    test_pomeroy_predictor()

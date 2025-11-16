"""
Pregame Analyzer for NCAA Basketball
Analyzes upcoming games to identify under betting opportunities before games start
"""

from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class PregameAnalyzer:
    """
    Analyzes pregame matchups to predict total scores and identify under betting opportunities
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def analyze_matchup(
        self,
        home_metrics: Dict,
        away_metrics: Dict,
        ou_line: float
    ) -> Dict:
        """
        Analyze pre-game matchup for under/over betting opportunity

        Args:
            home_metrics: Team stats for home team
            away_metrics: Team stats for away team
            ou_line: Over/Under line from sportsbook

        Returns:
            Dict with:
                - predicted_total: Expected final score
                - under_score: Confidence in under (0-100)
                - over_score: Confidence in over (0-100)
                - recommendation: BET_UNDER/LEAN_UNDER/PASS/LEAN_OVER/BET_OVER
                - factors: List of factors influencing the prediction
                - edge: Difference between predicted total and O/U line
        """
        try:
            # Calculate expected total
            predicted_total = self._calculate_expected_total(home_metrics, away_metrics)

            # Calculate edge (positive = favor under, negative = favor over)
            edge = ou_line - predicted_total

            # Score under factors
            under_score, factors = self._score_under_factors(
                home_metrics, away_metrics, ou_line, predicted_total, edge
            )

            # Determine recommendation
            recommendation = self._get_recommendation(under_score)

            return {
                'predicted_total': round(predicted_total, 1),
                'under_score': round(under_score, 1),
                'over_score': round(100 - under_score, 1),
                'recommendation': recommendation,
                'factors': factors,
                'edge': round(edge, 1)
            }

        except Exception as e:
            self.logger.error(f"Error analyzing matchup: {e}")
            return {
                'predicted_total': 0,
                'under_score': 50,
                'over_score': 50,
                'recommendation': 'PASS',
                'factors': ['Error analyzing matchup'],
                'edge': 0
            }

    def _calculate_expected_total(self, home_metrics: Dict, away_metrics: Dict) -> float:
        """
        Calculate expected total score based on team averages and pace

        Uses a weighted approach:
        1. Base prediction from team PPG averages
        2. Adjust for pace differential
        3. Adjust for defensive efficiency matchup
        """
        # Get average PPG for both teams
        home_ppg = home_metrics.get('avg_ppg', 75)
        away_ppg = away_metrics.get('avg_ppg', 75)

        # Base prediction: average of both teams' scoring
        base_total = home_ppg + away_ppg

        # Pace adjustment
        home_pace = home_metrics.get('pace', 70)
        away_pace = away_metrics.get('pace', 70)
        avg_pace = (home_pace + away_pace) / 2

        # National average pace is ~70 possessions per game
        # Adjust total based on pace differential
        pace_factor = (avg_pace - 70) / 70
        pace_adjustment = base_total * pace_factor * 0.5  # 0.5 dampens the effect

        # Defensive efficiency adjustment
        # Lower def_eff = better defense = fewer points
        home_def = home_metrics.get('def_efficiency', 100)
        away_def = away_metrics.get('def_efficiency', 100)

        # National average is ~100 points per 100 possessions
        # Strong defenses (< 95) should reduce total
        # Weak defenses (> 105) should increase total
        avg_def = (home_def + away_def) / 2
        def_factor = (avg_def - 100) / 100
        def_adjustment = base_total * def_factor * 0.3  # 0.3 dampens the effect

        # Calculate final predicted total
        predicted_total = base_total + pace_adjustment + def_adjustment

        return predicted_total

    def _score_under_factors(
        self,
        home_metrics: Dict,
        away_metrics: Dict,
        ou_line: float,
        predicted_total: float,
        edge: float
    ) -> Tuple[float, List[str]]:
        """
        Score factors that favor the under bet

        Returns:
            Tuple of (under_score: 0-100, factors: list of strings)
        """
        score = 50  # Start neutral
        factors = []

        # Factor 1: Predicted total vs O/U line (most important)
        if edge >= 8:
            score += 25
            factors.append(f"Strong edge: Predicted {predicted_total:.1f} vs Line {ou_line} ({edge:+.1f})")
        elif edge >= 5:
            score += 18
            factors.append(f"Moderate edge: Predicted {predicted_total:.1f} vs Line {ou_line} ({edge:+.1f})")
        elif edge >= 2:
            score += 10
            factors.append(f"Small edge: Predicted {predicted_total:.1f} vs Line {ou_line} ({edge:+.1f})")
        elif edge <= -8:
            score -= 25
            factors.append(f"Strong edge for OVER: Line {ou_line} vs Predicted {predicted_total:.1f} ({edge:+.1f})")
        elif edge <= -5:
            score -= 18
            factors.append(f"Moderate edge for OVER: Line {ou_line} vs Predicted {predicted_total:.1f} ({edge:+.1f})")
        elif edge <= -2:
            score -= 10
            factors.append(f"Small edge for OVER: Line {ou_line} vs Predicted {predicted_total:.1f} ({edge:+.1f})")

        # Factor 2: Both teams slow pace
        home_pace = home_metrics.get('pace', 70)
        away_pace = away_metrics.get('pace', 70)
        avg_pace = (home_pace + away_pace) / 2

        if avg_pace < 66:
            score += 15
            factors.append(f"Very slow pace matchup (avg {avg_pace:.1f} possessions/game)")
        elif avg_pace < 68:
            score += 10
            factors.append(f"Slow pace matchup (avg {avg_pace:.1f} possessions/game)")
        elif avg_pace > 74:
            score -= 10
            factors.append(f"Fast pace matchup (avg {avg_pace:.1f} possessions/game)")
        elif avg_pace > 72:
            score -= 5
            factors.append(f"Above average pace (avg {avg_pace:.1f} possessions/game)")

        # Factor 3: Both teams strong defense
        home_def = home_metrics.get('def_efficiency', 100)
        away_def = away_metrics.get('def_efficiency', 100)
        avg_def = (home_def + away_def) / 2

        if avg_def < 95:
            score += 15
            factors.append(f"Elite defenses (avg {avg_def:.1f} pts/100 poss)")
        elif avg_def < 98:
            score += 10
            factors.append(f"Strong defenses (avg {avg_def:.1f} pts/100 poss)")
        elif avg_def > 105:
            score -= 10
            factors.append(f"Weak defenses (avg {avg_def:.1f} pts/100 poss)")
        elif avg_def > 102:
            score -= 5
            factors.append(f"Below average defenses (avg {avg_def:.1f} pts/100 poss)")

        # Factor 4: Low 3-point volume (slower game, less variance)
        home_3p_rate = home_metrics.get('three_p_rate', 0.35)
        away_3p_rate = away_metrics.get('three_p_rate', 0.35)
        avg_3p_rate = (home_3p_rate + away_3p_rate) / 2

        if avg_3p_rate < 0.30:
            score += 8
            factors.append(f"Low 3P volume (avg {avg_3p_rate*100:.1f}% of FGA)")
        elif avg_3p_rate > 0.42:
            score -= 8
            factors.append(f"High 3P volume (avg {avg_3p_rate*100:.1f}% of FGA)")

        # Factor 5: Low free throw volume (fewer stoppages)
        # Note: ft_rate from ESPN is FTA per game, not a percentage
        home_ft_per_game = home_metrics.get('ft_rate', 18.0)
        away_ft_per_game = away_metrics.get('ft_rate', 18.0)
        avg_ft_per_game = (home_ft_per_game + away_ft_per_game) / 2

        if avg_ft_per_game < 16.0:
            score += 5
            factors.append(f"Low FT volume (avg {avg_ft_per_game:.1f} FTA/game)")
        elif avg_ft_per_game > 22.0:
            score -= 5
            factors.append(f"High FT volume (avg {avg_ft_per_game:.1f} FTA/game)")

        # Factor 6: Pace mismatch penalty (fast team forces faster pace)
        pace_diff = abs(home_pace - away_pace)
        if pace_diff > 8:
            score -= 5
            factors.append(f"Large pace mismatch ({home_pace:.1f} vs {away_pace:.1f})")

        # Factor 7: Turnover volume (high turnovers = more possessions = higher scoring)
        # Note: to_rate from ESPN is TO per game, not a percentage
        home_to_per_game = home_metrics.get('to_rate', 12.0)
        away_to_per_game = away_metrics.get('to_rate', 12.0)
        avg_to_per_game = (home_to_per_game + away_to_per_game) / 2

        if avg_to_per_game < 11.0:
            score += 5
            factors.append(f"Low turnover volume (avg {avg_to_per_game:.1f} TO/game)")
        elif avg_to_per_game > 15.0:
            score -= 5
            factors.append(f"High turnover volume (avg {avg_to_per_game:.1f} TO/game)")

        # Cap score at 0-100
        score = max(0, min(100, score))

        return score, factors

    def _get_recommendation(self, under_score: float) -> str:
        """
        Convert under score to betting recommendation

        Args:
            under_score: Confidence in under (0-100)

        Returns:
            One of: BET_UNDER, LEAN_UNDER, PASS, LEAN_OVER, BET_OVER
        """
        if under_score >= 75:
            return "BET_UNDER"
        elif under_score >= 60:
            return "LEAN_UNDER"
        elif under_score >= 40:
            return "PASS"
        elif under_score >= 25:
            return "LEAN_OVER"
        else:
            return "BET_OVER"


def get_pregame_analyzer() -> PregameAnalyzer:
    """Factory function to get a pregame analyzer instance"""
    return PregameAnalyzer()

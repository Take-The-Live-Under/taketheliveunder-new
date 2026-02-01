"""
Betting Signal Calculator
Generates betting signals with edge calculation, confidence scoring, and unit sizing
"""

import numpy as np
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass, field
from datetime import datetime
from loguru import logger

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import config


@dataclass
class BettingSignal:
    """A betting signal with all relevant information"""
    timestamp: str = ""
    game_id: str = ""
    home_team: str = ""
    away_team: str = ""

    # Current game state
    minute: int = 0
    minutes_remaining: int = 40
    current_total: float = 0.0

    # Projection
    projected_total: float = 0.0
    projection_low: float = 0.0
    projection_high: float = 0.0
    kalman_covariance: float = 0.0

    # Line info
    ou_line: float = 0.0

    # Signal
    direction: str = "NO_PLAY"  # OVER, UNDER, NO_PLAY
    edge_points: float = 0.0
    edge_pct: float = 0.0

    # Confidence and sizing
    confidence: int = 0  # 0-100
    unit_size: float = 0.0  # 0, 0.5, 1, 2, or 3

    # Reasoning
    reasoning: List[str] = field(default_factory=list)

    # Matchup context
    matchup_type: str = ""
    home_pace: str = ""
    away_pace: str = ""

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "timestamp": self.timestamp,
            "game_id": self.game_id,
            "home_team": self.home_team,
            "away_team": self.away_team,
            "minute": self.minute,
            "minutes_remaining": self.minutes_remaining,
            "current_total": self.current_total,
            "projected_total": self.projected_total,
            "projection_low": self.projection_low,
            "projection_high": self.projection_high,
            "kalman_covariance": self.kalman_covariance,
            "ou_line": self.ou_line,
            "direction": self.direction,
            "edge_points": self.edge_points,
            "edge_pct": self.edge_pct,
            "confidence": self.confidence,
            "unit_size": self.unit_size,
            "reasoning": "; ".join(self.reasoning),
            "matchup_type": self.matchup_type,
            "home_pace": self.home_pace,
            "away_pace": self.away_pace,
        }

    def is_actionable(self) -> bool:
        """Check if this signal is actionable (has a direction and units)"""
        return self.direction in ["OVER", "UNDER"] and self.unit_size > 0


class BettingSignalCalculator:
    """
    Calculates betting signals from model projections and O/U lines
    """

    def __init__(self):
        self.betting_config = getattr(config, 'BETTING_CONFIG', {})
        self.min_edge_pct = self.betting_config.get("min_edge_pct", 2.0)
        self.confidence_tiers = self.betting_config.get("confidence_tiers", {
            80: 3, 70: 2, 60: 1, 50: 0.5
        })
        self.min_minutes = self.betting_config.get("min_minutes_for_bet", 4)
        self.confidence_weights = self.betting_config.get("confidence_weights", {
            "edge_weight": 0.4,
            "time_weight": 0.2,
            "covariance_weight": 0.2,
            "matchup_weight": 0.2,
        })

    def calculate_edge(
        self,
        projected_total: float,
        ou_line: float
    ) -> Tuple[float, float, str]:
        """
        Calculate edge percentage and direction

        Args:
            projected_total: Model's projected total
            ou_line: Over/under line

        Returns:
            Tuple of (edge_points, edge_pct, direction)
        """
        if ou_line <= 0:
            return 0.0, 0.0, "NO_PLAY"

        edge_points = projected_total - ou_line
        edge_pct = (edge_points / ou_line) * 100

        if edge_pct >= self.min_edge_pct:
            direction = "OVER"
        elif edge_pct <= -self.min_edge_pct:
            direction = "UNDER"
            edge_pct = abs(edge_pct)
        else:
            direction = "NO_PLAY"

        return edge_points, edge_pct, direction

    def calculate_confidence(
        self,
        edge_pct: float,
        minutes_elapsed: int,
        kalman_covariance: float,
        matchup_factor: float = 1.0,
        total_minutes: int = 40
    ) -> int:
        """
        Calculate confidence score (0-100)

        Args:
            edge_pct: Edge percentage (absolute value)
            minutes_elapsed: Minutes elapsed in game
            kalman_covariance: Kalman filter covariance (uncertainty)
            matchup_factor: Matchup-based confidence multiplier (0.5-1.5)
            total_minutes: Total game minutes

        Returns:
            Confidence score 0-100
        """
        weights = self.confidence_weights

        # Edge component (0-40 points based on edge size)
        edge_scale = self.betting_config.get("edge_confidence_scale", {
            2.0: 50, 4.0: 65, 6.0: 75, 8.0: 85
        })
        edge_confidence = self._interpolate_edge_confidence(edge_pct, edge_scale)
        edge_score = edge_confidence * weights.get("edge_weight", 0.4)

        # Time component (more confident later in game)
        # At minute 4: ~0.1, at minute 20: ~0.5, at minute 35: ~0.875
        time_factor = minutes_elapsed / total_minutes
        time_score = (time_factor * 100) * weights.get("time_weight", 0.2)

        # Covariance component (lower covariance = more confident)
        # Typical covariance range: 0.1 - 2.0
        cov_normalized = min(1.0, kalman_covariance / 2.0)
        cov_confidence = (1 - cov_normalized) * 100
        cov_score = cov_confidence * weights.get("covariance_weight", 0.2)

        # Matchup component
        # matchup_factor: 0.8 = unfavorable, 1.0 = neutral, 1.2 = favorable
        matchup_confidence = (matchup_factor - 0.5) * 100  # Map 0.5-1.5 to 0-100
        matchup_score = matchup_confidence * weights.get("matchup_weight", 0.2)

        # Combine all components
        total_confidence = edge_score + time_score + cov_score + matchup_score

        return int(max(0, min(100, total_confidence)))

    def _interpolate_edge_confidence(
        self,
        edge_pct: float,
        scale: Dict[float, int]
    ) -> float:
        """Interpolate confidence from edge scale"""
        sorted_edges = sorted(scale.keys())

        if edge_pct <= sorted_edges[0]:
            return scale[sorted_edges[0]]

        if edge_pct >= sorted_edges[-1]:
            return scale[sorted_edges[-1]]

        # Linear interpolation
        for i in range(len(sorted_edges) - 1):
            low_edge = sorted_edges[i]
            high_edge = sorted_edges[i + 1]
            if low_edge <= edge_pct <= high_edge:
                low_conf = scale[low_edge]
                high_conf = scale[high_edge]
                ratio = (edge_pct - low_edge) / (high_edge - low_edge)
                return low_conf + ratio * (high_conf - low_conf)

        return scale[sorted_edges[0]]

    def get_unit_size(self, confidence: int) -> float:
        """
        Get recommended unit size based on confidence

        Args:
            confidence: Confidence score 0-100

        Returns:
            Unit size (0, 0.5, 1, 2, or 3)
        """
        for threshold, units in sorted(self.confidence_tiers.items(), reverse=True):
            if confidence >= threshold:
                return units
        return 0.0

    def generate_signal(
        self,
        game_id: str,
        home_team: str,
        away_team: str,
        minute: int,
        current_total: float,
        projected_total: float,
        ou_line: float,
        kalman_covariance: float = 1.0,
        projection_range: Tuple[float, float] = None,
        matchup_info: Dict = None,
        total_minutes: int = 40
    ) -> BettingSignal:
        """
        Generate a complete betting signal

        Args:
            game_id: Game identifier
            home_team: Home team name
            away_team: Away team name
            minute: Current minute
            current_total: Current total points scored
            projected_total: Model's projected final total
            ou_line: Over/under line
            kalman_covariance: Kalman filter covariance
            projection_range: Optional (low, high) projection range
            matchup_info: Optional matchup context dict
            total_minutes: Total game minutes

        Returns:
            BettingSignal
        """
        signal = BettingSignal(
            timestamp=datetime.now().isoformat(),
            game_id=str(game_id),
            home_team=home_team,
            away_team=away_team,
            minute=minute,
            minutes_remaining=total_minutes - minute,
            current_total=current_total,
            projected_total=projected_total,
            kalman_covariance=kalman_covariance,
            ou_line=ou_line,
        )

        # Set projection range
        if projection_range:
            signal.projection_low, signal.projection_high = projection_range
        else:
            # Estimate from covariance
            std_dev = np.sqrt(kalman_covariance) * (total_minutes - minute)
            signal.projection_low = projected_total - 1.96 * std_dev
            signal.projection_high = projected_total + 1.96 * std_dev

        # Set matchup info
        if matchup_info:
            signal.matchup_type = matchup_info.get("matchup_type", "")
            signal.home_pace = matchup_info.get("home_pace", "")
            signal.away_pace = matchup_info.get("away_pace", "")

        reasoning = []

        # Check minimum minutes
        if minute < self.min_minutes:
            signal.direction = "NO_PLAY"
            signal.reasoning = [f"Too early (minute {minute} < {self.min_minutes})"]
            return signal

        # Calculate edge
        edge_points, edge_pct, direction = self.calculate_edge(projected_total, ou_line)
        signal.edge_points = edge_points
        signal.edge_pct = edge_pct
        signal.direction = direction

        if direction == "NO_PLAY":
            signal.reasoning = [f"Edge {edge_pct:.1f}% below threshold {self.min_edge_pct}%"]
            return signal

        reasoning.append(f"{direction}: {edge_pct:.1f}% edge ({edge_points:.1f} pts)")

        # Calculate matchup factor
        matchup_factor = 1.0
        if matchup_info:
            pace_agreement = matchup_info.get("pace_agreement", 1.0)
            matchup_factor = 0.8 + (pace_agreement * 0.4)  # Range: 0.8-1.2

            if direction == "UNDER" and "Slow" in matchup_info.get("matchup_type", ""):
                matchup_factor += 0.1
                reasoning.append("Both teams slow pace (+10% confidence)")
            elif direction == "OVER" and "Fast" in matchup_info.get("matchup_type", ""):
                matchup_factor += 0.1
                reasoning.append("Both teams fast pace (+10% confidence)")

        # Calculate confidence
        confidence = self.calculate_confidence(
            edge_pct,
            minute,
            kalman_covariance,
            matchup_factor,
            total_minutes
        )
        signal.confidence = confidence

        # Get unit size
        unit_size = self.get_unit_size(confidence)
        signal.unit_size = unit_size

        # Add confidence reasoning
        reasoning.append(f"Confidence: {confidence} -> {unit_size} units")

        # Add time context
        if minute >= 30:
            reasoning.append("Late game - higher certainty")
        elif minute >= 20:
            reasoning.append("Second half - moderate certainty")
        else:
            reasoning.append("First half - projection may shift")

        signal.reasoning = reasoning

        return signal

    def generate_signals_for_game(
        self,
        game_data: Dict,
        minute_data: List[Dict],
        ou_line: float,
        matchup_info: Dict = None
    ) -> List[BettingSignal]:
        """
        Generate signals for all minutes of a game

        Args:
            game_data: Game-level data (game_id, home_team, away_team)
            minute_data: List of per-minute data dicts with
                        (minute, current_total, projected_total, kalman_covariance)
            ou_line: Over/under line
            matchup_info: Optional matchup context

        Returns:
            List of BettingSignal objects
        """
        signals = []

        for md in minute_data:
            signal = self.generate_signal(
                game_id=game_data.get("game_id", ""),
                home_team=game_data.get("home_team", ""),
                away_team=game_data.get("away_team", ""),
                minute=md.get("minute", 0),
                current_total=md.get("current_total", 0),
                projected_total=md.get("projected_total", 0),
                ou_line=ou_line,
                kalman_covariance=md.get("kalman_covariance", 1.0),
                matchup_info=matchup_info,
            )
            signals.append(signal)

        return signals


def calculate_implied_probability(odds: int) -> float:
    """
    Calculate implied probability from American odds

    Args:
        odds: American odds (e.g., -110, +150)

    Returns:
        Implied probability (0-1)
    """
    if odds < 0:
        return abs(odds) / (abs(odds) + 100)
    else:
        return 100 / (odds + 100)


def calculate_expected_value(
    win_probability: float,
    odds: int = -110
) -> float:
    """
    Calculate expected value of a bet

    Args:
        win_probability: Probability of winning (0-1)
        odds: American odds (default -110)

    Returns:
        Expected value as decimal (0.05 = 5% EV)
    """
    implied_prob = calculate_implied_probability(odds)

    # Profit on win
    if odds < 0:
        win_profit = 100 / abs(odds)
    else:
        win_profit = odds / 100

    # EV = (win_prob * win_profit) - (lose_prob * 1)
    ev = (win_probability * win_profit) - ((1 - win_probability) * 1)

    return ev


def get_betting_signal_calculator() -> BettingSignalCalculator:
    """Factory function for BettingSignalCalculator"""
    return BettingSignalCalculator()

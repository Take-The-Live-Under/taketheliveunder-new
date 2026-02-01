"""
Kalman Filter Module
1D Kalman filters for smoothing pace and efficiency metrics
"""

import numpy as np
from typing import Tuple, Optional, Dict, List
from loguru import logger

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import config


class KalmanFilter1D:
    """
    1D Kalman Filter for smoothing noisy measurements

    State model: x_k = x_{k-1} + w_k (random walk)
    Measurement model: z_k = x_k + v_k

    Where:
    - x_k is the true state at time k
    - z_k is the measurement at time k
    - w_k ~ N(0, Q) is process noise
    - v_k ~ N(0, R) is measurement noise
    """

    def __init__(
        self,
        Q: float = None,
        R: float = None,
        x0: float = None,
        P0: float = None
    ):
        """
        Initialize Kalman Filter

        Args:
            Q: Process noise covariance (higher = more responsive)
            R: Measurement noise covariance (higher = smoother)
            x0: Initial state estimate
            P0: Initial error covariance
        """
        kf_config = config.KALMAN_CONFIG

        self.Q = Q if Q is not None else kf_config["Q_default"]
        self.R = R if R is not None else kf_config["R_default"]
        self.x = x0 if x0 is not None else kf_config["x0"]
        self.P = P0 if P0 is not None else kf_config["P0"]

        # Store history
        self.state_history: List[float] = []
        self.covariance_history: List[float] = []
        self.kalman_gain_history: List[float] = []

    def reset(self, x0: float = None, P0: float = None):
        """Reset filter state"""
        kf_config = config.KALMAN_CONFIG
        self.x = x0 if x0 is not None else kf_config["x0"]
        self.P = P0 if P0 is not None else kf_config["P0"]
        self.state_history = []
        self.covariance_history = []
        self.kalman_gain_history = []

    def predict(self, Q_override: float = None) -> Tuple[float, float]:
        """
        Prediction step: project state forward

        Args:
            Q_override: Override process noise for this step

        Returns:
            Tuple of (predicted state, predicted covariance)
        """
        Q = Q_override if Q_override is not None else self.Q

        # State prediction (random walk model)
        x_pred = self.x

        # Covariance prediction
        P_pred = self.P + Q

        return x_pred, P_pred

    def update(self, z: float, R_override: float = None) -> Tuple[float, float, float]:
        """
        Update step: incorporate new measurement

        Args:
            z: New measurement
            R_override: Override measurement noise for this step

        Returns:
            Tuple of (updated state, updated covariance, Kalman gain)
        """
        R = R_override if R_override is not None else self.R

        # Kalman gain
        K = self.P / (self.P + R)

        # State update
        self.x = self.x + K * (z - self.x)

        # Covariance update
        self.P = (1 - K) * self.P

        # Store history
        self.state_history.append(self.x)
        self.covariance_history.append(self.P)
        self.kalman_gain_history.append(K)

        return self.x, self.P, K

    def filter_step(
        self,
        z: float,
        Q_override: float = None,
        R_override: float = None
    ) -> Tuple[float, float, float]:
        """
        Combined predict + update step

        Args:
            z: New measurement
            Q_override: Override process noise
            R_override: Override measurement noise

        Returns:
            Tuple of (filtered state, covariance, Kalman gain)
        """
        # Predict
        _, P_pred = self.predict(Q_override)
        self.P = P_pred

        # Update
        return self.update(z, R_override)

    def get_state(self) -> float:
        """Get current state estimate"""
        return self.x

    def get_covariance(self) -> float:
        """Get current error covariance"""
        return self.P


class AdaptiveKalmanFilter(KalmanFilter1D):
    """
    Kalman Filter with adaptive Q/R based on game context.
    Enhanced with:
    - Continuous late-game curve (smooth exponential instead of binary)
    - Online Q/R adaptation based on innovation (prediction error)
    - Garbage time handling
    """

    def __init__(
        self,
        Q: float = None,
        R: float = None,
        x0: float = None,
        P0: float = None
    ):
        super().__init__(Q, R, x0, P0)
        self.base_Q = self.Q
        self.base_R = self.R

        # Innovation tracking for online adaptation
        self.innovation_history: List[float] = []
        self.innovation_variance: float = 1.0

    def reset(self, x0: float = None, P0: float = None):
        """Reset filter state and innovation history"""
        super().reset(x0, P0)
        self.innovation_history = []
        self.innovation_variance = 1.0

    def get_late_game_adjustments(self, minutes_remaining: float) -> Tuple[float, float]:
        """
        Get Q/R adjustments for late game situations.
        Uses continuous exponential curve if enabled, otherwise binary threshold.

        Args:
            minutes_remaining: Minutes left in game

        Returns:
            Tuple of (Q multiplier, R multiplier)
        """
        kf_config = config.KALMAN_CONFIG

        if kf_config.get("use_continuous_late_game", False):
            # CONTINUOUS CURVE: Q_mult = 1 + (max - 1) * exp(-decay * min_remaining)
            q_max = kf_config.get("late_game_Q_max_mult", 3.0)
            r_min = kf_config.get("late_game_R_min_mult", 0.3)
            decay = kf_config.get("late_game_decay", 0.25)

            # Exponential increase in Q as time runs out
            time_factor = np.exp(-decay * minutes_remaining)
            q_mult = 1.0 + (q_max - 1.0) * time_factor

            # Exponential decrease in R as time runs out
            r_mult = 1.0 - (1.0 - r_min) * time_factor

            return q_mult, r_mult
        else:
            # BINARY THRESHOLD (legacy behavior)
            threshold = kf_config["late_game_threshold"]

            if minutes_remaining < threshold:
                q_mult = kf_config["late_game_Q_multiplier"]
                r_mult = kf_config["late_game_R_multiplier"]
            else:
                q_mult = 1.0
                r_mult = 1.0

            return q_mult, r_mult

    def update_innovation(self, z: float) -> Tuple[float, float]:
        """
        Track innovation (prediction error) for online adaptation.

        Args:
            z: Current measurement

        Returns:
            Tuple of (Q adjustment, R adjustment) based on innovation
        """
        kf_config = config.KALMAN_CONFIG

        if not kf_config.get("use_online_adaptation", False):
            return 1.0, 1.0

        # Calculate innovation (prediction error)
        innovation = z - self.x

        # Add to history
        window = kf_config.get("innovation_window", 5)
        self.innovation_history.append(innovation)
        if len(self.innovation_history) > window:
            self.innovation_history.pop(0)

        # Calculate innovation variance
        if len(self.innovation_history) >= 2:
            self.innovation_variance = np.var(self.innovation_history)

        # Adapt Q/R based on innovation variance
        # High innovation variance = predictions are wrong = increase Q
        q_scale = kf_config.get("innovation_q_scale", 0.5)
        r_scale = kf_config.get("innovation_r_scale", 0.3)
        max_q = kf_config.get("max_online_q_mult", 2.0)
        max_r = kf_config.get("max_online_r_mult", 2.0)

        # Q increases when innovation variance is high
        q_adapt = 1.0 + q_scale * min(self.innovation_variance, 2.0)
        q_adapt = min(q_adapt, max_q)

        # R adjusts inversely - high variance means trust measurements less
        r_adapt = 1.0 + r_scale * min(self.innovation_variance, 2.0)
        r_adapt = min(r_adapt, max_r)

        return q_adapt, r_adapt

    def get_garbage_time_adjustments(self, blowout_factor: float) -> Tuple[float, float]:
        """
        Get Q/R adjustments for garbage time situations.

        Args:
            blowout_factor: 0-1 scale of how much of a blowout (from data)

        Returns:
            Tuple of (Q multiplier, R multiplier)
        """
        blowout_config = getattr(config, 'BLOWOUT_CONFIG', {})

        if not blowout_config.get("use_garbage_time_adjustments", False):
            return 1.0, 1.0

        threshold = blowout_config.get("activation_threshold", 0.4)

        if blowout_factor > threshold:
            # Scale adjustment by how far past threshold
            intensity = (blowout_factor - threshold) / (1.0 - threshold)
            q_mult = 1.0 + (blowout_config.get("garbage_Q_mult", 2.5) - 1.0) * intensity
            r_mult = 1.0 - (1.0 - blowout_config.get("garbage_R_mult", 0.3)) * intensity
            return q_mult, r_mult

        return 1.0, 1.0

    def get_regime_adjustments(self, state_idx: int) -> Tuple[float, float]:
        """
        Get Q/R adjustments based on HMM regime state

        Args:
            state_idx: HMM state index

        Returns:
            Tuple of (Q multiplier, R multiplier)
        """
        regime_adj = config.REGIME_KALMAN_ADJUSTMENTS.get(
            state_idx,
            {"Q_mult": 1.0, "R_mult": 1.0}
        )

        return regime_adj["Q_mult"], regime_adj["R_mult"]

    def filter_step_adaptive(
        self,
        z: float,
        minutes_remaining: float,
        hmm_state: int = None,
        blowout_factor: float = 0.0
    ) -> Tuple[float, float, float, Dict]:
        """
        Adaptive filter step with context-aware Q/R.
        Incorporates: late-game curve, regime, online adaptation, garbage time.

        Args:
            z: New measurement
            minutes_remaining: Minutes remaining in game
            hmm_state: Current HMM state (if available)
            blowout_factor: 0-1 blowout intensity (for garbage time)

        Returns:
            Tuple of (filtered state, covariance, Kalman gain, adjustment info)
        """
        # 1. Get late game adjustments (continuous curve)
        late_q_mult, late_r_mult = self.get_late_game_adjustments(minutes_remaining)

        # 2. Get regime adjustments (if HMM state available)
        if hmm_state is not None:
            regime_q_mult, regime_r_mult = self.get_regime_adjustments(hmm_state)
        else:
            regime_q_mult, regime_r_mult = 1.0, 1.0

        # 3. Get online adaptation adjustments (innovation-based)
        online_q_mult, online_r_mult = self.update_innovation(z)

        # 4. Get garbage time adjustments
        garbage_q_mult, garbage_r_mult = self.get_garbage_time_adjustments(blowout_factor)

        # Combine all adjustments (multiplicative)
        total_q_mult = late_q_mult * regime_q_mult * online_q_mult * garbage_q_mult
        total_r_mult = late_r_mult * regime_r_mult * online_r_mult * garbage_r_mult

        # Apply adjusted Q/R
        Q_adj = self.base_Q * total_q_mult
        R_adj = self.base_R * total_r_mult

        # Filter step with adjusted parameters
        x, P, K = self.filter_step(z, Q_override=Q_adj, R_override=R_adj)

        adjustment_info = {
            "Q_adjusted": Q_adj,
            "R_adjusted": R_adj,
            "late_game_Q_mult": late_q_mult,
            "late_game_R_mult": late_r_mult,
            "regime_Q_mult": regime_q_mult,
            "regime_R_mult": regime_r_mult,
            "online_Q_mult": online_q_mult,
            "online_R_mult": online_r_mult,
            "garbage_Q_mult": garbage_q_mult,
            "garbage_R_mult": garbage_r_mult,
            "total_Q_mult": total_q_mult,
            "total_R_mult": total_r_mult,
            "innovation_variance": self.innovation_variance,
        }

        return x, P, K, adjustment_info


class MultiFilterBank:
    """
    Bank of Kalman filters for multiple metrics
    """

    def __init__(self, metrics: List[str] = None):
        """
        Initialize filter bank

        Args:
            metrics: List of metric names to filter (default: ["ppm", "posm"])
        """
        self.metrics = metrics or ["ppm", "posm"]
        self.filters: Dict[str, AdaptiveKalmanFilter] = {}

        for metric in self.metrics:
            self.filters[metric] = AdaptiveKalmanFilter()

    def reset_all(self, initial_values: Dict[str, float] = None):
        """Reset all filters"""
        for metric, filt in self.filters.items():
            x0 = initial_values.get(metric, 0.0) if initial_values else 0.0
            filt.reset(x0=x0)

    def filter_step_all(
        self,
        measurements: Dict[str, float],
        minutes_remaining: float,
        hmm_state: int = None,
        blowout_factor: float = 0.0
    ) -> Dict[str, Tuple[float, float, float, Dict]]:
        """
        Apply filter step to all metrics

        Args:
            measurements: Dict of metric_name -> measured value
            minutes_remaining: Minutes remaining in game
            hmm_state: Current HMM state
            blowout_factor: 0-1 blowout intensity for garbage time

        Returns:
            Dict of metric_name -> (state, covariance, kalman_gain, adjustments)
        """
        results = {}

        for metric, filt in self.filters.items():
            if metric in measurements:
                z = measurements[metric]
                results[metric] = filt.filter_step_adaptive(
                    z, minutes_remaining, hmm_state, blowout_factor
                )
            else:
                # No measurement, just return current state
                results[metric] = (
                    filt.get_state(),
                    filt.get_covariance(),
                    0.0,
                    {}
                )

        return results

    def get_filtered_states(self) -> Dict[str, float]:
        """Get current filtered state for all metrics"""
        return {metric: filt.get_state() for metric, filt in self.filters.items()}


class TeamAdaptiveKalmanFilter(AdaptiveKalmanFilter):
    """
    Kalman Filter with team-specific Q/R adjustments based on team profiles.
    Incorporates team variance characteristics for better filtering.
    """

    def __init__(
        self,
        Q: float = None,
        R: float = None,
        x0: float = None,
        P0: float = None
    ):
        super().__init__(Q, R, x0, P0)
        self.home_team_mult = (1.0, 1.0)  # (Q_mult, R_mult)
        self.away_team_mult = (1.0, 1.0)
        self.matchup_mult = (1.0, 1.0)

    def set_team_adjustments(
        self,
        home_q_mult: float = 1.0,
        home_r_mult: float = 1.0,
        away_q_mult: float = 1.0,
        away_r_mult: float = 1.0
    ):
        """
        Set team-specific Kalman adjustments

        Args:
            home_q_mult: Home team Q multiplier
            home_r_mult: Home team R multiplier
            away_q_mult: Away team Q multiplier
            away_r_mult: Away team R multiplier
        """
        self.home_team_mult = (home_q_mult, home_r_mult)
        self.away_team_mult = (away_q_mult, away_r_mult)

        # Combined multipliers (average of both teams)
        self.matchup_mult = (
            (home_q_mult + away_q_mult) / 2,
            (home_r_mult + away_r_mult) / 2
        )

    def set_from_profiles(self, home_profile, away_profile):
        """
        Set adjustments directly from TeamProfile objects

        Args:
            home_profile: Home team TeamProfile
            away_profile: Away team TeamProfile
        """
        self.set_team_adjustments(
            home_q_mult=home_profile.get_q_multiplier(),
            home_r_mult=home_profile.get_r_multiplier(),
            away_q_mult=away_profile.get_q_multiplier(),
            away_r_mult=away_profile.get_r_multiplier(),
        )

    def set_from_matchup_adjustment(self, matchup_adjustment):
        """
        Set adjustments from MatchupAdjustment object

        Args:
            matchup_adjustment: MatchupAdjustment from MatchupAdjuster
        """
        self.matchup_mult = (
            matchup_adjustment.q_multiplier,
            matchup_adjustment.r_multiplier
        )

    def get_team_adjustments(self) -> Tuple[float, float]:
        """
        Get combined team Q/R multipliers

        Returns:
            Tuple of (Q_multiplier, R_multiplier)
        """
        return self.matchup_mult

    def filter_step_team_adaptive(
        self,
        z: float,
        minutes_remaining: float,
        hmm_state: int = None,
        blowout_factor: float = 0.0
    ) -> Tuple[float, float, float, Dict]:
        """
        Filter step with team-specific + regime + late-game + online + garbage time adjustments

        Args:
            z: New measurement
            minutes_remaining: Minutes remaining in game
            hmm_state: Current HMM state (if available)
            blowout_factor: 0-1 blowout intensity for garbage time

        Returns:
            Tuple of (filtered state, covariance, Kalman gain, adjustment info)
        """
        # Get late game adjustments (continuous curve)
        late_q_mult, late_r_mult = self.get_late_game_adjustments(minutes_remaining)

        # Get regime adjustments (if HMM state available)
        if hmm_state is not None:
            regime_q_mult, regime_r_mult = self.get_regime_adjustments(hmm_state)
        else:
            regime_q_mult, regime_r_mult = 1.0, 1.0

        # Get team adjustments
        team_q_mult, team_r_mult = self.matchup_mult

        # Get online adaptation adjustments
        online_q_mult, online_r_mult = self.update_innovation(z)

        # Get garbage time adjustments
        garbage_q_mult, garbage_r_mult = self.get_garbage_time_adjustments(blowout_factor)

        # Combine all adjustments (multiplicative)
        total_q_mult = late_q_mult * regime_q_mult * team_q_mult * online_q_mult * garbage_q_mult
        total_r_mult = late_r_mult * regime_r_mult * team_r_mult * online_r_mult * garbage_r_mult

        # Apply adjusted Q/R
        Q_adj = self.base_Q * total_q_mult
        R_adj = self.base_R * total_r_mult

        # Filter step with adjusted parameters
        x, P, K = self.filter_step(z, Q_override=Q_adj, R_override=R_adj)

        adjustment_info = {
            "Q_adjusted": Q_adj,
            "R_adjusted": R_adj,
            "late_game_Q_mult": late_q_mult,
            "late_game_R_mult": late_r_mult,
            "regime_Q_mult": regime_q_mult,
            "regime_R_mult": regime_r_mult,
            "team_Q_mult": team_q_mult,
            "team_R_mult": team_r_mult,
            "online_Q_mult": online_q_mult,
            "online_R_mult": online_r_mult,
            "garbage_Q_mult": garbage_q_mult,
            "garbage_R_mult": garbage_r_mult,
            "total_Q_mult": total_q_mult,
            "total_R_mult": total_r_mult,
            "innovation_variance": self.innovation_variance,
        }

        return x, P, K, adjustment_info


class TeamMultiFilterBank(MultiFilterBank):
    """
    Bank of team-adaptive Kalman filters for multiple metrics
    """

    def __init__(self, metrics: List[str] = None):
        """
        Initialize filter bank with team-adaptive filters

        Args:
            metrics: List of metric names to filter (default: ["ppm", "posm"])
        """
        self.metrics = metrics or ["ppm", "posm"]
        self.filters: Dict[str, TeamAdaptiveKalmanFilter] = {}

        for metric in self.metrics:
            self.filters[metric] = TeamAdaptiveKalmanFilter()

    def set_team_adjustments_all(
        self,
        home_q_mult: float = 1.0,
        home_r_mult: float = 1.0,
        away_q_mult: float = 1.0,
        away_r_mult: float = 1.0
    ):
        """Set team adjustments for all filters in the bank"""
        for filt in self.filters.values():
            filt.set_team_adjustments(
                home_q_mult, home_r_mult,
                away_q_mult, away_r_mult
            )

    def set_from_matchup_adjustment_all(self, matchup_adjustment):
        """Set from matchup adjustment for all filters"""
        for filt in self.filters.values():
            filt.set_from_matchup_adjustment(matchup_adjustment)

    def filter_step_all_team_adaptive(
        self,
        measurements: Dict[str, float],
        minutes_remaining: float,
        hmm_state: int = None,
        blowout_factor: float = 0.0
    ) -> Dict[str, Tuple[float, float, float, Dict]]:
        """
        Apply team-adaptive filter step to all metrics

        Args:
            measurements: Dict of metric_name -> measured value
            minutes_remaining: Minutes remaining in game
            hmm_state: Current HMM state
            blowout_factor: 0-1 blowout intensity for garbage time

        Returns:
            Dict of metric_name -> (state, covariance, kalman_gain, adjustments)
        """
        results = {}

        for metric, filt in self.filters.items():
            if metric in measurements:
                z = measurements[metric]
                results[metric] = filt.filter_step_team_adaptive(
                    z, minutes_remaining, hmm_state, blowout_factor
                )
            else:
                # No measurement, just return current state
                results[metric] = (
                    filt.get_state(),
                    filt.get_covariance(),
                    0.0,
                    {}
                )

        return results


def get_kalman_filter(Q: float = None, R: float = None) -> AdaptiveKalmanFilter:
    """Factory function for AdaptiveKalmanFilter"""
    return AdaptiveKalmanFilter(Q=Q, R=R)


def get_team_kalman_filter(Q: float = None, R: float = None) -> TeamAdaptiveKalmanFilter:
    """Factory function for TeamAdaptiveKalmanFilter"""
    return TeamAdaptiveKalmanFilter(Q=Q, R=R)


def get_filter_bank(metrics: List[str] = None) -> MultiFilterBank:
    """Factory function for MultiFilterBank"""
    return MultiFilterBank(metrics=metrics)


def get_team_filter_bank(metrics: List[str] = None) -> TeamMultiFilterBank:
    """Factory function for TeamMultiFilterBank"""
    return TeamMultiFilterBank(metrics=metrics)

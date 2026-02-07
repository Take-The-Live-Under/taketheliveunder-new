"""
PJ Engine - Combines HMM + Kalman for Projected Total
Main orchestration module for generating projections
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


class PJEngine:
    """
    Projected Total Engine combining HMM regime detection and Kalman filtering
    """

    def __init__(
        self,
        n_states: int = None,
        kalman_metrics: List[str] = None
    ):
        """
        Initialize PJ Engine

        Args:
            n_states: Number of HMM states (default from config)
            kalman_metrics: Metrics to apply Kalman filtering (default: ["ppm", "posm"])
        """
        self.n_states = n_states or config.HMM_CONFIG["n_states"]
        self.kalman_metrics = kalman_metrics or ["ppm", "posm"]

        # Components
        self.data_loader: Optional[DataLoader] = None
        self.hmm_detector: Optional[HMMRegimeDetector] = None
        self.filter_banks: Dict[str, MultiFilterBank] = {}  # Per-game filter banks

        # State
        self.is_fitted = False
        self.processed_data: Optional[pd.DataFrame] = None
        self.projections: Optional[pd.DataFrame] = None

    def load_data(self, csv_path: str) -> pd.DataFrame:
        """
        Load and preprocess data

        Args:
            csv_path: Path to input CSV

        Returns:
            Processed DataFrame
        """
        logger.info(f"Loading data from {csv_path}")

        self.data_loader = get_data_loader(csv_path)
        self.data_loader.load()
        self.data_loader.engineer_features()

        # Standardize features for HMM (with fallback to core features)
        hmm_features = config.HMM_CONFIG["features"]
        core_features = config.HMM_CONFIG.get("core_features", ["ppm", "posm", "foulm", "tovm"])
        self.data_loader.standardize_features(hmm_features, fallback_features=core_features)

        # Store which features are actually being used
        self.hmm_features = getattr(self.data_loader, 'standardized_features', core_features)

        self.processed_data = self.data_loader.get_full_dataframe()
        logger.info(f"Data loaded: {len(self.processed_data)} rows")
        logger.info(f"HMM features in use: {self.hmm_features}")

        return self.processed_data

    def fit_hmm(self) -> "PJEngine":
        """
        Fit HMM on loaded data

        Returns:
            self for method chaining
        """
        if self.processed_data is None:
            raise ValueError("Must call load_data() first")

        logger.info(f"Fitting HMM with {self.n_states} states")

        # Get sequences for HMM using actually available features
        hmm_features = getattr(self, 'hmm_features', config.HMM_CONFIG["features"])
        logger.info(f"Training HMM on features: {hmm_features}")

        sequences = self.data_loader.get_game_sequences(hmm_features, standardized=True)

        # Fit HMM
        self.hmm_detector = get_hmm_detector(n_states=self.n_states)
        self.hmm_detector.fit(sequences)

        self.is_fitted = True
        logger.info("HMM fitted successfully")

        return self

    def _get_or_create_filter_bank(self, game_id: str) -> MultiFilterBank:
        """Get or create a filter bank for a game"""
        if game_id not in self.filter_banks:
            self.filter_banks[game_id] = get_filter_bank(self.kalman_metrics)
        return self.filter_banks[game_id]

    def _get_adaptive_regime_weight(self, minute_idx: int, total_minutes: int) -> float:
        """
        Calculate adaptive regime weight that increases with game time.
        Early game: trust history more. Late game: trust HMM regime more.

        Args:
            minute_idx: Current minute
            total_minutes: Total game minutes

        Returns:
            Regime weight between min and max
        """
        proj_config = config.PROJECTION_CONFIG

        if proj_config.get("use_adaptive_regime_weight", False):
            weight_min = proj_config.get("regime_weight_min", 0.2)
            weight_max = proj_config.get("regime_weight_max", 0.65)
            progress = min(minute_idx / max(total_minutes, 1), 1.0)
            return weight_min + (weight_max - weight_min) * progress
        else:
            return proj_config.get("regime_weight", 0.6)

    def generate_projections(self) -> pd.DataFrame:
        """
        Generate per-minute projections for all games.
        Enhanced with: adaptive regime weight, garbage time handling, improved features.

        Returns:
            DataFrame with projections
        """
        if not self.is_fitted:
            raise ValueError("Must call fit_hmm() first")

        logger.info("Generating projections with enhanced adaptive model")

        results = []
        total_minutes = config.PROJECTION_CONFIG["total_minutes"]
        min_minutes = config.PROJECTION_CONFIG["min_minutes_for_projection"]

        # Process each game
        for game_id, game_df in self.processed_data.groupby("game_id"):
            game_df = game_df.sort_values("minute_index")

            # Get HMM states for this game using available features
            hmm_features = getattr(self, 'hmm_features', config.HMM_CONFIG.get("core_features", ["ppm", "posm", "foulm", "tovm"]))
            feature_cols = [f"{f}_std" for f in hmm_features if f"{f}_std" in game_df.columns]

            if len(feature_cols) == 0:
                logger.warning(f"No standardized features found for game {game_id}, skipping")
                continue

            sequence = game_df[feature_cols].values

            states = self.hmm_detector.predict_states(sequence)
            state_probs = self.hmm_detector.predict_state_probabilities(sequence)

            # Get filter bank for this game
            filter_bank = self._get_or_create_filter_bank(game_id)

            # Initialize filter with first measurement
            first_row = game_df.iloc[0]
            initial_vals = {
                "ppm": first_row["ppm"],
                "posm": first_row["posm"]
            }
            filter_bank.reset_all(initial_vals)

            # Process each minute
            for idx, (_, row) in enumerate(game_df.iterrows()):
                minute_idx = row["minute_index"]
                minutes_remaining = row["minutes_remaining"]
                points_so_far = row["points_so_far"]
                hmm_state = states[idx]

                # Get blowout factor for garbage time handling
                blowout_factor = row.get("blowout_factor", 0.0)
                is_blowout = row.get("is_blowout", 0)

                # Apply Kalman filtering with blowout context
                measurements = {
                    "ppm": row["ppm"],
                    "posm": row["posm"]
                }
                filter_results = filter_bank.filter_step_all(
                    measurements,
                    minutes_remaining,
                    hmm_state,
                    blowout_factor
                )

                # Get filtered ppm
                filtered_ppm = filter_results["ppm"][0]
                kalman_gain_ppm = filter_results["ppm"][2]
                kalman_info = filter_results["ppm"][3]

                # Get regime-expected ppm from HMM state profile
                state_profile = self.hmm_detector.get_state_profile(hmm_state)
                regime_ppm_std = state_profile.get("means", {}).get("ppm", 0)

                # Convert standardized regime ppm back to raw scale
                ppm_mean = self.data_loader.feature_means.get("ppm", 4.0)
                ppm_std = self.data_loader.feature_stds.get("ppm", 1.0)
                regime_ppm = regime_ppm_std * ppm_std + ppm_mean

                # ADAPTIVE REGIME WEIGHT: increases with game time
                regime_weight = self._get_adaptive_regime_weight(minute_idx, total_minutes)

                # Blend historical and regime-based ppm
                historical_ppm = points_so_far / max(minute_idx, 1)
                expected_ppm = (
                    (1 - regime_weight) * historical_ppm +
                    regime_weight * regime_ppm
                )

                # Incorporate Kalman-filtered ppm with weighted blend
                # Weight Kalman more heavily late in game
                kalman_weight = 0.4 + 0.2 * (minute_idx / total_minutes)
                expected_ppm = (1 - kalman_weight) * expected_ppm + kalman_weight * filtered_ppm

                # Calculate projection
                if minute_idx >= min_minutes:
                    projected_total = points_so_far + expected_ppm * minutes_remaining
                else:
                    # Not enough data, use simple extrapolation
                    avg_ppm_so_far = points_so_far / max(minute_idx, 1)
                    projected_total = points_so_far + avg_ppm_so_far * minutes_remaining

                # Build result row
                result = {
                    "game_id": game_id,
                    "minute_index": minute_idx,
                    "minutes_remaining": minutes_remaining,
                    "points_so_far": points_so_far,
                    "raw_ppm": row["ppm"],
                    "filtered_ppm": filtered_ppm,
                    "expected_ppm": expected_ppm,
                    "projected_total": projected_total,
                    "hmm_state": hmm_state,
                    "hmm_state_label": state_profile.get("label", "Unknown"),
                    "regime_weight": regime_weight,
                    "blowout_factor": blowout_factor,
                    "is_blowout": is_blowout,
                }

                # Add state probabilities
                if config.OUTPUT_CONFIG["include_state_probs"]:
                    for s in range(self.n_states):
                        result[f"state_{s}_prob"] = state_probs[idx][s]

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
        logger.info(f"Generated {len(self.projections)} projection rows")

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

    def get_final_projections(self) -> pd.DataFrame:
        """
        Get final projection for each game (at last available minute)
        """
        if self.projections is None:
            raise ValueError("Must call generate_projections() first")

        # Get last minute for each game
        final = self.projections.groupby("game_id").last().reset_index()

        # Calculate projection accuracy columns
        final["projection_at_minute"] = final["minute_index"]

        return final[["game_id", "projection_at_minute", "points_so_far",
                      "expected_ppm", "projected_total", "hmm_state_label"]]


def get_pj_engine(n_states: int = None) -> PJEngine:
    """Factory function for PJEngine"""
    return PJEngine(n_states=n_states)

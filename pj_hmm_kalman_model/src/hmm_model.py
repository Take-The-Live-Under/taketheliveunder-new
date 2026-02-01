"""
Hidden Markov Model Module
Fits GaussianHMM to identify game pace regimes
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from hmmlearn.hmm import GaussianHMM
from loguru import logger

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import config


class HMMRegimeDetector:
    """
    Uses Gaussian HMM to detect game pace regimes from minute-by-minute features
    """

    def __init__(
        self,
        n_states: int = None,
        covariance_type: str = None,
        n_iter: int = None,
        random_state: int = None
    ):
        """
        Initialize HMM Regime Detector

        Args:
            n_states: Number of hidden states (default from config)
            covariance_type: HMM covariance type
            n_iter: Number of EM iterations
            random_state: Random seed for reproducibility
        """
        hmm_config = config.HMM_CONFIG

        self.n_states = n_states or hmm_config["n_states"]
        self.covariance_type = covariance_type or hmm_config["covariance_type"]
        self.n_iter = n_iter or hmm_config["n_iter"]
        self.random_state = random_state or hmm_config["random_state"]
        self.min_covar = hmm_config.get("min_covar", 1e-3)

        self.model: Optional[GaussianHMM] = None
        self.is_fitted = False
        self.state_profiles: Dict[int, Dict] = {}

    def fit(self, sequences: Dict[str, np.ndarray]) -> "HMMRegimeDetector":
        """
        Fit GaussianHMM on game sequences

        Args:
            sequences: Dict of game_id -> 2D array (n_minutes, n_features)

        Returns:
            self for method chaining
        """
        # Concatenate all sequences with lengths
        all_sequences = []
        lengths = []

        for game_id, seq in sequences.items():
            if len(seq) < 2:
                logger.warning(f"Skipping game {game_id}: too short ({len(seq)} minutes)")
                continue
            all_sequences.append(seq)
            lengths.append(len(seq))

        if not all_sequences:
            raise ValueError("No valid sequences to train on")

        X = np.vstack(all_sequences)
        logger.info(f"Training HMM on {len(lengths)} games, {len(X)} total observations")

        # Initialize and fit model
        self.model = GaussianHMM(
            n_components=self.n_states,
            covariance_type=self.covariance_type,
            n_iter=self.n_iter,
            random_state=self.random_state,
            min_covar=self.min_covar
        )

        self.model.fit(X, lengths)
        self.is_fitted = True

        # Analyze state profiles
        self._analyze_states()

        logger.info(f"HMM fitted with {self.n_states} states, converged: {self.model.monitor_.converged}")
        return self

    def _analyze_states(self):
        """Analyze and label each hidden state based on emission means"""
        if not self.is_fitted:
            return

        means = self.model.means_
        covars = self.model.covars_

        # Assuming features are [ppm, posm, foulm, tovm] (standardized)
        feature_names = config.HMM_CONFIG.get("features", ["ppm", "posm", "foulm", "tovm"])

        for state_idx in range(self.n_states):
            state_mean = means[state_idx]

            # Determine state characteristics based on means
            profile = {
                "state_id": state_idx,
                "means": {feat: state_mean[i] for i, feat in enumerate(feature_names) if i < len(state_mean)},
            }

            # Get covariance (handling different covariance types)
            if self.covariance_type == "diag":
                profile["variances"] = {feat: covars[state_idx][i] for i, feat in enumerate(feature_names) if i < len(covars[state_idx])}
            elif self.covariance_type == "full":
                profile["covariance_matrix"] = covars[state_idx]

            # Label state based on ppm (points per minute)
            ppm_mean = state_mean[0] if len(state_mean) > 0 else 0
            foul_mean = state_mean[2] if len(state_mean) > 2 else 0

            if ppm_mean > 0.5:
                profile["label"] = "Fast"
            elif ppm_mean < -0.5:
                profile["label"] = "Slow"
            elif foul_mean > 0.5:
                profile["label"] = "Foul/Endgame"
            else:
                profile["label"] = "Normal"

            self.state_profiles[state_idx] = profile

        # Sort states by ppm mean for consistent ordering
        sorted_states = sorted(
            self.state_profiles.items(),
            key=lambda x: x[1]["means"].get("ppm", 0)
        )

        # Reassign labels based on sorted order
        labels = ["Slow", "Normal", "Fast", "Foul/Endgame"]
        for rank, (state_idx, profile) in enumerate(sorted_states):
            if rank < len(labels):
                profile["regime_rank"] = rank
                # Keep original label if foul-heavy, otherwise use rank-based
                if profile["label"] != "Foul/Endgame" and rank < 3:
                    profile["label"] = labels[rank]

    def predict_states(self, sequence: np.ndarray) -> np.ndarray:
        """
        Predict most likely state sequence for a game

        Args:
            sequence: 2D array (n_minutes, n_features)

        Returns:
            1D array of state indices
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted first")

        return self.model.predict(sequence)

    def predict_state_probabilities(self, sequence: np.ndarray) -> np.ndarray:
        """
        Get state probabilities for each minute

        Args:
            sequence: 2D array (n_minutes, n_features)

        Returns:
            2D array (n_minutes, n_states) of probabilities
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted first")

        return self.model.predict_proba(sequence)

    def get_state_profile(self, state_idx: int) -> Dict:
        """Get profile for a specific state"""
        return self.state_profiles.get(state_idx, {})

    def get_all_state_profiles(self) -> pd.DataFrame:
        """Get all state profiles as DataFrame"""
        if not self.state_profiles:
            return pd.DataFrame()

        rows = []
        for state_idx, profile in self.state_profiles.items():
            row = {
                "state_id": state_idx,
                "label": profile.get("label", "Unknown"),
                "regime_rank": profile.get("regime_rank", state_idx),
            }
            # Add means
            for feat, val in profile.get("means", {}).items():
                row[f"mean_{feat}"] = val
            # Add variances if available
            for feat, val in profile.get("variances", {}).items():
                row[f"var_{feat}"] = val
            rows.append(row)

        return pd.DataFrame(rows).sort_values("regime_rank")

    def score(self, sequence: np.ndarray) -> float:
        """
        Compute log-likelihood of a sequence

        Args:
            sequence: 2D array (n_minutes, n_features)

        Returns:
            Log-likelihood score
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted first")

        return self.model.score(sequence)


def get_hmm_detector(n_states: int = None) -> HMMRegimeDetector:
    """Factory function for HMMRegimeDetector"""
    return HMMRegimeDetector(n_states=n_states)

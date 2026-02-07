"""
Data Loader and Feature Engineering Module
Ingests play-by-play minute bin CSV and creates standardized features
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List, Dict, Optional
from loguru import logger

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
import config


class DataLoader:
    """Loads and preprocesses play-by-play minute bin data"""

    def __init__(self, csv_path: str):
        """
        Initialize DataLoader

        Args:
            csv_path: Path to the input CSV file
        """
        self.csv_path = Path(csv_path)
        self.raw_data: Optional[pd.DataFrame] = None
        self.processed_data: Optional[pd.DataFrame] = None
        self.feature_means: Dict[str, float] = {}
        self.feature_stds: Dict[str, float] = {}
        self.standardized_features: List[str] = []  # Track which features were standardized

    def load(self) -> pd.DataFrame:
        """
        Load CSV file and validate columns

        Returns:
            Raw DataFrame

        Raises:
            FileNotFoundError: If CSV file doesn't exist
            ValueError: If required columns are missing
        """
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Input file not found: {self.csv_path}")

        logger.info(f"Loading data from {self.csv_path}")
        self.raw_data = pd.read_csv(self.csv_path)

        # Validate required columns
        required = config.FEATURE_CONFIG["required_columns"]
        missing = [col for col in required if col not in self.raw_data.columns]

        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        logger.info(f"Loaded {len(self.raw_data)} rows from {len(self.raw_data['game_id'].unique())} games")
        return self.raw_data

    def engineer_features(self) -> pd.DataFrame:
        """
        Create derived features from raw data

        Returns:
            DataFrame with engineered features
        """
        if self.raw_data is None:
            raise ValueError("Must call load() before engineer_features()")

        df = self.raw_data.copy()

        # Create derived features
        derived = config.FEATURE_CONFIG["derived"]

        # Points per minute bin
        df["ppm"] = df["points_home"] + df["points_away"]

        # Possessions per minute bin
        df["posm"] = df["poss_home"] + df["poss_away"]

        # Fouls per minute bin
        df["foulm"] = df["fouls_home"] + df["fouls_away"]

        # Turnovers per minute bin
        df["tovm"] = df["to_home"] + df["to_away"]

        # Calculate cumulative points for projections
        df = df.sort_values(["game_id", "minute_index"])
        df["points_so_far"] = df.groupby("game_id")["ppm"].cumsum()

        # Calculate minutes remaining (assuming 40-minute game)
        total_minutes = config.PROJECTION_CONFIG["total_minutes"]
        df["minutes_remaining"] = total_minutes - df["minute_index"]
        df["minutes_elapsed"] = df["minute_index"]

        # Late game flag
        late_threshold = config.KALMAN_CONFIG["late_game_threshold"]
        df["is_late_game"] = df["minutes_remaining"] < late_threshold

        # Add enhanced features if enabled
        if getattr(config, 'USE_ENHANCED_FEATURES', False):
            df = self._add_enhanced_features(df)
            logger.info("Added enhanced features (efficiency, momentum, context)")

        logger.info(f"Engineered {len(derived)} derived features")
        self.processed_data = df
        return df

    def _add_enhanced_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add enhanced features: efficiency, momentum, and context

        Args:
            df: DataFrame with basic features

        Returns:
            DataFrame with enhanced features added
        """
        df = df.copy()

        # =================================================================
        # EFFICIENCY FEATURES
        # =================================================================

        # Points per possession (PPP) - efficiency metric
        # Guard against zero possessions
        df["ppp_total"] = df.apply(
            lambda row: row["ppm"] / row["posm"] if row["posm"] > 0 else 0.0,
            axis=1
        )

        # Cumulative PPP for the game
        df["poss_so_far"] = df.groupby("game_id")["posm"].cumsum()
        df["ppp_cumulative"] = df.apply(
            lambda row: row["points_so_far"] / row["poss_so_far"]
            if row["poss_so_far"] > 0 else 0.0,
            axis=1
        )

        # =================================================================
        # MOMENTUM FEATURES
        # =================================================================

        # 3-minute rolling PPM delta (momentum detection)
        df["ppm_rolling_3"] = df.groupby("game_id")["ppm"].transform(
            lambda x: x.rolling(window=3, min_periods=1).mean()
        )
        df["ppm_rolling_3_lag"] = df.groupby("game_id")["ppm_rolling_3"].shift(3)
        df["ppm_delta_3"] = df["ppm_rolling_3"] - df["ppm_rolling_3_lag"].fillna(
            df["ppm_rolling_3"]
        )

        # Scoring run detection (consecutive high/low scoring minutes)
        df["scoring_run"] = df.groupby("game_id")["ppm"].transform(
            self._calculate_scoring_runs
        )

        # =================================================================
        # CONTEXT FEATURES
        # =================================================================

        # Cumulative score by team
        df["score_home_cumulative"] = df.groupby("game_id")["points_home"].cumsum()
        df["score_away_cumulative"] = df.groupby("game_id")["points_away"].cumsum()

        # Score differential (positive = home leading)
        df["score_diff"] = df["score_home_cumulative"] - df["score_away_cumulative"]
        df["score_diff_abs"] = df["score_diff"].abs()

        # Blowout detection
        blowout_threshold = getattr(config, 'BLOWOUT_CONFIG', {}).get('threshold', 15)
        blowout_min_minute = getattr(config, 'BLOWOUT_CONFIG', {}).get('min_minute', 8)

        df["is_blowout"] = (
            (df["score_diff_abs"] > blowout_threshold) &
            (df["minute_index"] >= blowout_min_minute)
        ).astype(int)

        # Blowout factor (0-1 scale based on how much of a blowout)
        df["blowout_factor"] = (df["score_diff_abs"] / 30.0).clip(0, 1)

        # Half indicator (1 = first half, 2 = second half)
        half_cutoff = config.PROJECTION_CONFIG["total_minutes"] // 2
        df["half_indicator"] = (df["minute_index"] >= half_cutoff).astype(int) + 1

        # Clean up intermediate columns
        df = df.drop(columns=["ppm_rolling_3_lag"], errors="ignore")

        return df

    @staticmethod
    def _calculate_scoring_runs(ppm_series: pd.Series) -> pd.Series:
        """
        Calculate scoring run indicator for a game.
        Positive = consecutive high-scoring minutes, Negative = consecutive low-scoring.

        Args:
            ppm_series: Series of PPM values for a game

        Returns:
            Series of scoring run indicators
        """
        median_ppm = ppm_series.median()
        runs = []
        current_run = 0

        for ppm in ppm_series:
            if ppm > median_ppm + 0.5:  # High scoring minute
                current_run = max(1, current_run + 1)
            elif ppm < median_ppm - 0.5:  # Low scoring minute
                current_run = min(-1, current_run - 1)
            else:
                # Trend toward zero
                if current_run > 0:
                    current_run -= 1
                elif current_run < 0:
                    current_run += 1
            runs.append(current_run)

        return pd.Series(runs, index=ppm_series.index)

    def standardize_features(self, features: List[str], fallback_features: List[str] = None) -> pd.DataFrame:
        """
        Standardize features using z-score normalization.
        Falls back to core features if enhanced features are not available.

        Args:
            features: List of feature column names to standardize
            fallback_features: Fallback features if some are missing

        Returns:
            DataFrame with standardized features (suffixed with '_std')
        """
        if self.processed_data is None:
            raise ValueError("Must call engineer_features() before standardize_features()")

        df = self.processed_data.copy()
        standardized_count = 0

        # Check which features are available
        available_features = [f for f in features if f in df.columns]
        missing_features = [f for f in features if f not in df.columns]

        if missing_features:
            logger.warning(f"Features not available: {missing_features}")
            if fallback_features:
                for fb in fallback_features:
                    if fb not in available_features and fb in df.columns:
                        available_features.append(fb)
                logger.info(f"Using available features: {available_features}")

        for feat in available_features:
            # Handle NaN values
            df[feat] = df[feat].fillna(df[feat].median())

            mean = df[feat].mean()
            std = df[feat].std()

            # Avoid division by zero
            if std < 1e-10:
                std = 1.0

            self.feature_means[feat] = mean
            self.feature_stds[feat] = std

            df[f"{feat}_std"] = (df[feat] - mean) / std
            standardized_count += 1

        self.processed_data = df
        self.standardized_features = available_features
        logger.info(f"Standardized {standardized_count} features: {available_features}")
        return df

    def get_game_sequences(self, features: List[str], standardized: bool = True) -> Dict[str, np.ndarray]:
        """
        Get feature sequences grouped by game_id for HMM training

        Args:
            features: List of feature names (without _std suffix)
            standardized: Whether to use standardized features

        Returns:
            Dict mapping game_id -> 2D numpy array (n_minutes, n_features)
        """
        if self.processed_data is None:
            raise ValueError("Must call engineer_features() first")

        suffix = "_std" if standardized else ""
        feature_cols = [f"{f}{suffix}" for f in features]

        # Verify columns exist
        missing = [col for col in feature_cols if col not in self.processed_data.columns]
        if missing:
            raise ValueError(f"Missing feature columns: {missing}. Run standardize_features() first?")

        sequences = {}
        for game_id, group in self.processed_data.groupby("game_id"):
            # Sort by minute index and extract features
            sorted_group = group.sort_values("minute_index")
            sequences[game_id] = sorted_group[feature_cols].values

        logger.info(f"Created {len(sequences)} game sequences")
        return sequences

    def get_full_dataframe(self) -> pd.DataFrame:
        """Get the fully processed DataFrame"""
        if self.processed_data is None:
            raise ValueError("Must call engineer_features() first")
        return self.processed_data.copy()


def get_data_loader(csv_path: str) -> DataLoader:
    """Factory function for DataLoader"""
    return DataLoader(csv_path)

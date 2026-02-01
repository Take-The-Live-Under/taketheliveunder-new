"""
Output Handler Module
Saves projections and state profiles to CSV files
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple
from loguru import logger

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
import config


class OutputHandler:
    """Handles saving results to CSV files"""

    def __init__(self, output_dir: str = None):
        """
        Initialize OutputHandler

        Args:
            output_dir: Directory for output files (default from config)
        """
        self.output_dir = Path(output_dir) if output_dir else config.OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.decimal_places = config.OUTPUT_CONFIG["decimal_places"]

    def save_projections(
        self,
        projections: pd.DataFrame,
        filename_prefix: str = "pj_results"
    ) -> Path:
        """
        Save projections to CSV

        Args:
            projections: DataFrame of per-minute projections
            filename_prefix: Prefix for output filename

        Returns:
            Path to saved file
        """
        filename = f"{filename_prefix}_{self.timestamp}.csv"
        filepath = self.output_dir / filename

        # Round numeric columns
        df = projections.copy()
        numeric_cols = df.select_dtypes(include=['float64', 'float32']).columns
        df[numeric_cols] = df[numeric_cols].round(self.decimal_places)

        df.to_csv(filepath, index=False)
        logger.info(f"Saved projections to {filepath}")

        return filepath

    def save_state_profiles(
        self,
        state_profiles: pd.DataFrame,
        filename_prefix: str = "state_profiles"
    ) -> Path:
        """
        Save HMM state profiles to CSV

        Args:
            state_profiles: DataFrame of state profiles
            filename_prefix: Prefix for output filename

        Returns:
            Path to saved file
        """
        filename = f"{filename_prefix}_{self.timestamp}.csv"
        filepath = self.output_dir / filename

        # Round numeric columns
        df = state_profiles.copy()
        numeric_cols = df.select_dtypes(include=['float64', 'float32']).columns
        df[numeric_cols] = df[numeric_cols].round(self.decimal_places)

        df.to_csv(filepath, index=False)
        logger.info(f"Saved state profiles to {filepath}")

        return filepath

    def save_summary_report(
        self,
        projections: pd.DataFrame,
        state_profiles: pd.DataFrame,
        filename_prefix: str = "summary_report"
    ) -> Path:
        """
        Save a text summary report

        Args:
            projections: DataFrame of projections
            state_profiles: DataFrame of state profiles
            filename_prefix: Prefix for output filename

        Returns:
            Path to saved file
        """
        filename = f"{filename_prefix}_{self.timestamp}.txt"
        filepath = self.output_dir / filename

        lines = [
            "=" * 80,
            "HMM + KALMAN FILTER PJ MODEL - SUMMARY REPORT",
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "=" * 80,
            "",
            "DATA SUMMARY",
            "-" * 40,
            f"Total Games: {projections['game_id'].nunique()}",
            f"Total Minutes Analyzed: {len(projections)}",
            f"Average Minutes Per Game: {len(projections) / projections['game_id'].nunique():.1f}",
            "",
            "PROJECTION STATISTICS",
            "-" * 40,
            f"Mean Projected Total: {projections['projected_total'].mean():.2f}",
            f"Std Projected Total: {projections['projected_total'].std():.2f}",
            f"Mean Expected PPM: {projections['expected_ppm'].mean():.2f}",
            "",
            "HMM STATE PROFILES",
            "-" * 40,
        ]

        # Add state profile info
        for _, row in state_profiles.iterrows():
            lines.append(f"  State {int(row['state_id'])}: {row['label']}")
            if 'mean_ppm' in row:
                lines.append(f"    Mean PPM (std): {row['mean_ppm']:.3f}")
            if 'mean_posm' in row:
                lines.append(f"    Mean Possessions (std): {row['mean_posm']:.3f}")

        lines.append("")
        lines.append("STATE DISTRIBUTION")
        lines.append("-" * 40)

        state_counts = projections['hmm_state'].value_counts().sort_index()
        for state, count in state_counts.items():
            pct = count / len(projections) * 100
            label = projections[projections['hmm_state'] == state]['hmm_state_label'].iloc[0]
            lines.append(f"  State {state} ({label}): {count} minutes ({pct:.1f}%)")

        lines.append("")
        lines.append("KALMAN FILTER SUMMARY")
        lines.append("-" * 40)
        if 'kalman_gain' in projections.columns:
            lines.append(f"  Mean Kalman Gain: {projections['kalman_gain'].mean():.4f}")
            lines.append(f"  Max Kalman Gain: {projections['kalman_gain'].max():.4f}")

        lines.append("")
        lines.append("=" * 80)
        lines.append("END OF REPORT")
        lines.append("=" * 80)

        with open(filepath, 'w') as f:
            f.write('\n'.join(lines))

        logger.info(f"Saved summary report to {filepath}")
        return filepath

    def save_all(
        self,
        projections: pd.DataFrame,
        state_profiles: pd.DataFrame
    ) -> Tuple[Path, Path, Path]:
        """
        Save all outputs

        Args:
            projections: DataFrame of projections
            state_profiles: DataFrame of state profiles

        Returns:
            Tuple of (projections_path, state_profiles_path, summary_path)
        """
        proj_path = self.save_projections(projections)
        state_path = self.save_state_profiles(state_profiles)
        summary_path = self.save_summary_report(projections, state_profiles)

        return proj_path, state_path, summary_path


def get_output_handler(output_dir: str = None) -> OutputHandler:
    """Factory function for OutputHandler"""
    return OutputHandler(output_dir)

#!/usr/bin/env python3
"""
Team-by-Team Breakdown Analysis
Analyzes HMM/Kalman projections by team for betting insights
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from loguru import logger
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
import config


class TeamBreakdownAnalyzer:
    """Analyzes projection results by team"""

    def __init__(
        self,
        projections_df: pd.DataFrame,
        pbp_df: pd.DataFrame = None
    ):
        """
        Initialize analyzer

        Args:
            projections_df: Output from PJ engine (pj_results_*.csv)
            pbp_df: Original minute bins with team names
        """
        self.projections = projections_df.copy()
        self.pbp = pbp_df.copy() if pbp_df is not None else None

        # Merge team names if available and not already present
        if self.pbp is not None and "home_team" in self.pbp.columns:
            if "home_team" not in self.projections.columns:
                # Get unique game/team mapping
                team_map = self.pbp.groupby("game_id").first()[["home_team", "away_team"]].reset_index()
                self.projections = self.projections.merge(team_map, on="game_id", how="left")
                logger.info(f"Merged team names: {self.projections['home_team'].nunique()} unique teams")

    def get_game_summaries(self) -> pd.DataFrame:
        """Get summary stats for each game"""
        # Get final minute for each game
        final = self.projections.groupby("game_id").last().reset_index()

        # Get first minute for starting total
        first = self.projections.groupby("game_id").first().reset_index()[["game_id", "projected_total"]]
        first = first.rename(columns={"projected_total": "initial_projection"})

        # Merge
        final = final.merge(first, on="game_id")

        # Calculate projection change
        final["projection_change"] = final["projected_total"] - final["initial_projection"]

        # Get state distribution per game
        state_dist = self.projections.groupby(["game_id", "hmm_state_label"]).size().unstack(fill_value=0)
        state_dist.columns = [f"minutes_{col}" for col in state_dist.columns]
        final = final.merge(state_dist.reset_index(), on="game_id", how="left")

        return final

    def get_team_stats(self) -> pd.DataFrame:
        """
        Calculate stats for each team (both home and away appearances)
        """
        if "home_team" not in self.projections.columns:
            logger.warning("No team names in projections. Run with PBP data.")
            return pd.DataFrame()

        game_summaries = self.get_game_summaries()

        # Analyze as home team
        home_stats = game_summaries.groupby("home_team").agg({
            "game_id": "count",
            "projected_total": "mean",
            "points_so_far": "mean",
            "expected_ppm": "mean",
            "projection_change": "mean",
        }).rename(columns={
            "game_id": "home_games",
            "projected_total": "avg_proj_total_home",
            "points_so_far": "avg_final_points_home",
            "expected_ppm": "avg_ppm_home",
            "projection_change": "avg_proj_change_home",
        })

        # Analyze as away team
        away_stats = game_summaries.groupby("away_team").agg({
            "game_id": "count",
            "projected_total": "mean",
            "points_so_far": "mean",
            "expected_ppm": "mean",
            "projection_change": "mean",
        }).rename(columns={
            "game_id": "away_games",
            "projected_total": "avg_proj_total_away",
            "points_so_far": "avg_final_points_away",
            "expected_ppm": "avg_ppm_away",
            "projection_change": "avg_proj_change_away",
        })

        # Combine
        home_stats.index.name = "team"
        away_stats.index.name = "team"

        team_stats = home_stats.join(away_stats, how="outer").fillna(0)

        # Calculate totals
        team_stats["total_games"] = team_stats["home_games"] + team_stats["away_games"]
        team_stats["avg_proj_total"] = (
            (team_stats["avg_proj_total_home"] * team_stats["home_games"] +
             team_stats["avg_proj_total_away"] * team_stats["away_games"]) /
            team_stats["total_games"].replace(0, 1)
        )
        team_stats["avg_ppm"] = (
            (team_stats["avg_ppm_home"] * team_stats["home_games"] +
             team_stats["avg_ppm_away"] * team_stats["away_games"]) /
            team_stats["total_games"].replace(0, 1)
        )

        return team_stats.reset_index().sort_values("total_games", ascending=False)

    def get_team_regime_profiles(self) -> pd.DataFrame:
        """
        Analyze which regimes each team tends to play in
        """
        if "home_team" not in self.projections.columns:
            return pd.DataFrame()

        # Flatten team appearances
        home_regimes = self.projections[["game_id", "home_team", "hmm_state_label", "minute_index"]].copy()
        home_regimes = home_regimes.rename(columns={"home_team": "team"})
        home_regimes["is_home"] = True

        away_regimes = self.projections[["game_id", "away_team", "hmm_state_label", "minute_index"]].copy()
        away_regimes = away_regimes.rename(columns={"away_team": "team"})
        away_regimes["is_home"] = False

        all_regimes = pd.concat([home_regimes, away_regimes], ignore_index=True)

        # Count regime minutes by team
        regime_counts = all_regimes.groupby(["team", "hmm_state_label"]).size().unstack(fill_value=0)

        # Calculate percentages
        regime_pcts = regime_counts.div(regime_counts.sum(axis=1), axis=0) * 100
        regime_pcts.columns = [f"pct_{col}" for col in regime_pcts.columns]

        # Combine counts and percentages
        regime_counts.columns = [f"mins_{col}" for col in regime_counts.columns]
        team_regimes = regime_counts.join(regime_pcts)

        # Add total minutes
        team_regimes["total_minutes"] = regime_counts.sum(axis=1)

        # Determine dominant regime
        regime_cols = [c for c in regime_pcts.columns if c.startswith("pct_")]
        team_regimes["dominant_regime"] = regime_pcts[regime_cols].idxmax(axis=1).str.replace("pct_", "")

        return team_regimes.reset_index().sort_values("total_minutes", ascending=False)

    def get_over_under_tendencies(self, actual_totals: Dict[str, float] = None) -> pd.DataFrame:
        """
        Analyze over/under tendencies by team

        Args:
            actual_totals: Optional dict of game_id -> actual final total
        """
        if "home_team" not in self.projections.columns:
            return pd.DataFrame()

        game_summaries = self.get_game_summaries()

        # Calculate projection accuracy if we have actual totals
        if actual_totals:
            game_summaries["actual_total"] = game_summaries["game_id"].map(actual_totals)
            game_summaries["proj_error"] = game_summaries["projected_total"] - game_summaries["actual_total"]
            game_summaries["went_over"] = game_summaries["actual_total"] > game_summaries["projected_total"]
        else:
            # Use late-game trend as proxy
            game_summaries["proj_trend"] = game_summaries["projection_change"]

        # Aggregate by team
        results = []

        for team_col in ["home_team", "away_team"]:
            team_data = game_summaries.groupby(team_col).agg({
                "game_id": "count",
                "projected_total": ["mean", "std"],
                "projection_change": "mean",
                "expected_ppm": "mean",
            })
            team_data.columns = ["_".join(col).strip("_") for col in team_data.columns]
            team_data = team_data.rename(columns={
                "game_id_count": "games",
                "projected_total_mean": "avg_projection",
                "projected_total_std": "projection_volatility",
                "projection_change_mean": "avg_proj_change",
                "expected_ppm_mean": "avg_ppm",
            })

            team_data["role"] = "home" if team_col == "home_team" else "away"
            team_data.index.name = "team"
            results.append(team_data.reset_index())

        combined = pd.concat(results, ignore_index=True)

        # Pivot to get home/away side by side
        team_ou = combined.pivot_table(
            index="team",
            columns="role",
            values=["games", "avg_projection", "avg_ppm", "projection_volatility"],
            aggfunc="first"
        )
        team_ou.columns = [f"{col[0]}_{col[1]}" for col in team_ou.columns]
        team_ou = team_ou.reset_index()

        # Calculate combined metrics
        team_ou["total_games"] = team_ou.get("games_home", 0).fillna(0) + team_ou.get("games_away", 0).fillna(0)
        team_ou = team_ou[team_ou["total_games"] > 0]

        return team_ou.sort_values("total_games", ascending=False)

    def get_pace_analysis(self) -> pd.DataFrame:
        """Analyze team pace tendencies based on regime detection"""
        regime_profiles = self.get_team_regime_profiles()

        if regime_profiles.empty:
            return pd.DataFrame()

        # Calculate pace score (weighted by regime)
        # Higher = faster pace
        pace_weights = {
            "pct_Slow": -1,
            "pct_Normal": 0,
            "pct_Fast": 1,
            "pct_Foul/Endgame": 0.5,  # Often fast due to intentional fouls
        }

        regime_profiles["pace_score"] = 0
        for col, weight in pace_weights.items():
            if col in regime_profiles.columns:
                regime_profiles["pace_score"] += regime_profiles[col] * weight

        # Classify pace
        regime_profiles["pace_category"] = pd.cut(
            regime_profiles["pace_score"],
            bins=[-np.inf, -20, -5, 5, 20, np.inf],
            labels=["Very Slow", "Slow", "Average", "Fast", "Very Fast"]
        )

        return regime_profiles[["team", "total_minutes", "dominant_regime", "pace_score", "pace_category"]].sort_values("pace_score")

    def generate_full_report(self, output_dir: str = None) -> Dict[str, pd.DataFrame]:
        """
        Generate all team breakdown reports

        Args:
            output_dir: Optional directory to save CSVs

        Returns:
            Dict of report name -> DataFrame
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        reports = {
            "team_stats": self.get_team_stats(),
            "team_regimes": self.get_team_regime_profiles(),
            "team_ou_tendencies": self.get_over_under_tendencies(),
            "team_pace": self.get_pace_analysis(),
            "game_summaries": self.get_game_summaries(),
        }

        if output_dir:
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)

            for name, df in reports.items():
                if not df.empty:
                    filepath = output_path / f"{name}_{timestamp}.csv"
                    df.to_csv(filepath, index=False)
                    logger.info(f"Saved {name} to {filepath}")

        return reports

    def print_summary(self):
        """Print team breakdown summary to console"""
        print("\n" + "=" * 80)
        print("TEAM-BY-TEAM BREAKDOWN SUMMARY")
        print("=" * 80)

        team_stats = self.get_team_stats()
        if not team_stats.empty:
            print("\n📊 TOP TEAMS BY GAMES PLAYED:")
            print("-" * 60)
            for _, row in team_stats.head(15).iterrows():
                print(f"  {row['team']:<35} {int(row['total_games']):>3} games | "
                      f"Avg PJ: {row['avg_proj_total']:>6.1f} | "
                      f"PPM: {row['avg_ppm']:>4.2f}")

        pace_analysis = self.get_pace_analysis()
        if not pace_analysis.empty:
            print("\n🏃 PACE ANALYSIS:")
            print("-" * 60)

            fastest = pace_analysis.nlargest(5, "pace_score")
            print("\n  FASTEST PACE:")
            for _, row in fastest.iterrows():
                print(f"    {row['team']:<35} Score: {row['pace_score']:>6.1f} ({row['pace_category']})")

            slowest = pace_analysis.nsmallest(5, "pace_score")
            print("\n  SLOWEST PACE:")
            for _, row in slowest.iterrows():
                print(f"    {row['team']:<35} Score: {row['pace_score']:>6.1f} ({row['pace_category']})")

        regime_profiles = self.get_team_regime_profiles()
        if not regime_profiles.empty:
            print("\n🎯 DOMINANT REGIMES:")
            print("-" * 60)

            for regime in regime_profiles["dominant_regime"].unique():
                teams_in_regime = regime_profiles[regime_profiles["dominant_regime"] == regime]
                if len(teams_in_regime) > 0:
                    print(f"\n  {regime.upper()} ({len(teams_in_regime)} teams):")
                    for _, row in teams_in_regime.head(5).iterrows():
                        pct_col = f"pct_{regime}"
                        pct = row.get(pct_col, 0)
                        print(f"    {row['team']:<35} {pct:>5.1f}% of minutes")

        print("\n" + "=" * 80)


def run_team_breakdown(
    projections_csv: str,
    pbp_csv: str = None,
    output_dir: str = None
):
    """
    Run team breakdown analysis

    Args:
        projections_csv: Path to pj_results CSV
        pbp_csv: Path to original minute bins CSV (with team names)
        output_dir: Where to save reports
    """
    logger.info(f"Loading projections from {projections_csv}")
    projections = pd.read_csv(projections_csv)

    pbp = None
    if pbp_csv:
        logger.info(f"Loading PBP from {pbp_csv}")
        pbp = pd.read_csv(pbp_csv)

    analyzer = TeamBreakdownAnalyzer(projections, pbp)
    analyzer.print_summary()

    if output_dir:
        reports = analyzer.generate_full_report(output_dir)
        logger.info(f"Saved {len(reports)} reports to {output_dir}")

    return analyzer


if __name__ == "__main__":
    import click

    @click.command()
    @click.option("--projections", "-p", required=True, help="Path to pj_results CSV")
    @click.option("--pbp", "-b", default=None, help="Path to minute bins CSV with team names")
    @click.option("--output", "-o", default="outputs", help="Output directory for reports")
    def main(projections, pbp, output):
        """Generate team-by-team breakdown from PJ model results"""
        logger.remove()
        logger.add(sys.stderr, level="INFO")

        run_team_breakdown(projections, pbp, output)

    main()

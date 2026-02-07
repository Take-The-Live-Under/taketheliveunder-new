#!/usr/bin/env python3
"""
Full Pipeline: Fetch PBP → Run HMM/Kalman → Team Breakdown
"""

import sys
import click
from pathlib import Path
from datetime import datetime
from loguru import logger

sys.path.insert(0, str(Path(__file__).parent.parent))

import config
from src.fetch_pbp import ESPNPlayByPlayFetcher
from src.pj_engine import get_pj_engine
from src.output_handler import get_output_handler
from src.team_breakdown import TeamBreakdownAnalyzer
import pandas as pd


def setup_logging(verbose: bool = False):
    """Configure logging"""
    logger.remove()
    level = "DEBUG" if verbose else "INFO"
    logger.add(
        sys.stderr,
        level=level,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        colorize=True
    )


@click.command()
@click.option(
    "--historical", "-h",
    default=None,
    type=click.Path(exists=True),
    help="Path to historical games CSV (with game_id column)"
)
@click.option(
    "--pbp", "-p",
    default=None,
    type=click.Path(exists=True),
    help="Path to existing minute bins CSV (skip fetching)"
)
@click.option(
    "--max-games", "-n",
    default=50,
    type=int,
    help="Maximum games to fetch (default: 50)"
)
@click.option(
    "--k-states", "-k",
    default=4,
    type=int,
    help="Number of HMM states (default: 4)"
)
@click.option(
    "--outdir", "-o",
    default="outputs",
    type=click.Path(),
    help="Output directory"
)
@click.option(
    "--delay", "-d",
    default=0.3,
    type=float,
    help="Delay between ESPN requests (seconds)"
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    help="Enable verbose logging"
)
def main(historical, pbp, max_games, k_states, outdir, delay, verbose):
    """
    Run full PJ pipeline: Fetch PBP data, fit HMM/Kalman model, generate team breakdowns.

    Examples:
        # Fetch fresh data from ESPN and run analysis
        python src/run_full_pipeline.py -h ../data/historical_games/games_2025_processed.csv -n 50

        # Use existing PBP data
        python src/run_full_pipeline.py -p data/pbp_minute_bins.csv

        # More games, more HMM states
        python src/run_full_pipeline.py -h games.csv -n 100 -k 5
    """
    setup_logging(verbose)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    output_path = Path(outdir)
    output_path.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 70)
    logger.info("HMM + KALMAN FILTER PJ MODEL - FULL PIPELINE")
    logger.info("=" * 70)

    # =========================================================================
    # STEP 1: Get or fetch PBP data
    # =========================================================================
    if pbp:
        logger.info(f"STEP 1: Loading existing PBP data from {pbp}")
        pbp_df = pd.read_csv(pbp)
        pbp_path = pbp
    elif historical:
        logger.info(f"STEP 1: Fetching PBP data from ESPN ({max_games} games max)")

        # Load historical games
        hist_df = pd.read_csv(historical)
        game_ids = hist_df["game_id"].astype(str).unique().tolist()[:max_games]
        logger.info(f"  Found {len(game_ids)} games to fetch")

        # Fetch PBP
        fetcher = ESPNPlayByPlayFetcher()
        pbp_df = fetcher.fetch_games_pbp(game_ids, delay=delay)

        if pbp_df.empty:
            logger.error("Failed to fetch any PBP data!")
            return 1

        # Save PBP
        pbp_path = output_path / f"pbp_minute_bins_{timestamp}.csv"
        pbp_df.to_csv(pbp_path, index=False)
        logger.info(f"  Saved PBP data to {pbp_path}")
    else:
        logger.error("Must provide either --historical or --pbp")
        return 1

    logger.info(f"  Loaded {len(pbp_df)} minute bins from {pbp_df['game_id'].nunique()} games")

    # Verify required columns
    required = ["game_id", "minute_index", "points_home", "points_away",
                "poss_home", "poss_away", "fouls_home", "fouls_away",
                "to_home", "to_away"]
    missing = [c for c in required if c not in pbp_df.columns]
    if missing:
        logger.error(f"Missing required columns: {missing}")
        return 1

    # =========================================================================
    # STEP 2: Run HMM + Kalman model
    # =========================================================================
    logger.info(f"\nSTEP 2: Running HMM/Kalman model (k={k_states})")

    # Save to temp location for model input
    model_input_path = output_path / "model_input.csv"

    # The model expects specific columns - keep only those
    model_cols = ["game_id", "minute_index", "points_home", "points_away",
                  "poss_home", "poss_away", "fouls_home", "fouls_away",
                  "to_home", "to_away"]
    pbp_model = pbp_df[model_cols].copy()
    pbp_model.to_csv(model_input_path, index=False)

    # Run model
    engine = get_pj_engine(n_states=k_states)
    engine.load_data(str(model_input_path))
    engine.fit_hmm()

    state_profiles = engine.get_state_profiles_summary()
    logger.info(f"  Fitted {k_states} HMM states:")
    for _, row in state_profiles.iterrows():
        logger.info(f"    State {int(row['state_id'])}: {row['label']}")

    projections = engine.generate_projections()
    logger.info(f"  Generated {len(projections)} projection rows")

    # Save projections
    proj_path = output_path / f"pj_results_{timestamp}.csv"
    projections.to_csv(proj_path, index=False)

    state_path = output_path / f"state_profiles_{timestamp}.csv"
    state_profiles.to_csv(state_path, index=False)

    logger.info(f"  Saved projections to {proj_path}")

    # =========================================================================
    # STEP 3: Team breakdown analysis
    # =========================================================================
    logger.info(f"\nSTEP 3: Generating team-by-team breakdown")

    analyzer = TeamBreakdownAnalyzer(projections, pbp_df)
    reports = analyzer.generate_full_report(str(output_path))

    # =========================================================================
    # STEP 4: Print summary
    # =========================================================================
    analyzer.print_summary()

    # =========================================================================
    # Final summary
    # =========================================================================
    logger.info("\n" + "=" * 70)
    logger.info("PIPELINE COMPLETE")
    logger.info("=" * 70)
    logger.info(f"\nOutput files in {output_path}:")
    for f in sorted(output_path.glob(f"*_{timestamp}*")):
        size_kb = f.stat().st_size / 1024
        logger.info(f"  {f.name} ({size_kb:.1f} KB)")

    # Print key insights
    team_stats = reports.get("team_stats")
    if team_stats is not None and not team_stats.empty:
        logger.info(f"\n📊 Analyzed {len(team_stats)} unique teams")

        high_ppm = team_stats.nlargest(3, "avg_ppm")
        logger.info("\n🔥 Highest PPM teams (favor OVER):")
        for _, row in high_ppm.iterrows():
            logger.info(f"   {row['team']}: {row['avg_ppm']:.2f} PPM ({int(row['total_games'])} games)")

        low_ppm = team_stats.nsmallest(3, "avg_ppm")
        logger.info("\n❄️  Lowest PPM teams (favor UNDER):")
        for _, row in low_ppm.iterrows():
            logger.info(f"   {row['team']}: {row['avg_ppm']:.2f} PPM ({int(row['total_games'])} games)")

    return 0


if __name__ == "__main__":
    sys.exit(main())

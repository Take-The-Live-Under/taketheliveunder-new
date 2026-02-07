#!/usr/bin/env python3
"""
HMM + Kalman Filter PJ Model CLI
Generates projected totals for NCAA basketball games using play-by-play data
"""

import sys
import click
from pathlib import Path
from loguru import logger

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import config
from src.pj_engine import get_pj_engine
from src.output_handler import get_output_handler


def setup_logging(verbose: bool = False):
    """Configure loguru logging"""
    logger.remove()  # Remove default handler

    level = "DEBUG" if verbose else config.LOG_CONFIG["level"]
    log_format = config.LOG_CONFIG["format"]

    # Console handler
    logger.add(
        sys.stderr,
        level=level,
        format=log_format,
        colorize=True
    )

    # File handler
    log_file = config.OUTPUT_DIR / "pj_model.log"
    logger.add(
        log_file,
        level="DEBUG",
        format=log_format,
        rotation=config.LOG_CONFIG["rotation"],
        retention=config.LOG_CONFIG["retention"]
    )


@click.command()
@click.option(
    '--input', '-i',
    'input_path',
    required=True,
    type=click.Path(exists=True),
    help='Path to input CSV file (play-by-play minute bins)'
)
@click.option(
    '--k_states', '-k',
    default=4,
    type=int,
    help='Number of HMM states (default: 4)'
)
@click.option(
    '--outdir', '-o',
    default=None,
    type=click.Path(),
    help='Output directory (default: outputs/)'
)
@click.option(
    '--verbose', '-v',
    is_flag=True,
    help='Enable verbose logging'
)
@click.option(
    '--dry-run',
    is_flag=True,
    help='Load and validate data without generating projections'
)
def main(input_path: str, k_states: int, outdir: str, verbose: bool, dry_run: bool):
    """
    Generate projected totals using HMM + Kalman Filter model.

    This model:
    1. Loads play-by-play minute bin data
    2. Fits a Gaussian HMM to detect game pace regimes
    3. Applies adaptive Kalman filters to smooth metrics
    4. Generates per-minute projected totals

    Example:
        python src/run_pj.py --input data/pbp_minute_bins.csv --k_states 4
    """
    setup_logging(verbose)

    logger.info("=" * 60)
    logger.info("HMM + KALMAN FILTER PJ MODEL")
    logger.info("=" * 60)
    logger.info(f"Input: {input_path}")
    logger.info(f"HMM States: {k_states}")
    logger.info(f"Output Dir: {outdir or 'outputs/'}")

    try:
        # Initialize engine
        engine = get_pj_engine(n_states=k_states)

        # Load and preprocess data
        logger.info("Step 1: Loading data...")
        data = engine.load_data(input_path)
        logger.info(f"  Loaded {len(data)} rows from {data['game_id'].nunique()} games")

        if dry_run:
            logger.info("Dry run complete. Data validated successfully.")
            logger.info(f"  Columns: {list(data.columns)}")
            logger.info(f"  Sample game IDs: {list(data['game_id'].unique()[:5])}")
            return 0

        # Fit HMM
        logger.info("Step 2: Fitting HMM...")
        engine.fit_hmm()
        state_profiles = engine.get_state_profiles_summary()
        logger.info(f"  Fitted {k_states} states:")
        for _, row in state_profiles.iterrows():
            logger.info(f"    State {int(row['state_id'])}: {row['label']}")

        # Generate projections
        logger.info("Step 3: Generating projections...")
        projections = engine.generate_projections()
        logger.info(f"  Generated {len(projections)} projection rows")

        # Save outputs
        logger.info("Step 4: Saving outputs...")
        output_handler = get_output_handler(outdir)
        proj_path, state_path, summary_path = output_handler.save_all(
            projections,
            state_profiles
        )

        logger.info("")
        logger.info("=" * 60)
        logger.info("COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Projections: {proj_path}")
        logger.info(f"State Profiles: {state_path}")
        logger.info(f"Summary Report: {summary_path}")

        # Print final projection summary
        final_projs = engine.get_final_projections()
        logger.info("")
        logger.info("FINAL PROJECTIONS SUMMARY:")
        logger.info("-" * 40)
        for _, row in final_projs.head(10).iterrows():
            logger.info(
                f"  Game {row['game_id']}: {row['projected_total']:.1f} "
                f"(at minute {row['projection_at_minute']}, "
                f"state: {row['hmm_state_label']})"
            )

        if len(final_projs) > 10:
            logger.info(f"  ... and {len(final_projs) - 10} more games")

        return 0

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        return 1

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return 1

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
NCAA Basketball Referee Foul Tendency Analyzer
Main orchestration script for collecting and analyzing referee statistics
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.referee_fetcher import get_referee_fetcher
from utils.referee_processor import get_referee_processor
from utils.excel_exporter import get_excel_exporter
import config


# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(config.LOG_DIR / 'referee_analyzer.log')
    ]
)

logger = logging.getLogger(__name__)


def main():
    """Main execution function"""
    logger.info("=" * 80)
    logger.info("NCAA Basketball Referee Foul Tendency Analyzer")
    logger.info("=" * 80)

    try:
        # Step 1: Fetch game data
        logger.info("Step 1: Fetching game data from ESPN API...")
        fetcher = get_referee_fetcher()

        season_start = getattr(config, 'REFEREE_SEASON_START', datetime(2024, 11, 1))
        games = fetcher.fetch_season_games(season_start)

        if not games:
            logger.error("No games found. Check your date range and ESPN API availability.")
            return

        logger.info(f"✓ Fetched {len(games)} completed games")

        # Step 2: Process referee statistics
        logger.info("\nStep 2: Processing referee statistics...")
        processor = get_referee_processor(
            min_games=getattr(config, 'REFEREE_MIN_GAMES', 5),
            close_game_margin=getattr(config, 'CLOSE_GAME_MARGIN', 10),
            high_foul_threshold=getattr(config, 'HIGH_FOUL_THRESHOLD', 40)
        )

        analysis_data = processor.process_games(games)

        referee_stats = analysis_data["referee_stats"]
        game_logs = analysis_data["game_logs"]
        summary = analysis_data["summary"]

        if referee_stats.empty:
            logger.error("No referees met the minimum games threshold.")
            return

        logger.info(f"✓ Analyzed {len(referee_stats)} referees")

        # Step 3: Generate Excel report
        logger.info("\nStep 3: Generating Excel report...")

        # Create output filename with date
        output_filename = f"referee_analysis_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        output_path = config.DATA_DIR / output_filename

        exporter = get_excel_exporter(str(output_path))
        exporter.export(analysis_data)

        logger.info(f"✓ Excel report generated: {output_path}")

        # Step 4: Print summary to console
        print("\n" + "=" * 80)
        print("REFEREE ANALYSIS SUMMARY")
        print("=" * 80)

        print(f"\nTotal Games Analyzed: {summary['total_games_analyzed']}")
        print(f"Total Referees (≥{getattr(config, 'REFEREE_MIN_GAMES', 5)} games): {summary['total_referees']}")
        print(f"Average Fouls Per Game: {summary['avg_fouls_per_game']}")
        print(f"Overall Home Team Avg: {summary['overall_home_avg']}")
        print(f"Overall Away Team Avg: {summary['overall_away_avg']}")

        print(f"\n{'Highest Average Fouls Referee:'}")
        print(f"  {summary['highest_avg_referee']}: {summary['highest_avg_fouls']} fouls/game")

        print(f"\n{'Lowest Average Fouls Referee:'}")
        print(f"  {summary['lowest_avg_referee']}: {summary['lowest_avg_fouls']} fouls/game")

        print(f"\nClose Games: {summary['close_games_pct']}%")
        print(f"Overtime Games: {summary['ot_games_pct']}%")

        print("\n" + "-" * 80)
        print("Top 10 Referees by Average Fouls Per Game:")
        print("-" * 80)
        print(f"{'Rank':<6} {'Referee':<30} {'Avg Fouls':<12} {'Games':<8}")
        print("-" * 80)

        for idx, (_, row) in enumerate(referee_stats.head(10).iterrows(), start=1):
            print(f"{idx:<6} {row['referee']:<30} {row['avg_total_fouls']:<12.2f} {row['total_games']:<8}")

        print("\n" + "-" * 80)
        print("Top 10 Referees with Home/Away Bias:")
        print("-" * 80)
        print(f"{'Rank':<6} {'Referee':<30} {'Bias':<12} {'Interpretation':<20}")
        print("-" * 80)

        # Sort by absolute bias
        biased_refs = referee_stats.copy()
        biased_refs['abs_bias'] = biased_refs['home_away_bias'].abs()
        biased_refs = biased_refs.sort_values('abs_bias', ascending=False)

        for idx, (_, row) in enumerate(biased_refs.head(10).iterrows(), start=1):
            bias = row['home_away_bias']
            interpretation = "Favors Home" if bias > 0 else "Favors Away"
            print(f"{idx:<6} {row['referee']:<30} {bias:<12.2f} {interpretation:<20}")

        print("\n" + "=" * 80)
        print(f"Excel report saved to: {output_path}")
        print("=" * 80)

        logger.info("\n✓ Analysis complete!")

    except Exception as e:
        logger.error(f"Error during analysis: {e}", exc_info=True)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())

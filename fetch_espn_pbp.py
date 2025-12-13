"""
Fetch NCAA Men's Basketball play-by-play data from ESPN via SportsDataverse
Saves to: data play by play 2025/espn/
"""
import pandas as pd
from sportsdataverse.mbb import espn_mbb_schedule, espn_mbb_pbp
from tqdm import tqdm
import time
from pathlib import Path
from loguru import logger
import json

# Configure output directory
OUTPUT_DIR = Path("data play by play 2025/espn")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Configure season
SEASON = 2025  # 2024-2025 season
SEASON_TYPE = 2  # Regular season (1=preseason, 2=regular, 3=postseason)

logger.info(f"Fetching NCAA MBB play-by-play data for {SEASON} season")

def fetch_schedule(season: int, season_type: int):
    """Fetch game schedule for the season"""
    logger.info(f"Fetching schedule for season {season}, type {season_type}")

    try:
        # Get schedule - this returns all games for the season (Polars DataFrame)
        schedule = espn_mbb_schedule(dates=season, season_type=season_type)

        if schedule is None or len(schedule) == 0:
            logger.warning("No games found in schedule")
            return pd.DataFrame()

        logger.info(f"Found {len(schedule)} games in schedule")

        # Convert Polars to Pandas
        schedule_df = schedule.to_pandas()

        # Save schedule
        schedule_file = OUTPUT_DIR / f"schedule_{season}_type{season_type}.parquet"
        schedule_df.to_parquet(schedule_file)
        logger.info(f"Saved schedule to {schedule_file}")

        return schedule_df

    except Exception as e:
        logger.error(f"Error fetching schedule: {e}")
        return pd.DataFrame()

def fetch_game_pbp(game_id: str) -> pd.DataFrame:
    """Fetch play-by-play data for a single game"""
    try:
        pbp = espn_mbb_pbp(game_id=game_id)

        if pbp is not None:
            # ESPN returns a dict with 'plays' key containing the actual play-by-play data
            if isinstance(pbp, dict):
                plays = pbp.get('plays', [])
                if plays and len(plays) > 0:
                    pbp_df = pd.DataFrame(plays)
                    pbp_df['game_id'] = game_id
                    return pbp_df
            # Handle Polars DataFrame if structure changes
            elif hasattr(pbp, 'to_pandas'):
                pbp_df = pbp.to_pandas()
                pbp_df['game_id'] = game_id
                return pbp_df
            # Handle pandas DataFrame
            elif isinstance(pbp, pd.DataFrame):
                pbp_df = pbp.copy()
                pbp_df['game_id'] = game_id
                return pbp_df

        logger.debug(f"No PBP data for game {game_id}")
        return pd.DataFrame()

    except Exception as e:
        logger.debug(f"Error fetching PBP for game {game_id}: {e}")
        return pd.DataFrame()

def fetch_all_pbp(schedule: pd.DataFrame, batch_size: int = 100):
    """Fetch play-by-play for all games in schedule"""

    if 'game_id' not in schedule.columns and 'id' in schedule.columns:
        schedule['game_id'] = schedule['id']

    game_ids = schedule['game_id'].unique()
    logger.info(f"Fetching PBP for {len(game_ids)} games")

    all_pbp = []
    failed_games = []

    # Process in batches to save incrementally
    for i in range(0, len(game_ids), batch_size):
        batch_ids = game_ids[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(game_ids) + batch_size - 1) // batch_size

        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch_ids)} games)")

        batch_pbp = []

        for game_id in tqdm(batch_ids, desc=f"Batch {batch_num}"):
            pbp = fetch_game_pbp(str(game_id))

            if len(pbp) > 0:
                batch_pbp.append(pbp)
            else:
                failed_games.append(game_id)

            # Rate limiting - be nice to ESPN
            time.sleep(0.5)

        # Save batch
        if batch_pbp:
            batch_df = pd.concat(batch_pbp, ignore_index=True)
            batch_file = OUTPUT_DIR / f"pbp_batch_{batch_num}.parquet"
            batch_df.to_parquet(batch_file)
            logger.info(f"Saved batch {batch_num} ({len(batch_df)} plays) to {batch_file}")

            all_pbp.append(batch_df)

    # Combine all batches
    if all_pbp:
        full_pbp = pd.concat(all_pbp, ignore_index=True)

        # Save complete dataset
        output_file = OUTPUT_DIR / f"ncaa_mbb_pbp_{SEASON}_complete.parquet"
        full_pbp.to_parquet(output_file)
        logger.info(f"Saved complete PBP dataset: {output_file}")

        # Also save as CSV for easy viewing
        csv_file = OUTPUT_DIR / f"ncaa_mbb_pbp_{SEASON}_complete.csv"
        full_pbp.to_csv(csv_file, index=False)
        logger.info(f"Saved CSV: {csv_file}")

        # Save summary stats
        summary = {
            'total_games': len(full_pbp['game_id'].unique()),
            'total_plays': len(full_pbp),
            'failed_games': len(failed_games),
            'columns': list(full_pbp.columns),
            'date_range': [
                str(full_pbp['game_date'].min()) if 'game_date' in full_pbp.columns else 'N/A',
                str(full_pbp['game_date'].max()) if 'game_date' in full_pbp.columns else 'N/A'
            ]
        }

        summary_file = OUTPUT_DIR / "summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)

        logger.info(f"\n=== SUMMARY ===")
        logger.info(f"Total games with PBP: {summary['total_games']}")
        logger.info(f"Total plays: {summary['total_plays']}")
        logger.info(f"Failed games: {summary['failed_games']}")

        return full_pbp
    else:
        logger.warning("No play-by-play data collected")
        return pd.DataFrame()

if __name__ == "__main__":
    logger.info("="*70)
    logger.info("ESPN Play-by-Play Data Fetcher (via SportsDataverse)")
    logger.info("="*70)

    # Step 1: Fetch schedule
    schedule = fetch_schedule(SEASON, SEASON_TYPE)

    if len(schedule) == 0:
        logger.error("Could not fetch schedule. Exiting.")
        exit(1)

    # Step 2: Fetch play-by-play for all games
    pbp_data = fetch_all_pbp(schedule, batch_size=100)

    logger.info("="*70)
    logger.info("ESPN PBP fetch complete!")
    logger.info(f"Data saved to: {OUTPUT_DIR}")
    logger.info("="*70)

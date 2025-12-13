"""
Fetch NCAA Men's Basketball play-by-play data from NCAA.com API
Using henrygd/ncaa-api wrapper: https://ncaa-api.henrygd.me
Saves to: data play by play 2025/ncaa/
"""
import requests
import pandas as pd
from tqdm import tqdm
import time
from pathlib import Path
from loguru import logger
import json
from datetime import datetime, timedelta

# Configure output directory
OUTPUT_DIR = Path("data play by play 2025/ncaa")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# NCAA API base URL (public instance)
BASE_URL = "https://ncaa-api.henrygd.me"

# Rate limit: 5 requests/sec
RATE_LIMIT_DELAY = 0.25  # 250ms between requests = 4 req/sec to be safe

# Season configuration
SPORT_ID = "MBB"  # Men's Basketball
DIVISION = "1"  # Division I
SEASON = "2025"  # 2024-2025 season

logger.info(f"Fetching NCAA MBB play-by-play data via NCAA.com API")

def fetch_scoreboard(date: str = None):
    """
    Fetch scoreboard/games for a specific date or range

    Args:
        date: Date in YYYY-MM-DD format, defaults to today
    """
    try:
        # If no date provided, use current date
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        url = f"{BASE_URL}/scoreboard/{SPORT_ID}/{DIVISION}"
        params = {"date": date}

        logger.info(f"Fetching scoreboard for {date}")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()

        games = data.get("games", [])
        logger.info(f"Found {len(games)} games on {date}")

        time.sleep(RATE_LIMIT_DELAY)
        return games

    except Exception as e:
        logger.error(f"Error fetching scoreboard for {date}: {e}")
        return []

def fetch_season_schedule(start_date: str, end_date: str):
    """
    Fetch all games for a date range

    Args:
        start_date: Start date YYYY-MM-DD
        end_date: End date YYYY-MM-DD
    """
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    all_games = []
    current = start

    logger.info(f"Fetching schedule from {start_date} to {end_date}")

    # Iterate through each day
    pbar = tqdm(total=(end - start).days + 1, desc="Fetching schedule")

    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        games = fetch_scoreboard(date_str)

        for game in games:
            game['schedule_date'] = date_str
            all_games.append(game)

        current += timedelta(days=1)
        pbar.update(1)

    pbar.close()

    logger.info(f"Total games found: {len(all_games)}")

    # Save schedule
    schedule_df = pd.DataFrame(all_games)
    schedule_file = OUTPUT_DIR / f"schedule_{SEASON}.parquet"
    schedule_df.to_parquet(schedule_file)
    logger.info(f"Saved schedule to {schedule_file}")

    return all_games

def fetch_game_pbp(game_id: str):
    """Fetch play-by-play data for a specific game"""
    try:
        url = f"{BASE_URL}/game/{SPORT_ID}/{game_id}/pbp"

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        data = response.json()

        time.sleep(RATE_LIMIT_DELAY)

        return data

    except Exception as e:
        logger.debug(f"Error fetching PBP for game {game_id}: {e}")
        return None

def parse_pbp_to_dataframe(pbp_data: dict, game_id: str):
    """Convert PBP JSON to DataFrame"""
    try:
        plays = []

        # NCAA API structure varies, adapt as needed
        if 'plays' in pbp_data:
            for play in pbp_data['plays']:
                play['game_id'] = game_id
                plays.append(play)
        elif 'periods' in pbp_data:
            # Handle period-based structure
            for period in pbp_data.get('periods', []):
                for play in period.get('plays', []):
                    play['game_id'] = game_id
                    play['period'] = period.get('period', 0)
                    plays.append(play)

        if plays:
            return pd.DataFrame(plays)
        else:
            return pd.DataFrame()

    except Exception as e:
        logger.error(f"Error parsing PBP for game {game_id}: {e}")
        return pd.DataFrame()

def fetch_all_pbp(games: list, batch_size: int = 100):
    """Fetch play-by-play for all games"""

    logger.info(f"Fetching PBP for {len(games)} games")

    all_pbp = []
    failed_games = []

    # Extract game IDs
    game_ids = [g.get('id') or g.get('game_id') for g in games if g.get('id') or g.get('game_id')]

    # Process in batches
    for i in range(0, len(game_ids), batch_size):
        batch_ids = game_ids[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(game_ids) + batch_size - 1) // batch_size

        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch_ids)} games)")

        batch_pbp = []

        for game_id in tqdm(batch_ids, desc=f"Batch {batch_num}"):
            pbp_data = fetch_game_pbp(str(game_id))

            if pbp_data:
                pbp_df = parse_pbp_to_dataframe(pbp_data, str(game_id))

                if len(pbp_df) > 0:
                    batch_pbp.append(pbp_df)
                else:
                    failed_games.append(game_id)
            else:
                failed_games.append(game_id)

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

        # Also save as CSV
        csv_file = OUTPUT_DIR / f"ncaa_mbb_pbp_{SEASON}_complete.csv"
        full_pbp.to_csv(csv_file, index=False)
        logger.info(f"Saved CSV: {csv_file}")

        # Save summary
        summary = {
            'source': 'NCAA.com via henrygd/ncaa-api',
            'total_games': len(full_pbp['game_id'].unique()),
            'total_plays': len(full_pbp),
            'failed_games': len(failed_games),
            'columns': list(full_pbp.columns),
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
    logger.info("NCAA.com Play-by-Play Data Fetcher")
    logger.info("="*70)

    # Define season date range (adjust as needed)
    # 2024-2025 season typically runs Nov 2024 - March 2025
    START_DATE = "2024-11-01"
    END_DATE = "2025-03-31"

    # Step 1: Fetch schedule
    games = fetch_season_schedule(START_DATE, END_DATE)

    if len(games) == 0:
        logger.error("Could not fetch games schedule. Exiting.")
        exit(1)

    # Step 2: Fetch play-by-play for all games
    pbp_data = fetch_all_pbp(games, batch_size=100)

    logger.info("="*70)
    logger.info("NCAA PBP fetch complete!")
    logger.info(f"Data saved to: {OUTPUT_DIR}")
    logger.info("="*70)

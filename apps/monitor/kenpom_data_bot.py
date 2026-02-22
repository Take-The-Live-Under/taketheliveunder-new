#!/usr/bin/env python3
"""
KenPom Data Collection Bot

Automated script that:
1. Fetches data from KenPom API
2. Cleans and validates the data
3. Saves with date stamp for historical tracking

Can be run manually or scheduled via cron/Task Scheduler.
"""

import os
import sys
import time
import requests
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Any, List
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ============================================================================
# CONFIGURATION
# ============================================================================

# KenPom API credentials
KENPOM_EMAIL = os.getenv("KENPOM_EMAIL", "brookssawyer@gmail.com")
KENPOM_PASSWORD = os.getenv("KENPOM_PASSWORD", "")

# Use kenpompy library for reliable KenPom scraping
# Note: KenPom blocks automated access with Cloudflare, so defaulting to ESPN
USE_KENPOMPY = False

# Output directory
OUTPUT_DIR = Path(__file__).parent / "data" / "kenpom_historical"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Log directory
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Current season
CURRENT_SEASON = 2025

# Request timeout
REQUEST_TIMEOUT = 30


# ============================================================================
# LOGGING
# ============================================================================

class Logger:
    """Simple logger that writes to both console and file."""

    def __init__(self, log_file: Path):
        self.log_file = log_file

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)

        with open(self.log_file, 'a') as f:
            f.write(log_message + "\n")


# ============================================================================
# DATA FETCHING
# ============================================================================

def fetch_kenpom_data_kenpompy(logger: Logger) -> Optional[pd.DataFrame]:
    """
    Fetch KenPom data using the kenpompy library.

    This is the recommended method as it handles authentication and scraping reliably.
    """
    try:
        import kenpompy.utils as kp

        logger.log("Connecting to KenPom with kenpompy...")

        # Login to KenPom
        browser = kp.login(KENPOM_EMAIL, KENPOM_PASSWORD)

        logger.log("Fetching efficiency data...")
        efficiency_df = kp.get_pomeroy_ratings(browser, season=str(CURRENT_SEASON))

        logger.log("Fetching four factors...")
        fourfactors_df = kp.get_fourfactors(browser, season=str(CURRENT_SEASON))

        logger.log("Fetching team stats...")
        team_stats_df = kp.get_teamstats(browser, season=str(CURRENT_SEASON))

        logger.log("Fetching height data...")
        try:
            height_df = kp.get_height(browser, season=str(CURRENT_SEASON))
        except:
            logger.log("Height data not available, skipping...", "WARNING")
            height_df = None

        # Close browser
        browser.close()

        # Merge all data
        logger.log("Merging all datasets...")
        merged = efficiency_df.copy()

        # Clean team names for joining
        for df in [merged, fourfactors_df, team_stats_df]:
            if 'Team' in df.columns:
                df['Team'] = df['Team'].str.strip()

        # Merge four factors
        merged = merged.merge(
            fourfactors_df,
            on='Team',
            how='left',
            suffixes=('', '_ff')
        )

        # Merge team stats
        merged = merged.merge(
            team_stats_df,
            on='Team',
            how='left',
            suffixes=('', '_ts')
        )

        # Merge height if available
        if height_df is not None and 'Team' in height_df.columns:
            height_df['Team'] = height_df['Team'].str.strip()
            merged = merged.merge(
                height_df,
                on='Team',
                how='left',
                suffixes=('', '_ht')
            )

        logger.log(f"Successfully fetched data for {len(merged)} teams")
        return merged

    except ImportError:
        logger.log("kenpompy not installed. Install with: pip install kenpompy", "ERROR")
        return None
    except Exception as e:
        logger.log(f"Error fetching KenPom data: {e}", "ERROR")
        return None


def fetch_espn_data(logger: Logger) -> Optional[pd.DataFrame]:
    """
    Fetch team data from ESPN using the existing ESPN fetcher.
    """
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from utils.team_stats_espn import get_espn_fetcher

        logger.log("Fetching data from ESPN...")
        fetcher = get_espn_fetcher()
        fetcher.fetch_team_stats()

        # ESPN fetcher saves to CSV - load that instead
        cache_dir = Path(__file__).parent / "cache"
        espn_csv_files = sorted(cache_dir.glob("espn_stats_*.csv"), reverse=True)

        if espn_csv_files:
            latest_csv = espn_csv_files[0]
            logger.log(f"Loading ESPN data from {latest_csv.name}")
            df = pd.read_csv(latest_csv)
            logger.log(f"Loaded {len(df)} teams from ESPN")
            return df
        else:
            logger.log("No ESPN CSV file found", "ERROR")
            return None

    except Exception as e:
        logger.log(f"ESPN fetch failed: {e}", "ERROR")
        import traceback
        logger.log(f"Traceback: {traceback.format_exc()}", "ERROR")
        return None


def fetch_kenpom_data_official_api(logger: Logger) -> Optional[pd.DataFrame]:
    """
    Fetch KenPom data using the official REST API

    This is now the primary method using the official KenPom API with Bearer token.
    """
    try:
        # Import the new official API client
        sys.path.insert(0, str(Path(__file__).parent))
        from kenpom_api_client import KenPomOfficialAPIClient, normalize_api_response, merge_endpoint_data

        logger.log("Connecting to KenPom Official API...")

        # API key
        api_key = "a0155e1f2bc4453f1d6943bd7ed1cf52a1ddfa35ba0df2fde24fff294d70444c"

        # Create client
        client = KenPomOfficialAPIClient(api_key, logger)

        logger.log("Fetching comprehensive team data from API...")

        # Fetch all priority endpoints
        all_data_raw = client.fetch_all_priority_endpoints(year=CURRENT_SEASON)

        if not all_data_raw:
            logger.log("No data retrieved from API", "ERROR")
            return None

        # Convert to DataFrames
        logger.log("Converting API responses to DataFrames...")
        all_data_df = {}
        for endpoint, data in all_data_raw.items():
            df = normalize_api_response(data, endpoint, logger)
            if df is not None:
                all_data_df[endpoint] = df

        if not all_data_df:
            logger.log("Failed to convert any endpoint data to DataFrame", "ERROR")
            return None

        # Merge all data
        logger.log("Merging data from multiple endpoints...")
        merged_df = merge_endpoint_data(all_data_df, logger)

        if merged_df is None or merged_df.empty:
            logger.log("Failed to merge endpoint data", "ERROR")
            return None

        logger.log(f"Successfully fetched data for {len(merged_df)} teams from official API")
        return merged_df

    except ImportError as e:
        logger.log(f"Could not import kenpom_api_client: {e}", "ERROR")
        return None
    except Exception as e:
        logger.log(f"Error fetching KenPom API data: {e}", "ERROR")
        import traceback
        logger.log(f"Traceback: {traceback.format_exc()}", "ERROR")
        return None


def fetch_kenpom_data_fallback(logger: Logger) -> Optional[pd.DataFrame]:
    """
    Fallback method using existing team_stats CSV cache or ESPN data.
    """
    try:
        # First, try ESPN data (free and reliable)
        logger.log("Trying ESPN data source...")
        df = fetch_espn_data(logger)
        if df is not None:
            if not df.empty:
                return df
            else:
                logger.log("ESPN data returned empty DataFrame", "WARNING")

        # Check for existing CSV cache
        csv_path = Path(__file__).parent / "data" / "team_stats.csv"

        if csv_path.exists():
            logger.log(f"Loading existing cache from {csv_path}")
            df = pd.read_csv(csv_path)
            logger.log(f"Loaded {len(df)} teams from CSV cache")
            return df

        # Try to load from system cache directory
        cache_path = Path(__file__).parent / "cache" / "team_stats.csv"
        if cache_path.exists():
            logger.log(f"Loading cache from {cache_path}")
            df = pd.read_csv(cache_path)
            logger.log(f"Loaded {len(df)} teams from cache directory")
            return df

        logger.log("No data source available", "ERROR")
        return None

    except Exception as e:
        logger.log(f"Fallback method failed: {e}", "ERROR")
        return None


# ============================================================================
# DATA CLEANING
# ============================================================================

def clean_kenpom_data(df: pd.DataFrame, logger: Logger) -> pd.DataFrame:
    """
    Clean and validate KenPom data.

    Steps:
    1. Remove duplicate columns
    2. Standardize column names
    3. Convert numeric columns to proper types
    4. Remove invalid/missing rows
    5. Add metadata columns
    """
    logger.log("Cleaning data...")

    # Create copy to avoid modifying original
    df_clean = df.copy()

    # 1. Remove duplicate columns (suffixed columns from merges)
    duplicate_cols = [col for col in df_clean.columns if col.endswith(('_ff', '_ts', '_ht'))]
    if duplicate_cols:
        logger.log(f"Removing {len(duplicate_cols)} duplicate columns")
        df_clean = df_clean.drop(columns=duplicate_cols, errors='ignore')

    # 2. Standardize column names (lowercase, replace spaces with underscores)
    df_clean.columns = [col.lower().replace(' ', '_').replace('.', '') for col in df_clean.columns]

    # 3. Add metadata
    df_clean['fetch_date'] = datetime.now().strftime("%Y-%m-%d")
    df_clean['fetch_timestamp'] = datetime.now().isoformat()
    df_clean['season'] = CURRENT_SEASON

    # 4. Identify numeric columns and convert
    numeric_cols = []
    for col in df_clean.columns:
        if col not in ['team', 'conf', 'fetch_date', 'fetch_timestamp']:
            try:
                df_clean[col] = pd.to_numeric(df_clean[col], errors='ignore')
                if df_clean[col].dtype in ['int64', 'float64']:
                    numeric_cols.append(col)
            except:
                pass

    logger.log(f"Converted {len(numeric_cols)} columns to numeric")

    # 5. Identify team name column (could be 'team', 'team_name', 'Team', 'teamname', or 'TeamName')
    team_col = None
    for possible_col in ['team', 'team_name', 'Team', 'teamname', 'TeamName']:
        if possible_col in df_clean.columns:
            team_col = possible_col
            break

    if team_col:
        # Rename to standard 'team' column if not already
        if team_col != 'team':
            df_clean.rename(columns={team_col: 'team'}, inplace=True)
            logger.log(f"Renamed column '{team_col}' to 'team'")
    else:
        logger.log("Warning: No team name column found", "WARNING")

    # 6. Remove rows with missing team names
    if 'team' in df_clean.columns:
        initial_rows = len(df_clean)
        df_clean = df_clean.dropna(subset=['team'])
        removed_rows = initial_rows - len(df_clean)
        if removed_rows > 0:
            logger.log(f"Removed {removed_rows} rows with missing team names", "WARNING")

        # Sort by team name
        df_clean = df_clean.sort_values('team').reset_index(drop=True)

    logger.log(f"Cleaning complete: {len(df_clean)} teams, {len(df_clean.columns)} columns")

    return df_clean


# ============================================================================
# DATA VALIDATION
# ============================================================================

def validate_data(df: pd.DataFrame, logger: Logger) -> bool:
    """
    Validate the cleaned data meets quality thresholds.

    Returns True if data is valid, False otherwise.
    """
    logger.log("Validating data...")

    # Check minimum number of teams (NCAA D1 has ~350 teams)
    if len(df) < 300:
        logger.log(f"VALIDATION FAILED: Only {len(df)} teams (expected 300+)", "ERROR")
        return False

    # Check for required columns
    required_cols = ['team']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        logger.log(f"VALIDATION FAILED: Missing columns: {missing_cols}", "ERROR")
        return False

    # Check for duplicate teams
    duplicates = df[df.duplicated(subset=['team'], keep=False)]
    if not duplicates.empty:
        logger.log(f"VALIDATION WARNING: {len(duplicates)} duplicate teams found", "WARNING")
        logger.log(f"Duplicates: {duplicates['team'].tolist()}", "WARNING")

    # Check for reasonable data ranges (if efficiency columns exist)
    if 'adjoe' in df.columns:
        if df['adjoe'].min() < 70 or df['adjoe'].max() > 130:
            logger.log("VALIDATION WARNING: AdjOE values outside expected range (70-130)", "WARNING")

    logger.log("Validation passed")
    return True


# ============================================================================
# DATA SAVING
# ============================================================================

def save_data(df: pd.DataFrame, logger: Logger) -> Dict[str, Path]:
    """
    Save data with date stamps in multiple formats.

    Returns dict with paths to saved files.
    """
    date_stamp = datetime.now().strftime("%Y-%m-%d")
    time_stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")

    saved_files = {}

    # 1. Save timestamped CSV (for historical tracking)
    csv_timestamped = OUTPUT_DIR / f"cleaned_kenpom_data_{time_stamp}.csv"
    df.to_csv(csv_timestamped, index=False)
    logger.log(f"Saved timestamped CSV: {csv_timestamped}")
    saved_files['csv_timestamped'] = csv_timestamped

    # 2. Save date-stamped CSV (latest for that day)
    csv_dated = OUTPUT_DIR / f"cleaned_kenpom_data_{date_stamp}.csv"
    df.to_csv(csv_dated, index=False)
    logger.log(f"Saved dated CSV: {csv_dated}")
    saved_files['csv_dated'] = csv_dated

    # 3. Save as "latest" (always current)
    csv_latest = OUTPUT_DIR / "cleaned_kenpom_data_latest.csv"
    df.to_csv(csv_latest, index=False)
    logger.log(f"Saved latest CSV: {csv_latest}")
    saved_files['csv_latest'] = csv_latest

    # 4. Save Excel with timestamp
    try:
        xlsx_timestamped = OUTPUT_DIR / f"cleaned_kenpom_data_{time_stamp}.xlsx"
        df.to_excel(xlsx_timestamped, index=False, engine='openpyxl')
        logger.log(f"Saved timestamped Excel: {xlsx_timestamped}")
        saved_files['xlsx_timestamped'] = xlsx_timestamped
    except Exception as e:
        logger.log(f"Could not save Excel (openpyxl may not be installed): {e}", "WARNING")

    return saved_files


def cleanup_old_files(logger: Logger, days_to_keep: int = 30):
    """
    Remove files older than specified days to prevent directory bloat.
    """
    logger.log(f"Cleaning up files older than {days_to_keep} days...")

    cutoff_time = time.time() - (days_to_keep * 86400)
    removed_count = 0

    for file_path in OUTPUT_DIR.glob("cleaned_kenpom_data_*.csv"):
        # Don't delete the "latest" file
        if file_path.name.endswith("_latest.csv"):
            continue

        if file_path.stat().st_mtime < cutoff_time:
            file_path.unlink()
            removed_count += 1
            logger.log(f"Removed old file: {file_path.name}")

    for file_path in OUTPUT_DIR.glob("cleaned_kenpom_data_*.xlsx"):
        if file_path.stat().st_mtime < cutoff_time:
            file_path.unlink()
            removed_count += 1
            logger.log(f"Removed old file: {file_path.name}")

    logger.log(f"Cleanup complete: removed {removed_count} old files")


# ============================================================================
# MAIN BOT FUNCTION
# ============================================================================

def run_bot():
    """
    Main bot execution function.
    """
    # Setup logging
    log_file = LOG_DIR / f"kenpom_bot_{datetime.now().strftime('%Y-%m-%d')}.log"
    logger = Logger(log_file)

    logger.log("="*80)
    logger.log("KenPom Data Collection Bot Started")
    logger.log("="*80)
    logger.log(f"Season: {CURRENT_SEASON}")
    logger.log(f"Output directory: {OUTPUT_DIR}")
    logger.log(f"Log file: {log_file}")
    logger.log("="*80)

    # Check credentials (only needed for KenPom)
    if USE_KENPOMPY and not KENPOM_PASSWORD:
        logger.log("ERROR: KENPOM_PASSWORD not set in environment variables", "ERROR")
        logger.log("Set it with: export KENPOM_PASSWORD='your_password'", "ERROR")
        logger.log("OR: Set USE_KENPOMPY=False to use ESPN data instead", "WARNING")
        return False

    # Fetch data
    logger.log("\n" + "="*80)
    logger.log("Step 1: Fetching KenPom data")
    logger.log("="*80)

    # Try official API first (new method)
    logger.log("Primary method: Official KenPom API")
    df_raw = fetch_kenpom_data_official_api(logger)

    # Fallback to kenpompy if API fails
    if df_raw is None or df_raw.empty:
        logger.log("Official API failed, trying kenpompy fallback...", "WARNING")
        if USE_KENPOMPY:
            df_raw = fetch_kenpom_data_kenpompy(logger)

    # Final fallback to ESPN/cache
    if df_raw is None or df_raw.empty:
        logger.log("Trying final fallback (ESPN/cache)...", "WARNING")
        df_raw = fetch_kenpom_data_fallback(logger)

    if df_raw is None or df_raw.empty:
        logger.log("FATAL: Could not fetch any data from any source", "ERROR")
        return False

    # Clean data
    logger.log("\n" + "="*80)
    logger.log("Step 2: Cleaning data")
    logger.log("="*80)

    df_clean = clean_kenpom_data(df_raw, logger)

    # Validate data
    logger.log("\n" + "="*80)
    logger.log("Step 3: Validating data")
    logger.log("="*80)

    if not validate_data(df_clean, logger):
        logger.log("Data validation failed - aborting save", "ERROR")
        return False

    # Save data
    logger.log("\n" + "="*80)
    logger.log("Step 4: Saving data")
    logger.log("="*80)

    saved_files = save_data(df_clean, logger)

    # Cleanup old files
    logger.log("\n" + "="*80)
    logger.log("Step 5: Cleanup")
    logger.log("="*80)

    cleanup_old_files(logger, days_to_keep=30)

    # Summary
    logger.log("\n" + "="*80)
    logger.log("Bot Execution Complete")
    logger.log("="*80)
    logger.log(f"Teams processed: {len(df_clean)}")
    logger.log(f"Columns: {len(df_clean.columns)}")
    logger.log(f"Files saved: {len(saved_files)}")
    logger.log("\nSaved files:")
    for file_type, file_path in saved_files.items():
        logger.log(f"  - {file_type}: {file_path}")
    logger.log("="*80)

    return True


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    success = run_bot()
    sys.exit(0 if success else 1)

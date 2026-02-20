#!/usr/bin/env python3
"""
KenPom Official API Client

Uses the official KenPom REST API with Bearer token authentication.
API Documentation: https://kenpom.com/api-documentation.php

Base URL: https://kenpom.com
Endpoint Format: /api.php?endpoint=ENDPOINT_NAME&y=YEAR
Authentication: Bearer token in Authorization header
"""

import os
import sys
import time
import requests
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ============================================================================
# CONFIGURATION
# ============================================================================

# KenPom API key (Bearer token)
KENPOM_API_KEY = "a0155e1f2bc4453f1d6943bd7ed1cf52a1ddfa35ba0df2fde24fff294d70444c"

# Official API base URL
API_BASE_URL = "https://kenpom.com"

# Available endpoints (from official documentation)
AVAILABLE_ENDPOINTS = {
    "ratings": "Core efficiency metrics (AdjEM, AdjOE, AdjDE, Tempo, SOS)",
    "four-factors": "Shooting efficiency (eFG%, TO%, OR%, FT%)",
    "misc-stats": "Additional stats (3P%, 2P%, blocks, steals, assists)",
    "height": "Physical attributes (height, experience, bench, continuity)",
    "pointdist": "Point distribution (FT%, 2P%, 3P%)",
    "archive": "Historical ratings from specific dates",
    "fanmatch": "Game predictions for specific dates"
}

# Priority endpoints to fetch for comprehensive data
PRIORITY_ENDPOINTS = [
    "ratings",       # Must have - core metrics
    "four-factors",  # Must have - shooting efficiency
    "misc-stats",    # Must have - additional stats
    "height",        # Should have - physical data
    "pointdist",     # Should have - scoring breakdown
]

# Output directory
OUTPUT_DIR = Path(__file__).parent / "data" / "kenpom_historical"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Current season
CURRENT_SEASON = 2025

# Request timeout
REQUEST_TIMEOUT = 30


# ============================================================================
# LOGGING
# ============================================================================

class Logger:
    """Simple logger"""
    def __init__(self, log_file: Path):
        self.log_file = log_file

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)
        with open(self.log_file, 'a') as f:
            f.write(log_message + "\n")


# ============================================================================
# KENPOM OFFICIAL API CLIENT
# ============================================================================

class KenPomOfficialAPIClient:
    """
    Official KenPom API Client using documented REST endpoints

    Official API Structure:
    - Base URL: https://kenpom.com
    - Endpoint format: /api.php?endpoint=ENDPOINT_NAME&y=YEAR
    - Authentication: Bearer token in Authorization header
    """

    def __init__(self, api_key: str, logger: Logger):
        self.api_key = api_key
        self.logger = logger
        self.base_url = API_BASE_URL
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create requests session with Bearer authentication"""
        session = requests.Session()

        # Official authentication: Bearer token
        session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Accept': 'application/json',
            'User-Agent': 'KenPom-Official-API-Client/2.0',
        })

        # Retry strategy for transient failures
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        return session

    def fetch_endpoint(self, endpoint: str, year: int = CURRENT_SEASON, **kwargs) -> Optional[Dict]:
        """
        Fetch data from a specific KenPom API endpoint

        Args:
            endpoint: Endpoint name (e.g., 'ratings', 'four-factors')
            year: Season year (ending year, e.g., 2025 for 2024-25 season)
            **kwargs: Additional query parameters (e.g., team_id, c for conference)

        Returns:
            JSON response as dict, or None if failed
        """
        url = f"{self.base_url}/api.php"

        # Build query parameters
        params = {
            'endpoint': endpoint,
            'y': year,
            **kwargs
        }

        try:
            self.logger.log(f"Fetching from endpoint '{endpoint}' for year {year}...")

            response = self.session.get(
                url,
                params=params,
                timeout=REQUEST_TIMEOUT
            )

            self.logger.log(f"  Status: {response.status_code}")

            if response.status_code == 200:
                try:
                    data = response.json()
                    self.logger.log(f"  ✓ Successfully fetched JSON data from '{endpoint}'")
                    return data
                except ValueError:
                    # Response is not JSON
                    self.logger.log(f"  Response is not JSON: {response.text[:200]}", "WARNING")
                    return None

            elif response.status_code == 401:
                self.logger.log(f"  ✗ Authentication failed - check API key", "ERROR")
                self.logger.log(f"  Response: {response.text[:500]}", "ERROR")
                return None
            elif response.status_code == 403:
                self.logger.log(f"  ✗ Forbidden - API key may not have access to '{endpoint}'", "ERROR")
                self.logger.log(f"  Response: {response.text[:500]}", "ERROR")
                return None
            elif response.status_code == 404:
                self.logger.log(f"  ✗ Endpoint not found: '{endpoint}'", "ERROR")
                return None
            else:
                self.logger.log(f"  ✗ Unexpected status {response.status_code}", "WARNING")
                self.logger.log(f"  Response: {response.text[:500]}", "WARNING")
                return None

        except requests.exceptions.Timeout:
            self.logger.log(f"  ✗ Request timeout for '{endpoint}'", "ERROR")
            return None
        except requests.exceptions.RequestException as e:
            self.logger.log(f"  ✗ Request failed for '{endpoint}': {e}", "ERROR")
            return None

    def fetch_all_priority_endpoints(self, year: int = CURRENT_SEASON) -> Dict[str, Any]:
        """
        Fetch data from all priority endpoints

        Returns dict with endpoint name as key and data as value
        """
        all_data = {}

        self.logger.log(f"\nFetching from {len(PRIORITY_ENDPOINTS)} priority endpoints...")
        self.logger.log("="*80)

        for endpoint in PRIORITY_ENDPOINTS:
            self.logger.log(f"\nEndpoint: {endpoint}")
            self.logger.log(f"Description: {AVAILABLE_ENDPOINTS.get(endpoint, 'N/A')}")

            data = self.fetch_endpoint(endpoint, year)

            if data:
                all_data[endpoint] = data
                self.logger.log(f"  ✓ '{endpoint}' data retrieved successfully")
            else:
                self.logger.log(f"  ✗ '{endpoint}' data retrieval failed", "WARNING")

        self.logger.log("="*80)
        self.logger.log(f"Successfully fetched {len(all_data)}/{len(PRIORITY_ENDPOINTS)} endpoints")

        return all_data


# ============================================================================
# DATA PROCESSING
# ============================================================================

def normalize_api_response(data: Any, endpoint: str, logger: Logger) -> Optional[pd.DataFrame]:
    """
    Convert API response to DataFrame

    KenPom API can return:
    - List of dicts (most common)
    - Dict with 'data' key containing list
    - Single dict
    """
    try:
        if isinstance(data, list):
            # Most common: list of team records
            df = pd.DataFrame(data)
        elif isinstance(data, dict):
            # Check for common wrapper patterns
            if 'data' in data:
                df = pd.DataFrame(data['data'])
            elif 'teams' in data:
                df = pd.DataFrame(data['teams'])
            elif 'results' in data:
                df = pd.DataFrame(data['results'])
            else:
                # Try to normalize the dict itself
                df = pd.json_normalize(data)
        else:
            logger.log(f"Unknown data format for '{endpoint}': {type(data)}", "ERROR")
            return None

        if not df.empty:
            logger.log(f"Converted '{endpoint}' to DataFrame: {len(df)} rows, {len(df.columns)} columns")
            return df
        else:
            logger.log(f"DataFrame is empty for '{endpoint}'", "WARNING")
            return None

    except Exception as e:
        logger.log(f"Error processing '{endpoint}' data: {e}", "ERROR")
        return None


def merge_endpoint_data(all_data: Dict[str, pd.DataFrame], logger: Logger) -> Optional[pd.DataFrame]:
    """
    Merge data from multiple endpoints into single DataFrame

    Merges on team identifier (TeamName, Team, or team)
    """
    if not all_data:
        logger.log("No data to merge", "ERROR")
        return None

    logger.log("\nMerging data from multiple endpoints...")

    # Start with ratings (primary dataset)
    if 'ratings' not in all_data:
        logger.log("Missing 'ratings' endpoint - cannot merge without base dataset", "ERROR")
        return None

    merged_df = all_data['ratings'].copy()
    logger.log(f"Starting with 'ratings': {len(merged_df)} teams")

    # Identify team name column
    team_col = None
    for col in ['TeamName', 'Team', 'team', 'TeamId']:
        if col in merged_df.columns:
            team_col = col
            break

    if not team_col:
        logger.log("Cannot find team identifier column in ratings data", "ERROR")
        return None

    logger.log(f"Using '{team_col}' as merge key")

    # Merge other endpoints
    for endpoint, df in all_data.items():
        if endpoint == 'ratings':
            continue  # Already our base

        if df is None or df.empty:
            logger.log(f"Skipping empty '{endpoint}' data", "WARNING")
            continue

        # Find team column in this endpoint
        endpoint_team_col = None
        for col in ['TeamName', 'Team', 'team', 'TeamId']:
            if col in df.columns:
                endpoint_team_col = col
                break

        if not endpoint_team_col:
            logger.log(f"Cannot find team identifier in '{endpoint}' - skipping", "WARNING")
            continue

        # Merge
        try:
            before_cols = len(merged_df.columns)
            merged_df = merged_df.merge(
                df,
                left_on=team_col,
                right_on=endpoint_team_col,
                how='left',
                suffixes=('', f'_{endpoint}')
            )
            after_cols = len(merged_df.columns)
            new_cols = after_cols - before_cols
            logger.log(f"  ✓ Merged '{endpoint}': added {new_cols} new columns")
        except Exception as e:
            logger.log(f"  ✗ Failed to merge '{endpoint}': {e}", "ERROR")

    logger.log(f"\nFinal merged dataset: {len(merged_df)} teams, {len(merged_df.columns)} columns")

    return merged_df


def clean_and_save(df: pd.DataFrame, logger: Logger) -> Dict[str, Path]:
    """Clean and save data"""
    # Add metadata
    df['fetch_date'] = datetime.now().strftime("%Y-%m-%d")
    df['fetch_timestamp'] = datetime.now().isoformat()
    df['season'] = CURRENT_SEASON
    df['data_source'] = 'kenpom_api'

    # Standardize column names
    df.columns = [col.lower().replace(' ', '_').replace('.', '').replace('-', '_') for col in df.columns]

    logger.log(f"Final data: {len(df)} rows, {len(df.columns)} columns")

    # Save files
    date_stamp = datetime.now().strftime("%Y-%m-%d")
    time_stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")

    saved_files = {}

    csv_timestamped = OUTPUT_DIR / f"cleaned_kenpom_data_{time_stamp}.csv"
    df.to_csv(csv_timestamped, index=False)
    saved_files['csv_timestamped'] = csv_timestamped

    csv_dated = OUTPUT_DIR / f"cleaned_kenpom_data_{date_stamp}.csv"
    df.to_csv(csv_dated, index=False)
    saved_files['csv_dated'] = csv_dated

    csv_latest = OUTPUT_DIR / "cleaned_kenpom_data_latest.csv"
    df.to_csv(csv_latest, index=False)
    saved_files['csv_latest'] = csv_latest

    try:
        xlsx = OUTPUT_DIR / f"cleaned_kenpom_data_{time_stamp}.xlsx"
        df.to_excel(xlsx, index=False, engine='openpyxl')
        saved_files['xlsx'] = xlsx
    except:
        pass

    return saved_files


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main execution"""
    log_file = Path(__file__).parent / "logs" / f"kenpom_api_{datetime.now().strftime('%Y-%m-%d')}.log"
    log_file.parent.mkdir(exist_ok=True)

    logger = Logger(log_file)

    logger.log("="*80)
    logger.log("KenPom Official API Client v2.0")
    logger.log("="*80)
    logger.log(f"API Key: {KENPOM_API_KEY[:20]}...")
    logger.log(f"Base URL: {API_BASE_URL}")
    logger.log(f"Season: {CURRENT_SEASON}")
    logger.log(f"Priority Endpoints: {', '.join(PRIORITY_ENDPOINTS)}")
    logger.log("="*80)

    # Create client
    client = KenPomOfficialAPIClient(KENPOM_API_KEY, logger)

    # Fetch all data
    logger.log("\n" + "="*80)
    logger.log("Fetching KenPom Data")
    logger.log("="*80)

    all_data_raw = client.fetch_all_priority_endpoints(CURRENT_SEASON)

    if not all_data_raw:
        logger.log("\n" + "="*80)
        logger.log("No data retrieved from API", "ERROR")
        logger.log("="*80)
        logger.log("\nPossible reasons:")
        logger.log("1. API key may be invalid or expired")
        logger.log("2. Cloudflare protection may be blocking requests")
        logger.log("3. API endpoints may have changed")
        logger.log("\nPlease verify:")
        logger.log("- API key is correct")
        logger.log("- Subscription includes API access")
        logger.log("- Check https://kenpom.com/api-documentation.php")
        logger.log("="*80)
        return False

    # Convert to DataFrames
    logger.log("\n" + "="*80)
    logger.log("Converting to DataFrames")
    logger.log("="*80)

    all_data_df = {}
    for endpoint, data in all_data_raw.items():
        df = normalize_api_response(data, endpoint, logger)
        if df is not None:
            all_data_df[endpoint] = df

    if not all_data_df:
        logger.log("Failed to convert any endpoint data to DataFrame", "ERROR")
        return False

    # Merge all data
    logger.log("\n" + "="*80)
    logger.log("Merging Endpoint Data")
    logger.log("="*80)

    merged_df = merge_endpoint_data(all_data_df, logger)

    if merged_df is None or merged_df.empty:
        logger.log("Failed to merge endpoint data", "ERROR")
        return False

    # Save
    logger.log("\n" + "="*80)
    logger.log("Saving Data")
    logger.log("="*80)

    saved_files = clean_and_save(merged_df, logger)

    logger.log("\n" + "="*80)
    logger.log("SUCCESS!")
    logger.log("="*80)
    logger.log(f"Teams: {len(merged_df)}")
    logger.log(f"Columns: {len(merged_df.columns)}")
    logger.log(f"Endpoints fetched: {len(all_data_df)}")
    logger.log("\nFiles saved:")
    for file_type, file_path in saved_files.items():
        logger.log(f"  - {file_type}: {file_path}")
    logger.log("="*80)

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

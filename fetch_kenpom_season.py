#!/usr/bin/env python3
"""
Fetch KenPom Data for Specific Season

Usage:
    python fetch_kenpom_season.py 2026
    python fetch_kenpom_season.py 2025
    python fetch_kenpom_season.py 2024
"""

import sys
from pathlib import Path
from datetime import datetime

# Import the API client
sys.path.insert(0, str(Path(__file__).parent))
from kenpom_api_client import (
    KenPomOfficialAPIClient,
    normalize_api_response,
    merge_endpoint_data,
    Logger,
    KENPOM_API_KEY
)

def fetch_season_data(year: int):
    """Fetch KenPom data for a specific season"""

    # Setup logging
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / f"kenpom_season_{year}_{datetime.now().strftime('%Y-%m-%d')}.log"
    logger = Logger(log_file)

    logger.log("="*80)
    logger.log(f"Fetching KenPom {year} Season Data")
    logger.log("="*80)
    logger.log(f"Season: {year}")
    logger.log(f"API Key: {KENPOM_API_KEY[:20]}...")
    logger.log("="*80)

    # Create client
    client = KenPomOfficialAPIClient(KENPOM_API_KEY, logger)

    # Fetch data
    logger.log(f"\nFetching data for {year} season...")
    all_data_raw = client.fetch_all_priority_endpoints(year=year)

    if not all_data_raw:
        logger.log("No data retrieved", "ERROR")
        return False

    # Convert to DataFrames
    logger.log("\nConverting to DataFrames...")
    all_data_df = {}
    for endpoint, data in all_data_raw.items():
        df = normalize_api_response(data, endpoint, logger)
        if df is not None:
            all_data_df[endpoint] = df

    if not all_data_df:
        logger.log("Failed to convert any data", "ERROR")
        return False

    # Merge
    logger.log("\nMerging data from multiple endpoints...")
    merged_df = merge_endpoint_data(all_data_df, logger)

    if merged_df is None or merged_df.empty:
        logger.log("Failed to merge data", "ERROR")
        return False

    # Add metadata and clean columns
    merged_df['fetch_date'] = datetime.now().strftime("%Y-%m-%d")
    merged_df['fetch_timestamp'] = datetime.now().isoformat()
    merged_df['season'] = year
    merged_df['data_source'] = 'kenpom_api'

    # Standardize column names
    merged_df.columns = [
        col.lower().replace(' ', '_').replace('.', '').replace('-', '_')
        for col in merged_df.columns
    ]

    # Create season-specific output directory
    output_dir = Path(__file__).parent / "data" / "kenpom_historical" / f"season_{year}"
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.log(f"\nSaving to: {output_dir}")

    # Generate timestamps
    date_stamp = datetime.now().strftime("%Y-%m-%d")
    time_stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")

    saved_files = []

    # Save timestamped CSV
    csv_timestamped = output_dir / f"kenpom_{year}_{time_stamp}.csv"
    merged_df.to_csv(csv_timestamped, index=False)
    logger.log(f"✓ Saved: {csv_timestamped}")
    saved_files.append(csv_timestamped)

    # Save dated CSV
    csv_dated = output_dir / f"kenpom_{year}_{date_stamp}.csv"
    merged_df.to_csv(csv_dated, index=False)
    logger.log(f"✓ Saved: {csv_dated}")
    saved_files.append(csv_dated)

    # Save latest CSV
    csv_latest = output_dir / f"kenpom_{year}_latest.csv"
    merged_df.to_csv(csv_latest, index=False)
    logger.log(f"✓ Saved: {csv_latest}")
    saved_files.append(csv_latest)

    # Save Excel
    try:
        xlsx = output_dir / f"kenpom_{year}_{time_stamp}.xlsx"
        merged_df.to_excel(xlsx, index=False, engine='openpyxl')
        logger.log(f"✓ Saved: {xlsx}")
        saved_files.append(xlsx)
    except Exception as e:
        logger.log(f"Could not save Excel: {e}", "WARNING")

    # Summary
    logger.log("\n" + "="*80)
    logger.log("SUCCESS!")
    logger.log("="*80)
    logger.log(f"Season: {year}")
    logger.log(f"Teams: {len(merged_df)}")
    logger.log(f"Columns: {len(merged_df.columns)}")
    logger.log(f"Endpoints: {len(all_data_df)}")
    logger.log(f"Files saved: {len(saved_files)}")
    logger.log(f"Output directory: {output_dir}")
    logger.log("="*80)

    # Console output
    print(f"\n✅ Successfully fetched {year} season data!")
    print(f"   Teams: {len(merged_df)}")
    print(f"   Columns: {len(merged_df.columns)}")
    print(f"   Saved to: {output_dir}")
    print(f"   Files: {len(saved_files)}")

    return True


def main():
    """Main execution"""
    if len(sys.argv) < 2:
        print("Usage: python fetch_kenpom_season.py <year>")
        print("\nExamples:")
        print("  python fetch_kenpom_season.py 2026")
        print("  python fetch_kenpom_season.py 2025")
        print("  python fetch_kenpom_season.py 2024")
        sys.exit(1)

    try:
        year = int(sys.argv[1])
    except ValueError:
        print(f"Error: '{sys.argv[1]}' is not a valid year")
        sys.exit(1)

    # Validate year range
    current_year = datetime.now().year
    if year < 2002 or year > current_year + 2:
        print(f"Error: Year must be between 2002 and {current_year + 2}")
        sys.exit(1)

    success = fetch_season_data(year)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

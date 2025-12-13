#!/usr/bin/env python3
"""
Historical Games Processor

Extracts completed games from NCAA live log and processes them for model training.
For each completed game:
- Calculates Pomeroy possessions and efficiency metrics
- Merges with KenPom season ratings
- Saves to training dataset

Output: data/training/games_2025.csv
"""

import sys
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Tuple

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from models.data_pipeline.possessions_calculator import (
    calculate_possessions,
    calculate_team_possessions,
    calculate_efficiency,
    calculate_tempo,
    process_game_stats
)


# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent.parent
LIVE_LOG_PATH = PROJECT_ROOT / "data" / "ncaa_live_log.csv"
RESULTS_PATH = PROJECT_ROOT / "data" / "ncaa_results.csv"
KENPOM_PATH = PROJECT_ROOT / "data" / "kenpom_historical" / "season_2025" / "cleaned_kenpom_data_latest.csv"
OUTPUT_DIR = PROJECT_ROOT / "data" / "training"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Game completion indicators
COMPLETION_STATUSES = ["Final", "Completed", "complete", "final"]


# ============================================================================
# TEAM NAME NORMALIZATION
# ============================================================================

def normalize_team_name(name: str) -> str:
    """
    Normalize team name for matching between data sources.

    Examples:
        "South Florida Bulls" -> "South Florida"
        "Kennesaw State Owls" -> "Kennesaw State"
        "UNC Tar Heels" -> "UNC"
    """
    if pd.isna(name):
        return ""

    name = str(name).strip()

    # Remove common mascot suffixes
    mascots = [
        'Aggies', 'Aztecs', 'Badgers', 'Bears', 'Bearcats', 'Beavers', 'Billikens',
        'Bison', 'Blue Devils', 'Bobcats', 'Boilermakers', 'Broncos', 'Bruins',
        'Buckeyes', 'Buffaloes', 'Bulldogs', 'Bulls', 'Cardinals', 'Catamounts',
        'Cavaliers', 'Chanticleers', 'Chippewas', 'Cougars', 'Cowboys', 'Crimson Tide',
        'Crusaders', 'Cyclones', 'Demon Deacons', 'Devils', 'Dolphins', 'Dragons',
        'Ducks', 'Eagles', 'Falcons', 'Fighting Irish', 'Flames', 'Flyers', 'Gators',
        'Golden Eagles', 'Golden Gophers', 'Grizzlies', 'Hawkeyes', 'Hilltoppers',
        'Hokies', 'Hoosiers', 'Hornets', 'Huskies', 'Hurricanes', 'Jaguars', 'Jayhawks',
        'Knights', 'Lions', 'Lobos', 'Longhorns', 'Miners', 'Minutemen', 'Mountain Hawks',
        'Mountaineers', 'Musketeers', 'Mustangs', 'Nittany Lions', 'Owls', 'Panthers',
        'Patriots', 'Peacocks', 'Pirates', 'Rainbow Warriors', 'Rams', 'Ramblers',
        'Razorbacks', 'Rebels', 'Red Raiders', 'Red Storm', 'Redbirds', 'Riverhawks',
        'Rockets', 'Running Rebels', 'Salukis', 'Scarlet Knights', 'Seminoles',
        'Seawolves', 'Shockers', 'Sooners', 'Spartans', 'Stags', 'Sun Devils',
        'Sycamores', 'Tar Heels', 'Terrapins', 'Tigers', 'Titans', 'Toreros',
        'Trojans', 'Utes', 'Vandals', 'Vikings', 'Volunteers', 'Wildcats', 'Wolfpack',
        'Wolverines', 'Greyhounds', 'Black Bears'
    ]

    for mascot in mascots:
        if name.endswith(f' {mascot}'):
            name = name[:-len(mascot)-1].strip()
            break

    return name


# ============================================================================
# KENPOM DATA LOADING
# ============================================================================

def load_kenpom_ratings() -> pd.DataFrame:
    """Load KenPom season ratings and create lookup dictionary"""
    print(f"Loading KenPom ratings from: {KENPOM_PATH}")

    if not KENPOM_PATH.exists():
        raise FileNotFoundError(f"KenPom data not found at {KENPOM_PATH}")

    df = pd.read_csv(KENPOM_PATH)
    print(f"  Loaded {len(df)} teams")

    # Normalize team names for matching
    df['team_normalized'] = df['team'].apply(normalize_team_name)

    # Select key columns for training
    key_columns = [
        'team', 'team_normalized',
        'adjem', 'adjoe', 'adjde', 'adjtempo',
        'tempo', 'efg_pct', 'to_pct', 'or_pct', 'ft_rate',
        'defg_pct', 'dto_pct', 'dor_pct', 'dft_rate',
        'fg3pct', 'fg2pct', 'ftpct',
        'oppfg3pct', 'oppfg2pct', 'oppftpct',
        'avghgt', 'exp', 'bench'
    ]

    available_columns = [col for col in key_columns if col in df.columns]
    df_filtered = df[available_columns].copy()

    print(f"  Selected {len(available_columns)} feature columns")

    return df_filtered


def find_team_in_kenpom(team_name: str, kenpom_df: pd.DataFrame) -> Optional[pd.Series]:
    """
    Find team in KenPom data with flexible matching.

    Tries:
    1. Exact match on normalized name
    2. Partial match (team name contains or is contained in KenPom name)
    3. Case-insensitive fuzzy match
    """
    team_normalized = normalize_team_name(team_name)

    # Try exact match
    exact_match = kenpom_df[kenpom_df['team_normalized'] == team_normalized]
    if not exact_match.empty:
        return exact_match.iloc[0]

    # Try partial match
    for idx, row in kenpom_df.iterrows():
        kp_name = row['team_normalized'].lower()
        tm_name = team_normalized.lower()

        if kp_name in tm_name or tm_name in kp_name:
            return row

    # No match found
    return None


# ============================================================================
# GAME EXTRACTION
# ============================================================================

def extract_completed_games_from_results() -> pd.DataFrame:
    """
    Extract completed games from results file.

    The results file contains final game data with actual outcomes.
    We'll merge this with the live log to get the box score stats.
    """
    print("\nLoading completed games from results...")

    if not RESULTS_PATH.exists():
        raise FileNotFoundError(f"Results file not found at {RESULTS_PATH}")

    results_df = pd.read_csv(RESULTS_PATH)
    print(f"  Total completed games: {len(results_df)}")

    return results_df


def merge_with_live_log(results_df: pd.DataFrame, live_log_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge results with live log box scores.

    For each completed game in results, find the final snapshot in the live log
    to get detailed box score stats.
    """
    print("\nMerging results with live log box scores...")

    # Get the last entry for each game in live log
    if 'Game ID' in live_log_df.columns:
        game_id_col = 'Game ID'
    elif 'game_id' in live_log_df.columns:
        game_id_col = 'game_id'
    else:
        raise ValueError("Cannot find Game ID column in live log")

    # Sort by timestamp and get last entry per game
    if 'Timestamp' in live_log_df.columns:
        live_log_df = live_log_df.sort_values('Timestamp')

    final_snapshots = live_log_df.groupby(game_id_col).last().reset_index()
    print(f"  Live log has {len(final_snapshots)} unique games")

    # Merge results with live log
    merged = results_df.merge(
        final_snapshots,
        left_on='game_id',
        right_on=game_id_col,
        how='left',
        suffixes=('_result', '_live')
    )

    print(f"  Successfully merged {len(merged)} games")

    # Count how many have box score data
    has_box_scores = merged['Home FGA'].notna().sum() if 'Home FGA' in merged.columns else 0
    print(f"  Games with box score data: {has_box_scores}")

    return merged


def process_game_row(row: pd.Series, kenpom_df: pd.DataFrame) -> Optional[Dict]:
    """
    Process a single game row into training features.

    Returns:
        Dict with all features needed for training, or None if processing fails
    """
    try:
        # Extract basic game info - prioritize results columns
        game_id = row.get('game_id')

        # Use results file columns (home_team, away_team, final scores)
        team1_name = row.get('home_team', row.get('Team 1', ''))
        team2_name = row.get('away_team', row.get('Team 2', ''))
        score1 = float(row.get('final_home_score', row.get('Score 1', 0)))
        score2 = float(row.get('final_away_score', row.get('Score 2', 0)))

        # Extract box score stats for Team 1 (Home)
        home_fga = float(row.get('Home FGA', 0))
        home_fta = float(row.get('Home FTA', 0))
        home_oreb = float(row.get('Home Off Rebounds', 0))
        home_to = float(row.get('Home Turnovers', 0))

        # Extract box score stats for Team 2 (Away)
        away_fga = float(row.get('Away FGA', 0))
        away_fta = float(row.get('Away FTA', 0))
        away_oreb = float(row.get('Away Off Rebounds', 0))
        away_to = float(row.get('Away Turnovers', 0))

        # Determine game length
        period = row.get('Period', 2)
        if pd.isna(period):
            period = 2
        else:
            period = int(period)

        went_to_ot = period > 2
        game_minutes = 40 + ((period - 2) * 5) if went_to_ot else 40

        # Calculate Pomeroy metrics
        game_data = {
            'home_fga': home_fga,
            'home_fta': home_fta,
            'home_oreb': home_oreb,
            'home_to': home_to,
            'home_points': score1,
            'away_fga': away_fga,
            'away_fta': away_fta,
            'away_oreb': away_oreb,
            'away_to': away_to,
            'away_points': score2,
            'game_minutes': game_minutes
        }

        pomeroy_metrics = process_game_stats(game_data)

        # Get KenPom ratings for both teams
        team1_kenpom = find_team_in_kenpom(team1_name, kenpom_df)
        team2_kenpom = find_team_in_kenpom(team2_name, kenpom_df)

        # Build feature dict
        features = {
            'game_id': game_id,
            'team_1': team1_name,
            'team_2': team2_name,
            'team_1_score': score1,
            'team_2_score': score2,
            'total_points': score1 + score2,
            'went_to_ot': went_to_ot,
            'game_minutes': game_minutes,

            # Pomeroy game metrics
            'possessions': pomeroy_metrics['possessions'],
            'team_1_off_eff': pomeroy_metrics['home_off_eff'],
            'team_2_off_eff': pomeroy_metrics['away_off_eff'],
            'team_1_def_eff': pomeroy_metrics['home_def_eff'],
            'team_2_def_eff': pomeroy_metrics['away_def_eff'],
            'tempo': pomeroy_metrics['tempo'],
        }

        # Add Team 1 KenPom features
        if team1_kenpom is not None:
            for col in kenpom_df.columns:
                if col not in ['team', 'team_normalized']:
                    features[f'team_1_{col}'] = team1_kenpom[col]
        else:
            print(f"  WARNING: Team 1 '{team1_name}' not found in KenPom data")

        # Add Team 2 KenPom features
        if team2_kenpom is not None:
            for col in kenpom_df.columns:
                if col not in ['team', 'team_normalized']:
                    features[f'team_2_{col}'] = team2_kenpom[col]
        else:
            print(f"  WARNING: Team 2 '{team2_name}' not found in KenPom data")

        # Add O/U line if available (from either source)
        ou_line = row.get('ou_line', row.get('OU Line'))
        if ou_line is not None and not pd.isna(ou_line):
            features['ou_line'] = float(ou_line)
            features['ou_result'] = 'over' if (score1 + score2) > features['ou_line'] else 'under'

        # Add O/U result if available from results file
        if 'ou_result' in row and not pd.isna(row['ou_result']):
            features['ou_result'] = row['ou_result']

        # Add OT flag if available from results
        if 'went_to_ot' in row and not pd.isna(row['went_to_ot']):
            features['went_to_ot'] = bool(row['went_to_ot'])

        return features

    except Exception as e:
        print(f"  ERROR processing game {game_id}: {e}")
        return None


# ============================================================================
# MAIN PROCESSING
# ============================================================================

def process_historical_games(
    output_filename: str = "games_2025.csv",
    verbose: bool = True
) -> pd.DataFrame:
    """
    Main processing function.

    Returns:
        DataFrame with processed training data
    """
    print("="*80)
    print("Historical Games Processor")
    print("="*80)
    print(f"Live log: {LIVE_LOG_PATH}")
    print(f"KenPom data: {KENPOM_PATH}")
    print(f"Output: {OUTPUT_DIR / output_filename}")
    print("="*80)

    # Load data
    print("\nLoading data...")
    live_log_df = pd.read_csv(LIVE_LOG_PATH)
    kenpom_df = load_kenpom_ratings()

    # Extract completed games from results file
    results_df = extract_completed_games_from_results()

    # Merge with live log to get box scores
    completed_games = merge_with_live_log(results_df, live_log_df)

    # Process each game
    print("\nProcessing games...")
    processed_games = []

    for idx, row in completed_games.iterrows():
        if verbose and idx % 10 == 0:
            print(f"  Processing game {idx+1}/{len(completed_games)}...")

        features = process_game_row(row, kenpom_df)
        if features:
            processed_games.append(features)

    # Create DataFrame
    print(f"\nSuccessfully processed {len(processed_games)} games")

    if len(processed_games) == 0:
        print("ERROR: No games were successfully processed")
        return pd.DataFrame()

    training_df = pd.DataFrame(processed_games)

    # Add metadata
    training_df['processed_date'] = datetime.now().strftime("%Y-%m-%d")
    training_df['processed_timestamp'] = datetime.now().isoformat()
    training_df['season'] = 2025

    # Save
    output_path = OUTPUT_DIR / output_filename
    training_df.to_csv(output_path, index=False)
    print(f"\nSaved to: {output_path}")
    print(f"  Rows: {len(training_df)}")
    print(f"  Columns: {len(training_df.columns)}")

    # Summary statistics
    print("\n" + "="*80)
    print("Summary Statistics")
    print("="*80)
    print(f"Games: {len(training_df)}")
    print(f"Average total points: {training_df['total_points'].mean():.1f}")
    print(f"Total points range: {training_df['total_points'].min():.0f} - {training_df['total_points'].max():.0f}")
    print(f"Average possessions: {training_df['possessions'].mean():.1f}")
    print(f"Games with O/U line: {training_df['ou_line'].notna().sum()}")
    print(f"Overtime games: {training_df['went_to_ot'].sum()}")
    print("="*80)

    return training_df


# ============================================================================
# CLI
# ============================================================================

def main():
    """Main execution"""
    training_df = process_historical_games()

    if training_df.empty:
        print("\nFailed to create training dataset")
        return False

    print("\n✅ Training data extraction complete!")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

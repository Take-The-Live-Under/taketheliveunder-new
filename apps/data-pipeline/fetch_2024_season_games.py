#!/usr/bin/env python3
"""
Fetch 2024-25 NCAA Basketball Season Games

Uses sportsdataverse-py to fetch completed games from the 2024-25 season
and process them into training data format.

This will dramatically expand our training dataset from 44 games to 1000+.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import sys

# Try to import sportsdataverse
try:
    from sportsdataverse.mbb import load_mbb_schedule
except ImportError:
    print("ERROR: sportsdataverse not installed")
    print("Install with: pip install sportsdataverse")
    sys.exit(1)

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))


def fetch_2024_season_games():
    """Fetch all completed games from 2024-25 season"""
    print("="*80)
    print("Fetching 2024-25 NCAA Basketball Season Games")
    print("="*80)

    # Fetch 2025 season (2024-25 academic year)
    print("\nFetching 2025 season games from sportsdataverse...")
    print("(This may take a few minutes...)")

    try:
        games_df = load_mbb_schedule(seasons=[2025])
        print(f"✅ Fetched {len(games_df)} games from 2025 season")
    except Exception as e:
        print(f"❌ Error fetching games: {e}")
        import traceback
        traceback.print_exc()
        return None

    # Filter to completed games only
    print("\nFiltering to completed games...")
    print(f"DataFrame type: {type(games_df)}")

    # Convert to pandas if it's polars
    if hasattr(games_df, 'to_pandas'):
        print("Converting from Polars to Pandas...")
        games_df = games_df.to_pandas()

    # Check available columns
    print(f"Columns: {list(games_df.columns)[:20]}...")  # Show first 20

    # Try filtering by status
    if 'status_type_completed' in games_df.columns:
        completed_games = games_df[games_df['status_type_completed'] == True].copy()
    elif 'status_type_state' in games_df.columns:
        completed_games = games_df[games_df['status_type_state'] == 'post'].copy()
    else:
        print("⚠️  Could not find completion status column, using all games")
        completed_games = games_df.copy()

    print(f"✅ Found {len(completed_games)} completed games")

    if len(completed_games) == 0:
        print("⚠️  No completed games found in dataset")
        return None

    # Save raw data
    output_dir = Path(__file__).parent / "data" / "historical_games"
    output_dir.mkdir(parents=True, exist_ok=True)

    raw_path = output_dir / "sportsdataverse_2025_raw.csv"
    completed_games.to_csv(raw_path, index=False)
    print(f"\n✅ Saved raw data: {raw_path}")
    print(f"   Columns: {len(completed_games.columns)}")
    print(f"   Games: {len(completed_games)}")

    # Show column names for reference
    print("\nAvailable columns:")
    print(", ".join(sorted(completed_games.columns)))

    return completed_games


def process_games_to_training_format(games_df):
    """
    Process sportsdataverse games into our training format.

    Extract team names, scores, and basic stats.
    We'll merge with KenPom ratings separately.
    """
    print("\n" + "="*80)
    print("Processing Games to Training Format")
    print("="*80)

    processed_games = []

    for idx, game in games_df.iterrows():
        try:
            # Extract basic game info
            game_id = game.get('game_id', f"unknown_{idx}")

            # Get team names
            home_team = game.get('home_team_name', game.get('home_display_name', 'Unknown'))
            away_team = game.get('away_team_name', game.get('away_display_name', 'Unknown'))

            # Get scores - try multiple column names
            home_score = None
            away_score = None

            # Try different column name patterns
            for col in ['home_score', 'home_points', 'home_team_score']:
                if col in game and pd.notna(game[col]):
                    home_score = float(game[col])
                    break

            for col in ['away_score', 'away_points', 'away_team_score']:
                if col in game and pd.notna(game[col]):
                    away_score = float(game[col])
                    break

            # Skip if no scores available
            if home_score is None or away_score is None:
                continue

            total_points = home_score + away_score

            # Check for OT
            went_to_ot = False
            if 'status_period' in game and pd.notna(game.get('status_period')):
                went_to_ot = int(game['status_period']) > 2

            # Game date
            game_date = game.get('game_date', game.get('start_date', datetime.now().isoformat()))

            processed_game = {
                'game_id': game_id,
                'date': game_date,
                'team_1': home_team,
                'team_2': away_team,
                'team_1_score': home_score,
                'team_2_score': away_score,
                'total_points': total_points,
                'went_to_ot': went_to_ot,
                'season': 2025,
                'data_source': 'sportsdataverse'
            }

            processed_games.append(processed_game)

        except Exception as e:
            print(f"⚠️  Error processing game {idx}: {e}")
            continue

    if not processed_games:
        print("❌ No games successfully processed")
        return None

    processed_df = pd.DataFrame(processed_games)

    print(f"\n✅ Processed {len(processed_df)} games")
    print(f"   Average total: {processed_df['total_points'].mean():.1f}")
    print(f"   Total range: {processed_df['total_points'].min():.0f} - {processed_df['total_points'].max():.0f}")
    print(f"   OT games: {processed_df['went_to_ot'].sum()}")

    # Save processed games
    output_dir = Path(__file__).parent / "data" / "historical_games"
    processed_path = output_dir / "games_2025_processed.csv"
    processed_df.to_csv(processed_path, index=False)
    print(f"\n✅ Saved processed games: {processed_path}")

    return processed_df


def main():
    """Main execution"""
    print("\n🏀 NCAA Basketball 2024-25 Season Data Fetcher\n")

    # Fetch raw games
    games_df = fetch_2024_season_games()
    if games_df is None:
        return False

    # Process to training format
    processed_df = process_games_to_training_format(games_df)
    if processed_df is None:
        return False

    print("\n" + "="*80)
    print("SUCCESS!")
    print("="*80)
    print(f"✅ Fetched and processed {len(processed_df)} games from 2024-25 season")
    print(f"\nNext steps:")
    print("1. Merge with KenPom ratings using historical_games_processor.py")
    print("2. Retrain model with expanded dataset using train_models.py")
    print("="*80)

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

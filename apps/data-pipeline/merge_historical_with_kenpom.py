#!/usr/bin/env python3
"""
Merge Historical Games with KenPom Ratings

Takes the 6070 games from sportsdataverse and merges with KenPom 2025 ratings
to create a full training dataset with all the features needed for prediction.

This dramatically expands our training set from 44 games to 6000+!
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys

# Paths
PROJECT_ROOT = Path(__file__).parent
GAMES_PATH = PROJECT_ROOT / "data" / "historical_games" / "games_2025_processed.csv"
KENPOM_PATH = PROJECT_ROOT / "data" / "kenpom_historical" / "season_2025" / "cleaned_kenpom_data_latest.csv"
OUTPUT_PATH = PROJECT_ROOT / "data" / "training" / "games_2025.csv"

# Import team name normalizer from historical_games_processor
sys.path.insert(0, str(PROJECT_ROOT))
from models.data_pipeline.historical_games_processor import normalize_team_name


def load_kenpom_ratings():
    """Load KenPom 2025 season ratings"""
    print("Loading KenPom 2025 ratings...")

    if not KENPOM_PATH.exists():
        print(f"❌ KenPom data not found at: {KENPOM_PATH}")
        return None

    kenpom_df = pd.read_csv(KENPOM_PATH)
    print(f"✅ Loaded {len(kenpom_df)} teams from KenPom")

    # Normalize team names for matching
    kenpom_df['team_normalized'] = kenpom_df['team'].apply(normalize_team_name)

    # Create lookup dictionary for easy access
    kenpom_lookup = {}
    for _, row in kenpom_df.iterrows():
        team_norm = row['team_normalized']
        kenpom_lookup[team_norm] = row.to_dict()

    return kenpom_lookup


def merge_games_with_kenpom(games_df, kenpom_lookup):
    """Merge game data with KenPom ratings for both teams"""
    print("\nMerging games with KenPom ratings...")

    merged_games = []
    unmatched_teams = set()

    for idx, game in games_df.iterrows():
        # Normalize team names
        team_1_norm = normalize_team_name(game['team_1'])
        team_2_norm = normalize_team_name(game['team_2'])

        # Look up KenPom data
        team_1_kenpom = kenpom_lookup.get(team_1_norm)
        team_2_kenpom = kenpom_lookup.get(team_2_norm)

        # Skip if either team not in KenPom (non-D1 teams)
        if not team_1_kenpom or not team_2_kenpom:
            if not team_1_kenpom:
                unmatched_teams.add(game['team_1'])
            if not team_2_kenpom:
                unmatched_teams.add(game['team_2'])
            continue

        # Build merged record
        merged_record = {
            # Game info
            'game_id': game['game_id'],
            'team_1': game['team_1'],
            'team_2': game['team_2'],
            'team_1_score': game['team_1_score'],
            'team_2_score': game['team_2_score'],
            'total_points': game['total_points'],
            'went_to_ot': game['went_to_ot'],
            'season': game['season'],
            'data_source': game['data_source'],

            # Team 1 KenPom ratings
            'team_1_adjem': team_1_kenpom.get('adjem', 0),
            'team_1_adjoe': team_1_kenpom.get('adjoe', 100),
            'team_1_adjde': team_1_kenpom.get('adjde', 100),
            'team_1_adjtempo': team_1_kenpom.get('adjtempo', 68),
            'team_1_tempo': team_1_kenpom.get('tempo', 68),
            'team_1_efg_pct': team_1_kenpom.get('efgpct', 50),
            'team_1_to_pct': team_1_kenpom.get('topct', 18),
            'team_1_or_pct': team_1_kenpom.get('orpct', 30),
            'team_1_ft_rate': team_1_kenpom.get('ftrate', 30),
            'team_1_defg_pct': team_1_kenpom.get('defgpct', 50),
            'team_1_dto_pct': team_1_kenpom.get('dtopct', 18),
            'team_1_dor_pct': team_1_kenpom.get('dorpct', 30),
            'team_1_dft_rate': team_1_kenpom.get('dftrate', 30),
            'team_1_fg3pct': team_1_kenpom.get('fg3pct', 33),
            'team_1_fg2pct': team_1_kenpom.get('fg2pct', 50),
            'team_1_ftpct': team_1_kenpom.get('ftpct', 70),
            'team_1_oppfg3pct': team_1_kenpom.get('oppfg3pct', 33),
            'team_1_oppfg2pct': team_1_kenpom.get('oppfg2pct', 50),
            'team_1_oppftpct': team_1_kenpom.get('oppftpct', 70),
            'team_1_avghgt': team_1_kenpom.get('avghgt', 77),
            'team_1_exp': team_1_kenpom.get('exp', 1.5),
            'team_1_bench': team_1_kenpom.get('bench', 35),

            # Team 2 KenPom ratings
            'team_2_adjem': team_2_kenpom.get('adjem', 0),
            'team_2_adjoe': team_2_kenpom.get('adjoe', 100),
            'team_2_adjde': team_2_kenpom.get('adjde', 100),
            'team_2_adjtempo': team_2_kenpom.get('adjtempo', 68),
            'team_2_tempo': team_2_kenpom.get('tempo', 68),
            'team_2_efg_pct': team_2_kenpom.get('efgpct', 50),
            'team_2_to_pct': team_2_kenpom.get('topct', 18),
            'team_2_or_pct': team_2_kenpom.get('orpct', 30),
            'team_2_ft_rate': team_2_kenpom.get('ftrate', 30),
            'team_2_defg_pct': team_2_kenpom.get('defgpct', 50),
            'team_2_dto_pct': team_2_kenpom.get('dtopct', 18),
            'team_2_dor_pct': team_2_kenpom.get('dorpct', 30),
            'team_2_dft_rate': team_2_kenpom.get('dftrate', 30),
            'team_2_fg3pct': team_2_kenpom.get('fg3pct', 33),
            'team_2_fg2pct': team_2_kenpom.get('fg2pct', 50),
            'team_2_ftpct': team_2_kenpom.get('ftpct', 70),
            'team_2_oppfg3pct': team_2_kenpom.get('oppfg3pct', 33),
            'team_2_oppfg2pct': team_2_kenpom.get('oppfg2pct', 50),
            'team_2_oppftpct': team_2_kenpom.get('oppftpct', 70),
            'team_2_avghgt': team_2_kenpom.get('avghgt', 77),
            'team_2_exp': team_2_kenpom.get('exp', 1.5),
            'team_2_bench': team_2_kenpom.get('bench', 35),
        }

        merged_games.append(merged_record)

        if (idx + 1) % 1000 == 0:
            print(f"  Processed {idx+1}/{len(games_df)} games...")

    merged_df = pd.DataFrame(merged_games)

    print(f"\n✅ Successfully merged {len(merged_df)} games")
    print(f"⚠️  Skipped {len(games_df) - len(merged_df)} games (non-D1 teams)")
    print(f"   Unmatched teams: {len(unmatched_teams)}")

    if len(unmatched_teams) > 0:
        print(f"\n   Sample unmatched teams: {list(unmatched_teams)[:10]}")

    return merged_df


def add_blowout_detector(df):
    """
    Add blowout detection feature based on AdjEM difference.

    Games with AdjEM difference > 15 are likely UNDER (defensive blowouts).
    This was a missing pattern identified in our research.
    """
    print("\nAdding blowout detector feature...")

    df['adjem_diff'] = abs(df['team_1_adjem'] - df['team_2_adjem'])
    df['is_blowout'] = df['adjem_diff'] > 15

    blowout_games = df[df['is_blowout']]
    print(f"✅ Flagged {len(blowout_games)} games as potential blowouts (AdjEM diff > 15)")

    if len(blowout_games) > 0:
        avg_total_blowout = blowout_games['total_points'].mean()
        avg_total_normal = df[~df['is_blowout']]['total_points'].mean()
        print(f"   Blowout avg total: {avg_total_blowout:.1f}")
        print(f"   Normal avg total: {avg_total_normal:.1f}")
        print(f"   Difference: {avg_total_blowout - avg_total_normal:+.1f} points")

    return df


def main():
    """Main execution"""
    print("="*80)
    print("Merge Historical Games with KenPom Ratings")
    print("="*80)

    # Load games
    print(f"\nLoading games from: {GAMES_PATH}")
    games_df = pd.read_csv(GAMES_PATH)
    print(f"✅ Loaded {len(games_df)} games")
    print(f"   Date range: {games_df['date'].min()} to {games_df['date'].max()}")
    print(f"   Average total: {games_df['total_points'].mean():.1f}")

    # Load KenPom
    kenpom_lookup = load_kenpom_ratings()
    if kenpom_lookup is None:
        return False

    # Merge
    merged_df = merge_games_with_kenpom(games_df, kenpom_lookup)

    if len(merged_df) == 0:
        print("❌ No games successfully merged")
        return False

    # Add blowout detector
    merged_df = add_blowout_detector(merged_df)

    # Save to training directory
    print(f"\n💾 Saving to: {OUTPUT_PATH}")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    merged_df.to_csv(OUTPUT_PATH, index=False)
    print(f"✅ Saved {len(merged_df)} games")

    # Summary
    print("\n" + "="*80)
    print("SUCCESS!")
    print("="*80)
    print(f"Training dataset: {OUTPUT_PATH}")
    print(f"Games: {len(merged_df)} (was 44, now {len(merged_df)}) = {len(merged_df)/44:.0f}x increase!")
    print(f"Average total: {merged_df['total_points'].mean():.1f}")
    print(f"OT games: {merged_df['went_to_ot'].sum()}")
    print(f"Blowout games: {merged_df['is_blowout'].sum()}")
    print(f"\nNext step: python train_models.py")
    print("="*80)

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

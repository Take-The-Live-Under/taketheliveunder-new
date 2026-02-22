#!/usr/bin/env python3
"""
Push NCAA Basketball Predictions to Dashboard
Runs predictions and pushes them to the API/Frontend at localhost:3002
"""

import pandas as pd
import pickle
import requests
import time
from pathlib import Path
from datetime import datetime, timedelta
import sys

# Add models to path
sys.path.insert(0, str(Path(__file__).parent))

from models.data_pipeline.historical_games_processor import normalize_team_name

# Paths
DATA_DIR = Path(__file__).parent / "data"
MODEL_PATH = DATA_DIR / "trained_models" / "ensemble_latest.pkl"
KENPOM_PATH = DATA_DIR / "kenpom_historical" / "season_2025" / "cleaned_kenpom_data_latest.csv"
PREDICTIONS_DIR = DATA_DIR / "predictions"

# API Configuration
API_URL = "http://localhost:8000"
ODDS_API_KEY = 'c1e957e22dfde2c23b3cac82758bef3e'
ODDS_API_BASE = "https://api.the-odds-api.com/v4"
SPORT_MODE = 'basketball_ncaab'


def fetch_upcoming_games(date_str=None):
    """Fetch games for the specified date"""
    if date_str is None:
        tomorrow = datetime.now() + timedelta(days=1)
        date_str = tomorrow.strftime("%Y-%m-%d")

    print(f"\nFetching games for {date_str}...")

    url = f"{ODDS_API_BASE}/sports/{SPORT_MODE}/odds"
    params = {
        'apiKey': ODDS_API_KEY,
        'regions': 'us',
        'markets': 'totals',
        'oddsFormat': 'american'
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    games_data = response.json()

    # Filter to target date
    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    games = []

    for game in games_data:
        game_time = datetime.fromisoformat(game['commence_time'].replace('Z', '+00:00'))
        if game_time.date() == target_date:
            ou_line = None
            if 'bookmakers' in game and game['bookmakers']:
                for bookmaker in game['bookmakers']:
                    if 'markets' in bookmaker:
                        for market in bookmaker['markets']:
                            if market['key'] == 'totals' and 'outcomes' in market:
                                for outcome in market['outcomes']:
                                    if 'point' in outcome:
                                        ou_line = outcome['point']
                                        break
                            if ou_line:
                                break
                    if ou_line:
                        break

            games.append({
                'home_team': game['home_team'],
                'away_team': game['away_team'],
                'commence_time': game_time.strftime("%Y-%m-%d %H:%M"),
                'ou_line': ou_line
            })

    print(f"  Found {len(games)} games on {date_str}")
    return games


def load_kenpom_ratings():
    """Load KenPom season ratings"""
    df = pd.read_csv(KENPOM_PATH)
    df['team_normalized'] = df['team'].apply(normalize_team_name)
    return df


def find_team_in_kenpom(team_name, kenpom_df):
    """Find team in KenPom data"""
    team_normalized = normalize_team_name(team_name)

    exact_match = kenpom_df[kenpom_df['team_normalized'] == team_normalized]
    if not exact_match.empty:
        return exact_match.iloc[0]

    for idx, row in kenpom_df.iterrows():
        kp_name = row['team_normalized'].lower()
        tm_name = team_normalized.lower()
        if kp_name in tm_name or tm_name in kp_name:
            return row

    return None


def prepare_game_features(home_team, away_team, kenpom_df):
    """Prepare features for a single game"""
    home_kenpom = find_team_in_kenpom(home_team, kenpom_df)
    away_kenpom = find_team_in_kenpom(away_team, kenpom_df)

    if home_kenpom is None or away_kenpom is None:
        return None

    features = {}

    for col in kenpom_df.columns:
        if col not in ['team', 'team_normalized']:
            features[f'team_1_{col}'] = home_kenpom[col]

    for col in kenpom_df.columns:
        if col not in ['team', 'team_normalized']:
            features[f'team_2_{col}'] = away_kenpom[col]

    features['team_1_is_home'] = True

    return pd.DataFrame([features])


def push_predictions_to_api(predictions):
    """Push predictions to the API"""
    try:
        response = requests.post(
            f"{API_URL}/api/predictions/update",
            json={"predictions": predictions},
            timeout=5
        )
        if response.status_code == 200:
            print("✅ Predictions pushed to API successfully")
            return True
        else:
            print(f"⚠️  API returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("⚠️  Could not connect to API at localhost:8000")
        print("   Start the API with: python api/main.py")
        return False
    except Exception as e:
        print(f"⚠️  Error pushing to API: {e}")
        return False


def main():
    """Main prediction pipeline"""
    print("="*80)
    print("NCAA Basketball Predictions → Dashboard Pusher")
    print("="*80)

    # Get tomorrow's games
    tomorrow = datetime.now() + timedelta(days=1)
    date_str = tomorrow.strftime("%Y-%m-%d")

    games = fetch_upcoming_games(date_str)
    if not games:
        print(f"\nNo games found for {date_str}")
        return False

    # Load model and data
    print(f"\nLoading model from: {MODEL_PATH}")
    with open(MODEL_PATH, 'rb') as f:
        ensemble = pickle.load(f)

    print(f"Loading KenPom data from: {KENPOM_PATH}")
    kenpom_df = load_kenpom_ratings()

    # Make predictions
    print(f"\nMaking predictions for {len(games)} games...")
    predictions = []

    for game in games:
        home_team = game['home_team']
        away_team = game['away_team']

        features = prepare_game_features(home_team, away_team, kenpom_df)
        if features is None:
            print(f"  ⚠️  Skipping {home_team} vs {away_team} (teams not found)")
            continue

        # Get prediction details from Pomeroy (uses enhanced model with adjustments)
        pomeroy_details = ensemble.pomeroy.predict_with_details(features)

        # Calculate confidence
        home_adjem = features['team_1_adjem'].values[0] if 'team_1_adjem' in features else 0
        away_adjem = features['team_2_adjem'].values[0] if 'team_2_adjem' in features else 0
        avg_strength = (abs(home_adjem) + abs(away_adjem)) / 2
        confidence = min(100, 50 + avg_strength * 2)

        # Get tempo and check for sweet spot
        predicted_tempo = pomeroy_details['possessions'].values[0]
        in_tempo_sweet_spot = 66.0 <= predicted_tempo <= 68.0

        # Calculate blowout risk (AdjEM difference > 15)
        adjem_diff = abs(home_adjem - away_adjem)
        is_blowout_risk = adjem_diff > 15

        # Get individual model predictions for transparency
        pomeroy_prediction = ensemble.pomeroy.predict(features)[0]
        ml_prediction = ensemble.ml.predict(features)[0]

        prediction = {
            'date': game['commence_time'],
            'home_team': home_team,
            'away_team': away_team,
            'home_projected_score': float(round(pomeroy_details['team1_points'].values[0], 1)),
            'away_projected_score': float(round(pomeroy_details['team2_points'].values[0], 1)),
            'projected_total': float(round(pomeroy_details['total_points'].values[0], 1)),
            'home_efficiency': float(round(pomeroy_details['team1_efficiency'].values[0], 1)),
            'away_efficiency': float(round(pomeroy_details['team2_efficiency'].values[0], 1)),
            'confidence': float(round(confidence, 0)),
            'ou_line': float(game['ou_line']) if game.get('ou_line') else None,
            'projected_tempo': float(round(predicted_tempo, 1)),
            'adjustments': float(round(pomeroy_details.get('adjustments', 0).values[0], 1)),
            'early_season_bonus': float(round(pomeroy_details.get('early_season_bonus', 0).values[0], 1)),
            'tempo_bonus': float(round(pomeroy_details.get('tempo_bonus', 0).values[0], 1)),
            'in_tempo_sweet_spot': bool(in_tempo_sweet_spot),
            # New fields for betting optimization
            'is_blowout_risk': bool(is_blowout_risk),
            'adjem_differential': float(round(adjem_diff, 1)),
            'home_adjem': float(round(home_adjem, 1)),
            'away_adjem': float(round(away_adjem, 1)),
            'pomeroy_prediction': float(round(pomeroy_prediction, 1)),
            'ml_prediction': float(round(ml_prediction, 1)),
            'model_agreement': float(round(abs(pomeroy_prediction - ml_prediction), 1))
        }

        # Add O/U comparison
        if prediction['ou_line'] is not None:
            diff = prediction['projected_total'] - prediction['ou_line']
            prediction['vs_line'] = float(round(diff, 1))
            if diff > 2:
                prediction['suggestion'] = 'OVER'
            elif diff < -2:
                prediction['suggestion'] = 'UNDER'
            else:
                prediction['suggestion'] = 'PASS'
        else:
            prediction['vs_line'] = None
            prediction['suggestion'] = 'NO LINE'

        predictions.append(prediction)
        print(f"  ✅ {home_team} vs {away_team}: {prediction['projected_total']} (Tempo: {prediction['projected_tempo']:.1f})")

    if not predictions:
        print("\n⚠️  No valid predictions generated")
        return False

    # Save to CSV
    df = pd.DataFrame(predictions)
    csv_path = PREDICTIONS_DIR / f"predictions_{date_str}.csv"
    df.to_csv(csv_path, index=False)
    print(f"\n✅ Saved predictions to: {csv_path}")

    # Push to API
    print("\nPushing to API...")
    push_predictions_to_api(predictions)

    # Display summary
    print("\n" + "="*80)
    print("PREDICTION SUMMARY")
    print("="*80)
    print(f"Games predicted: {len(predictions)}")
    print(f"Average projected total: {df['projected_total'].mean():.1f}")
    print(f"Average confidence: {df['confidence'].mean():.0f}/100")
    print(f"Games in tempo sweet spot (66-68): {sum(df['in_tempo_sweet_spot'])}")
    print(f"Average early season bonus: {df['early_season_bonus'].mean():.1f} points")
    print(f"Average tempo bonus: {df['tempo_bonus'].mean():.1f} points")

    if df['ou_line'].notna().any():
        over_picks = (df['suggestion'] == 'OVER').sum()
        under_picks = (df['suggestion'] == 'UNDER').sum()
        print(f"\nSuggestions: {over_picks} OVER, {under_picks} UNDER")

    print("\n✅ Dashboard should be updated at http://localhost:3002")
    print("   (Make sure API is running: python api/main.py)")
    print("   (Make sure Frontend is running: cd frontend && npm run dev)")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

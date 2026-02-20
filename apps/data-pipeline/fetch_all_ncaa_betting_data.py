#!/usr/bin/env python3
"""
ESPN NCAA Basketball Betting Data Fetcher (All Games)

Fetches betting data for all college basketball games this season from ESPN

Usage: python fetch_all_ncaa_betting_data.py
"""

import requests
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import json
import time
from typing import List, Dict


# ============================================================================
# CONFIGURATION
# ============================================================================

# ESPN API endpoints
ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball"
ESPN_SCOREBOARD_URL = f"{ESPN_BASE_URL}/scoreboard"
ESPN_SUMMARY_URL = f"{ESPN_BASE_URL}/summary"

# Season configuration
# Full 2024-25 season to date
SEASON_START = "2024-11-01"  # Season start
SEASON_END = "2024-11-22"    # Today

# Request headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
}

# Output directory
OUTPUT_DIR = Path.home() / "Desktop" / "basketball-betting" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================================
# ESPN BETTING DATA FETCHER
# ============================================================================

class NCAABettingFetcher:
    """Fetches betting data for all NCAA basketball games"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.all_games = []
        self.betting_data = []

    def fetch_games_for_date(self, date_str: str) -> List[Dict]:
        """
        Fetch all games for a specific date

        Args:
            date_str: Date in YYYYMMDD format

        Returns:
            List of game dictionaries
        """
        try:
            params = {'dates': date_str}
            response = self.session.get(ESPN_SCOREBOARD_URL, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()
            events = data.get('events', [])

            print(f"  {date_str}: Found {len(events)} games")

            return events

        except Exception as e:
            print(f"  {date_str}: Error - {e}")
            return []

    def fetch_all_season_games(self, start_date: str, end_date: str) -> List[Dict]:
        """
        Fetch all games for the entire season

        Args:
            start_date: Start date YYYY-MM-DD
            end_date: End date YYYY-MM-DD

        Returns:
            List of all games
        """
        print("\n" + "=" * 70)
        print("FETCHING ALL SEASON GAMES")
        print("=" * 70)
        print(f"Date Range: {start_date} to {end_date}")
        print("=" * 70)

        all_games = []

        # Convert to datetime
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        current_date = start

        while current_date <= end:
            date_str = current_date.strftime("%Y%m%d")
            games = self.fetch_games_for_date(date_str)

            if games:
                all_games.extend(games)

            # Move to next day
            current_date += timedelta(days=1)

            # Be respectful to API - small delay
            time.sleep(0.5)

        print("\n" + "=" * 70)
        print(f"✓ Total games found: {len(all_games)}")
        print("=" * 70)

        self.all_games = all_games
        return all_games

    def extract_betting_data_from_game(self, game: dict) -> Dict:
        """
        Extract betting data from a game object

        Args:
            game: Game dictionary from scoreboard

        Returns:
            Dictionary with betting and game info
        """
        try:
            game_id = game.get('id', '')
            game_name = game.get('name', '')
            game_date = game.get('date', '')

            # Get competition data
            competitions = game.get('competitions', [{}])
            competition = competitions[0] if competitions else {}

            # Get teams
            competitors = competition.get('competitors', [])
            home_team = {'name': '', 'abbreviation': '', 'score': '', 'id': ''}
            away_team = {'name': '', 'abbreviation': '', 'score': '', 'id': ''}

            for comp in competitors:
                team = comp.get('team', {})
                team_info = {
                    'name': team.get('displayName', ''),
                    'abbreviation': team.get('abbreviation', ''),
                    'score': comp.get('score', ''),
                    'id': team.get('id', '')
                }

                if comp.get('homeAway') == 'home':
                    home_team = team_info
                else:
                    away_team = team_info

            # Get status
            status = competition.get('status', {})
            status_type = status.get('type', {}).get('description', '')

            # Get venue
            venue = competition.get('venue', {})

            # Extract betting odds
            odds_data = competition.get('odds', [])
            betting_info = self._parse_odds(odds_data)

            # Combine all data
            game_data = {
                'game_id': game_id,
                'game_date': game_date,
                'game_name': game_name,
                'status': status_type,
                'venue': venue.get('fullName', ''),
                'home_team': home_team['name'],
                'home_abbreviation': home_team['abbreviation'],
                'home_score': home_team['score'],
                'home_team_id': home_team['id'],
                'away_team': away_team['name'],
                'away_abbreviation': away_team['abbreviation'],
                'away_score': away_team['score'],
                'away_team_id': away_team['id'],
            }

            # Merge betting info
            game_data.update(betting_info)

            return game_data

        except Exception as e:
            print(f"  Warning: Error extracting data for game {game.get('id', 'unknown')}: {e}")
            return {}

    def _parse_odds(self, odds_list: List[Dict]) -> Dict:
        """
        Parse betting odds from odds list

        Args:
            odds_list: List of odds providers

        Returns:
            Dictionary with betting data
        """
        betting_data = {
            'has_odds': False,
            'provider': '',
            'spread': '',
            'over_under': '',
            'home_moneyline': '',
            'away_moneyline': '',
            'home_spread_odds': '',
            'away_spread_odds': '',
            'over_odds': '',
            'under_odds': '',
            'details': ''
        }

        if not odds_list:
            return betting_data

        # Use first provider (usually ESPN BET or consensus)
        odds = odds_list[0] if odds_list else {}

        if not odds:
            return betting_data

        betting_data['has_odds'] = True
        betting_data['provider'] = odds.get('provider', {}).get('name', '')
        betting_data['details'] = odds.get('details', '')
        betting_data['spread'] = odds.get('spread', '')
        betting_data['over_under'] = odds.get('overUnder', '')

        # Get home/away team odds if available
        home_odds = odds.get('homeTeamOdds', {})
        away_odds = odds.get('awayTeamOdds', {})

        if home_odds:
            betting_data['home_moneyline'] = home_odds.get('moneyLine', '')
            betting_data['home_spread_odds'] = home_odds.get('spreadOdds', '')

        if away_odds:
            betting_data['away_moneyline'] = away_odds.get('moneyLine', '')
            betting_data['away_spread_odds'] = away_odds.get('spreadOdds', '')

        betting_data['over_odds'] = odds.get('overOdds', '')
        betting_data['under_odds'] = odds.get('underOdds', '')

        return betting_data

    def fetch_detailed_betting_data(self, game_id: str) -> Dict:
        """
        Fetch detailed betting data for a specific game from summary endpoint

        Args:
            game_id: ESPN game ID

        Returns:
            Dictionary with detailed betting data
        """
        try:
            params = {'event': game_id}
            response = self.session.get(ESPN_SUMMARY_URL, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()

            # Extract pickcenter data
            pickcenter = data.get('pickcenter', [])

            if not pickcenter:
                return {}

            pick = pickcenter[0] if pickcenter else {}

            provider = pick.get('provider', {})
            home_odds = pick.get('homeTeamOdds', {})
            away_odds = pick.get('awayTeamOdds', {})

            detailed_data = {
                'provider': provider.get('name', ''),
                'details': pick.get('details', ''),
                'spread': pick.get('spread', ''),
                'over_under': pick.get('overUnder', ''),
                'over_odds': pick.get('overOdds', ''),
                'under_odds': pick.get('underOdds', ''),
                'home_favorite': home_odds.get('favorite', ''),
                'home_moneyline': home_odds.get('moneyLine', ''),
                'home_spread_odds': home_odds.get('spreadOdds', ''),
                'away_favorite': away_odds.get('favorite', ''),
                'away_moneyline': away_odds.get('moneyLine', ''),
                'away_spread_odds': away_odds.get('spreadOdds', ''),
            }

            return detailed_data

        except Exception as e:
            return {}

    def process_all_games(self, fetch_detailed: bool = True) -> pd.DataFrame:
        """
        Process all games and extract betting data

        Args:
            fetch_detailed: If True, fetch detailed data for each game via summary endpoint (required for odds)

        Returns:
            DataFrame with all betting data
        """
        print("\n" + "=" * 70)
        print("PROCESSING GAMES AND EXTRACTING BETTING DATA")
        print("=" * 70)
        print(f"Fetching detailed odds from summary endpoint for each game...")
        print("=" * 70)

        all_data = []

        for i, game in enumerate(self.all_games, 1):
            game_data = self.extract_betting_data_from_game(game)

            if game_data:
                # Fetch detailed data from summary endpoint (where betting odds live)
                if fetch_detailed:
                    if i % 10 == 0 or i == 1:
                        print(f"  [{i}/{len(self.all_games)}] {game_data.get('game_name', 'Unknown')}")

                    detailed = self.fetch_detailed_betting_data(game_data['game_id'])
                    if detailed:
                        # Update with detailed betting data
                        game_data.update(detailed)
                        game_data['has_odds'] = True

                    # Be respectful to API
                    time.sleep(0.3)

                all_data.append(game_data)

        df = pd.DataFrame(all_data)

        print(f"\n✓ Processed {len(df)} games")
        if 'has_odds' in df.columns:
            print(f"✓ Games with betting odds: {len(df[df['has_odds'] == True])}")

        return df


# ============================================================================
# DATA ANALYSIS & SAVING
# ============================================================================

def analyze_betting_data(df: pd.DataFrame):
    """Display summary statistics"""

    print("\n" + "=" * 70)
    print("BETTING DATA SUMMARY")
    print("=" * 70)

    total_games = len(df)
    games_with_odds = len(df[df['has_odds'] == True])
    completed_games = len(df[df['status'] == 'Final'])

    print(f"\nTotal games: {total_games}")
    print(f"Games with betting odds: {games_with_odds} ({games_with_odds/total_games*100:.1f}%)")
    print(f"Completed games: {completed_games}")

    # Status breakdown
    print("\nGame Status Breakdown:")
    status_counts = df['status'].value_counts()
    for status, count in status_counts.head(10).items():
        print(f"  {status}: {count}")

    # Provider breakdown
    if 'provider' in df.columns:
        print("\nBetting Provider Breakdown:")
        provider_counts = df[df['has_odds'] == True]['provider'].value_counts()
        for provider, count in provider_counts.head(10).items():
            print(f"  {provider}: {count}")

    # Sample of games with odds
    games_with_betting = df[df['has_odds'] == True]

    if not games_with_betting.empty:
        print("\nSample Games with Betting Data:")
        sample = games_with_betting[['game_date', 'away_team', 'home_team', 'spread', 'over_under', 'status']].head(10)
        print(sample.to_string(index=False))


def save_data(df: pd.DataFrame, output_dir: Path) -> Dict:
    """Save data to CSV and Excel files"""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    season = "2024_25"

    saved_files = {}

    # Add metadata
    df['fetch_timestamp'] = datetime.now().isoformat()
    df['data_source'] = 'espn_api'

    # Save all games CSV
    csv_all = output_dir / f"ncaa_betting_all_games_{season}_{timestamp}.csv"
    df.to_csv(csv_all, index=False)
    saved_files['csv_all'] = csv_all

    csv_latest = output_dir / f"ncaa_betting_all_games_{season}_latest.csv"
    df.to_csv(csv_latest, index=False)
    saved_files['csv_latest'] = csv_latest

    # Save games with odds only
    games_with_odds = df[df['has_odds'] == True]

    if not games_with_odds.empty:
        csv_odds = output_dir / f"ncaa_betting_odds_only_{season}_{timestamp}.csv"
        games_with_odds.to_csv(csv_odds, index=False)
        saved_files['csv_odds'] = csv_odds

        csv_odds_latest = output_dir / f"ncaa_betting_odds_only_{season}_latest.csv"
        games_with_odds.to_csv(csv_odds_latest, index=False)
        saved_files['csv_odds_latest'] = csv_odds_latest

    # Excel files
    try:
        xlsx_all = output_dir / f"NCAA_BETTING_ALL_GAMES_{season}_{timestamp}.xlsx"
        df.to_excel(xlsx_all, index=False, engine='openpyxl')
        saved_files['xlsx_all'] = xlsx_all

        if not games_with_odds.empty:
            xlsx_odds = output_dir / f"NCAA_BETTING_ODDS_ONLY_{season}_{timestamp}.xlsx"
            games_with_odds.to_excel(xlsx_odds, index=False, engine='openpyxl')
            saved_files['xlsx_odds'] = xlsx_odds
    except Exception as e:
        print(f"  Warning: Could not save Excel files: {e}")

    return saved_files


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main execution"""

    print("=" * 70)
    print("ESPN NCAA Basketball Betting Data Fetcher (Full Season)")
    print("=" * 70)
    print(f"Season: 2024-25")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 70)

    # Create fetcher
    fetcher = NCAABettingFetcher()

    # Fetch all games
    print("\n[1/3] Fetching all games...")
    all_games = fetcher.fetch_all_season_games(SEASON_START, SEASON_END)

    if not all_games:
        print("\n✗ No games found")
        return False

    # Process games
    print("\n[2/3] Processing games...")
    # fetch_detailed=True is required to get betting odds from summary endpoint
    df = fetcher.process_all_games(fetch_detailed=True)

    if df.empty:
        print("\n✗ No data extracted")
        return False

    # Analyze
    analyze_betting_data(df)

    # Save
    print("\n[3/3] Saving data...")
    saved_files = save_data(df, OUTPUT_DIR)

    print("\n" + "=" * 70)
    print("SUCCESS!")
    print("=" * 70)
    print("\nFiles saved:")
    for file_type, file_path in saved_files.items():
        print(f"  {file_type}: {file_path.name}")

    print(f"\n✓ All files saved to: {OUTPUT_DIR}")
    print("=" * 70)

    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

#!/usr/bin/env python3
"""
ESPN Betting Data Fetcher

Fetches historical betting lines and odds data from ESPN for college football games

Usage: python fetch_espn_betting_data.py
"""

import requests
import pandas as pd
from datetime import datetime
from pathlib import Path
import json


# ============================================================================
# CONFIGURATION
# ============================================================================

# ESPN API endpoints
ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/college-football"
ESPN_SUMMARY_URL = f"{ESPN_BASE_URL}/summary"

# Request headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
}


# ============================================================================
# ESPN BETTING DATA FETCHER
# ============================================================================

class ESPNBettingFetcher:
    """Fetches betting lines and odds data from ESPN"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def fetch_game_betting_data(self, game_id: str) -> dict:
        """
        Fetch betting data for a specific game

        Args:
            game_id: ESPN game ID (e.g., "401752778")

        Returns:
            Dictionary with betting data
        """
        print(f"\nFetching betting data for game ID: {game_id}")
        print("=" * 70)

        try:
            # Get game summary
            params = {'event': game_id}
            response = self.session.get(ESPN_SUMMARY_URL, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()

            # Extract game info
            game_info = self._extract_game_info(data)

            # Extract betting data
            betting_data = self._extract_betting_data(data)

            # Extract pickcenter data (betting percentages, etc.)
            pickcenter_data = self._extract_pickcenter_data(data)

            # Combine all data
            result = {
                'game_info': game_info,
                'betting_lines': betting_data,
                'pickcenter': pickcenter_data,
                'raw_data': data  # Keep for debugging
            }

            return result

        except Exception as e:
            print(f"✗ Error fetching data: {e}")
            return {}

    def _extract_game_info(self, data: dict) -> dict:
        """Extract basic game information"""
        try:
            header = data.get('header', {})
            competition = header.get('competitions', [{}])[0]

            # Get teams
            competitors = competition.get('competitors', [])
            home_team = None
            away_team = None

            for comp in competitors:
                team = comp.get('team', {})
                if comp.get('homeAway') == 'home':
                    home_team = {
                        'name': team.get('displayName', ''),
                        'abbreviation': team.get('abbreviation', ''),
                        'score': comp.get('score', ''),
                        'record': comp.get('records', [{}])[0].get('summary', '') if comp.get('records') else ''
                    }
                else:
                    away_team = {
                        'name': team.get('displayName', ''),
                        'abbreviation': team.get('abbreviation', ''),
                        'score': comp.get('score', ''),
                        'record': comp.get('records', [{}])[0].get('summary', '') if comp.get('records') else ''
                    }

            # Get status
            status = competition.get('status', {})

            game_info = {
                'game_id': header.get('id', ''),
                'game_date': competition.get('date', ''),
                'home_team': home_team,
                'away_team': away_team,
                'status': status.get('type', {}).get('description', ''),
                'venue': competition.get('venue', {}).get('fullName', ''),
                'attendance': competition.get('attendance', '')
            }

            return game_info

        except Exception as e:
            print(f"  Warning: Error extracting game info: {e}")
            return {}

    def _extract_betting_data(self, data: dict) -> list:
        """Extract betting lines (spread, over/under, moneyline)"""
        betting_lines = []

        try:
            # Check in pickcenter first
            pickcenter = data.get('pickcenter', [])
            for pick in pickcenter:
                provider = pick.get('provider', {})
                details = pick.get('details', '')

                # Get home and away team odds
                home_odds = pick.get('homeTeamOdds', {})
                away_odds = pick.get('awayTeamOdds', {})

                # Parse the betting line with full details
                betting_lines.append({
                    'provider': provider.get('name', ''),
                    'provider_id': provider.get('id', ''),
                    'details': details,
                    'spread': pick.get('spread', ''),
                    'over_under': pick.get('overUnder', ''),
                    'over_odds': pick.get('overOdds', ''),
                    'under_odds': pick.get('underOdds', ''),

                    # Home team odds
                    'home_favorite': home_odds.get('favorite', ''),
                    'home_moneyline': home_odds.get('moneyLine', ''),
                    'home_spread_odds': home_odds.get('spreadOdds', ''),

                    # Away team odds
                    'away_favorite': away_odds.get('favorite', ''),
                    'away_moneyline': away_odds.get('moneyLine', ''),
                    'away_spread_odds': away_odds.get('spreadOdds', ''),
                })

            # Also check in odds section if available
            odds = data.get('odds', [])
            for odd in odds:
                provider = odd.get('provider', {})

                betting_lines.append({
                    'provider': provider.get('name', ''),
                    'provider_id': provider.get('id', ''),
                    'details': odd.get('details', ''),
                    'over_under': odd.get('overUnder', ''),
                    'spread': odd.get('spread', ''),
                    'open_line': odd.get('open', {}),
                    'current_line': odd.get('current', {})
                })

        except Exception as e:
            print(f"  Warning: Error extracting betting data: {e}")

        return betting_lines

    def _extract_pickcenter_data(self, data: dict) -> dict:
        """Extract pickcenter data (betting percentages, expert picks, etc.)"""
        try:
            pickcenter = data.get('pickcenter', [])

            if not pickcenter:
                return {}

            # Usually first item has the main data
            main_pick = pickcenter[0] if pickcenter else {}

            return {
                'against_the_spread': main_pick.get('againstTheSpread', {}),
                'over_under_picks': main_pick.get('overUnder', {}),
                'spread_record': main_pick.get('spreadRecord', {}),
                'predictions': main_pick.get('predictions', []),
                'game_projection': main_pick.get('gameProjection', {})
            }

        except Exception as e:
            print(f"  Warning: Error extracting pickcenter data: {e}")
            return {}


# ============================================================================
# DATA PROCESSING & DISPLAY
# ============================================================================

def display_game_summary(game_data: dict):
    """Display formatted game summary"""

    if not game_data:
        print("No data to display")
        return

    game_info = game_data.get('game_info', {})

    print("\n" + "=" * 70)
    print("GAME SUMMARY")
    print("=" * 70)

    if game_info:
        away = game_info.get('away_team', {})
        home = game_info.get('home_team', {})

        print(f"\nGame ID: {game_info.get('game_id')}")
        print(f"Date: {game_info.get('game_date')}")
        print(f"Venue: {game_info.get('venue')}")
        print(f"Status: {game_info.get('status')}")

        if game_info.get('attendance'):
            print(f"Attendance: {game_info.get('attendance'):,}")

        print(f"\n{away.get('name', 'Away')} ({away.get('record', '')})")
        print(f"  Score: {away.get('score', 'N/A')}")

        print(f"\n{home.get('name', 'Home')} ({home.get('record', '')})")
        print(f"  Score: {home.get('score', 'N/A')}")

    # Display betting lines
    betting_lines = game_data.get('betting_lines', [])

    if betting_lines:
        print("\n" + "=" * 70)
        print("BETTING LINES")
        print("=" * 70)

        for i, line in enumerate(betting_lines, 1):
            provider = line.get('provider', 'Unknown')
            print(f"\n{i}. {provider}")
            print(f"   Details: {line.get('details', 'N/A')}")

            # Spread
            if line.get('spread'):
                print(f"\n   SPREAD: {line.get('spread')}")
                if line.get('home_spread_odds'):
                    print(f"     Home Spread Odds: {line.get('home_spread_odds')}")
                if line.get('away_spread_odds'):
                    print(f"     Away Spread Odds: {line.get('away_spread_odds')}")

            # Over/Under
            if line.get('over_under'):
                print(f"\n   OVER/UNDER: {line.get('over_under')}")
                if line.get('over_odds'):
                    print(f"     Over Odds: {line.get('over_odds')}")
                if line.get('under_odds'):
                    print(f"     Under Odds: {line.get('under_odds')}")

            # Moneylines
            if line.get('home_moneyline') or line.get('away_moneyline'):
                print(f"\n   MONEYLINES:")
                if line.get('home_moneyline'):
                    fav_text = " (Favorite)" if line.get('home_favorite') else ""
                    print(f"     Home: {line.get('home_moneyline')}{fav_text}")
                if line.get('away_moneyline'):
                    fav_text = " (Favorite)" if line.get('away_favorite') else ""
                    print(f"     Away: {line.get('away_moneyline')}{fav_text}")

            # Show open vs current if available
            if line.get('open_line'):
                print(f"\n   Open Line: {line.get('open_line')}")
            if line.get('current_line'):
                print(f"   Current Line: {line.get('current_line')}")

    # Display pickcenter data
    pickcenter = game_data.get('pickcenter', {})

    if pickcenter:
        print("\n" + "=" * 70)
        print("BETTING TRENDS & PICKS")
        print("=" * 70)

        if pickcenter.get('against_the_spread'):
            ats = pickcenter['against_the_spread']
            print(f"\nAgainst the Spread: {ats}")

        if pickcenter.get('over_under_picks'):
            ou = pickcenter['over_under_picks']
            print(f"Over/Under Picks: {ou}")

        if pickcenter.get('game_projection'):
            proj = pickcenter['game_projection']
            print(f"Game Projection: {proj}")


def save_to_files(game_data: dict, game_id: str, output_dir: Path):
    """Save data to CSV and JSON files"""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save raw JSON
    json_file = output_dir / f"espn_betting_{game_id}_{timestamp}.json"
    with open(json_file, 'w') as f:
        json.dump(game_data, f, indent=2)
    print(f"\n✓ Saved raw data: {json_file.name}")

    # Create CSV for betting lines
    betting_lines = game_data.get('betting_lines', [])
    if betting_lines:
        df = pd.DataFrame(betting_lines)
        csv_file = output_dir / f"espn_betting_lines_{game_id}_{timestamp}.csv"
        df.to_csv(csv_file, index=False)
        print(f"✓ Saved betting lines CSV: {csv_file.name}")

        # Excel too
        try:
            xlsx_file = output_dir / f"espn_betting_lines_{game_id}_{timestamp}.xlsx"
            df.to_excel(xlsx_file, index=False, engine='openpyxl')
            print(f"✓ Saved betting lines Excel: {xlsx_file.name}")
        except:
            pass

    # Create summary CSV
    game_info = game_data.get('game_info', {})
    if game_info:
        summary_data = {
            'game_id': [game_info.get('game_id')],
            'game_date': [game_info.get('game_date')],
            'away_team': [game_info.get('away_team', {}).get('name')],
            'away_score': [game_info.get('away_team', {}).get('score')],
            'home_team': [game_info.get('home_team', {}).get('name')],
            'home_score': [game_info.get('home_team', {}).get('score')],
            'status': [game_info.get('status')],
            'venue': [game_info.get('venue')],
        }

        df_summary = pd.DataFrame(summary_data)
        csv_summary = output_dir / f"espn_game_summary_{game_id}_{timestamp}.csv"
        df_summary.to_csv(csv_summary, index=False)
        print(f"✓ Saved game summary CSV: {csv_summary.name}")


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main execution"""

    # Game ID from the URL: https://www.espn.com/college-football/game/_/gameId/401752778/missouri-oklahoma
    GAME_ID = "401752778"

    # Output directory
    OUTPUT_DIR = Path.home() / "Desktop" / "basketball-betting" / "data"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("ESPN Betting Data Fetcher")
    print("=" * 70)
    print(f"Game ID: {GAME_ID}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 70)

    # Fetch data
    fetcher = ESPNBettingFetcher()
    game_data = fetcher.fetch_game_betting_data(GAME_ID)

    if not game_data:
        print("\n✗ Failed to fetch data")
        return False

    # Display summary
    display_game_summary(game_data)

    # Save to files
    print("\n" + "=" * 70)
    print("SAVING DATA")
    print("=" * 70)
    save_to_files(game_data, GAME_ID, OUTPUT_DIR)

    print("\n" + "=" * 70)
    print("COMPLETE!")
    print(f"All files saved to: {OUTPUT_DIR}")
    print("=" * 70)

    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

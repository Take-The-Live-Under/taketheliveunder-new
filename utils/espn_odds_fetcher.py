"""
ESPN Odds Fetcher
Fetches betting odds (opening/closing lines) from ESPN's game summary API
"""
import requests
from typing import Dict, Optional
from loguru import logger


class ESPNOddsFetcher:
    """Fetches betting odds from ESPN game summary API"""

    SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

    def fetch_game_odds(self, game_id: str) -> Optional[Dict]:
        """
        Fetch betting odds and team fouls for a specific game

        Args:
            game_id: ESPN game ID

        Returns:
            Dict with:
            - closing_total: Closing over/under line
            - opening_total: Opening over/under line
            - closing_spread: Closing point spread
            - opening_spread: Opening point spread
            - home_fouls: Home team fouls
            - away_fouls: Away team fouls
        """
        try:
            params = {'event': game_id}
            response = self.session.get(self.SUMMARY_URL, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Extract odds from pickcenter
            pickcenter = data.get('pickcenter', [])
            if not pickcenter or len(pickcenter) == 0:
                logger.debug(f"No odds data available for game {game_id}")
                return None

            odds_data = pickcenter[0]

            # Extract total (over/under) lines
            total_data = odds_data.get('total', {})
            over_data = total_data.get('over', {})

            closing_total = None
            opening_total = None

            if 'close' in over_data:
                close_line = over_data['close'].get('line', '')
                # Line format is "o144.5" - extract the number
                if close_line and close_line.startswith('o'):
                    try:
                        closing_total = float(close_line[1:])
                    except:
                        pass

            if 'open' in over_data:
                open_line = over_data['open'].get('line', '')
                # Line format is "o141.5" - extract the number
                if open_line and open_line.startswith('o'):
                    try:
                        opening_total = float(open_line[1:])
                    except:
                        pass

            # Extract spread lines
            spread_data = odds_data.get('pointSpread', {})
            home_spread_data = spread_data.get('home', {})

            closing_spread = None
            opening_spread = None

            if 'close' in home_spread_data:
                closing_spread = home_spread_data['close'].get('line')

            if 'open' in home_spread_data:
                opening_spread = home_spread_data['open'].get('line')

            # Extract fouls from boxscore
            home_fouls = None
            away_fouls = None

            boxscore = data.get('boxscore', {})
            teams = boxscore.get('teams', [])

            for team in teams:
                home_away = team.get('homeAway', '')  # homeAway is at root level, not inside 'team'

                stats = team.get('statistics', [])
                fouls = None

                for stat in stats:
                    if stat.get('name') == 'fouls':
                        try:
                            fouls = int(stat.get('displayValue', 0))
                        except:
                            pass
                        break

                if home_away == 'home':
                    home_fouls = fouls
                elif home_away == 'away':
                    away_fouls = fouls

            result = {
                'closing_total': closing_total,
                'opening_total': opening_total,
                'closing_spread': closing_spread,
                'opening_spread': opening_spread,
                'home_fouls': home_fouls,
                'away_fouls': away_fouls
            }

            logger.debug(f"Fetched odds for game {game_id}: {result}")
            return result

        except Exception as e:
            logger.warning(f"Error fetching ESPN odds for game {game_id}: {e}")
            return None


# Singleton instance
_espn_odds_fetcher = None

def get_espn_odds_fetcher() -> ESPNOddsFetcher:
    """Get singleton ESPN odds fetcher instance"""
    global _espn_odds_fetcher
    if _espn_odds_fetcher is None:
        _espn_odds_fetcher = ESPNOddsFetcher()
    return _espn_odds_fetcher

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
        Fetch betting odds and comprehensive team statistics for a specific game

        Args:
            game_id: ESPN game ID

        Returns:
            Dict with:
            - closing_total: Closing over/under line
            - opening_total: Opening over/under line
            - closing_spread: Closing point spread
            - opening_spread: Opening point spread
            - home_stats: Dict of home team live statistics
            - away_stats: Dict of away team live statistics
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

            # Extract comprehensive stats from boxscore
            home_stats = {}
            away_stats = {}

            boxscore = data.get('boxscore', {})
            teams = boxscore.get('teams', [])

            for team in teams:
                home_away = team.get('homeAway', '')
                stats = team.get('statistics', [])

                team_stats = self._extract_team_stats(stats)

                if home_away == 'home':
                    home_stats = team_stats
                elif home_away == 'away':
                    away_stats = team_stats

            result = {
                'closing_total': closing_total,
                'opening_total': opening_total,
                'closing_spread': closing_spread,
                'opening_spread': opening_spread,
                'home_stats': home_stats,
                'away_stats': away_stats
            }

            logger.debug(f"Fetched odds for game {game_id}: {result}")
            return result

        except Exception as e:
            logger.warning(f"Error fetching ESPN odds for game {game_id}: {e}")
            return None

    def _extract_team_stats(self, statistics: list) -> Dict:
        """
        Extract comprehensive team statistics from ESPN boxscore

        Args:
            statistics: List of stat dicts from ESPN API

        Returns:
            Dict with all team statistics including calculated metrics
        """
        stats_dict = {}

        # Helper function to parse "made-attempted" format
        def parse_made_attempted(value: str) -> tuple:
            try:
                parts = value.split('-')
                made = int(parts[0])
                attempted = int(parts[1])
                return made, attempted
            except:
                return 0, 0

        # Helper function to safely parse float
        def safe_float(value, default=0.0):
            try:
                return float(value)
            except:
                return default

        # Helper function to safely parse int
        def safe_int(value, default=0):
            try:
                return int(value)
            except:
                return default

        # Extract all stats from the statistics array
        for stat in statistics:
            name = stat.get('name', '')
            display_value = stat.get('displayValue', '')

            if name == 'fouls':
                stats_dict['fouls'] = safe_int(display_value)

            elif name == 'fieldGoalsMade-fieldGoalsAttempted':
                fg_made, fg_att = parse_made_attempted(display_value)
                stats_dict['fg_made'] = fg_made
                stats_dict['fg_attempted'] = fg_att

            elif name == 'fieldGoalPct':
                stats_dict['fg_pct'] = safe_float(display_value)

            elif name == 'threePointFieldGoalsMade-threePointFieldGoalsAttempted':
                three_made, three_att = parse_made_attempted(display_value)
                stats_dict['three_made'] = three_made
                stats_dict['three_attempted'] = three_att

            elif name == 'threePointFieldGoalPct':
                stats_dict['three_pct'] = safe_float(display_value)

            elif name == 'freeThrowsMade-freeThrowsAttempted':
                ft_made, ft_att = parse_made_attempted(display_value)
                stats_dict['ft_made'] = ft_made
                stats_dict['ft_attempted'] = ft_att

            elif name == 'freeThrowPct':
                stats_dict['ft_pct'] = safe_float(display_value)

            elif name == 'totalRebounds':
                stats_dict['rebounds_total'] = safe_int(display_value)

            elif name == 'offensiveRebounds':
                stats_dict['rebounds_offensive'] = safe_int(display_value)

            elif name == 'defensiveRebounds':
                stats_dict['rebounds_defensive'] = safe_int(display_value)

            elif name == 'assists':
                stats_dict['assists'] = safe_int(display_value)

            elif name == 'steals':
                stats_dict['steals'] = safe_int(display_value)

            elif name == 'blocks':
                stats_dict['blocks'] = safe_int(display_value)

            elif name == 'turnovers':
                stats_dict['turnovers'] = safe_int(display_value)

        # Calculate derived metrics
        fg_made = stats_dict.get('fg_made', 0)
        fg_att = stats_dict.get('fg_attempted', 0)
        three_made = stats_dict.get('three_made', 0)
        ft_att = stats_dict.get('ft_attempted', 0)

        # Effective Field Goal % = (FGM + 0.5 * 3PM) / FGA
        if fg_att > 0:
            stats_dict['effective_fg_pct'] = round(((fg_made + 0.5 * three_made) / fg_att) * 100, 1)
        else:
            stats_dict['effective_fg_pct'] = 0.0

        # True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))
        # Note: We don't have total points in stats, so we'll calculate it
        ft_made = stats_dict.get('ft_made', 0)
        points = (fg_made * 2) + three_made + ft_made  # Approximate (assumes all non-3P FG are 2P)
        ts_denominator = 2 * (fg_att + 0.44 * ft_att)
        if ts_denominator > 0:
            stats_dict['true_shooting_pct'] = round((points / ts_denominator) * 100, 1)
        else:
            stats_dict['true_shooting_pct'] = 0.0

        # Ensure all expected keys exist with default values
        default_stats = {
            'fouls': 0,
            'fg_made': 0,
            'fg_attempted': 0,
            'fg_pct': 0.0,
            'three_made': 0,
            'three_attempted': 0,
            'three_pct': 0.0,
            'ft_made': 0,
            'ft_attempted': 0,
            'ft_pct': 0.0,
            'rebounds_total': 0,
            'rebounds_offensive': 0,
            'rebounds_defensive': 0,
            'assists': 0,
            'steals': 0,
            'blocks': 0,
            'turnovers': 0,
            'effective_fg_pct': 0.0,
            'true_shooting_pct': 0.0
        }

        # Merge defaults with extracted stats
        for key, default_value in default_stats.items():
            if key not in stats_dict:
                stats_dict[key] = default_value

        return stats_dict


# Singleton instance
_espn_odds_fetcher = None

def get_espn_odds_fetcher() -> ESPNOddsFetcher:
    """Get singleton ESPN odds fetcher instance"""
    global _espn_odds_fetcher
    if _espn_odds_fetcher is None:
        _espn_odds_fetcher = ESPNOddsFetcher()
    return _espn_odds_fetcher

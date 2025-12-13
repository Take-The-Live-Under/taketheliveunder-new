"""
Referee Data Fetcher
Collects game data including referee assignments and foul counts from ESPN API
"""

import requests
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class RefereeFetcher:
    """Fetches NCAA basketball game data with referee assignments from ESPN API"""

    def __init__(self):
        self.base_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball"

    def fetch_games_by_date_range(self, start_date: datetime, end_date: datetime) -> List[Dict]:
        """
        Fetch all games within a date range

        Args:
            start_date: Start date for game collection
            end_date: End date for game collection

        Returns:
            List of game data dictionaries
        """
        all_games = []
        current_date = start_date

        while current_date <= end_date:
            date_str = current_date.strftime("%Y%m%d")
            logger.info(f"Fetching games for {date_str}")

            games = self._fetch_games_for_date(date_str)
            all_games.extend(games)

            current_date += timedelta(days=1)

        logger.info(f"Fetched {len(all_games)} total games")
        return all_games

    def _fetch_games_for_date(self, date_str: str) -> List[Dict]:
        """
        Fetch games for a specific date

        Args:
            date_str: Date in YYYYMMDD format

        Returns:
            List of game data dictionaries
        """
        url = f"{self.base_url}/scoreboard"
        params = {"dates": date_str}

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            games = []
            if "events" in data:
                for event in data["events"]:
                    game_data = self._parse_game_event(event)
                    if game_data:
                        games.append(game_data)

            return games

        except Exception as e:
            logger.error(f"Error fetching games for {date_str}: {e}")
            return []

    def _parse_game_event(self, event: Dict) -> Optional[Dict]:
        """
        Parse a single game event from ESPN API

        Args:
            event: Raw event data from ESPN

        Returns:
            Parsed game data or None if incomplete
        """
        try:
            # Only process completed games
            status = event.get("status", {}).get("type", {}).get("name", "")
            if status != "STATUS_FINAL":
                return None

            game_id = event.get("id")
            date = event.get("date")

            # Get teams
            competitions = event.get("competitions", [{}])[0]
            teams = competitions.get("competitors", [])

            if len(teams) != 2:
                return None

            # Determine home/away
            home_team = next((t for t in teams if t.get("homeAway") == "home"), None)
            away_team = next((t for t in teams if t.get("homeAway") == "away"), None)

            if not home_team or not away_team:
                return None

            # Get scores and stats
            home_score = int(home_team.get("score", 0))
            away_score = int(away_team.get("score", 0))

            # Get foul counts from statistics
            home_fouls = self._extract_fouls(home_team)
            away_fouls = self._extract_fouls(away_team)

            # Get referee information
            officials = competitions.get("officials", [])
            referee_names = [official.get("displayName", "") for official in officials]

            # Check for overtime
            periods = event.get("status", {}).get("period", 2)
            went_to_ot = periods > 2

            # Calculate score differential (final margin)
            score_diff = abs(home_score - away_score)

            return {
                "game_id": game_id,
                "date": datetime.fromisoformat(date.replace("Z", "+00:00")),
                "home_team": home_team.get("team", {}).get("displayName", "Unknown"),
                "away_team": away_team.get("team", {}).get("displayName", "Unknown"),
                "home_score": home_score,
                "away_score": away_score,
                "home_fouls": home_fouls,
                "away_fouls": away_fouls,
                "total_fouls": home_fouls + away_fouls,
                "referees": referee_names,
                "went_to_ot": went_to_ot,
                "score_diff": score_diff,
                "close_game": score_diff <= 10,  # Configurable threshold
            }

        except Exception as e:
            logger.error(f"Error parsing game event: {e}")
            return None

    def _extract_fouls(self, team_data: Dict) -> int:
        """
        Extract foul count from team statistics

        Args:
            team_data: Team data from ESPN API

        Returns:
            Number of fouls (0 if not found)
        """
        try:
            statistics = team_data.get("statistics", [])
            for stat in statistics:
                if stat.get("name") == "fouls":
                    return int(stat.get("displayValue", 0))

            # Fallback: try to find in stats array
            stats = team_data.get("stats", [])
            for stat in stats:
                if stat.get("name") == "fouls" or stat.get("abbreviation") == "PF":
                    return int(stat.get("value", 0))

            return 0

        except Exception as e:
            logger.warning(f"Could not extract foul count: {e}")
            return 0

    def fetch_season_games(self, season_start: datetime) -> List[Dict]:
        """
        Fetch all games from season start to today

        Args:
            season_start: Start date of the season

        Returns:
            List of all game data
        """
        today = datetime.now()
        return self.fetch_games_by_date_range(season_start, today)


def get_referee_fetcher() -> RefereeFetcher:
    """Get singleton instance of RefereeFetcher"""
    return RefereeFetcher()

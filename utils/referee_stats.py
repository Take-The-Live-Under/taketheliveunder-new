"""
Referee Statistics Loader and Matcher

Loads referee data from RefMetrics CSV and provides methods to:
- Get referee statistics (fouls/game, home bias, etc.)
- Match referee names with team stats
- Analyze referee tendencies for live games
"""

import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional
from loguru import logger


class RefereeStatsManager:
    """Manages referee statistics from RefMetrics data"""

    def __init__(self, csv_path: Optional[str] = None):
        """
        Initialize the referee stats manager

        Args:
            csv_path: Path to referee CSV file. If None, uses default location.
        """
        if csv_path is None:
            # Default to data directory in project root
            project_root = Path(__file__).parent.parent
            csv_path = project_root / "data" / "refmetrics_fouls_2024_25_auth_latest.csv"

        self.csv_path = Path(csv_path)
        self.stats_cache: Dict[str, Dict] = {}
        self.last_loaded = None

        # Load stats on init
        self._load_stats()

    def _load_stats(self):
        """Load referee stats from CSV file"""
        try:
            if not self.csv_path.exists():
                logger.warning(f"Referee data file not found: {self.csv_path}")
                return

            df = pd.read_csv(self.csv_path)
            logger.info(f"Loaded {len(df)} referees from {self.csv_path}")

            # Build cache: referee_name -> stats dict
            for _, row in df.iterrows():
                name = row['referee_name']
                self.stats_cache[name] = {
                    'name': name,
                    'total_fouls_per_game': float(row['total_fouls_per_game']),
                    'home_fouls_per_game': float(row['home_fouls_per_game']),
                    'away_fouls_per_game': float(row['away_fouls_per_game']),
                    'foul_differential': float(row['foul_differential']),
                    'total_games': int(row['total_games']),
                    'home_bias': float(row['home_bias']),
                    'consistency_score': float(row['consistency_score']),
                    'ref_style': row['ref_style'],
                    'rank_most_fouls': int(row['rank_most_fouls']) if pd.notna(row.get('rank_most_fouls')) else None,
                    'profile_url': row['profile_url']
                }

            self.last_loaded = pd.Timestamp.now()
            logger.success(f"Cached stats for {len(self.stats_cache)} referees")

        except Exception as e:
            logger.error(f"Error loading referee stats: {e}")

    def get_referee_stats(self, referee_name: str) -> Optional[Dict]:
        """
        Get stats for a specific referee

        Args:
            referee_name: Name of the referee

        Returns:
            Dictionary with referee stats, or None if not found
        """
        # Try exact match first
        if referee_name in self.stats_cache:
            return self.stats_cache[referee_name]

        # Try case-insensitive match
        referee_lower = referee_name.lower()
        for name, stats in self.stats_cache.items():
            if name.lower() == referee_lower:
                return stats

        # Try partial match (e.g., "John Smith" matches "John D. Smith")
        for name, stats in self.stats_cache.items():
            if referee_lower in name.lower() or name.lower() in referee_lower:
                return stats

        logger.debug(f"No stats found for referee: {referee_name}")
        return None

    def get_crew_stats(self, referee_names: List[str]) -> Dict:
        """
        Get aggregated stats for a referee crew

        Args:
            referee_names: List of referee names

        Returns:
            Dictionary with crew aggregate stats
        """
        crew_stats = []
        found_refs = []

        for ref_name in referee_names:
            stats = self.get_referee_stats(ref_name)
            if stats:
                crew_stats.append(stats)
                found_refs.append(ref_name)

        if not crew_stats:
            return {
                'found_refs': 0,
                'total_refs': len(referee_names),
                'avg_fouls_per_game': None,
                'avg_home_bias': None,
                'crew_style': 'Unknown'
            }

        # Calculate averages
        avg_fouls = sum(s['total_fouls_per_game'] for s in crew_stats) / len(crew_stats)
        avg_home_bias = sum(s['home_bias'] for s in crew_stats) / len(crew_stats)

        # Determine crew style based on average fouls
        if avg_fouls >= 40:
            crew_style = 'Tight'
        elif avg_fouls <= 32:
            crew_style = 'Loose'
        else:
            crew_style = 'Average'

        return {
            'found_refs': len(found_refs),
            'total_refs': len(referee_names),
            'referees': crew_stats,
            'avg_fouls_per_game': round(avg_fouls, 1),
            'avg_home_fouls': round(sum(s['home_fouls_per_game'] for s in crew_stats) / len(crew_stats), 1),
            'avg_away_fouls': round(sum(s['away_fouls_per_game'] for s in crew_stats) / len(crew_stats), 1),
            'avg_home_bias': round(avg_home_bias, 2),
            'crew_style': crew_style,
            'total_games_officiated': sum(s['total_games'] for s in crew_stats)
        }

    def get_all_referees(self, sort_by: str = 'total_fouls_per_game', ascending: bool = False) -> List[Dict]:
        """
        Get all referees sorted by a specific stat

        Args:
            sort_by: Stat to sort by (default: total_fouls_per_game)
            ascending: Sort order (default: False for descending)

        Returns:
            List of referee stats dictionaries
        """
        refs = list(self.stats_cache.values())

        try:
            refs.sort(key=lambda x: x.get(sort_by, 0), reverse=not ascending)
        except Exception as e:
            logger.warning(f"Could not sort by {sort_by}: {e}")

        return refs


# Singleton instance
_referee_stats_manager = None


def get_referee_stats_manager(csv_path: Optional[str] = None) -> RefereeStatsManager:
    """
    Get or create the singleton referee stats manager

    Args:
        csv_path: Optional path to CSV file

    Returns:
        RefereeStatsManager instance
    """
    global _referee_stats_manager

    if _referee_stats_manager is None:
        _referee_stats_manager = RefereeStatsManager(csv_path)

    return _referee_stats_manager

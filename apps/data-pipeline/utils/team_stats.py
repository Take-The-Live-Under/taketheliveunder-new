"""
Unified Team Stats Manager
Switches between KenPom, ESPN (NCAA), and NBA based on configuration
"""
from typing import Dict, Optional
from loguru import logger
import config

# Import all fetchers
from utils.team_stats_kenpom import get_kenpom_fetcher
from utils.team_stats_espn import get_espn_fetcher
from utils.team_stats_nba import get_nba_fetcher


class TeamStatsManager:
    """Unified interface for team statistics regardless of sport/data source"""

    def __init__(self):
        # Determine sport mode
        self.sport_mode = config.SPORT_MODE

        # For NBA, always use ESPN (no KenPom for NBA)
        if self.sport_mode == "nba":
            self.data_source = "nba_espn"
            self.fetcher = get_nba_fetcher()
            logger.info(f"Initialized TeamStatsManager for NBA (ESPN)")
        # For NCAA, use KenPom if configured, else ESPN
        elif config.USE_KENPOM:
            self.data_source = "kenpom"
            self.fetcher = get_kenpom_fetcher()
            logger.info(f"Initialized TeamStatsManager for NCAA (KenPom)")
        else:
            self.data_source = "espn"
            self.fetcher = get_espn_fetcher()
            logger.info(f"Initialized TeamStatsManager for NCAA (ESPN)")

    def fetch_all_stats(self, force_refresh: bool = False):
        """Fetch team statistics from configured source"""
        logger.info(f"Fetching team stats from {self.data_source}...")
        return self.fetcher.fetch_team_stats(force_refresh=force_refresh)

    def get_team_metrics(self, team_name: str) -> Optional[Dict]:
        """
        Get standardized metrics for a specific team

        Returns dict with:
        - team_name: Official team name
        - pace: Tempo/pace (possessions per game or per 40 min)
        - off_efficiency: Offensive efficiency (points per 100 possessions)
        - def_efficiency: Defensive efficiency (points allowed per 100 possessions)
        - three_p_rate: 3-point attempt rate (if available)
        - three_p_pct: 3-point percentage (if available)
        - ft_rate: Free throw rate (if available)
        - to_rate: Turnover rate (if available)
        - data_source: "kenpom" or "espn"
        """
        metrics = self.fetcher.get_team_metrics(team_name)

        if metrics is None:
            logger.warning(f"No metrics found for team: {team_name}")
            return None

        # Standardize metrics across sources
        # KenPom uses per-40-min pace, ESPN uses per-game
        # Normalize to per-game for consistency
        if config.USE_KENPOM and metrics.get("pace"):
            # Convert KenPom's per-40-min to per-game (approx)
            metrics["pace_per_game"] = metrics["pace"]
        else:
            metrics["pace_per_game"] = metrics.get("pace", 70)

        return metrics

    def get_matchup_metrics(self, home_team: str, away_team: str) -> tuple:
        """
        Get metrics for both teams in a matchup

        Returns:
        (home_metrics, away_metrics)
        """
        home = self.get_team_metrics(home_team)
        away = self.get_team_metrics(away_team)

        return home, away


# Singleton instance
_stats_manager = None

def get_stats_manager() -> TeamStatsManager:
    """Get singleton stats manager instance"""
    global _stats_manager
    if _stats_manager is None:
        _stats_manager = TeamStatsManager()
    return _stats_manager

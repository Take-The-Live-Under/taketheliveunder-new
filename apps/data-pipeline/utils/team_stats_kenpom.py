"""
KenPom Team Stats Fetcher
Uses kenpompy to get advanced metrics from kenpom.com
Requires KenPom subscription
"""
import pandas as pd
from typing import Dict, Optional
from datetime import datetime, timedelta
import kenpompy.utils as kp_utils
import kenpompy.summary as kp_summary
from loguru import logger
from pathlib import Path
import config


class KenPomStatsFetcher:
    """Fetches team statistics from KenPom"""

    def __init__(self):
        self.browser = None
        self.stats_cache = None
        self.last_fetch = None

    def _login(self):
        """Authenticate with KenPom"""
        try:
            logger.info("Logging into KenPom...")
            self.browser = kp_utils.login(
                config.KENPOM_EMAIL,
                config.KENPOM_PASSWORD
            )
            logger.success("KenPom login successful")
            return True
        except Exception as e:
            logger.error(f"KenPom login failed: {e}")
            return False

    def fetch_team_stats(self, force_refresh: bool = False) -> pd.DataFrame:
        """
        Fetch current season team statistics from KenPom

        Returns DataFrame with columns:
        - Team: Team name
        - AdjEM: Adjusted Efficiency Margin
        - AdjO: Adjusted Offensive Efficiency
        - AdjD: Adjusted Defensive Efficiency
        - AdjT: Adjusted Tempo (possessions per 40 minutes)
        - Luck: Luck rating
        - SOS_AdjEM: Strength of Schedule
        - OppO: Opponent Offensive Efficiency
        - OppD: Opponent Defensive Efficiency
        - NCSOS_AdjEM: Non-conference SOS
        """
        # Check if we have recent cached data
        if not force_refresh and self._is_cache_valid():
            logger.info("Using cached KenPom stats")
            return self.stats_cache

        # Login if needed
        if self.browser is None:
            if not self._login():
                raise Exception("Failed to login to KenPom")

        try:
            logger.info("Fetching team stats from KenPom...")

            # Get current season efficiency stats
            efficiency_df = kp_summary.get_efficiency(self.browser)

            logger.success(f"Fetched stats for {len(efficiency_df)} teams from KenPom")

            # Cache the results
            self.stats_cache = efficiency_df
            self.last_fetch = datetime.now()

            # Save to CSV for persistence
            self._save_to_csv(efficiency_df)

            return efficiency_df

        except Exception as e:
            logger.error(f"Error fetching KenPom stats: {e}")
            # Try to load from CSV backup
            return self._load_from_csv()

    def get_team_metrics(self, team_name: str) -> Optional[Dict]:
        """
        Get metrics for a specific team

        Returns dict with:
        - pace: Tempo (possessions per 40 min)
        - off_efficiency: Adjusted offensive efficiency
        - def_efficiency: Adjusted defensive efficiency
        - adj_em: Adjusted efficiency margin
        """
        if self.stats_cache is None:
            self.fetch_team_stats()

        # Try to find team (flexible matching)
        team_row = self._find_team(team_name)

        if team_row is None:
            logger.warning(f"Team not found in KenPom data: {team_name}")
            return None

        pace_value = float(team_row["AdjT"])
        return {
            "team_name": team_row["Team"],
            "kenpom_rank": int(team_row.get("Rk", 0)),
            "pace": pace_value,
            "pace_per_game": pace_value,  # Alias for compatibility with CSV logger
            "off_efficiency": float(team_row["AdjO"]),
            "def_efficiency": float(team_row["AdjD"]),
            "adj_em": float(team_row["AdjEM"]),
            "sos": float(team_row.get("SOS_AdjEM", 0)),
            "data_source": "kenpom"
        }

    def _find_team(self, team_name: str) -> Optional[pd.Series]:
        """Find team in stats cache with flexible matching"""
        if self.stats_cache is None:
            return None

        # Direct match
        direct = self.stats_cache[self.stats_cache["Team"] == team_name]
        if not direct.empty:
            return direct.iloc[0]

        # Case-insensitive match
        team_lower = team_name.lower()
        for idx, row in self.stats_cache.iterrows():
            if row["Team"].lower() == team_lower:
                return row

        # Partial match (contains)
        for idx, row in self.stats_cache.iterrows():
            if team_lower in row["Team"].lower() or row["Team"].lower() in team_lower:
                return row

        return None

    def _is_cache_valid(self) -> bool:
        """Check if cached stats are still valid"""
        if self.stats_cache is None or self.last_fetch is None:
            return False

        age = datetime.now() - self.last_fetch
        max_age = timedelta(hours=config.STATS_REFRESH_HOURS)

        return age < max_age

    def _save_to_csv(self, df: pd.DataFrame):
        """Save stats to CSV for backup"""
        try:
            filepath = config.CACHE_DIR / f"kenpom_stats_{datetime.now().strftime('%Y%m%d')}.csv"
            df.to_csv(filepath, index=False)
            logger.info(f"Saved KenPom stats to {filepath}")
        except Exception as e:
            logger.error(f"Error saving KenPom stats to CSV: {e}")

    def _load_from_csv(self) -> Optional[pd.DataFrame]:
        """Load most recent stats from CSV backup"""
        try:
            # Find most recent cache file
            cache_files = sorted(config.CACHE_DIR.glob("kenpom_stats_*.csv"), reverse=True)
            if cache_files:
                logger.info(f"Loading KenPom stats from backup: {cache_files[0]}")
                df = pd.read_csv(cache_files[0])
                self.stats_cache = df
                return df
        except Exception as e:
            logger.error(f"Error loading KenPom stats from CSV: {e}")

        return None

    def close(self):
        """Close browser session"""
        if self.browser:
            try:
                self.browser.quit()
                logger.info("Closed KenPom browser session")
            except:
                pass


# Singleton instance
_kenpom_fetcher = None

def get_kenpom_fetcher() -> KenPomStatsFetcher:
    """Get singleton KenPom fetcher instance"""
    global _kenpom_fetcher
    if _kenpom_fetcher is None:
        _kenpom_fetcher = KenPomStatsFetcher()
    return _kenpom_fetcher

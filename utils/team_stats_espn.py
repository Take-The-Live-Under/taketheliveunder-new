"""
ESPN Team Stats Fetcher (Free Alternative)
Uses sportsdataverse-py to get team box scores and calculate advanced metrics
No subscription required
"""
import pandas as pd
import polars as pl
from typing import Dict, Optional
from datetime import datetime, timedelta
from sportsdataverse.mbb import load_mbb_team_boxscore
from loguru import logger
import config


class ESPNStatsFetcher:
    """Fetches and calculates team statistics from ESPN data"""

    def __init__(self):
        self.stats_cache = None
        self.last_fetch = None
        self.current_season = datetime.now().year if datetime.now().month >= 10 else datetime.now().year
        # Load team name mappings from CSV (Odds API -> ESPN)
        self.name_mapping = self._load_name_mapping()

    def fetch_team_stats(self, force_refresh: bool = False) -> pd.DataFrame:
        """
        Fetch current season box scores and aggregate into team statistics

        Returns DataFrame with columns:
        - team_name: Team name
        - games_played: Number of games
        - pace: Estimated pace (possessions per game)
        - off_efficiency: Offensive efficiency (points per 100 poss)
        - def_efficiency: Defensive efficiency (points allowed per 100 poss)
        - fg_pct: Field goal percentage
        - three_p_rate: 3P attempts / FGA
        - three_p_pct: 3P percentage
        - ft_rate: FTA per game
        - ft_pct: Free throw percentage
        - oreb_pct: Offensive rebounding percentage
        - to_rate: Turnovers per game
        - efg_pct: Effective FG% (NEW)
        - ts_pct: True Shooting % (NEW)
        - two_p_pct: 2-Point FG% (NEW)
        - efficiency_margin: Off Eff - Def Eff (NEW)
        """
        # Check if we have recent cached data
        if not force_refresh and self._is_cache_valid():
            logger.info("Using cached ESPN stats")
            return self.stats_cache

        try:
            logger.info(f"Fetching team box scores from ESPN for {self.current_season} season...")

            # Load team box scores for current season
            box_scores = load_mbb_team_boxscore(
                seasons=[self.current_season],
                return_as_pandas=True
            )

            logger.info(f"Processing {len(box_scores)} team box scores...")

            # Aggregate stats by team
            team_stats = self._calculate_team_stats(box_scores)

            logger.success(f"Calculated stats for {len(team_stats)} teams from ESPN")

            # Cache the results
            self.stats_cache = team_stats
            self.last_fetch = datetime.now()

            # Save to CSV for persistence
            self._save_to_csv(team_stats)

            return team_stats

        except Exception as e:
            logger.error(f"Error fetching ESPN stats: {e}")
            # Try to load from CSV backup
            return self._load_from_csv()

    def _calculate_team_stats(self, box_scores: pd.DataFrame) -> pd.DataFrame:
        """Calculate advanced metrics from box score data"""

        # Group by team
        team_groups = []

        for team_id in box_scores['team_id'].unique():
            team_games = box_scores[box_scores['team_id'] == team_id]

            if len(team_games) == 0:
                continue

            # Get team name
            team_name = team_games.iloc[0]['team_display_name']
            games_played = len(team_games)

            # Parse shooting stats (columns are already separated in new ESPN API)
            fgm = pd.to_numeric(team_games['field_goals_made'], errors='coerce').fillna(0)
            fga = pd.to_numeric(team_games['field_goals_attempted'], errors='coerce').fillna(0)
            three_m = pd.to_numeric(team_games['three_point_field_goals_made'], errors='coerce').fillna(0)
            three_a = pd.to_numeric(team_games['three_point_field_goals_attempted'], errors='coerce').fillna(0)
            ftm = pd.to_numeric(team_games['free_throws_made'], errors='coerce').fillna(0)
            fta = pd.to_numeric(team_games['free_throws_attempted'], errors='coerce').fillna(0)

            # Calculate totals
            total_points = team_games['team_score'].sum()
            total_fgm = fgm.sum()
            total_fga = fga.sum()
            total_3pm = three_m.sum()
            total_3pa = three_a.sum()
            total_ftm = ftm.sum()
            total_fta = fta.sum()
            total_oreb = team_games['offensive_rebounds'].sum()
            total_dreb = team_games['defensive_rebounds'].sum()
            total_reb = team_games['total_rebounds'].sum()
            total_to = team_games['turnovers'].sum()

            # Opponent stats (for defensive metrics)
            opp_points = team_games['opponent_team_score'].sum()

            # Calculate pace (estimate using formula: FGA + 0.44*FTA - OReb + TO)
            poss_estimate = (total_fga + 0.44 * total_fta - total_oreb + total_to)
            pace = poss_estimate / games_played if games_played > 0 else 0

            # Offensive efficiency (points per 100 possessions)
            off_eff = (total_points / poss_estimate * 100) if poss_estimate > 0 else 0

            # Defensive efficiency (opponent points per 100 possessions - approximation)
            def_eff = (opp_points / poss_estimate * 100) if poss_estimate > 0 else 0

            # Shooting percentages
            fg_pct = (total_fgm / total_fga * 100) if total_fga > 0 else 0
            three_p_rate = (total_3pa / total_fga) if total_fga > 0 else 0
            three_p_pct = (total_3pm / total_3pa * 100) if total_3pa > 0 else 0
            ft_rate = total_fta / games_played if games_played > 0 else 0
            ft_pct = (total_ftm / total_fta * 100) if total_fta > 0 else 0

            # Rebounding (simplified - would need opponent reb for true OReb%)
            oreb_pct = (total_oreb / total_reb * 100) if total_reb > 0 else 0

            # Turnover rate
            to_rate = total_to / games_played if games_played > 0 else 0

            # NEW ADVANCED METRICS (Phase 1)
            # 1. Effective Field Goal % (eFG%) = (FGM + 0.5 × 3PM) / FGA
            efg_pct = ((total_fgm + 0.5 * total_3pm) / total_fga * 100) if total_fga > 0 else 0

            # 2. True Shooting % (TS%) = PTS / (2 × (FGA + 0.44 × FTA))
            ts_pct = (total_points / (2 * (total_fga + 0.44 * total_fta)) * 100) if (total_fga + total_fta) > 0 else 0

            # 3. 2-Point Field Goal %
            two_point_m = total_fgm - total_3pm
            two_point_a = total_fga - total_3pa
            two_p_pct = (two_point_m / two_point_a * 100) if two_point_a > 0 else 0

            # 4. Efficiency Margin (replaces AdjEM from KenPom)
            efficiency_margin = off_eff - def_eff

            # 5. Average PPM (Points Per Minute)
            # NCAA games are 40 minutes (2 x 20 min halves)
            total_minutes = games_played * 40
            avg_ppm = total_points / total_minutes if total_minutes > 0 else 0

            # 6. Average PPG (Points Per Game)
            avg_ppg = total_points / games_played if games_played > 0 else 0

            team_groups.append({
                'team_id': team_id,
                'team_name': team_name,
                'games_played': games_played,
                'pace': pace,
                'off_efficiency': off_eff,
                'def_efficiency': def_eff,
                'fg_pct': fg_pct,
                'three_p_rate': three_p_rate,
                'three_p_pct': three_p_pct,
                'ft_rate': ft_rate,
                'ft_pct': ft_pct,
                'oreb_pct': oreb_pct,
                'to_rate': to_rate,
                # New advanced metrics
                'efg_pct': efg_pct,
                'ts_pct': ts_pct,
                'two_p_pct': two_p_pct,
                'efficiency_margin': efficiency_margin,
                'avg_ppm': avg_ppm,  # Average points per minute
                'avg_ppg': avg_ppg,  # Average points per game
                'data_source': 'espn'
            })

        # Create DataFrame
        df = pd.DataFrame(team_groups)

        # Calculate rankings based on efficiency margin (best teams first)
        # Sort by efficiency margin descending, then assign rank 1, 2, 3, etc.
        df = df.sort_values('efficiency_margin', ascending=False)
        df['espn_rank'] = range(1, len(df) + 1)

        # Sort back by team name for easier lookups
        df = df.sort_values('team_name')

        return df

    def get_team_metrics(self, team_name: str) -> Optional[Dict]:
        """
        Get metrics for a specific team

        Returns dict with:
        - pace: Possessions per game
        - off_efficiency: Offensive efficiency
        - def_efficiency: Defensive efficiency
        - three_p_rate: 3PA / FGA
        - three_p_pct: 3P%
        - ft_rate: FTA per game
        - to_rate: TO per game
        - efg_pct: Effective FG% (NEW)
        - ts_pct: True Shooting % (NEW)
        - two_p_pct: 2-Point FG% (NEW)
        - efficiency_margin: Off Eff - Def Eff (NEW)
        """
        if self.stats_cache is None:
            self.fetch_team_stats()

        # Translate Odds API name to ESPN name if mapping exists
        name_to_lookup = team_name
        if team_name.lower() in self.name_mapping:
            name_to_lookup = self.name_mapping[team_name.lower()]
            logger.debug(f"Translated team name: '{team_name}' -> '{name_to_lookup}'")

        # Try to find team
        team_row = self._find_team(name_to_lookup)

        if team_row is None:
            logger.warning(f"Team not found in ESPN data: {team_name}")
            return None

        return {
            "team_name": team_row["team_name"],
            "pace": float(team_row["pace"]),
            "off_efficiency": float(team_row["off_efficiency"]),
            "def_efficiency": float(team_row["def_efficiency"]),
            "three_p_rate": float(team_row["three_p_rate"]),
            "three_p_pct": float(team_row["three_p_pct"]),
            "ft_rate": float(team_row["ft_rate"]),
            "to_rate": float(team_row["to_rate"]),
            "oreb_pct": float(team_row["oreb_pct"]),
            # New advanced metrics
            "efg_pct": float(team_row["efg_pct"]),
            "ts_pct": float(team_row["ts_pct"]),
            "two_p_pct": float(team_row["two_p_pct"]),
            "efficiency_margin": float(team_row["efficiency_margin"]),
            "avg_ppm": float(team_row["avg_ppm"]),  # Average points per minute
            "avg_ppg": float(team_row["avg_ppg"]),  # Average points per game
            "espn_rank": int(team_row["espn_rank"]),  # ESPN-calculated ranking
            "data_source": "espn"
        }

    def _find_team(self, team_name: str) -> Optional[pd.Series]:
        """Find team in stats cache with flexible matching"""
        if self.stats_cache is None:
            return None

        # Direct match
        direct = self.stats_cache[self.stats_cache["team_name"] == team_name]
        if not direct.empty:
            return direct.iloc[0]

        # Case-insensitive match
        team_lower = team_name.lower()
        for idx, row in self.stats_cache.iterrows():
            if row["team_name"].lower() == team_lower:
                return row

        # Partial match (contains)
        for idx, row in self.stats_cache.iterrows():
            if team_lower in row["team_name"].lower() or row["team_name"].lower() in team_lower:
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
            filepath = config.CACHE_DIR / f"espn_stats_{datetime.now().strftime('%Y%m%d')}.csv"
            df.to_csv(filepath, index=False)
            logger.info(f"Saved ESPN stats to {filepath}")
        except Exception as e:
            logger.error(f"Error saving ESPN stats to CSV: {e}")

    def _load_from_csv(self) -> Optional[pd.DataFrame]:
        """Load most recent stats from CSV backup"""
        try:
            # Find most recent cache file
            cache_files = sorted(config.CACHE_DIR.glob("espn_stats_*.csv"), reverse=True)
            if cache_files:
                logger.info(f"Loading ESPN stats from backup: {cache_files[0]}")
                df = pd.read_csv(cache_files[0])
                self.stats_cache = df
                return df
        except Exception as e:
            logger.error(f"Error loading ESPN stats from CSV: {e}")

        return None

    def _load_name_mapping(self) -> Dict[str, str]:
        """Load Odds API -> ESPN team name mappings from CSV"""
        from pathlib import Path
        csv_file = Path(__file__).parent.parent / "data" / "team_name_mapping.csv"
        mapping = {}

        if csv_file.exists():
            try:
                df = pd.read_csv(csv_file)
                for _, row in df.iterrows():
                    odds_name = str(row['full_name']).strip().lower()
                    espn_name = str(row['espn_name']).strip()
                    mapping[odds_name] = espn_name
                logger.debug(f"Loaded {len(df)} team name mappings for ESPN stats")
            except Exception as e:
                logger.warning(f"Error loading team name mappings: {e}")

        return mapping


# Singleton instance
_espn_fetcher = None

def get_espn_fetcher() -> ESPNStatsFetcher:
    """Get singleton ESPN fetcher instance"""
    global _espn_fetcher
    if _espn_fetcher is None:
        _espn_fetcher = ESPNStatsFetcher()
    return _espn_fetcher

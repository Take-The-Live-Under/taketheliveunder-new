"""
Team Profile Manager
Builds and manages team baseline statistics for projection adjustments
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass, field
from loguru import logger

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
import config


@dataclass
class TeamProfile:
    """Profile containing a team's baseline statistics"""
    team_name: str
    games_played: int = 0

    # Pace metrics
    avg_ppm: float = 0.0
    avg_posm: float = 0.0
    pace_category: str = "Normal"  # Slow, Normal, Fast

    # Efficiency metrics
    avg_ppp: float = 0.0  # Points per possession

    # Variance metrics (for Kalman tuning)
    ppm_variance: float = 0.0
    ppm_std: float = 0.0
    variance_category: str = "Normal"  # Low, Normal, High

    # Home/Away splits
    home_ppm: float = 0.0
    away_ppm: float = 0.0
    home_games: int = 0
    away_games: int = 0

    # Additional context
    avg_fouls_per_game: float = 0.0
    avg_turnovers_per_game: float = 0.0

    def get_q_multiplier(self) -> float:
        """Get Kalman Q multiplier based on team variance"""
        thresholds = config.TEAM_PROFILE_CONFIG.get("variance_thresholds", {})
        low_thresh = thresholds.get("low", 1.5)
        high_thresh = thresholds.get("high", 3.0)

        if self.ppm_std < low_thresh:
            return 0.7  # Low variance = smoother filter
        elif self.ppm_std > high_thresh:
            return 1.5  # High variance = more responsive
        else:
            return 1.0  # Normal

    def get_r_multiplier(self) -> float:
        """Get Kalman R multiplier based on team variance"""
        thresholds = config.TEAM_PROFILE_CONFIG.get("variance_thresholds", {})
        low_thresh = thresholds.get("low", 1.5)
        high_thresh = thresholds.get("high", 3.0)

        if self.ppm_std < low_thresh:
            return 1.3  # Low variance = trust measurements more
        elif self.ppm_std > high_thresh:
            return 0.7  # High variance = less trust
        else:
            return 1.0  # Normal

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "team_name": self.team_name,
            "games_played": self.games_played,
            "avg_ppm": self.avg_ppm,
            "avg_posm": self.avg_posm,
            "pace_category": self.pace_category,
            "avg_ppp": self.avg_ppp,
            "ppm_variance": self.ppm_variance,
            "ppm_std": self.ppm_std,
            "variance_category": self.variance_category,
            "home_ppm": self.home_ppm,
            "away_ppm": self.away_ppm,
            "home_games": self.home_games,
            "away_games": self.away_games,
            "avg_fouls_per_game": self.avg_fouls_per_game,
            "avg_turnovers_per_game": self.avg_turnovers_per_game,
            "q_multiplier": self.get_q_multiplier(),
            "r_multiplier": self.get_r_multiplier(),
        }


class TeamProfileManager:
    """
    Manages team baseline profiles built from historical data
    """

    def __init__(self):
        self.profiles: Dict[str, TeamProfile] = {}
        self.league_avg_profile: Optional[TeamProfile] = None

    def build_profiles_from_season(self, df: pd.DataFrame) -> Dict[str, TeamProfile]:
        """
        Build team profiles from season play-by-play data

        Args:
            df: DataFrame with columns including game_id, minute_index,
                team_home, team_away, ppm, posm, etc.

        Returns:
            Dict mapping team name to TeamProfile
        """
        logger.info("Building team profiles from season data...")

        # First, aggregate to game level for each team
        team_stats = self._aggregate_team_game_stats(df)

        # Build profiles for each team
        profiles = {}
        for team_name, stats in team_stats.items():
            profile = self._build_single_profile(team_name, stats)
            profiles[team_name] = profile

        # Calculate league averages
        self.league_avg_profile = self._calculate_league_average(profiles)

        self.profiles = profiles
        logger.info(f"Built profiles for {len(profiles)} teams")

        return profiles

    def _aggregate_team_game_stats(self, df: pd.DataFrame) -> Dict[str, List[Dict]]:
        """
        Aggregate play-by-play data to per-team-per-game stats

        Args:
            df: Raw play-by-play DataFrame

        Returns:
            Dict mapping team_name -> list of game stat dicts
        """
        team_stats = {}

        # Group by game
        for game_id, game_df in df.groupby("game_id"):
            # Get team names (handle different column naming)
            home_team = game_df.iloc[0].get("team_home", game_df.iloc[0].get("home_team", "Unknown"))
            away_team = game_df.iloc[0].get("team_away", game_df.iloc[0].get("away_team", "Unknown"))

            # Game totals
            total_ppm = game_df["ppm"].sum() if "ppm" in game_df.columns else 0
            total_posm = game_df["posm"].sum() if "posm" in game_df.columns else 0
            total_fouls = game_df["foulm"].sum() if "foulm" in game_df.columns else 0
            total_to = game_df["tovm"].sum() if "tovm" in game_df.columns else 0
            n_minutes = len(game_df)

            # Per-minute averages for this game
            game_ppm_mean = total_ppm / n_minutes if n_minutes > 0 else 0
            game_ppm_std = game_df["ppm"].std() if "ppm" in game_df.columns else 0
            game_ppp = total_ppm / total_posm if total_posm > 0 else 0

            # Home team contribution (approximation: split by home points)
            home_pts = game_df["points_home"].sum() if "points_home" in game_df.columns else total_ppm / 2
            away_pts = game_df["points_away"].sum() if "points_away" in game_df.columns else total_ppm / 2

            # Record for home team
            if home_team not in team_stats:
                team_stats[home_team] = []
            team_stats[home_team].append({
                "game_id": game_id,
                "is_home": True,
                "ppm_mean": game_ppm_mean,
                "ppm_std": game_ppm_std,
                "posm_mean": total_posm / n_minutes if n_minutes > 0 else 0,
                "ppp": game_ppp,
                "team_points": home_pts,
                "opp_points": away_pts,
                "fouls": total_fouls / 2,  # Approximate team fouls
                "turnovers": total_to / 2,
                "n_minutes": n_minutes,
            })

            # Record for away team
            if away_team not in team_stats:
                team_stats[away_team] = []
            team_stats[away_team].append({
                "game_id": game_id,
                "is_home": False,
                "ppm_mean": game_ppm_mean,
                "ppm_std": game_ppm_std,
                "posm_mean": total_posm / n_minutes if n_minutes > 0 else 0,
                "ppp": game_ppp,
                "team_points": away_pts,
                "opp_points": home_pts,
                "fouls": total_fouls / 2,
                "turnovers": total_to / 2,
                "n_minutes": n_minutes,
            })

        return team_stats

    def _build_single_profile(self, team_name: str, game_stats: List[Dict]) -> TeamProfile:
        """
        Build a single team profile from their game statistics

        Args:
            team_name: Team name
            game_stats: List of per-game stat dicts

        Returns:
            TeamProfile
        """
        n_games = len(game_stats)
        if n_games == 0:
            return TeamProfile(team_name=team_name)

        # Calculate averages
        avg_ppm = np.mean([g["ppm_mean"] for g in game_stats])
        avg_posm = np.mean([g["posm_mean"] for g in game_stats])
        avg_ppp = np.mean([g["ppp"] for g in game_stats])

        # Variance (average of in-game variance + between-game variance)
        in_game_var = np.mean([g["ppm_std"] ** 2 for g in game_stats])
        between_game_var = np.var([g["ppm_mean"] for g in game_stats])
        total_var = in_game_var + between_game_var
        ppm_std = np.sqrt(total_var) if total_var > 0 else 0

        # Home/Away splits
        home_games = [g for g in game_stats if g["is_home"]]
        away_games = [g for g in game_stats if not g["is_home"]]

        home_ppm = np.mean([g["ppm_mean"] for g in home_games]) if home_games else avg_ppm
        away_ppm = np.mean([g["ppm_mean"] for g in away_games]) if away_games else avg_ppm

        # Fouls and turnovers
        avg_fouls = np.mean([g["fouls"] for g in game_stats])
        avg_to = np.mean([g["turnovers"] for g in game_stats])

        # Categorize pace
        pace_thresholds = config.TEAM_PROFILE_CONFIG.get("pace_thresholds", {})
        if avg_ppm < pace_thresholds.get("slow", 65.0) / 20:  # Convert to per-minute
            pace_category = "Slow"
        elif avg_ppm > pace_thresholds.get("fast", 72.0) / 20:
            pace_category = "Fast"
        else:
            pace_category = "Normal"

        # Categorize variance
        var_thresholds = config.TEAM_PROFILE_CONFIG.get("variance_thresholds", {})
        if ppm_std < var_thresholds.get("low", 1.5):
            variance_category = "Low"
        elif ppm_std > var_thresholds.get("high", 3.0):
            variance_category = "High"
        else:
            variance_category = "Normal"

        return TeamProfile(
            team_name=team_name,
            games_played=n_games,
            avg_ppm=avg_ppm,
            avg_posm=avg_posm,
            pace_category=pace_category,
            avg_ppp=avg_ppp,
            ppm_variance=total_var,
            ppm_std=ppm_std,
            variance_category=variance_category,
            home_ppm=home_ppm,
            away_ppm=away_ppm,
            home_games=len(home_games),
            away_games=len(away_games),
            avg_fouls_per_game=avg_fouls,
            avg_turnovers_per_game=avg_to,
        )

    def _calculate_league_average(self, profiles: Dict[str, TeamProfile]) -> TeamProfile:
        """Calculate league average profile"""
        if not profiles:
            return TeamProfile(team_name="LEAGUE_AVERAGE")

        return TeamProfile(
            team_name="LEAGUE_AVERAGE",
            games_played=sum(p.games_played for p in profiles.values()),
            avg_ppm=np.mean([p.avg_ppm for p in profiles.values()]),
            avg_posm=np.mean([p.avg_posm for p in profiles.values()]),
            pace_category="Normal",
            avg_ppp=np.mean([p.avg_ppp for p in profiles.values()]),
            ppm_variance=np.mean([p.ppm_variance for p in profiles.values()]),
            ppm_std=np.mean([p.ppm_std for p in profiles.values()]),
            variance_category="Normal",
            home_ppm=np.mean([p.home_ppm for p in profiles.values()]),
            away_ppm=np.mean([p.away_ppm for p in profiles.values()]),
        )

    def get_team_baseline(self, team_name: str) -> TeamProfile:
        """
        Get baseline profile for a team

        Args:
            team_name: Team name to look up

        Returns:
            TeamProfile (falls back to league average if not found)
        """
        # Direct match
        if team_name in self.profiles:
            return self.profiles[team_name]

        # Try case-insensitive match
        team_lower = team_name.lower()
        for name, profile in self.profiles.items():
            if name.lower() == team_lower:
                return profile

        # Try partial match
        for name, profile in self.profiles.items():
            if team_lower in name.lower() or name.lower() in team_lower:
                logger.debug(f"Partial match: '{team_name}' -> '{name}'")
                return profile

        # Fall back to league average
        logger.warning(f"Team '{team_name}' not found, using league average")
        return self.league_avg_profile or TeamProfile(
            team_name="LEAGUE_AVERAGE",
            avg_ppm=config.TEAM_PROFILE_CONFIG.get("league_avg_ppm", 3.5),
            avg_ppp=config.TEAM_PROFILE_CONFIG.get("league_avg_ppp", 1.0),
            ppm_std=config.TEAM_PROFILE_CONFIG.get("league_avg_variance", 2.0),
        )

    def calculate_deviation(self, team_name: str, current_ppm: float) -> float:
        """
        Calculate how much a team's current PPM deviates from their baseline

        Args:
            team_name: Team name
            current_ppm: Current observed PPM

        Returns:
            Z-score deviation (positive = above baseline)
        """
        profile = self.get_team_baseline(team_name)

        if profile.ppm_std < 0.01:
            return 0.0

        return (current_ppm - profile.avg_ppm) / profile.ppm_std

    def get_all_profiles_df(self) -> pd.DataFrame:
        """Get all profiles as a DataFrame"""
        if not self.profiles:
            return pd.DataFrame()

        records = [p.to_dict() for p in self.profiles.values()]
        return pd.DataFrame(records)

    def save_profiles(self, path: str):
        """Save profiles to CSV"""
        df = self.get_all_profiles_df()
        df.to_csv(path, index=False)
        logger.info(f"Saved {len(df)} team profiles to {path}")

    def load_profiles(self, path: str):
        """Load profiles from CSV"""
        df = pd.read_csv(path)
        self.profiles = {}

        for _, row in df.iterrows():
            profile = TeamProfile(
                team_name=row["team_name"],
                games_played=int(row.get("games_played", 0)),
                avg_ppm=float(row.get("avg_ppm", 0)),
                avg_posm=float(row.get("avg_posm", 0)),
                pace_category=row.get("pace_category", "Normal"),
                avg_ppp=float(row.get("avg_ppp", 0)),
                ppm_variance=float(row.get("ppm_variance", 0)),
                ppm_std=float(row.get("ppm_std", 0)),
                variance_category=row.get("variance_category", "Normal"),
                home_ppm=float(row.get("home_ppm", 0)),
                away_ppm=float(row.get("away_ppm", 0)),
                home_games=int(row.get("home_games", 0)),
                away_games=int(row.get("away_games", 0)),
                avg_fouls_per_game=float(row.get("avg_fouls_per_game", 0)),
                avg_turnovers_per_game=float(row.get("avg_turnovers_per_game", 0)),
            )
            self.profiles[profile.team_name] = profile

        self.league_avg_profile = self._calculate_league_average(self.profiles)
        logger.info(f"Loaded {len(self.profiles)} team profiles from {path}")


def get_team_profile_manager() -> TeamProfileManager:
    """Factory function for TeamProfileManager"""
    return TeamProfileManager()

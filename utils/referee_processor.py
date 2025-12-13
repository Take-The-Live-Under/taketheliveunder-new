"""
Referee Statistics Processor
Calculates foul tendency metrics for each referee
"""

import pandas as pd
import logging
from typing import List, Dict
from collections import defaultdict

logger = logging.getLogger(__name__)


class RefereeProcessor:
    """Processes game data to calculate referee statistics and tendencies"""

    def __init__(self, min_games: int = 5, close_game_margin: int = 10, high_foul_threshold: int = 40):
        """
        Initialize processor

        Args:
            min_games: Minimum games for a referee to be included in analysis
            close_game_margin: Point differential to classify as "close game"
            high_foul_threshold: Total fouls to classify as "high foul game"
        """
        self.min_games = min_games
        self.close_game_margin = close_game_margin
        self.high_foul_threshold = high_foul_threshold

    def process_games(self, games: List[Dict]) -> Dict:
        """
        Process all games and calculate referee statistics

        Args:
            games: List of game data dictionaries

        Returns:
            Dictionary containing:
                - referee_stats: DataFrame with per-referee statistics
                - game_logs: DataFrame with all game logs
                - summary: Overall summary statistics
        """
        logger.info(f"Processing {len(games)} games for referee analysis")

        # Create game logs DataFrame
        game_logs = self._create_game_logs(games)

        # Calculate per-referee statistics
        referee_stats = self._calculate_referee_stats(game_logs)

        # Filter to minimum games (only if we have data)
        if not referee_stats.empty and 'total_games' in referee_stats.columns:
            referee_stats = referee_stats[referee_stats['total_games'] >= self.min_games]

        # Calculate summary statistics
        summary = self._calculate_summary(game_logs, referee_stats)

        logger.info(f"Calculated stats for {len(referee_stats)} referees meeting minimum threshold")

        return {
            "referee_stats": referee_stats,
            "game_logs": game_logs,
            "summary": summary
        }

    def _create_game_logs(self, games: List[Dict]) -> pd.DataFrame:
        """
        Create detailed game log with one row per referee per game

        Args:
            games: List of game data

        Returns:
            DataFrame with game logs
        """
        logs = []

        for game in games:
            referees = game.get("referees", [])

            # Create a log entry for each referee in the game
            for referee in referees:
                if not referee or referee.strip() == "":
                    continue

                log = {
                    "game_id": game["game_id"],
                    "date": game["date"],
                    "referee": referee.strip(),
                    "home_team": game["home_team"],
                    "away_team": game["away_team"],
                    "home_fouls": game["home_fouls"],
                    "away_fouls": game["away_fouls"],
                    "total_fouls": game["total_fouls"],
                    "home_score": game["home_score"],
                    "away_score": game["away_score"],
                    "score_diff": game["score_diff"],
                    "close_game": game["close_game"],
                    "went_to_ot": game["went_to_ot"],
                    "high_foul_game": game["total_fouls"] >= self.high_foul_threshold,
                    "low_foul_game": game["total_fouls"] < 30,
                }
                logs.append(log)

        if not logs:
            return pd.DataFrame()

        df = pd.DataFrame(logs)
        df = df.sort_values("date", ascending=False)
        return df

    def _calculate_referee_stats(self, game_logs: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate statistics for each referee

        Args:
            game_logs: DataFrame with game logs

        Returns:
            DataFrame with per-referee statistics
        """
        if game_logs.empty:
            return pd.DataFrame()

        stats = []

        for referee in game_logs['referee'].unique():
            ref_games = game_logs[game_logs['referee'] == referee]

            # Basic counts
            total_games = len(ref_games)
            ot_games = ref_games['went_to_ot'].sum()
            close_games = ref_games['close_game'].sum()
            high_foul_games = ref_games['high_foul_game'].sum()
            low_foul_games = ref_games['low_foul_game'].sum()

            # Foul averages
            avg_total_fouls = ref_games['total_fouls'].mean()
            avg_home_fouls = ref_games['home_fouls'].mean()
            avg_away_fouls = ref_games['away_fouls'].mean()

            # Home/away bias calculation
            home_away_bias = avg_home_fouls - avg_away_fouls

            # Close game foul average
            close_game_fouls = ref_games[ref_games['close_game']]['total_fouls'].mean() if close_games > 0 else 0

            # Blowout game foul average
            blowout_games = ref_games[~ref_games['close_game']]
            blowout_game_fouls = blowout_games['total_fouls'].mean() if len(blowout_games) > 0 else 0

            # Statistical measures
            foul_std_dev = ref_games['total_fouls'].std()
            max_fouls = ref_games['total_fouls'].max()
            min_fouls = ref_games['total_fouls'].min()

            stats.append({
                "referee": referee,
                "total_games": total_games,
                "avg_total_fouls": round(avg_total_fouls, 2),
                "avg_home_fouls": round(avg_home_fouls, 2),
                "avg_away_fouls": round(avg_away_fouls, 2),
                "home_away_bias": round(home_away_bias, 2),
                "close_game_count": close_games,
                "close_game_avg_fouls": round(close_game_fouls, 2),
                "blowout_count": len(blowout_games),
                "blowout_avg_fouls": round(blowout_game_fouls, 2),
                "ot_games": ot_games,
                "high_foul_games": high_foul_games,
                "low_foul_games": low_foul_games,
                "foul_std_dev": round(foul_std_dev, 2),
                "max_fouls": int(max_fouls),
                "min_fouls": int(min_fouls),
            })

        df = pd.DataFrame(stats)
        df = df.sort_values("avg_total_fouls", ascending=False)
        return df

    def _calculate_summary(self, game_logs: pd.DataFrame, referee_stats: pd.DataFrame) -> Dict:
        """
        Calculate overall summary statistics

        Args:
            game_logs: Game logs DataFrame
            referee_stats: Referee stats DataFrame

        Returns:
            Summary statistics dictionary
        """
        if game_logs.empty:
            return {}

        return {
            "total_games_analyzed": len(game_logs['game_id'].unique()),
            "total_referees": len(referee_stats),
            "avg_fouls_per_game": round(game_logs.groupby('game_id')['total_fouls'].first().mean(), 2),
            "overall_home_avg": round(game_logs.groupby('game_id')['home_fouls'].first().mean(), 2),
            "overall_away_avg": round(game_logs.groupby('game_id')['away_fouls'].first().mean(), 2),
            "highest_avg_referee": referee_stats.iloc[0]['referee'] if len(referee_stats) > 0 else "N/A",
            "highest_avg_fouls": referee_stats.iloc[0]['avg_total_fouls'] if len(referee_stats) > 0 else 0,
            "lowest_avg_referee": referee_stats.iloc[-1]['referee'] if len(referee_stats) > 0 else "N/A",
            "lowest_avg_fouls": referee_stats.iloc[-1]['avg_total_fouls'] if len(referee_stats) > 0 else 0,
            "close_games_pct": round(
                (game_logs.groupby('game_id')['close_game'].first().sum() / len(game_logs['game_id'].unique())) * 100, 1
            ),
            "ot_games_pct": round(
                (game_logs.groupby('game_id')['went_to_ot'].first().sum() / len(game_logs['game_id'].unique())) * 100, 1
            ),
        }


def get_referee_processor(min_games: int = 5, close_game_margin: int = 10,
                          high_foul_threshold: int = 40) -> RefereeProcessor:
    """
    Get instance of RefereeProcessor

    Args:
        min_games: Minimum games for inclusion
        close_game_margin: Point differential for close games
        high_foul_threshold: Threshold for high foul games

    Returns:
        RefereeProcessor instance
    """
    return RefereeProcessor(min_games, close_game_margin, high_foul_threshold)

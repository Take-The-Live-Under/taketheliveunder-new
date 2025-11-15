"""
CSV Logging System
Logs live game polls and end-of-game results
"""
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
from loguru import logger
import config


class CSVLogger:
    """Handles CSV logging for live polls and game results"""

    def __init__(self):
        self.live_log_path = config.LIVE_LOG_FILE
        self.results_path = config.RESULTS_FILE

        # Initialize CSV files with headers if they don't exist
        self._init_live_log()
        self._init_results_log()

    def _init_live_log(self):
        """Initialize live log CSV with headers"""
        if not self.live_log_path.exists():
            headers = [
                "Team 1",
                "Score 1",
                "Team 2",
                "Score 2",
                "Period",
                "Mins Remaining",
                "Secs Remaining",
                "Status",
                "OU Line",
                "Sportsbook",
                "ESPN Closing Total",
                "Home Fouls",
                "Away Fouls",
                "Required PPM",
                "Time Weighted Threshold",
                "Current PPM",
                "PPM Diff",
                "Projected Final",
                "Total Time Left",
                "Bet Type",
                "Trigger",
                "Trigger Reasons",
                "Confidence",
                "Units",
                "Home Pace",
                "Home Off Eff",
                "Home Def Eff",
                "Home AdjEM",
                "Home Avg PPM",
                "Home Avg PPG",
                "Home KenPom Rank",
                "Home eFG%",         # NEW
                "Home TS%",          # NEW
                "Home 2P%",          # NEW
                "Home Eff Margin",   # NEW
                "Away Pace",
                "Away Off Eff",
                "Away Def Eff",
                "Away AdjEM",
                "Away Avg PPM",
                "Away Avg PPG",
                "Away KenPom Rank",
                "Away eFG%",         # NEW
                "Away TS%",          # NEW
                "Away 2P%",          # NEW
                "Away Eff Margin",   # NEW
                "Timestamp",
                "Game ID"
            ]

            with open(self.live_log_path, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(headers)

            logger.info(f"Initialized live log: {self.live_log_path}")

    def _init_results_log(self):
        """Initialize results log CSV with headers"""
        if not self.results_path.exists():
            headers = [
                "game_id",
                "date",
                "home_team",
                "away_team",
                "final_home_score",
                "final_away_score",
                "final_total",
                "ou_line",
                "ou_open",
                "ou_result",
                "went_to_ot",
                "our_trigger",
                "max_confidence",
                "max_units",
                "trigger_timestamp",
                "outcome",
                "unit_profit",
                "notes"
            ]

            with open(self.results_path, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(headers)

            logger.info(f"Initialized results log: {self.results_path}")

    def log_live_poll(self, game_data: Dict):
        """
        Log a live game poll to CSV

        Args:
            game_data: Dict containing:
                - timestamp
                - game_id
                - home_team, away_team
                - period, minutes_remaining, seconds_remaining
                - home_score, away_score, total_points
                - ou_line, ou_open
                - required_ppm, trigger_flag
                - home_metrics (pace, 3p_rate, def_eff)
                - away_metrics (pace, 3p_rate, def_eff)
                - confidence_score, unit_size
                - notes (optional)
        """
        try:
            # Format: Team 1 (Away), Score 1, Team 2 (Home), Score 2, Period, etc.
            status = "In Progress" if game_data.get("period", 0) > 0 else "Not Started"

            row = [
                game_data.get("away_team"),           # Team 1 (Away)
                game_data.get("away_score"),          # Score 1
                game_data.get("home_team"),           # Team 2 (Home)
                game_data.get("home_score"),          # Score 2
                game_data.get("period"),              # Period
                game_data.get("minutes_remaining"),   # Mins Remaining
                game_data.get("seconds_remaining"),   # Secs Remaining
                status,                                # Status
                game_data.get("ou_line"),             # OU Line
                game_data.get("sportsbook", ""),      # Sportsbook
                game_data.get("espn_closing_total", ""),  # ESPN Closing Total
                game_data.get("home_fouls", ""),      # Home Fouls
                game_data.get("away_fouls", ""),      # Away Fouls
                round(game_data.get("required_ppm", 0), 2),      # Required PPM
                round(game_data.get("time_weighted_threshold", 0), 2),  # Time Weighted Threshold
                round(game_data.get("current_ppm", 0), 2),       # Current PPM
                round(game_data.get("ppm_difference", 0), 2),    # PPM Diff
                round(game_data.get("projected_final_score", 0), 1),  # Projected Final
                round(game_data.get("total_time_remaining", 0), 1),   # Total Time Left
                game_data.get("bet_type", "").upper(),           # Bet Type
                "YES" if game_data.get("trigger_flag") else "NO",  # Trigger
                game_data.get("trigger_reasons", ""),            # Trigger Reasons
                round(game_data.get("confidence_score", 0), 1),  # Confidence
                game_data.get("unit_size", 0),                   # Units
                game_data.get("home_metrics", {}).get("pace_per_game", ""),     # Home Pace
                game_data.get("home_metrics", {}).get("off_efficiency", ""),    # Home Off Eff
                game_data.get("home_metrics", {}).get("def_efficiency", ""),    # Home Def Eff
                game_data.get("home_metrics", {}).get("adj_em", ""),            # Home AdjEM
                game_data.get("home_metrics", {}).get("avg_ppm", ""),           # Home Avg PPM
                game_data.get("home_metrics", {}).get("avg_ppg", ""),           # Home Avg PPG
                game_data.get("home_metrics", {}).get("kenpom_rank") or game_data.get("home_metrics", {}).get("espn_rank", ""),  # Home Rank (KenPom or ESPN)
                game_data.get("home_metrics", {}).get("efg_pct", ""),           # Home eFG% (NEW)
                game_data.get("home_metrics", {}).get("ts_pct", ""),            # Home TS% (NEW)
                game_data.get("home_metrics", {}).get("two_p_pct", ""),         # Home 2P% (NEW)
                game_data.get("home_metrics", {}).get("efficiency_margin", ""), # Home Eff Margin (NEW)
                game_data.get("away_metrics", {}).get("pace_per_game", ""),     # Away Pace
                game_data.get("away_metrics", {}).get("off_efficiency", ""),    # Away Off Eff
                game_data.get("away_metrics", {}).get("def_efficiency", ""),    # Away Def Eff
                game_data.get("away_metrics", {}).get("adj_em", ""),            # Away AdjEM
                game_data.get("away_metrics", {}).get("avg_ppm", ""),           # Away Avg PPM
                game_data.get("away_metrics", {}).get("avg_ppg", ""),           # Away Avg PPG
                game_data.get("away_metrics", {}).get("kenpom_rank") or game_data.get("away_metrics", {}).get("espn_rank", ""),  # Away Rank (KenPom or ESPN)
                game_data.get("away_metrics", {}).get("efg_pct", ""),           # Away eFG% (NEW)
                game_data.get("away_metrics", {}).get("ts_pct", ""),            # Away TS% (NEW)
                game_data.get("away_metrics", {}).get("two_p_pct", ""),         # Away 2P% (NEW)
                game_data.get("away_metrics", {}).get("efficiency_margin", ""), # Away Eff Margin (NEW)
                game_data.get("timestamp", datetime.now().isoformat()),         # Timestamp
                game_data.get("game_id")                                        # Game ID
            ]

            with open(self.live_log_path, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(row)

        except Exception as e:
            logger.error(f"Error logging live poll: {e}")

    def log_game_result(self, result_data: Dict):
        """
        Log final game result to CSV

        Args:
            result_data: Dict containing:
                - game_id
                - date
                - home_team, away_team
                - final_home_score, final_away_score, final_total
                - ou_line, ou_open, ou_result
                - went_to_ot
                - our_trigger (bool)
                - max_confidence, max_units
                - trigger_timestamp
                - outcome (win/loss/push)
                - unit_profit
                - notes
        """
        try:
            row = [
                result_data.get("game_id"),
                result_data.get("date"),
                result_data.get("home_team"),
                result_data.get("away_team"),
                result_data.get("final_home_score"),
                result_data.get("final_away_score"),
                result_data.get("final_total"),
                result_data.get("ou_line"),
                result_data.get("ou_open"),
                result_data.get("ou_result"),  # "over" or "under" or "push"
                result_data.get("went_to_ot", False),
                result_data.get("our_trigger", False),
                result_data.get("max_confidence", 0),
                result_data.get("max_units", 0),
                result_data.get("trigger_timestamp", ""),
                result_data.get("outcome", ""),  # "win", "loss", "push", or ""
                result_data.get("unit_profit", 0),
                result_data.get("notes", "")
            ]

            with open(self.results_path, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(row)

            logger.info(f"Logged game result: {result_data.get('game_id')}")

        except Exception as e:
            logger.error(f"Error logging game result: {e}")

    def get_recent_logs(self, limit: int = 100) -> list:
        """Get recent live log entries"""
        try:
            with open(self.live_log_path, 'r') as f:
                reader = csv.DictReader(f)
                logs = list(reader)
                return logs[-limit:] if len(logs) > limit else logs
        except Exception as e:
            logger.error(f"Error reading live logs: {e}")
            return []

    def get_results(self, limit: Optional[int] = None) -> list:
        """Get game results"""
        try:
            with open(self.results_path, 'r') as f:
                reader = csv.DictReader(f)
                results = list(reader)
                if limit:
                    return results[-limit:]
                return results
        except Exception as e:
            logger.error(f"Error reading results: {e}")
            return []

    def get_performance_stats(self) -> Dict:
        """
        Calculate performance statistics from results

        Returns:
            Dict with win rates, ROI, etc.
        """
        results = self.get_results()

        if not results:
            return {
                "total_bets": 0,
                "wins": 0,
                "losses": 0,
                "pushes": 0,
                "win_rate": 0,
                "total_units_wagered": 0,
                "total_unit_profit": 0,
                "roi": 0,
                "by_confidence": {}
            }

        # Filter to only games we bet on
        bets = [r for r in results if r.get("our_trigger") == "True"]

        total_bets = len(bets)
        wins = len([r for r in bets if r.get("outcome") == "win"])
        losses = len([r for r in bets if r.get("outcome") == "loss"])
        pushes = len([r for r in bets if r.get("outcome") == "push"])

        win_rate = (wins / total_bets * 100) if total_bets > 0 else 0

        total_units_wagered = sum(float(r.get("max_units", 0)) for r in bets)
        total_unit_profit = sum(float(r.get("unit_profit", 0)) for r in bets)

        roi = (total_unit_profit / total_units_wagered * 100) if total_units_wagered > 0 else 0

        # Performance by confidence tier
        by_confidence = {
            "low (41-60)": {"bets": 0, "wins": 0, "profit": 0},
            "medium (61-75)": {"bets": 0, "wins": 0, "profit": 0},
            "high (76-85)": {"bets": 0, "wins": 0, "profit": 0},
            "max (86-100)": {"bets": 0, "wins": 0, "profit": 0}
        }

        for bet in bets:
            conf = float(bet.get("max_confidence", 0))
            tier = None

            if 41 <= conf <= 60:
                tier = "low (41-60)"
            elif 61 <= conf <= 75:
                tier = "medium (61-75)"
            elif 76 <= conf <= 85:
                tier = "high (76-85)"
            elif 86 <= conf <= 100:
                tier = "max (86-100)"

            if tier:
                by_confidence[tier]["bets"] += 1
                if bet.get("outcome") == "win":
                    by_confidence[tier]["wins"] += 1
                by_confidence[tier]["profit"] += float(bet.get("unit_profit", 0))

        # Calculate win rates for each tier
        for tier in by_confidence:
            bets_count = by_confidence[tier]["bets"]
            if bets_count > 0:
                by_confidence[tier]["win_rate"] = by_confidence[tier]["wins"] / bets_count * 100
            else:
                by_confidence[tier]["win_rate"] = 0

        return {
            "total_bets": total_bets,
            "wins": wins,
            "losses": losses,
            "pushes": pushes,
            "win_rate": win_rate,
            "total_units_wagered": total_units_wagered,
            "total_unit_profit": total_unit_profit,
            "roi": roi,
            "by_confidence": by_confidence
        }


# Singleton instance
_csv_logger = None

def get_csv_logger() -> CSVLogger:
    """Get singleton CSV logger instance"""
    global _csv_logger
    if _csv_logger is None:
        _csv_logger = CSVLogger()
    return _csv_logger

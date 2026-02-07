#!/usr/bin/env python3
"""
Projection Backtester
Historical validation of model projections against actual game totals and O/U lines
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
from loguru import logger
import click

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from src.betting_signals import BettingSignal, BettingSignalCalculator, calculate_implied_probability


@dataclass
class BacktestResult:
    """Results from a single bet in backtesting"""
    game_id: str
    home_team: str
    away_team: str
    bet_minute: int
    direction: str  # OVER or UNDER
    ou_line: float
    projected_total: float
    actual_total: float
    edge_pct: float
    confidence: int
    unit_size: float
    won: bool
    profit: float  # In units (e.g., +0.91 for win at -110, -1 for loss)

    def to_dict(self) -> Dict:
        return {
            "game_id": self.game_id,
            "home_team": self.home_team,
            "away_team": self.away_team,
            "bet_minute": self.bet_minute,
            "direction": self.direction,
            "ou_line": self.ou_line,
            "projected_total": self.projected_total,
            "actual_total": self.actual_total,
            "edge_pct": self.edge_pct,
            "confidence": self.confidence,
            "unit_size": self.unit_size,
            "won": self.won,
            "profit": self.profit,
        }


@dataclass
class BacktestSummary:
    """Summary statistics from backtesting"""
    total_bets: int = 0
    wins: int = 0
    losses: int = 0
    pushes: int = 0
    win_rate: float = 0.0
    total_units_wagered: float = 0.0
    total_units_profit: float = 0.0
    roi: float = 0.0

    # Breakdowns
    by_confidence_tier: Dict[str, Dict] = field(default_factory=dict)
    by_minute_range: Dict[str, Dict] = field(default_factory=dict)
    by_direction: Dict[str, Dict] = field(default_factory=dict)
    by_matchup_type: Dict[str, Dict] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "total_bets": self.total_bets,
            "wins": self.wins,
            "losses": self.losses,
            "pushes": self.pushes,
            "win_rate": self.win_rate,
            "total_units_wagered": self.total_units_wagered,
            "total_units_profit": self.total_units_profit,
            "roi": self.roi,
            "by_confidence_tier": self.by_confidence_tier,
            "by_minute_range": self.by_minute_range,
            "by_direction": self.by_direction,
            "by_matchup_type": self.by_matchup_type,
        }


class ProjectionBacktester:
    """
    Backtests model projections against historical results
    """

    def __init__(self, odds: int = -110):
        """
        Initialize backtester

        Args:
            odds: Assumed odds for calculating profits (default -110)
        """
        self.odds = odds
        self.signal_calculator = BettingSignalCalculator()
        self.results: List[BacktestResult] = []

    def calculate_profit(self, won: bool, unit_size: float) -> float:
        """
        Calculate profit for a bet

        Args:
            won: Whether the bet won
            unit_size: Number of units wagered

        Returns:
            Profit in units (positive for win, negative for loss)
        """
        if won:
            # At -110, win $100 for every $110 wagered
            if self.odds < 0:
                return unit_size * (100 / abs(self.odds))
            else:
                return unit_size * (self.odds / 100)
        else:
            return -unit_size

    def evaluate_bet(
        self,
        signal: BettingSignal,
        actual_total: float
    ) -> Optional[BacktestResult]:
        """
        Evaluate a single betting signal against actual result

        Args:
            signal: BettingSignal that was generated
            actual_total: Actual final total of the game

        Returns:
            BacktestResult or None if no bet was placed
        """
        if not signal.is_actionable():
            return None

        # Determine if bet won
        if signal.direction == "OVER":
            won = actual_total > signal.ou_line
        elif signal.direction == "UNDER":
            won = actual_total < signal.ou_line
        else:
            return None

        # Handle push
        if actual_total == signal.ou_line:
            profit = 0.0
            won = None  # Push
        else:
            profit = self.calculate_profit(won, signal.unit_size)

        return BacktestResult(
            game_id=signal.game_id,
            home_team=signal.home_team,
            away_team=signal.away_team,
            bet_minute=signal.minute,
            direction=signal.direction,
            ou_line=signal.ou_line,
            projected_total=signal.projected_total,
            actual_total=actual_total,
            edge_pct=signal.edge_pct,
            confidence=signal.confidence,
            unit_size=signal.unit_size,
            won=won if won is not None else False,
            profit=profit,
        )

    def run_backtest(
        self,
        projections_df: pd.DataFrame,
        lines_df: pd.DataFrame = None,
        bet_at_minute: int = None,
        best_signal_only: bool = True
    ) -> BacktestSummary:
        """
        Run backtest on historical projections

        Args:
            projections_df: DataFrame with projection results (must have columns:
                game_id, minute_index, projected_total, points_so_far,
                kalman_covariance, team_home, team_away)
            lines_df: Optional DataFrame with O/U lines (game_id, ou_line, actual_total)
                     If not provided, uses projected_total as pseudo-line for testing
            bet_at_minute: If set, only bet at this specific minute. Otherwise, find best signal.
            best_signal_only: If True, only take the single best signal per game

        Returns:
            BacktestSummary with all statistics
        """
        self.results = []

        # Get unique games
        game_ids = projections_df['game_id'].unique()
        logger.info(f"Backtesting {len(game_ids)} games...")

        for game_id in game_ids:
            game_df = projections_df[projections_df['game_id'] == game_id].sort_values('minute_index')

            if game_df.empty:
                continue

            # Get game info
            home_team = game_df.iloc[0].get('team_home', game_df.iloc[0].get('home_team', 'Home'))
            away_team = game_df.iloc[0].get('team_away', game_df.iloc[0].get('away_team', 'Away'))

            # Get O/U line and actual total
            if lines_df is not None and game_id in lines_df['game_id'].values:
                line_row = lines_df[lines_df['game_id'] == game_id].iloc[0]
                ou_line = line_row['ou_line']
                actual_total = line_row['actual_total']
            else:
                # Use final game total as the "actual" and create a pseudo-line
                actual_total = game_df['points_so_far'].iloc[-1]
                # Create a line that's slightly different from actual for testing
                ou_line = actual_total - 2  # Pseudo-line for testing purposes

            # Get matchup info if available
            matchup_info = {
                "matchup_type": game_df.iloc[0].get('matchup_type', ''),
                "home_pace": game_df.iloc[0].get('home_pace', ''),
                "away_pace": game_df.iloc[0].get('away_pace', ''),
                "pace_agreement": game_df.iloc[0].get('pace_agreement', 1.0),
            }

            # Generate signals for each minute
            signals = []
            for _, row in game_df.iterrows():
                minute = int(row['minute_index'])

                if bet_at_minute is not None and minute != bet_at_minute:
                    continue

                signal = self.signal_calculator.generate_signal(
                    game_id=str(game_id),
                    home_team=home_team,
                    away_team=away_team,
                    minute=minute,
                    current_total=row.get('points_so_far', 0),
                    projected_total=row.get('projected_total', 0),
                    ou_line=ou_line,
                    kalman_covariance=row.get('kalman_covariance', row.get('P', 1.0)),
                    matchup_info=matchup_info if matchup_info.get('matchup_type') else None,
                )

                if signal.is_actionable():
                    signals.append(signal)

            if not signals:
                continue

            # Select signals to bet on
            if best_signal_only:
                # Take the signal with highest confidence
                best_signal = max(signals, key=lambda s: s.confidence)
                selected_signals = [best_signal]
            else:
                selected_signals = signals

            # Evaluate each selected signal
            for signal in selected_signals:
                result = self.evaluate_bet(signal, actual_total)
                if result:
                    self.results.append(result)

        # Calculate summary
        summary = self._calculate_summary()
        logger.info(f"Backtest complete: {summary.total_bets} bets, "
                   f"{summary.win_rate:.1f}% win rate, "
                   f"{summary.total_units_profit:.2f} units profit")

        return summary

    def _calculate_summary(self) -> BacktestSummary:
        """Calculate summary statistics from results"""
        if not self.results:
            return BacktestSummary()

        df = pd.DataFrame([r.to_dict() for r in self.results])

        total_bets = len(df)
        wins = df['won'].sum()
        losses = total_bets - wins
        pushes = len(df[df['profit'] == 0])

        win_rate = (wins / total_bets * 100) if total_bets > 0 else 0
        total_units_wagered = df['unit_size'].sum()
        total_units_profit = df['profit'].sum()
        roi = (total_units_profit / total_units_wagered * 100) if total_units_wagered > 0 else 0

        summary = BacktestSummary(
            total_bets=total_bets,
            wins=int(wins),
            losses=int(losses),
            pushes=pushes,
            win_rate=win_rate,
            total_units_wagered=total_units_wagered,
            total_units_profit=total_units_profit,
            roi=roi,
        )

        # Breakdown by confidence tier
        summary.by_confidence_tier = self._breakdown_by_confidence(df)

        # Breakdown by minute range
        summary.by_minute_range = self._breakdown_by_minute(df)

        # Breakdown by direction
        summary.by_direction = self._breakdown_by_direction(df)

        return summary

    def _breakdown_by_confidence(self, df: pd.DataFrame) -> Dict[str, Dict]:
        """Break down results by confidence tier"""
        tiers = {
            "80+": df[df['confidence'] >= 80],
            "70-79": df[(df['confidence'] >= 70) & (df['confidence'] < 80)],
            "60-69": df[(df['confidence'] >= 60) & (df['confidence'] < 70)],
            "50-59": df[(df['confidence'] >= 50) & (df['confidence'] < 60)],
            "<50": df[df['confidence'] < 50],
        }

        breakdown = {}
        for tier_name, tier_df in tiers.items():
            if len(tier_df) > 0:
                breakdown[tier_name] = {
                    "bets": len(tier_df),
                    "wins": int(tier_df['won'].sum()),
                    "win_rate": tier_df['won'].mean() * 100,
                    "units_profit": tier_df['profit'].sum(),
                    "roi": (tier_df['profit'].sum() / tier_df['unit_size'].sum() * 100)
                           if tier_df['unit_size'].sum() > 0 else 0,
                }

        return breakdown

    def _breakdown_by_minute(self, df: pd.DataFrame) -> Dict[str, Dict]:
        """Break down results by game minute"""
        ranges = {
            "4-10": df[(df['bet_minute'] >= 4) & (df['bet_minute'] <= 10)],
            "11-20": df[(df['bet_minute'] >= 11) & (df['bet_minute'] <= 20)],
            "21-30": df[(df['bet_minute'] >= 21) & (df['bet_minute'] <= 30)],
            "31-40": df[(df['bet_minute'] >= 31) & (df['bet_minute'] <= 40)],
        }

        breakdown = {}
        for range_name, range_df in ranges.items():
            if len(range_df) > 0:
                breakdown[range_name] = {
                    "bets": len(range_df),
                    "wins": int(range_df['won'].sum()),
                    "win_rate": range_df['won'].mean() * 100,
                    "units_profit": range_df['profit'].sum(),
                }

        return breakdown

    def _breakdown_by_direction(self, df: pd.DataFrame) -> Dict[str, Dict]:
        """Break down results by bet direction"""
        breakdown = {}
        for direction in ["OVER", "UNDER"]:
            dir_df = df[df['direction'] == direction]
            if len(dir_df) > 0:
                breakdown[direction] = {
                    "bets": len(dir_df),
                    "wins": int(dir_df['won'].sum()),
                    "win_rate": dir_df['won'].mean() * 100,
                    "units_profit": dir_df['profit'].sum(),
                }

        return breakdown

    def get_results_df(self) -> pd.DataFrame:
        """Get all results as a DataFrame"""
        if not self.results:
            return pd.DataFrame()
        return pd.DataFrame([r.to_dict() for r in self.results])

    def save_results(self, path: str):
        """Save results to CSV"""
        df = self.get_results_df()
        df.to_csv(path, index=False)
        logger.info(f"Saved {len(df)} backtest results to {path}")


def get_backtester(odds: int = -110) -> ProjectionBacktester:
    """Factory function for ProjectionBacktester"""
    return ProjectionBacktester(odds=odds)


@click.command()
@click.option("--projections", "-p", required=True, help="Path to projections CSV")
@click.option("--lines", "-l", default=None, help="Path to O/U lines CSV (optional)")
@click.option("--output", "-o", default=None, help="Output path for results CSV")
@click.option("--minute", "-m", default=None, type=int, help="Bet only at this minute")
@click.option("--odds", default=-110, type=int, help="Assumed odds (default -110)")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
def main(projections, lines, output, minute, odds, verbose):
    """
    Run backtest on projection results.

    Examples:
        # Basic backtest
        python backtester.py -p outputs/season_game_summaries.csv

        # With O/U lines
        python backtester.py -p outputs/projections.csv -l data/ou_lines.csv

        # Bet only at minute 20
        python backtester.py -p outputs/projections.csv -m 20
    """
    from loguru import logger
    import sys

    logger.remove()
    level = "DEBUG" if verbose else "INFO"
    logger.add(sys.stderr, level=level)

    # Load data
    projections_df = pd.read_csv(projections)
    logger.info(f"Loaded {len(projections_df)} projection rows from {projections}")

    lines_df = None
    if lines:
        lines_df = pd.read_csv(lines)
        logger.info(f"Loaded {len(lines_df)} lines from {lines}")

    # Run backtest
    backtester = ProjectionBacktester(odds=odds)
    summary = backtester.run_backtest(
        projections_df,
        lines_df=lines_df,
        bet_at_minute=minute,
    )

    # Print summary
    print("\n" + "=" * 60)
    print("BACKTEST SUMMARY")
    print("=" * 60)
    print(f"Total Bets: {summary.total_bets}")
    print(f"Record: {summary.wins}W - {summary.losses}L - {summary.pushes}P")
    print(f"Win Rate: {summary.win_rate:.1f}%")
    print(f"Break-even at -110: 52.4%")
    print(f"\nUnits Wagered: {summary.total_units_wagered:.1f}")
    print(f"Units Profit: {summary.total_units_profit:+.2f}")
    print(f"ROI: {summary.roi:+.1f}%")

    if summary.by_confidence_tier:
        print("\n" + "-" * 40)
        print("BY CONFIDENCE TIER")
        print("-" * 40)
        for tier, stats in sorted(summary.by_confidence_tier.items()):
            print(f"  {tier}: {stats['bets']} bets, "
                  f"{stats['win_rate']:.1f}% win rate, "
                  f"{stats['units_profit']:+.2f} units")

    if summary.by_minute_range:
        print("\n" + "-" * 40)
        print("BY MINUTE RANGE")
        print("-" * 40)
        for range_name, stats in summary.by_minute_range.items():
            print(f"  {range_name}: {stats['bets']} bets, "
                  f"{stats['win_rate']:.1f}% win rate, "
                  f"{stats['units_profit']:+.2f} units")

    if summary.by_direction:
        print("\n" + "-" * 40)
        print("BY DIRECTION")
        print("-" * 40)
        for direction, stats in summary.by_direction.items():
            print(f"  {direction}: {stats['bets']} bets, "
                  f"{stats['win_rate']:.1f}% win rate, "
                  f"{stats['units_profit']:+.2f} units")

    # Save results
    if output:
        backtester.save_results(output)
    else:
        output_path = Path(projections).parent / "backtest_results.csv"
        backtester.save_results(str(output_path))


if __name__ == "__main__":
    main()

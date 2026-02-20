"""
PPM Threshold Analysis System
Analyzes performance at different PPM trigger thresholds to optimize the model
"""
import csv
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict
from loguru import logger
import config


class PPMAnalyzer:
    """
    Analyzes betting performance across different PPM threshold levels

    Tracks:
    - Win rate at each 0.1 PPM interval
    - Hit rate (how often the required PPM was actually hit)
    - Average confidence at different thresholds
    - Optimal threshold recommendations
    """

    def __init__(self):
        self.live_log_path = config.LIVE_LOG_FILE
        self.results_path = config.RESULTS_FILE

        # PPM thresholds to analyze (0.5 to 10.0 in 0.1 increments)
        self.ppm_buckets = [round(x * 0.1, 1) for x in range(5, 101)]  # 0.5 to 10.0

    def analyze_ppm_performance(self, days: int = 30) -> Dict:
        """
        Analyze betting performance at different PPM threshold levels

        Args:
            days: Number of days to analyze

        Returns:
            Dict with analysis results per PPM bucket
        """
        cutoff_date = datetime.now() - timedelta(days=days)

        # Load all live logs
        logs = self._load_logs_since(cutoff_date)

        # Load results (final outcomes)
        results = self._load_results_since(cutoff_date)
        results_by_game = {r['game_id']: r for r in results}

        # Analyze each PPM bucket
        analysis = {}

        for ppm_threshold in self.ppm_buckets:
            bucket_data = self._analyze_bucket(
                logs, results_by_game, ppm_threshold
            )
            analysis[ppm_threshold] = bucket_data

        # Calculate optimal threshold
        optimal = self._find_optimal_threshold(analysis)

        return {
            'analysis_period_days': days,
            'total_games_analyzed': len(set(r['game_id'] for r in results)),
            'optimal_threshold': optimal,
            'by_threshold': analysis
        }

    def _analyze_bucket(
        self,
        logs: List[Dict],
        results_by_game: Dict,
        ppm_threshold: float
    ) -> Dict:
        """Analyze performance for a specific PPM threshold"""

        # Find all instances where this threshold was hit
        threshold_hits = []

        for log in logs:
            try:
                required_ppm = float(log.get('required_ppm', 0))
                bet_type = log.get('bet_type', '').lower()
                game_id = log.get('game_id')

                # Check if this would trigger at this threshold
                triggered = False
                if bet_type == 'under' and required_ppm >= ppm_threshold:
                    triggered = True
                elif bet_type == 'over' and required_ppm <= ppm_threshold:
                    triggered = True

                if triggered and game_id in results_by_game:
                    threshold_hits.append({
                        'log': log,
                        'result': results_by_game[game_id]
                    })
            except (ValueError, TypeError):
                continue

        if not threshold_hits:
            return {
                'triggers': 0,
                'win_rate': 0,
                'avg_confidence': 0,
                'avg_units': 0,
                'total_profit': 0,
                'roi': 0
            }

        # Calculate metrics
        triggers = len(threshold_hits)
        wins = sum(1 for h in threshold_hits if h['result'].get('outcome') == 'win')
        losses = sum(1 for h in threshold_hits if h['result'].get('outcome') == 'loss')
        pushes = sum(1 for h in threshold_hits if h['result'].get('outcome') == 'push')

        total_confidence = sum(float(h['log'].get('confidence_score', 0)) for h in threshold_hits)
        avg_confidence = total_confidence / triggers if triggers > 0 else 0

        total_units = sum(float(h['log'].get('unit_size', 0)) for h in threshold_hits)
        avg_units = total_units / triggers if triggers > 0 else 0

        total_profit = sum(float(h['result'].get('unit_profit', 0)) for h in threshold_hits)

        win_rate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0
        roi = (total_profit / total_units * 100) if total_units > 0 else 0

        return {
            'triggers': triggers,
            'wins': wins,
            'losses': losses,
            'pushes': pushes,
            'win_rate': round(win_rate, 2),
            'avg_confidence': round(avg_confidence, 1),
            'avg_units': round(avg_units, 2),
            'total_units_wagered': round(total_units, 2),
            'total_profit': round(total_profit, 2),
            'roi': round(roi, 2)
        }

    def _find_optimal_threshold(self, analysis: Dict) -> Dict:
        """
        Find the optimal PPM threshold based on multiple criteria

        Criteria:
        1. Highest ROI with at least 10 samples
        2. Best risk-adjusted return (ROI / std dev)
        3. Highest win rate with positive ROI
        """
        # Filter to thresholds with sufficient sample size
        valid_thresholds = {
            ppm: data for ppm, data in analysis.items()
            if data['triggers'] >= 10
        }

        if not valid_thresholds:
            return {
                'threshold': None,
                'reason': 'Insufficient data (need at least 10 triggers)',
                'recommendation': 'Continue collecting data'
            }

        # Find best ROI
        best_roi = max(valid_thresholds.items(), key=lambda x: x[1]['roi'])

        # Find best win rate (with positive ROI)
        positive_roi_thresholds = {
            ppm: data for ppm, data in valid_thresholds.items()
            if data['roi'] > 0
        }

        if positive_roi_thresholds:
            best_win_rate = max(
                positive_roi_thresholds.items(),
                key=lambda x: x[1]['win_rate']
            )
        else:
            best_win_rate = (None, None)

        return {
            'best_roi': {
                'threshold': best_roi[0],
                'roi': best_roi[1]['roi'],
                'win_rate': best_roi[1]['win_rate'],
                'triggers': best_roi[1]['triggers']
            },
            'best_win_rate': {
                'threshold': best_win_rate[0],
                'win_rate': best_win_rate[1]['win_rate'] if best_win_rate[1] else 0,
                'roi': best_win_rate[1]['roi'] if best_win_rate[1] else 0,
                'triggers': best_win_rate[1]['triggers'] if best_win_rate[1] else 0
            } if best_win_rate[0] else None,
            'recommendation': {
                'threshold': best_roi[0],
                'reason': f"Highest ROI ({best_roi[1]['roi']}%) with {best_roi[1]['triggers']} samples"
            }
        }

    def generate_daily_summary(self, date: Optional[datetime] = None) -> Dict:
        """
        Generate daily summary report for a specific date

        Args:
            date: Date to analyze (defaults to today)

        Returns:
            Dict with daily summary stats
        """
        if date is None:
            date = datetime.now()

        # Get all logs for this date
        logs = []
        try:
            with open(self.live_log_path, 'r') as f:
                reader = csv.DictReader(f)
                for log in reader:
                    try:
                        log_date = datetime.fromisoformat(log['timestamp']).date()
                        if log_date == date.date():
                            logs.append(log)
                    except:
                        continue
        except FileNotFoundError:
            logger.warning(f"Live log file not found: {self.live_log_path}")
            return {}

        if not logs:
            return {
                'date': date.date().isoformat(),
                'games_monitored': 0,
                'message': 'No games monitored on this date'
            }

        # Group by game
        games = defaultdict(list)
        for log in logs:
            game_id = log.get('game_id')
            games[game_id].append(log)

        # Analyze each game
        game_summaries = []
        for game_id, game_logs in games.items():
            summary = self._summarize_game(game_logs)
            if summary:
                game_summaries.append(summary)

        # Overall daily stats
        total_triggers = sum(1 for g in game_summaries if g['triggered'])
        total_polls = sum(g['polls'] for g in game_summaries)

        # PPM distribution
        ppm_distribution = self._calculate_ppm_distribution(logs)

        return {
            'date': date.date().isoformat(),
            'games_monitored': len(games),
            'total_polls': total_polls,
            'total_triggers': total_triggers,
            'trigger_rate': round(total_triggers / len(games) * 100, 1) if games else 0,
            'ppm_distribution': ppm_distribution,
            'games': game_summaries
        }

    def _summarize_game(self, game_logs: List[Dict]) -> Optional[Dict]:
        """Summarize a single game's monitoring"""
        if not game_logs:
            return None

        first_log = game_logs[0]
        last_log = game_logs[-1]

        # Track PPM progression
        ppm_values = []
        for log in game_logs:
            try:
                ppm = float(log.get('required_ppm', 0))
                if ppm > 0:
                    ppm_values.append(ppm)
            except (ValueError, TypeError):
                continue

        # Check if triggered
        triggered = any(log.get('trigger_flag') in ['True', True, '1'] for log in game_logs)

        # Get max confidence
        max_confidence = 0
        for log in game_logs:
            try:
                conf = float(log.get('confidence_score', 0))
                if conf > max_confidence:
                    max_confidence = conf
            except (ValueError, TypeError):
                continue

        return {
            'game_id': first_log.get('game_id'),
            'matchup': f"{first_log.get('away_team')} @ {first_log.get('home_team')}",
            'polls': len(game_logs),
            'triggered': triggered,
            'bet_type': last_log.get('bet_type', ''),
            'ou_line': float(last_log.get('ou_line', 0)),
            'final_total': float(last_log.get('total_points', 0)),
            'ppm_min': round(min(ppm_values), 2) if ppm_values else 0,
            'ppm_max': round(max(ppm_values), 2) if ppm_values else 0,
            'ppm_avg': round(sum(ppm_values) / len(ppm_values), 2) if ppm_values else 0,
            'max_confidence': round(max_confidence, 1)
        }

    def _calculate_ppm_distribution(self, logs: List[Dict]) -> Dict:
        """Calculate distribution of games across PPM ranges"""
        distribution = {
            '0.0-1.0': 0,
            '1.1-2.0': 0,
            '2.1-3.0': 0,
            '3.1-4.0': 0,
            '4.1-5.0': 0,
            '5.1-6.0': 0,
            '6.1-7.0': 0,
            '7.1+': 0
        }

        for log in logs:
            try:
                ppm = float(log.get('required_ppm', 0))
                if ppm <= 1.0:
                    distribution['0.0-1.0'] += 1
                elif ppm <= 2.0:
                    distribution['1.1-2.0'] += 1
                elif ppm <= 3.0:
                    distribution['2.1-3.0'] += 1
                elif ppm <= 4.0:
                    distribution['3.1-4.0'] += 1
                elif ppm <= 5.0:
                    distribution['4.1-5.0'] += 1
                elif ppm <= 6.0:
                    distribution['5.1-6.0'] += 1
                elif ppm <= 7.0:
                    distribution['6.1-7.0'] += 1
                else:
                    distribution['7.1+'] += 1
            except (ValueError, TypeError):
                continue

        return distribution

    def _load_logs_since(self, cutoff_date: datetime) -> List[Dict]:
        """Load all logs since cutoff date"""
        logs = []
        try:
            with open(self.live_log_path, 'r') as f:
                reader = csv.DictReader(f)
                for log in reader:
                    try:
                        log_date = datetime.fromisoformat(log['timestamp'])
                        if log_date >= cutoff_date:
                            logs.append(log)
                    except:
                        continue
        except FileNotFoundError:
            logger.warning(f"Live log file not found: {self.live_log_path}")

        return logs

    def _load_results_since(self, cutoff_date: datetime) -> List[Dict]:
        """Load all results since cutoff date"""
        results = []
        try:
            with open(self.results_path, 'r') as f:
                reader = csv.DictReader(f)
                for result in reader:
                    try:
                        result_date = datetime.fromisoformat(result['date'])
                        if result_date >= cutoff_date:
                            results.append(result)
                    except:
                        continue
        except FileNotFoundError:
            logger.warning(f"Results file not found: {self.results_path}")

        return results


# Singleton instance
_ppm_analyzer = None

def get_ppm_analyzer() -> PPMAnalyzer:
    """Get singleton PPM analyzer instance"""
    global _ppm_analyzer
    if _ppm_analyzer is None:
        _ppm_analyzer = PPMAnalyzer()
    return _ppm_analyzer

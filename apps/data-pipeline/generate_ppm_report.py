"""
CLI tool to generate PPM threshold analysis reports
Usage: python generate_ppm_report.py [--days 30] [--export report.json]
"""
import argparse
import json
from datetime import datetime, timedelta
from utils.ppm_analyzer import get_ppm_analyzer
from loguru import logger


def print_threshold_analysis(analysis: dict):
    """Pretty print the PPM threshold analysis"""
    print("\n" + "="*100)
    print(f"PPM THRESHOLD ANALYSIS - Last {analysis['analysis_period_days']} Days")
    print(f"Total Games Analyzed: {analysis['total_games_analyzed']}")
    print("="*100)

    # Print optimal threshold recommendation
    optimal = analysis.get('optimal_threshold', {})
    if optimal and isinstance(optimal, dict) and optimal.get('recommendation'):
        rec = optimal['recommendation']
        if isinstance(rec, dict):
            print(f"\n🎯 OPTIMAL THRESHOLD: {rec['threshold']} PPM")
            print(f"   Reason: {rec['reason']}")
        else:
            print(f"\n⚠️  {rec}")

    # Print best performers
    if optimal.get('best_roi'):
        best_roi = optimal['best_roi']
        print(f"\n💰 Best ROI: {best_roi['threshold']} PPM")
        print(f"   ROI: {best_roi['roi']}% | Win Rate: {best_roi['win_rate']}% | Triggers: {best_roi['triggers']}")

    if optimal.get('best_win_rate'):
        best_wr = optimal['best_win_rate']
        print(f"\n🏆 Best Win Rate: {best_wr['threshold']} PPM")
        print(f"   Win Rate: {best_wr['win_rate']}% | ROI: {best_wr['roi']}% | Triggers: {best_wr['triggers']}")

    # Print detailed breakdown
    print("\n" + "-"*100)
    print(f"{'Threshold':<12} {'Triggers':<10} {'W-L-P':<15} {'Win%':<8} {'Avg Conf':<10} {'Units':<10} {'Profit':<10} {'ROI%':<8}")
    print("-"*100)

    by_threshold = analysis.get('by_threshold', {})

    # Sort by threshold
    sorted_thresholds = sorted(by_threshold.items())

    # Only show thresholds with triggers or around current threshold (4.5)
    current_threshold = 4.5
    for threshold, data in sorted_thresholds:
        # Show if has triggers OR within 1.0 of current threshold
        if data.get('triggers', 0) > 0 or abs(threshold - current_threshold) <= 1.0:
            wlp = f"{data.get('wins', 0)}-{data.get('losses', 0)}-{data.get('pushes', 0)}"

            # Color code based on performance
            roi = data.get('roi', 0)
            roi_indicator = "🟢" if roi > 10 else "🟡" if roi > 0 else "🔴"

            print(
                f"{threshold:<12.1f} "
                f"{data.get('triggers', 0):<10} "
                f"{wlp:<15} "
                f"{data.get('win_rate', 0):<8.1f} "
                f"{data.get('avg_confidence', 0):<10.1f} "
                f"{data.get('total_units_wagered', 0):<10.1f} "
                f"{roi_indicator} {data.get('total_profit', 0):<7.2f} "
                f"{roi:<8.1f}"
            )

    print("="*100)


def print_daily_summary(summary: dict):
    """Pretty print the daily summary"""
    print("\n" + "="*80)
    print(f"DAILY SUMMARY - {summary.get('date', 'N/A')}")
    print("="*80)

    if summary.get('message'):
        print(f"\n{summary['message']}")
        return

    print(f"\nGames Monitored: {summary.get('games_monitored', 0)}")
    print(f"Total Polls: {summary.get('total_polls', 0)}")
    print(f"Triggers: {summary.get('total_triggers', 0)} ({summary.get('trigger_rate', 0)}%)")

    # PPM Distribution
    print("\n📊 PPM Distribution:")
    dist = summary.get('ppm_distribution', {})
    for range_name, count in dist.items():
        if count > 0:
            bar = "█" * (count // 5) if count >= 5 else "▌" * count
            print(f"  {range_name:<10} {bar} {count}")

    # Game summaries
    games = summary.get('games', [])
    if games:
        print("\n" + "-"*80)
        print("Game Details:")
        print("-"*80)
        for game in games:
            trigger_mark = "🚨" if game['triggered'] else "  "
            print(f"{trigger_mark} {game['matchup']}")
            print(f"   Line: {game['ou_line']} | Final: {game['final_total']}")
            print(f"   PPM Range: {game['ppm_min']} - {game['ppm_max']} (avg: {game['ppm_avg']})")
            print(f"   Polls: {game['polls']} | Max Confidence: {game['max_confidence']}")
            if game['triggered']:
                print(f"   ✅ Triggered: {game['bet_type'].upper()}")
            print()

    print("="*80)


def main():
    parser = argparse.ArgumentParser(description='Generate PPM threshold analysis reports')
    parser.add_argument('--days', type=int, default=30, help='Number of days to analyze (default: 30)')
    parser.add_argument('--export', type=str, help='Export analysis to JSON file')
    parser.add_argument('--daily', action='store_true', help='Show daily summary for today')
    parser.add_argument('--date', type=str, help='Date for daily summary (YYYY-MM-DD)')

    args = parser.parse_args()

    analyzer = get_ppm_analyzer()

    if args.daily or args.date:
        # Generate daily summary
        if args.date:
            try:
                target_date = datetime.fromisoformat(args.date)
            except ValueError:
                print(f"Error: Invalid date format. Use YYYY-MM-DD")
                return
        else:
            target_date = None

        summary = analyzer.generate_daily_summary(date=target_date)
        print_daily_summary(summary)

        if args.export:
            with open(args.export, 'w') as f:
                json.dump(summary, f, indent=2)
            print(f"\n✅ Exported to {args.export}")

    else:
        # Generate threshold analysis
        print(f"\nAnalyzing {args.days} days of data...")
        analysis = analyzer.analyze_ppm_performance(days=args.days)

        print_threshold_analysis(analysis)

        if args.export:
            with open(args.export, 'w') as f:
                json.dump(analysis, f, indent=2)
            print(f"\n✅ Exported to {args.export}")


if __name__ == "__main__":
    main()

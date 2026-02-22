"""
Performance Analysis Dashboard
Analyzes over/under betting performance from historical results
"""
import csv
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

def load_results(csv_path):
    """Load results from CSV"""
    results = []
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert numeric fields
            row['final_total'] = float(row['final_total']) if row['final_total'] else 0
            row['ou_line'] = float(row['ou_line']) if row['ou_line'] else 0
            row['max_confidence'] = float(row['max_confidence']) if row['max_confidence'] else 0
            row['max_units'] = float(row['max_units']) if row['max_units'] else 0
            row['unit_profit'] = float(row['unit_profit']) if row['unit_profit'] else 0
            row['our_trigger'] = row['our_trigger'] in ['True', 'TRUE', '1', 'true']
            results.append(row)
    return results

def analyze_overall_performance(results):
    """Calculate overall win rate and ROI"""
    triggered = [r for r in results if r['our_trigger']]

    total_bets = len(triggered)
    if total_bets == 0:
        return None

    wins = sum(1 for r in triggered if r['outcome'] == 'win')
    losses = sum(1 for r in triggered if r['outcome'] == 'loss')
    pushes = sum(1 for r in triggered if r['outcome'] == 'push')

    total_profit = sum(r['unit_profit'] for r in triggered)
    total_wagered = sum(abs(r['max_units']) for r in triggered)

    win_rate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0
    roi = (total_profit / total_wagered) * 100 if total_wagered > 0 else 0

    return {
        'total_bets': total_bets,
        'wins': wins,
        'losses': losses,
        'pushes': pushes,
        'win_rate': win_rate,
        'total_profit': total_profit,
        'total_wagered': total_wagered,
        'roi': roi
    }

def analyze_by_bet_type(results):
    """Analyze performance by OVER vs UNDER"""
    triggered = [r for r in results if r['our_trigger']]

    # Determine bet type based on system recommendation
    # If game went UNDER and we won, we bet UNDER
    # If game went OVER and we won, we bet OVER
    over_bets = []
    under_bets = []

    for r in triggered:
        ou_result = r['ou_result']
        outcome = r['outcome']

        # Determine what we bet
        if outcome == 'win':
            bet_type = ou_result  # If we won, we bet what actually happened
        elif outcome == 'loss':
            bet_type = 'over' if ou_result == 'under' else 'under'  # If we lost, we bet the opposite
        else:
            bet_type = 'unknown'

        if bet_type == 'over':
            over_bets.append(r)
        elif bet_type == 'under':
            under_bets.append(r)

    def calc_stats(bets):
        if not bets:
            return None
        wins = sum(1 for b in bets if b['outcome'] == 'win')
        losses = sum(1 for b in bets if b['outcome'] == 'loss')
        profit = sum(b['unit_profit'] for b in bets)
        wagered = sum(abs(b['max_units']) for b in bets)
        win_rate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0
        roi = (profit / wagered) * 100 if wagered > 0 else 0
        return {
            'count': len(bets),
            'wins': wins,
            'losses': losses,
            'win_rate': win_rate,
            'profit': profit,
            'wagered': wagered,
            'roi': roi
        }

    return {
        'over': calc_stats(over_bets),
        'under': calc_stats(under_bets)
    }

def analyze_by_confidence(results):
    """Analyze performance by confidence tier"""
    triggered = [r for r in results if r['our_trigger']]

    tiers = {
        'Low (41-60)': [],
        'Medium (61-75)': [],
        'High (76-85)': [],
        'Max (86-100)': []
    }

    for r in triggered:
        conf = r['max_confidence']
        if 41 <= conf <= 60:
            tiers['Low (41-60)'].append(r)
        elif 61 <= conf <= 75:
            tiers['Medium (61-75)'].append(r)
        elif 76 <= conf <= 85:
            tiers['High (76-85)'].append(r)
        elif conf >= 86:
            tiers['Max (86-100)'].append(r)

    def calc_stats(bets):
        if not bets:
            return None
        wins = sum(1 for b in bets if b['outcome'] == 'win')
        losses = sum(1 for b in bets if b['outcome'] == 'loss')
        profit = sum(b['unit_profit'] for b in bets)
        win_rate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0
        avg_units = sum(abs(b['max_units']) for b in bets) / len(bets) if bets else 0
        return {
            'count': len(bets),
            'wins': wins,
            'losses': losses,
            'win_rate': win_rate,
            'profit': profit,
            'avg_units': avg_units
        }

    return {tier: calc_stats(bets) for tier, bets in tiers.items()}

def analyze_actual_ou_distribution(results):
    """What actually happened - did games go OVER or UNDER more?"""
    over_count = sum(1 for r in results if r['ou_result'] == 'over')
    under_count = sum(1 for r in results if r['ou_result'] == 'under')
    push_count = sum(1 for r in results if r['ou_result'] == 'push')

    total = len(results)
    if total == 0:
        return None

    return {
        'over': over_count,
        'under': under_count,
        'push': push_count,
        'total': total,
        'over_pct': (over_count / total) * 100,
        'under_pct': (under_count / total) * 100
    }

def print_report(results):
    """Print comprehensive performance report"""
    print("\n" + "="*80)
    print("📊 OVER/UNDER BETTING PERFORMANCE ANALYSIS")
    print("="*80)

    # Overall Performance
    overall = analyze_overall_performance(results)
    if overall:
        print("\n🎯 OVERALL PERFORMANCE")
        print("-" * 80)
        print(f"Total Bets:        {overall['total_bets']}")
        print(f"Wins:              {overall['wins']}")
        print(f"Losses:            {overall['losses']}")
        print(f"Pushes:            {overall['pushes']}")
        print(f"Win Rate:          {overall['win_rate']:.1f}%")
        print(f"Total Profit:      {overall['total_profit']:+.1f} units")
        print(f"Total Wagered:     {overall['total_wagered']:.1f} units")
        print(f"ROI:               {overall['roi']:+.1f}%")

    # Actual O/U Distribution
    actual_dist = analyze_actual_ou_distribution(results)
    if actual_dist:
        print("\n📈 ACTUAL GAME OUTCOMES (What Happened in Reality)")
        print("-" * 80)
        print(f"Games that went OVER:  {actual_dist['over']} ({actual_dist['over_pct']:.1f}%)")
        print(f"Games that went UNDER: {actual_dist['under']} ({actual_dist['under_pct']:.1f}%)")
        print(f"Pushes:                {actual_dist['push']}")
        print(f"\n💡 INSIGHT: UNDERs hit {actual_dist['under_pct']:.1f}% of the time!")

    # By Bet Type
    by_type = analyze_by_bet_type(results)
    print("\n🎲 PERFORMANCE BY BET TYPE (What We Bet On)")
    print("-" * 80)

    for bet_type, stats in by_type.items():
        if stats:
            print(f"\n{bet_type.upper()} BETS:")
            print(f"  Count:      {stats['count']}")
            print(f"  Wins:       {stats['wins']}")
            print(f"  Losses:     {stats['losses']}")
            print(f"  Win Rate:   {stats['win_rate']:.1f}%")
            print(f"  Profit:     {stats['profit']:+.1f} units")
            print(f"  ROI:        {stats['roi']:+.1f}%")

    # By Confidence
    by_confidence = analyze_by_confidence(results)
    print("\n🎯 PERFORMANCE BY CONFIDENCE TIER")
    print("-" * 80)

    for tier, stats in by_confidence.items():
        if stats and stats['count'] > 0:
            print(f"\n{tier}:")
            print(f"  Count:        {stats['count']}")
            print(f"  Wins:         {stats['wins']}")
            print(f"  Losses:       {stats['losses']}")
            print(f"  Win Rate:     {stats['win_rate']:.1f}%")
            print(f"  Profit:       {stats['profit']:+.1f} units")
            print(f"  Avg Units:    {stats['avg_units']:.2f}")

    # Summary & Recommendations
    print("\n" + "="*80)
    print("💡 KEY INSIGHTS & RECOMMENDATIONS")
    print("="*80)

    if actual_dist and overall:
        print(f"\n1. UNDERS hit {actual_dist['under_pct']:.1f}% of tracked games")
        print(f"2. System win rate: {overall['win_rate']:.1f}%")
        print(f"3. System ROI: {overall['roi']:+.1f}%")

        if overall['win_rate'] >= 55:
            print(f"   ✅ PROFITABLE - Win rate above breakeven!")
        else:
            print(f"   ⚠️  Below 55% - Need higher win rate for profit with -110 juice")

        if overall['total_profit'] > 0:
            print(f"   ✅ NET POSITIVE - Up {overall['total_profit']:+.1f} units")
        else:
            print(f"   ❌ NET NEGATIVE - Down {overall['total_profit']:+.1f} units")

    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    csv_path = Path("data/ncaa_results.csv")

    if not csv_path.exists():
        print(f"❌ Error: {csv_path} not found")
        print("Run backfill_results.py first to generate historical data")
        exit(1)

    print(f"📁 Loading results from {csv_path}")
    results = load_results(csv_path)
    print(f"✅ Loaded {len(results)} games")

    print_report(results)

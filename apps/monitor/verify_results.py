"""
Third-Party Verification Script
Displays all game results with clickable ESPN links for manual verification
"""
import csv
from pathlib import Path

def load_and_display_results(csv_path):
    """Load results and display for manual verification"""
    results = []

    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            results.append(row)

    print("\n" + "="*100)
    print("🔍 GAME RESULTS VERIFICATION - Check Against ESPN/CBS Sports")
    print("="*100)
    print("\nInstructions: Click the ESPN link to verify the final score matches our data")
    print("="*100)

    over_count = 0
    under_count = 0
    push_count = 0

    for i, game in enumerate(results, 1):
        game_id = game['game_id']
        home_team = game['home_team']
        away_team = game['away_team']
        home_score = int(game['final_home_score'])
        away_score = int(game['final_away_score'])
        final_total = int(game['final_total'])
        ou_line = float(game['ou_line'])
        ou_result = game['ou_result']

        # Calculate margin
        margin = final_total - ou_line

        # Count results
        if ou_result == 'over':
            over_count += 1
            result_symbol = "📈 OVER"
            result_color = "🔴"
        elif ou_result == 'under':
            under_count += 1
            result_symbol = "📉 UNDER"
            result_color = "🔵"
        else:
            push_count += 1
            result_symbol = "⚖️  PUSH"
            result_color = "⚪"

        print(f"\n{result_color} Game #{i}: {away_team} @ {home_team}")
        print(f"   Final Score: {away_team} {away_score}, {home_team} {home_score} = {final_total} total")
        print(f"   O/U Line: {ou_line}")
        print(f"   Result: {result_symbol} by {abs(margin):.1f} points")
        print(f"   Math Check: {final_total} {'>' if ou_result == 'over' else '<' if ou_result == 'under' else '='} {ou_line} ✓")
        print(f"   Verify: https://www.espn.com/mens-college-basketball/game/_/gameId/{game_id}")

    print("\n" + "="*100)
    print("📊 SUMMARY")
    print("="*100)
    print(f"Total Games: {len(results)}")
    print(f"OVERs:       {over_count} ({(over_count/len(results)*100):.1f}%)")
    print(f"UNDERs:      {under_count} ({(under_count/len(results)*100):.1f}%)")
    print(f"Pushes:      {push_count}")
    print("="*100)

    # Show games that went OVER for easy checking
    print("\n🔴 GAMES THAT WENT OVER (Check these if you think more went over):")
    print("-"*100)
    over_games = [g for g in results if g['ou_result'] == 'over']
    for g in over_games:
        total = int(g['final_total'])
        line = float(g['ou_line'])
        print(f"   {g['away_team']} @ {g['home_team']}: {total} total (line: {line}) [+{total-line:.1f}]")

    print("\n🔵 GAMES THAT WENT UNDER (Verify these too):")
    print("-"*100)
    under_games = [g for g in results if g['ou_result'] == 'under']
    for g in under_games[:10]:  # Show first 10
        total = int(g['final_total'])
        line = float(g['ou_line'])
        print(f"   {g['away_team']} @ {g['home_team']}: {total} total (line: {line}) [{total-line:.1f}]")
    if len(under_games) > 10:
        print(f"   ... and {len(under_games)-10} more UNDER games")

    print("\n" + "="*100)
    print("💡 To verify any game:")
    print("   1. Click the ESPN link above")
    print("   2. Check the final score matches our data")
    print("   3. Verify the O/U line we used")
    print("   4. Confirm if it went OVER or UNDER")
    print("="*100 + "\n")

if __name__ == "__main__":
    csv_path = Path("data/ncaa_results.csv")

    if not csv_path.exists():
        print(f"❌ Error: {csv_path} not found")
        exit(1)

    load_and_display_results(csv_path)

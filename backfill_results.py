"""
Backfill Historical Game Results
Fetches final scores for tracked games and logs outcomes to ncaa_results.csv
"""
import csv
import requests
from datetime import datetime
from pathlib import Path
from collections import defaultdict
import time

def get_unique_games(csv_path):
    """Extract unique games with their trigger data"""
    games = {}

    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            game_id = row.get('Game ID')
            if not game_id:
                continue

            # Store game info (use latest entry for each game)
            if game_id not in games:
                games[game_id] = {
                    'game_id': game_id,
                    'home_team': row.get('Team 2'),  # Team 2 is home
                    'away_team': row.get('Team 1'),  # Team 1 is away
                    'ou_line': float(row.get('OU Line', 0)) if row.get('OU Line') else None,
                    'triggered': row.get('Trigger') == 'YES',
                    'max_confidence': 0,
                    'max_units': 0,
                    'bet_type': row.get('Bet Type', ''),
                    'trigger_timestamp': row.get('Timestamp', '')
                }

            # Track max confidence and units for this game
            try:
                confidence = float(row.get('Confidence', 0))
                units = float(row.get('Units', 0))
                if confidence > games[game_id]['max_confidence']:
                    games[game_id]['max_confidence'] = confidence
                    games[game_id]['max_units'] = units
            except:
                pass

    return games

def fetch_final_score(game_id):
    """Fetch final score from ESPN API"""
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary"
    params = {'event': game_id}

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Extract final scores
        header = data.get('header', {})
        competitions = header.get('competitions', [])

        if not competitions:
            return None

        competition = competitions[0]
        competitors = competition.get('competitors', [])

        scores = {}
        for competitor in competitors:
            home_away = competitor.get('homeAway')
            team_name = competitor.get('team', {}).get('displayName')
            score = int(competitor.get('score', 0))
            scores[home_away] = {'name': team_name, 'score': score}

        # Check if game is completed
        status = competition.get('status', {})
        completed = status.get('type', {}).get('completed', False)

        return {
            'home_score': scores.get('home', {}).get('score', 0),
            'away_score': scores.get('away', {}).get('score', 0),
            'home_name': scores.get('home', {}).get('name', ''),
            'away_name': scores.get('away', {}).get('name', ''),
            'completed': completed
        }

    except Exception as e:
        print(f"Error fetching game {game_id}: {e}")
        return None

def calculate_outcome(game, final_data):
    """Calculate game outcome and profit"""
    if not final_data or not game['ou_line']:
        return None

    final_total = final_data['home_score'] + final_data['away_score']
    ou_line = game['ou_line']

    # Determine O/U result
    if final_total > ou_line:
        ou_result = "over"
    elif final_total < ou_line:
        ou_result = "under"
    else:
        ou_result = "push"

    # Determine our outcome (we bet based on bet_type)
    outcome = ""
    unit_profit = 0

    if game['triggered']:
        bet_type = game['bet_type'].lower()

        if bet_type == ou_result:
            outcome = "win"
            unit_profit = game['max_units']  # Win 1:1
        elif ou_result == "push":
            outcome = "push"
            unit_profit = 0
        else:
            outcome = "loss"
            unit_profit = -game['max_units']

    # Estimate if went to OT (simple heuristic)
    went_to_ot = final_total > 180  # NCAA OT threshold

    return {
        'game_id': game['game_id'],
        'date': datetime.now().strftime("%Y-%m-%d"),
        'home_team': final_data['home_name'] or game['home_team'],
        'away_team': final_data['away_name'] or game['away_team'],
        'final_home_score': final_data['home_score'],
        'final_away_score': final_data['away_score'],
        'final_total': final_total,
        'ou_line': ou_line,
        'ou_open': ou_line,  # Assume same as closing (no historical open data)
        'ou_result': ou_result,
        'went_to_ot': went_to_ot,
        'our_trigger': game['triggered'],
        'max_confidence': game['max_confidence'],
        'max_units': game['max_units'],
        'trigger_timestamp': game['trigger_timestamp'],
        'outcome': outcome,
        'unit_profit': unit_profit,
        'notes': f"Backfilled from {csv_path.name}"
    }

def write_results(results, output_path):
    """Write results to CSV"""
    fieldnames = [
        "game_id", "date", "home_team", "away_team", "final_home_score",
        "final_away_score", "final_total", "ou_line", "ou_open", "ou_result",
        "went_to_ot", "our_trigger", "max_confidence", "max_units",
        "trigger_timestamp", "outcome", "unit_profit", "notes"
    ]

    # Check if file exists
    file_exists = output_path.exists()

    with open(output_path, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        writer.writerows(results)

if __name__ == "__main__":
    # Configuration
    csv_path = Path("data/ncaa_live_log.csv")  # Use current live log
    output_path = Path("data/ncaa_results.csv")

    print(f"🔍 Reading games from {csv_path}")
    games = get_unique_games(csv_path)
    print(f"Found {len(games)} unique games")

    print(f"\n📊 Fetching final scores from ESPN...")
    results = []
    successful = 0
    failed = 0

    for i, (game_id, game) in enumerate(games.items(), 1):
        print(f"[{i}/{len(games)}] {game['away_team']} @ {game['home_team']} (ID: {game_id})")

        # Fetch final score
        final_data = fetch_final_score(game_id)

        if final_data and final_data['completed']:
            outcome = calculate_outcome(game, final_data)
            if outcome:
                results.append(outcome)
                successful += 1
                status = f"✓ {outcome['ou_result'].upper()}"
                if outcome['outcome']:
                    status += f" - {outcome['outcome'].upper()} ({outcome['unit_profit']:+.1f} units)"
                print(f"  {status}")
            else:
                failed += 1
                print(f"  ✗ Could not calculate outcome")
        else:
            failed += 1
            if final_data:
                print(f"  ⏸ Game not completed yet")
            else:
                print(f"  ✗ Could not fetch data")

        # Rate limiting
        time.sleep(0.5)

    print(f"\n💾 Writing {len(results)} results to {output_path}")
    write_results(results, output_path)

    print(f"\n✅ Backfill Complete!")
    print(f"   Successful: {successful}")
    print(f"   Failed: {failed}")
    print(f"   Total: {len(games)}")

    # Summary statistics
    if results:
        wins = sum(1 for r in results if r['outcome'] == 'win')
        losses = sum(1 for r in results if r['outcome'] == 'loss')
        pushes = sum(1 for r in results if r['outcome'] == 'push')
        total_profit = sum(r['unit_profit'] for r in results)

        print(f"\n📈 Performance Summary:")
        print(f"   Triggered Bets: {wins + losses + pushes}")
        print(f"   Wins: {wins}")
        print(f"   Losses: {losses}")
        print(f"   Pushes: {pushes}")
        if wins + losses > 0:
            win_rate = (wins / (wins + losses)) * 100
            print(f"   Win Rate: {win_rate:.1f}%")
        print(f"   Total Profit: {total_profit:+.1f} units")

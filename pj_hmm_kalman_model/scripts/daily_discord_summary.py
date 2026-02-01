#!/usr/bin/env python3
"""
Daily Discord Summary for Take the Live Under
Fetches yesterday's NCAA basketball data and posts summary to Discord.
"""

import requests
import time
from datetime import datetime, timedelta
import os

# Discord webhook URL (can be overridden by environment variable)
WEBHOOK_URL = os.getenv(
    'DISCORD_WEBHOOK_URL',
    'https://discord.com/api/webhooks/1467008530811977822/yH6a1cIVfXerwCIeBZwSD6lbhutMGZPm1q96t_hspaRL2wscsOBJClNAxPxXspf8Sn_O'
)

def send_discord(content: str) -> bool:
    """Send a message to Discord. Returns True if successful."""
    try:
        response = requests.post(WEBHOOK_URL, json={'content': content}, timeout=10)
        success = response.status_code == 204
        if not success:
            print(f"Discord error: {response.status_code} - {response.text}")
        return success
    except Exception as e:
        print(f"Failed to send Discord message: {e}")
        return False


def fetch_espn_scores(date_str: str) -> list:
    """Fetch NCAA basketball scores from ESPN for a given date."""
    # ESPN API endpoint for college basketball scores
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates={date_str}"

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()

        games = []
        for event in data.get('events', []):
            competition = event.get('competitions', [{}])[0]
            competitors = competition.get('competitors', [])

            if len(competitors) == 2:
                home = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
                away = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])

                home_score = int(home.get('score', 0))
                away_score = int(away.get('score', 0))
                total = home_score + away_score

                status = event.get('status', {}).get('type', {}).get('name', '')

                if status == 'STATUS_FINAL':
                    games.append({
                        'home_team': home.get('team', {}).get('displayName', 'Unknown'),
                        'away_team': away.get('team', {}).get('displayName', 'Unknown'),
                        'home_score': home_score,
                        'away_score': away_score,
                        'total': total
                    })

        return games
    except Exception as e:
        print(f"Error fetching ESPN scores: {e}")
        return []


def fetch_todays_games() -> list:
    """Fetch today's scheduled NCAA basketball games."""
    today = datetime.now().strftime('%Y%m%d')
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates={today}"

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()

        games = []
        for event in data.get('events', []):
            competition = event.get('competitions', [{}])[0]
            competitors = competition.get('competitors', [])

            if len(competitors) == 2:
                home = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
                away = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])

                game_time = event.get('date', '')

                games.append({
                    'home_team': home.get('team', {}).get('displayName', 'Unknown'),
                    'away_team': away.get('team', {}).get('displayName', 'Unknown'),
                    'time': game_time
                })

        return games
    except Exception as e:
        print(f"Error fetching today's games: {e}")
        return []


def compile_summary():
    """Compile the daily summary and post to Discord."""

    yesterday = datetime.now() - timedelta(days=1)
    yesterday_str = yesterday.strftime('%Y%m%d')
    yesterday_display = yesterday.strftime('%B %d, %Y')
    today_display = datetime.now().strftime('%B %d, %Y')

    print(f"Fetching scores for {yesterday_display}...")
    games = fetch_espn_scores(yesterday_str)

    if not games:
        send_discord(f"🏀 **TAKE THE LIVE UNDER** - {today_display}\n\nNo NCAA games found for yesterday. Check back tomorrow!\n\n*taketheliveunder.com*")
        return

    # Calculate stats
    total_games = len(games)
    under_games = [g for g in games if g['total'] < 140]
    under_count = len(under_games)
    under_pct = (under_count / total_games * 100) if total_games > 0 else 0
    avg_total = sum(g['total'] for g in games) / total_games if total_games > 0 else 0

    # Sort for highlights
    lowest_games = sorted(games, key=lambda x: x['total'])[:5]

    # Message 1: Header + Snapshot
    msg1 = f"""🏀 **TAKE THE LIVE UNDER - NCAA Daily Summary**
📅 {today_display}

📊 **YESTERDAY'S SNAPSHOT** ({yesterday_display})
• Total games tracked: **{total_games}**
• Games under 140 total: **{under_count}** ({under_pct:.0f}%)
• Average combined score: **{avg_total:.1f}**
• Lowest total: **{lowest_games[0]['total']}** ({lowest_games[0]['away_team']} @ {lowest_games[0]['home_team']})"""

    send_discord(msg1)
    time.sleep(1.5)

    # Message 2: Under Winners
    low_scoring = [g for g in games if g['total'] < 135]

    if low_scoring:
        msg2_lines = ["✅ **UNDER WINNERS** (< 135 total)\n"]
        for g in sorted(low_scoring, key=lambda x: x['total'])[:8]:
            msg2_lines.append(f"**{g['away_team']} {g['away_score']} - {g['home_team']} {g['home_score']}** = {g['total']} pts")
        msg2 = "\n".join(msg2_lines)
    else:
        msg2 = "✅ **UNDER WINNERS**\n\nNo games finished under 135 total yesterday. Higher-scoring day overall."

    send_discord(msg2)
    time.sleep(1.5)

    # Message 3: PPM Trigger Context
    msg3 = """🚨 **4.5 PPM TRIGGER REMINDER**

Our core signal: When required PPM > 4.5, the game needs an unsustainably high pace to go over.

**How to use live:**
• Calculate: (O/U Line - Current Total) / Minutes Remaining
• If result > 4.5 → Strong under signal
• If result > 5.0 → Very strong under signal

Watch for these opportunities in today's games!"""

    send_discord(msg3)
    time.sleep(1.5)

    # Message 4: Today's Watch List
    todays_games = fetch_todays_games()

    if todays_games:
        # Just list a few games to watch
        watch_list = todays_games[:6]
        msg4_lines = ["🔮 **TODAY'S GAMES TO WATCH**\n"]
        for g in watch_list:
            msg4_lines.append(f"• {g['away_team']} @ {g['home_team']}")
        msg4_lines.append(f"\n**{len(todays_games)} total games today** - Monitor for 4.5+ PPM triggers!")
        msg4_lines.append("\n---\n*Take the Live Under | Where the math meets the market*\n*taketheliveunder.com*")
        msg4 = "\n".join(msg4_lines)
    else:
        msg4 = """🔮 **TODAY'S WATCH LIST**

Check ESPN for today's NCAA schedule. Look for:
• Slow-pace team matchups
• Strong defensive teams
• Games where PPM exceeds 4.5 live

---
*Take the Live Under | Where the math meets the market*
*taketheliveunder.com*"""

    send_discord(msg4)

    print(f"Successfully posted {total_games} games summary to Discord!")


if __name__ == '__main__':
    compile_summary()

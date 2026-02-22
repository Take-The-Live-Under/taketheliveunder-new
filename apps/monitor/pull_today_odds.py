#!/usr/bin/env python3
"""
pull_today_odds.py

Pulls betting odds from The Odds API (v4) and game data from ESPN
for NBA and NCAA Men's Basketball. Includes games for today (local time).

Usage:
    python pull_today_odds.py

Requires:
    - ODDS_API_KEY in .env file
    - pip install requests python-dotenv
"""

import os
import json
import csv
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
ODDS_API_KEY = os.getenv("ODDS_API_KEY")
ODDS_BASE_URL = "https://api.the-odds-api.com/v4"
ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball"
OUTPUT_DIR = Path("odds_snapshots_today")

# Sports configuration
SPORTS = [
    {
        "odds_key": "basketball_nba",
        "espn_path": "nba",
        "name": "NBA"
    },
    {
        "odds_key": "basketball_ncaab",
        "espn_path": "mens-college-basketball",
        "name": "NCAA Men's Basketball"
    },
]

# Markets to request from Odds API
MARKETS = "h2h,spreads,totals"
REGIONS = "us"
ODDS_FORMAT = "american"


def get_today_date_range():
    """Get date range for today's games (local time, extending into early next day UTC)."""
    now = datetime.now(timezone.utc)
    # Include games from 6 hours ago to 18 hours from now (covers US timezones)
    start = now - timedelta(hours=6)
    end = now + timedelta(hours=18)
    return start, end


def is_game_today(commence_time_str: str) -> bool:
    """Check if a game's commence time is within today's window."""
    try:
        commence_time = datetime.fromisoformat(commence_time_str.replace("Z", "+00:00"))
        start, end = get_today_date_range()
        return start <= commence_time <= end
    except (ValueError, AttributeError):
        return False


def fetch_odds_api(sport_key: str) -> tuple[list, dict]:
    """Fetch odds from The Odds API."""
    url = f"{ODDS_BASE_URL}/sports/{sport_key}/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": REGIONS,
        "markets": MARKETS,
        "oddsFormat": ODDS_FORMAT,
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json(), dict(response.headers)


def fetch_espn_scoreboard(espn_path: str) -> list:
    """Fetch today's games from ESPN scoreboard API."""
    today_str = datetime.now().strftime("%Y%m%d")
    url = f"{ESPN_BASE_URL}/{espn_path}/scoreboard?dates={today_str}"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data.get("events", [])
    except Exception as e:
        print(f"  ESPN fetch error: {e}")
        return []


def extract_espn_odds(event: dict) -> dict:
    """Extract betting odds from ESPN event data if available."""
    odds_info = {}

    # ESPN sometimes includes odds in competitions
    competitions = event.get("competitions", [])
    if competitions:
        comp = competitions[0]

        # Check for odds in the competition
        odds_data = comp.get("odds", [])
        if odds_data:
            for odds in odds_data:
                provider = odds.get("provider", {}).get("name", "Unknown")
                odds_info[provider] = {
                    "spread": odds.get("spread"),
                    "over_under": odds.get("overUnder"),
                    "home_team_odds": odds.get("homeTeamOdds", {}).get("moneyLine"),
                    "away_team_odds": odds.get("awayTeamOdds", {}).get("moneyLine"),
                }

    return odds_info


def parse_espn_game(event: dict) -> dict:
    """Parse ESPN event into standardized game format."""
    competitions = event.get("competitions", [])
    if not competitions:
        return None

    comp = competitions[0]
    competitors = comp.get("competitors", [])

    home_team = None
    away_team = None
    home_score = None
    away_score = None

    for team in competitors:
        team_info = team.get("team", {})
        if team.get("homeAway") == "home":
            home_team = team_info.get("displayName") or team_info.get("name")
            home_score = team.get("score")
        else:
            away_team = team_info.get("displayName") or team_info.get("name")
            away_score = team.get("score")

    status = comp.get("status", {})
    status_type = status.get("type", {})

    return {
        "espn_id": event.get("id"),
        "home_team": home_team,
        "away_team": away_team,
        "home_score": home_score,
        "away_score": away_score,
        "commence_time": event.get("date"),
        "status": status_type.get("name"),
        "status_detail": status_type.get("detail"),
        "espn_odds": extract_espn_odds(event),
    }


def extract_best_odds(bookmakers: list) -> dict:
    """Extract the best available odds from bookmakers list."""
    best = {
        "spread_home": None,
        "spread_away": None,
        "spread_line": None,
        "total_line": None,
        "total_over_odds": None,
        "total_under_odds": None,
        "moneyline_home": None,
        "moneyline_away": None,
        "bookmaker": None,
    }

    if not bookmakers:
        return best

    # Prefer FanDuel, DraftKings, then any available
    preferred = ["fanduel", "draftkings", "betmgm", "caesars"]
    bookmaker = None

    for pref in preferred:
        for bm in bookmakers:
            if bm.get("key") == pref:
                bookmaker = bm
                break
        if bookmaker:
            break

    if not bookmaker and bookmakers:
        bookmaker = bookmakers[0]

    if not bookmaker:
        return best

    best["bookmaker"] = bookmaker.get("title")

    for market in bookmaker.get("markets", []):
        key = market.get("key")
        outcomes = market.get("outcomes", [])

        if key == "spreads" and len(outcomes) >= 2:
            for outcome in outcomes:
                if "point" in outcome:
                    # Home team usually listed second or has negative point for favorite
                    best["spread_line"] = abs(outcome.get("point", 0))
                    best["spread_home"] = outcomes[0].get("price")
                    best["spread_away"] = outcomes[1].get("price")
                    break

        elif key == "totals" and len(outcomes) >= 2:
            for outcome in outcomes:
                if outcome.get("name") == "Over":
                    best["total_line"] = outcome.get("point")
                    best["total_over_odds"] = outcome.get("price")
                elif outcome.get("name") == "Under":
                    best["total_under_odds"] = outcome.get("price")

        elif key == "h2h" and len(outcomes) >= 2:
            best["moneyline_home"] = outcomes[0].get("price")
            best["moneyline_away"] = outcomes[1].get("price")

    return best


def match_games(odds_games: list, espn_games: list) -> list:
    """Match games between Odds API and ESPN by team names."""
    matched = []

    # Create lookup by normalized team names
    def normalize(name: str) -> str:
        if not name:
            return ""
        # Remove common suffixes and normalize
        name = name.lower().strip()

        # Common abbreviation expansions
        replacements = {
            "la clippers": "los angeles clippers",
            "la lakers": "los angeles lakers",
            "gw revolutionaries": "george washington revolutionaries",
            "michigan st ": "michigan state ",
            "ohio st ": "ohio state ",
            "penn st ": "penn state ",
            "arizona st ": "arizona state ",
            "san jose st ": "san jose state ",
            "san josé st ": "san jose state ",
            "fresno st ": "fresno state ",
            "boise st ": "boise state ",
            "utah st ": "utah state ",
            "colorado st ": "colorado state ",
            "kansas st ": "kansas state ",
            "oklahoma st ": "oklahoma state ",
            "iowa st ": "iowa state ",
            "se louisiana": "southeastern louisiana",
        }
        for abbr, full in replacements.items():
            name = name.replace(abbr, full)

        # Remove common suffixes
        for suffix in [" bulldogs", " tigers", " panthers", " hornets", " lumberjacks",
                       " colonels", " privateers", " demons", " spartans", " scarlet knights",
                       " blue devils", " tar heels", " wildcats", " cavaliers", " hoosiers",
                       " boilermakers", " wolverines", " buckeyes", " hawkeyes", " cyclones",
                       " jayhawks", " sooners", " longhorns", " aggies", " razorbacks",
                       " volunteers", " commodores", " rebels", " crimson tide", " golden eagles",
                       " blue jays", " fighting irish", " orange", " wolfpack", " hokies",
                       " yellow jackets", " seminoles", " hurricanes", " cavaliers", " cardinals"]:
            name = name.replace(suffix, "")
        return name.strip()

    espn_lookup = {}
    for game in espn_games:
        if game:
            key = f"{normalize(game['away_team'])}@{normalize(game['home_team'])}"
            espn_lookup[key] = game

    for odds_game in odds_games:
        home = odds_game.get("home_team", "")
        away = odds_game.get("away_team", "")
        key = f"{normalize(away)}@{normalize(home)}"

        espn_game = espn_lookup.get(key)
        espn_odds = espn_game.get("espn_odds", {}) if espn_game else {}

        # Get ESPN total if available
        espn_total = None
        for provider, data in espn_odds.items():
            if data.get("over_under"):
                espn_total = data.get("over_under")
                break

        odds_data = extract_best_odds(odds_game.get("bookmakers", []))

        matched.append({
            "odds_api_id": odds_game.get("id"),
            "espn_id": espn_game.get("espn_id") if espn_game else None,
            "home_team": home,
            "away_team": away,
            "commence_time": odds_game.get("commence_time"),
            "status": espn_game.get("status") if espn_game else "scheduled",
            "home_score": espn_game.get("home_score") if espn_game else None,
            "away_score": espn_game.get("away_score") if espn_game else None,
            "bookmaker": odds_data.get("bookmaker"),
            "spread_line": odds_data.get("spread_line"),
            "spread_home_odds": odds_data.get("spread_home"),
            "spread_away_odds": odds_data.get("spread_away"),
            "total_line": odds_data.get("total_line"),
            "total_over_odds": odds_data.get("total_over_odds"),
            "total_under_odds": odds_data.get("total_under_odds"),
            "moneyline_home": odds_data.get("moneyline_home"),
            "moneyline_away": odds_data.get("moneyline_away"),
            "espn_total": espn_total,
        })

    # Add ESPN-only games (no odds available)
    odds_keys = set()
    for g in odds_games:
        key = f"{normalize(g.get('away_team', ''))}@{normalize(g.get('home_team', ''))}"
        odds_keys.add(key)

    for game in espn_games:
        if not game:
            continue
        key = f"{normalize(game['away_team'])}@{normalize(game['home_team'])}"
        if key not in odds_keys:
            espn_odds = game.get("espn_odds", {})
            espn_total = None
            for provider, data in espn_odds.items():
                if data.get("over_under"):
                    espn_total = data.get("over_under")
                    break

            matched.append({
                "odds_api_id": None,
                "espn_id": game.get("espn_id"),
                "home_team": game.get("home_team"),
                "away_team": game.get("away_team"),
                "commence_time": game.get("commence_time"),
                "status": game.get("status"),
                "home_score": game.get("home_score"),
                "away_score": game.get("away_score"),
                "bookmaker": "ESPN" if espn_total else None,
                "spread_line": None,
                "spread_home_odds": None,
                "spread_away_odds": None,
                "total_line": espn_total,
                "total_over_odds": None,
                "total_under_odds": None,
                "moneyline_home": None,
                "moneyline_away": None,
                "espn_total": espn_total,
            })

    return matched


def deduplicate_games(games: list) -> list:
    """Remove duplicate games based on normalized team names."""
    seen = set()
    unique = []

    def normalize_for_dedup(name: str) -> str:
        if not name:
            return ""
        name = name.lower().strip()
        # Normalize abbreviations
        replacements = {
            "la clippers": "los angeles clippers",
            "la lakers": "los angeles lakers",
            "gw ": "george washington ",
            "michigan st ": "michigan state ",
            "ohio st ": "ohio state ",
            "san jose st ": "san jose state ",
            "san josé st ": "san jose state ",
        }
        for abbr, full in replacements.items():
            name = name.replace(abbr, full)
        # Keep just the city/school name
        words = name.split()
        return words[0] if words else ""

    for game in games:
        home = normalize_for_dedup(game.get("home_team", ""))
        away = normalize_for_dedup(game.get("away_team", ""))
        key = f"{away}@{home}"

        if key not in seen:
            seen.add(key)
            unique.append(game)
        else:
            # If we already have this game but the new one has more data, use it
            for i, existing in enumerate(unique):
                eh = normalize_for_dedup(existing.get("home_team", ""))
                ea = normalize_for_dedup(existing.get("away_team", ""))
                if f"{ea}@{eh}" == key:
                    # Prefer the one with Odds API data
                    if game.get("odds_api_id") and not existing.get("odds_api_id"):
                        unique[i] = game
                    break

    return unique


def save_to_csv(all_games: list, filename: str) -> Path:
    """Save all games to a single CSV file."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    filepath = OUTPUT_DIR / filename

    fieldnames = [
        "sport", "odds_api_id", "espn_id", "home_team", "away_team",
        "commence_time", "status", "home_score", "away_score",
        "bookmaker", "spread_line", "spread_home_odds", "spread_away_odds",
        "total_line", "total_over_odds", "total_under_odds",
        "moneyline_home", "moneyline_away", "espn_total"
    ]

    with open(filepath, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_games)

    return filepath


def save_to_json(data: dict, filename: str) -> Path:
    """Save data to JSON file."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    filepath = OUTPUT_DIR / filename
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    return filepath


def main():
    if not ODDS_API_KEY:
        print("ERROR: ODDS_API_KEY not found in environment variables.")
        print("Please add ODDS_API_KEY to your .env file.")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    print(f"Pulling odds for games on {today} (local time)")
    print("=" * 60)

    all_games = []
    total_requests_remaining = None

    for sport in SPORTS:
        odds_key = sport["odds_key"]
        espn_path = sport["espn_path"]
        sport_name = sport["name"]

        print(f"\n{'='*60}")
        print(f"{sport_name}")
        print("=" * 60)

        # Fetch from Odds API
        print(f"\nFetching from The Odds API ({odds_key})...")
        odds_games = []
        try:
            events, headers = fetch_odds_api(odds_key)
            total_requests_remaining = headers.get("x-requests-remaining", "N/A")

            # Filter for today's games
            today_odds = [e for e in events if is_game_today(e.get("commence_time", ""))]
            odds_games = today_odds
            print(f"  Total events: {len(events)}, Today: {len(today_odds)}")
        except requests.exceptions.HTTPError as e:
            print(f"  ERROR: HTTP {e.response.status_code}")
        except Exception as e:
            print(f"  ERROR: {e}")

        # Fetch from ESPN
        print(f"\nFetching from ESPN ({espn_path})...")
        espn_games = []
        try:
            espn_events = fetch_espn_scoreboard(espn_path)
            espn_games = [parse_espn_game(e) for e in espn_events]
            espn_games = [g for g in espn_games if g]  # Remove None entries
            print(f"  Games found: {len(espn_games)}")

            # Check for ESPN odds
            games_with_odds = sum(1 for g in espn_games if g.get("espn_odds"))
            if games_with_odds:
                print(f"  Games with ESPN odds: {games_with_odds}")
        except Exception as e:
            print(f"  ERROR: {e}")

        # Match and combine data
        print(f"\nCombining data...")
        matched = match_games(odds_games, espn_games)

        # Add sport name to each game
        for game in matched:
            game["sport"] = sport_name

        # Deduplicate
        matched = deduplicate_games(matched)

        all_games.extend(matched)

        print(f"  Combined games: {len(matched)}")

        # Print game list
        for game in matched:
            away = game["away_team"]
            home = game["home_team"]
            total = game.get("total_line") or game.get("espn_total") or "N/A"
            time_str = game.get("commence_time", "")[:16] if game.get("commence_time") else "TBD"
            status = game.get("status", "")

            if status and status.lower() not in ["scheduled", "status_scheduled"]:
                score = f"{game.get('away_score', 0)}-{game.get('home_score', 0)}"
                print(f"    {away} @ {home} | O/U: {total} | {score} ({status})")
            else:
                print(f"    {away} @ {home} | O/U: {total} | {time_str}")

    # Save combined CSV
    print(f"\n{'='*60}")
    print("SAVING FILES")
    print("=" * 60)

    csv_filename = f"all_games_{today}.csv"
    csv_path = save_to_csv(all_games, csv_filename)
    print(f"\nCSV saved: {csv_path}")

    # Also save JSON for reference
    json_data = {
        "date": today,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "total_games": len(all_games),
        "games": all_games,
    }
    json_filename = f"all_games_{today}.json"
    json_path = save_to_json(json_data, json_filename)
    print(f"JSON saved: {json_path}")

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print("=" * 60)
    print(f"Date: {today}")
    print(f"Total games: {len(all_games)}")

    by_sport = {}
    for g in all_games:
        sport = g.get("sport", "Unknown")
        by_sport[sport] = by_sport.get(sport, 0) + 1

    for sport, count in by_sport.items():
        print(f"  {sport}: {count} games")

    games_with_totals = sum(1 for g in all_games if g.get("total_line") or g.get("espn_total"))
    print(f"\nGames with O/U lines: {games_with_totals}")
    print(f"API requests remaining: {total_requests_remaining}")


if __name__ == "__main__":
    main()

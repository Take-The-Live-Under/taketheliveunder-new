"""
NCAA Basketball Live Betting Monitor
Enhanced with intelligent confidence scoring
"""
import asyncio
import aiohttp
import requests
from datetime import datetime
from typing import List, Dict, Optional
from loguru import logger
import sys

import config
from utils.team_stats import get_stats_manager
from utils.confidence_scorer import get_confidence_scorer
from utils.csv_logger import get_csv_logger
from utils.team_name_matcher import get_team_matcher
from utils.espn_live_fetcher import get_espn_live_fetcher
from utils.espn_odds_fetcher import get_espn_odds_fetcher

# Configure logging
logger.remove()
logger.add(sys.stderr, level=config.LOG_LEVEL)
logger.add(config.LOG_FILE, rotation="1 day", retention="30 days", level="INFO")


class NCAABettingMonitor:
    """
    Main monitoring class that:
    1. Polls Sportsdata.io API for live games
    2. Calculates Required PPM for over/under
    3. Fetches team stats
    4. Calculates confidence scores
    5. Logs to CSV
    6. Triggers alerts
    """

    def __init__(self):
        self.stats_manager = get_stats_manager()
        self.confidence_scorer = get_confidence_scorer()
        self.csv_logger = get_csv_logger()
        self.team_matcher = get_team_matcher()  # NCAA team name matching
        self.espn_fetcher = get_espn_live_fetcher()  # ESPN live scores
        self.espn_odds_fetcher = get_espn_odds_fetcher()  # ESPN betting odds

        self.api_key = config.ODDS_API_KEY
        self.api_base_url = "https://api.the-odds-api.com/v4"

        # Sport mode (NCAA or NBA)
        self.sport_mode = config.SPORT_MODE
        self.sport_key = "basketball_ncaab" if self.sport_mode == "ncaa" else "basketball_nba"

        # Track games we've already triggered on
        self.triggered_games = {}

        # Track game states for end-of-game logging
        self.game_states = {}

        # Kill switch: track last time we had live games
        self.last_live_games_time = None
        self.no_games_timeout = 300  # 5 minutes in seconds

        # ESPN scoreboard URL for accurate clock data
        if self.sport_mode == "nba":
            self.espn_scoreboard_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
        else:
            self.espn_scoreboard_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard"

        logger.info(f"Initialized Basketball Betting Monitor - {self.sport_mode.upper()} MODE")
        logger.info(f"Using data source: {'KenPom' if config.USE_KENPOM and self.sport_mode == 'ncaa' else 'ESPN'}")
        logger.info(f"Using ESPN API for live scores and game data")
        logger.info(f"Using The Odds API for betting odds only")

    async def initialize(self):
        """Initialize team stats (fetch once at startup)"""
        logger.info("Fetching team statistics...")
        try:
            self.stats_manager.fetch_all_stats()
            logger.success("Team statistics loaded successfully")
        except Exception as e:
            logger.error(f"Error loading team stats: {e}")
            logger.warning("Monitor will attempt to continue without cached stats")

    async def run(self):
        """Main monitoring loop"""
        logger.info("Starting monitoring loop...")
        logger.info(f"Polling interval: {config.POLL_INTERVAL} seconds")
        logger.info(f"PPM threshold: {config.PPM_THRESHOLD}")
        logger.info(f"Kill switch: Auto-shutdown after {self.no_games_timeout // 60} minutes of no live games")

        while True:
            try:
                await self.poll_live_games()

                # Check kill switch: if no live games for 5 minutes, shut down
                if self.last_live_games_time is None:
                    # First run, no games yet - don't trigger kill switch
                    pass
                else:
                    time_since_live_games = (datetime.now() - self.last_live_games_time).total_seconds()
                    if time_since_live_games > self.no_games_timeout:
                        logger.warning(f"⚠️  No live games detected for {self.no_games_timeout // 60} minutes")
                        logger.warning(f"🛑 Kill switch activated - shutting down monitor")
                        break

                await asyncio.sleep(config.POLL_INTERVAL)
            except KeyboardInterrupt:
                logger.info("Shutting down monitor...")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(config.POLL_INTERVAL)

    async def poll_live_games(self):
        """Poll ESPN for live games and The Odds API for betting odds"""
        try:
            # Step 1: Get live games with scores and time from ESPN (free!)
            espn_games = self.espn_fetcher.fetch_live_games()

            # Filter to only live games
            live_games = [g for g in espn_games if g['is_live']]

            if not live_games:
                logger.debug("No live games found on ESPN")
                return

            logger.info(f"ESPN reports {len(live_games)} live games")

            # Step 2: Get betting odds ONLY for live games from The Odds API
            games_with_odds = []

            try:
                # Fetch odds from The Odds API
                odds_url = f"{self.api_base_url}/sports/{self.sport_key}/odds/"
                odds_params = {
                    "apiKey": self.api_key,
                    "regions": "us",
                    "markets": "totals",
                    "oddsFormat": "american",
                    "dateFormat": "iso"
                }

                odds_response = requests.get(odds_url, params=odds_params, timeout=10)
                odds_response.raise_for_status()

                # Log quota usage
                requests_remaining = odds_response.headers.get('x-requests-remaining', 'unknown')
                requests_used = odds_response.headers.get('x-requests-used', 'unknown')
                logger.debug(f"API quota: {requests_used} used, {requests_remaining} remaining")

                odds_games = odds_response.json()

                # Create map of team names to bookmakers
                odds_map = {}
                for odds_game in odds_games:
                    home = odds_game.get('home_team')
                    away = odds_game.get('away_team')
                    if home and away:
                        # Use both team names as key
                        key = f"{away}|{home}"
                        odds_map[key] = odds_game.get('bookmakers', [])

                # Match ESPN games with odds
                for espn_game in live_games:
                    espn_home = espn_game['home_team']
                    espn_away = espn_game['away_team']

                    # Try to find matching odds
                    bookmakers = None
                    for odds_key, odds_bookmakers in odds_map.items():
                        odds_away, odds_home = odds_key.split('|')

                        # Use team matcher for flexible matching
                        home_match = self.team_matcher.match_teams(espn_home, odds_home)
                        away_match = self.team_matcher.match_teams(espn_away, odds_away)

                        if home_match and away_match:
                            bookmakers = odds_bookmakers
                            logger.debug(f"Matched odds: {espn_away} @ {espn_home} <-> {odds_away} @ {odds_home}")
                            break

                    if bookmakers:
                        # Add bookmakers to ESPN game data
                        espn_game['bookmakers'] = bookmakers
                        games_with_odds.append(espn_game)
                    else:
                        logger.debug(f"No odds found for {espn_away} @ {espn_home}")

            except Exception as e:
                logger.error(f"Error fetching odds from The Odds API: {e}")
                return

            if not games_with_odds:
                logger.debug("No live games with betting odds available")
                return

            # Update last live games time (for kill switch)
            self.last_live_games_time = datetime.now()

            logger.info(f"Monitoring {len(games_with_odds)} live games with odds")

            # Analyze each game
            for game in games_with_odds:
                await self.analyze_game(game)

        except Exception as e:
            logger.error(f"Error polling live games: {e}")

    def _get_espn_live_games(self) -> Dict[str, Dict]:
        """
        Get list of actually live games from ESPN (authoritative source)
        Returns: Dict mapping game_key to game info with team names
        """
        try:
            url = self.espn_scoreboard_url
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()

            live_games = {}

            for event in data.get("events", []):
                # Only include games that are actually in progress
                if event.get("status", {}).get("type", {}).get("state") != "in":
                    continue

                competition = event.get("competitions", [{}])[0]
                competitors = competition.get("competitors", [])

                # Get team names
                home_team = None
                away_team = None
                for comp in competitors:
                    team_name = comp.get("team", {}).get("displayName", "")
                    if comp.get("homeAway") == "home":
                        home_team = team_name
                    else:
                        away_team = team_name

                if home_team and away_team:
                    game_key = f"{away_team}_vs_{home_team}"
                    live_games[game_key] = {
                        'home_team': home_team,
                        'away_team': away_team,
                        'event_id': event.get('id')
                    }

            logger.debug(f"ESPN reports {len(live_games)} actually live games")
            return live_games

        except Exception as e:
            logger.warning(f"Error fetching ESPN live games list: {e}")
            return {}

    def _fetch_espn_scoreboard(self) -> Dict[str, Dict]:
        """
        Fetch live game data from ESPN API for accurate clock information
        Returns: Dict mapping team names to game clock data
        """
        try:
            # Use correct URL based on sport mode
            url = self.espn_scoreboard_url
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()

            clock_data = {}

            for event in data.get("events", []):
                # Only process live games (state: 'in' = live)
                if event.get("status", {}).get("type", {}).get("state") != "in":
                    continue

                competition = event.get("competitions", [{}])[0]
                competitors = competition.get("competitors", [])

                # Get team names
                home_team = None
                away_team = None
                for comp in competitors:
                    team_name = comp.get("team", {}).get("displayName", "")
                    if comp.get("homeAway") == "home":
                        home_team = team_name
                    else:
                        away_team = team_name

                if not home_team or not away_team:
                    continue

                status = event.get("status", {})
                period = status.get("period", 0)
                display_clock = status.get("displayClock", "0:00")

                # Parse display clock (format: "2:08" or "0.0")
                clock_seconds = 0
                if display_clock and display_clock != "0.0":
                    if ":" in display_clock:
                        parts = display_clock.split(":")
                        clock_minutes = int(parts[0])
                        clock_secs = int(parts[1]) if len(parts) > 1 else 0
                        clock_seconds = clock_minutes * 60 + clock_secs
                    else:
                        # Handle decimal format like "0.9"
                        clock_seconds = int(float(display_clock))

                # Calculate total minutes remaining based on sport
                if self.sport_mode == "nba":
                    # NBA: 4 quarters of 12 minutes each (48 minutes total)
                    if period >= 5:
                        # Overtime - each OT is 5 minutes
                        total_minutes_remaining = (clock_seconds / 60)
                    elif period == 4:
                        # 4th quarter - only this quarter remains
                        total_minutes_remaining = (clock_seconds / 60)
                    elif period == 3:
                        # 3rd quarter - this quarter + 4th quarter
                        total_minutes_remaining = 12 + (clock_seconds / 60)
                    elif period == 2:
                        # 2nd quarter - this quarter + 3rd + 4th
                        total_minutes_remaining = 24 + (clock_seconds / 60)
                    elif period == 1:
                        # 1st quarter - this quarter + 2nd + 3rd + 4th
                        total_minutes_remaining = 36 + (clock_seconds / 60)
                    else:
                        total_minutes_remaining = 48
                else:
                    # NCAA: 2 halves of 20 minutes each (40 minutes total)
                    if period >= 3:
                        # Overtime - each OT is 5 minutes
                        total_minutes_remaining = (clock_seconds / 60)
                    elif period == 2:
                        # 2nd half - only this half remains
                        total_minutes_remaining = (clock_seconds / 60)
                    elif period == 1:
                        # 1st half - this half + 2nd half
                        total_minutes_remaining = 20 + (clock_seconds / 60)
                    else:
                        total_minutes_remaining = 40

                minutes_on_clock = clock_seconds // 60
                seconds_on_clock = clock_seconds % 60

                game_clock_info = {
                    "period": period,
                    "minutes_remaining": minutes_on_clock,
                    "seconds_remaining": seconds_on_clock,
                    "total_minutes_remaining": total_minutes_remaining,
                    "clock_display": display_clock
                }

                clock_data[home_team] = game_clock_info
                clock_data[away_team] = game_clock_info

            logger.debug(f"Fetched ESPN clock data for {len(clock_data)//2} games")
            return clock_data

        except Exception as e:
            logger.warning(f"Error fetching ESPN scoreboard: {e}")
            return {}

    def _fetch_live_games(self) -> List[Dict]:
        """
        Fetch live games with betting odds from The Odds API
        OPTIMIZED: Single API call using /scores endpoint with scores included
        """
        try:
            # OPTIMIZATION: Use /scores endpoint which includes both scores AND odds
            # This is more efficient than separate /scores and /odds calls
            scores_url = f"{self.api_base_url}/sports/{self.sport_key}/scores/"
            scores_params = {
                "apiKey": self.api_key,
                "daysFrom": 1,  # Get games from last day
                "dateFormat": "iso"
            }

            scores_response = requests.get(scores_url, params=scores_params, timeout=10)
            scores_response.raise_for_status()

            # Log quota usage from response headers
            requests_remaining = scores_response.headers.get('x-requests-remaining', 'unknown')
            requests_used = scores_response.headers.get('x-requests-used', 'unknown')
            logger.debug(f"API quota: {requests_used} used, {requests_remaining} remaining")

            all_games = scores_response.json()

            # Filter to only in-progress games (have scores but not completed)
            live_games = []
            for game in all_games:
                if game.get("scores") and not game.get("completed", False):
                    live_games.append(game)

            if not live_games:
                logger.info(f"No live {self.sport_mode.upper()} basketball games currently in progress")
                return []

            # Step 2: Get odds ONLY for live games using eventIds filter
            # OPTIMIZATION: Use eventIds parameter to fetch only relevant odds
            live_game_ids = [game["id"] for game in live_games]

            odds_url = f"{self.api_base_url}/sports/{self.sport_key}/odds/"
            odds_params = {
                "apiKey": self.api_key,
                "regions": "us",              # Single region to minimize cost
                "markets": "totals",          # Single market (over/under only)
                "oddsFormat": "american",
                "dateFormat": "iso",
                "eventIds": ",".join(live_game_ids)  # OPTIMIZATION: Only fetch odds for live games
            }

            odds_response = requests.get(odds_url, params=odds_params, timeout=10)
            odds_response.raise_for_status()

            # Log quota usage
            requests_remaining = odds_response.headers.get('x-requests-remaining', 'unknown')
            requests_used = odds_response.headers.get('x-requests-used', 'unknown')
            logger.debug(f"API quota after odds: {requests_used} used, {requests_remaining} remaining")

            odds_games = odds_response.json()

            # Create a map of game_id -> bookmakers
            odds_map = {game["id"]: game.get("bookmakers", []) for game in odds_games}

            # Merge odds into live games
            for game in live_games:
                game_id = game["id"]
                if game_id in odds_map:
                    game["bookmakers"] = odds_map[game_id]

            logger.info(f"Found {len(live_games)} live {self.sport_mode.upper()} games")

            return live_games

        except Exception as e:
            logger.error(f"Error fetching live games from The Odds API: {e}")
            return []

    async def send_realtime_update(self, game_data: Dict, update_type: str = "game_update"):
        """
        Send real-time update to WebSocket clients via API

        Args:
            game_data: Dictionary containing game information
            update_type: Type of update (game_update, trigger, alert)
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "http://localhost:8000/api/internal/trigger-update",
                    json={"game_data": game_data, "update_type": update_type},
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        logger.debug(f"Real-time update sent for game {game_data.get('game_id')}")
                    else:
                        logger.warning(f"Real-time update failed: {response.status}")
        except asyncio.TimeoutError:
            logger.warning(f"Real-time update timed out for game {game_data.get('game_id')}")
        except Exception as e:
            logger.error(f"Error sending real-time update: {e}")
            # Don't raise - let monitoring continue even if WebSocket update fails

    async def analyze_game(self, game: Dict):
        """Analyze a single game for betting opportunities"""
        try:
            # Extract game data from ESPN format
            game_id = game.get("game_id")
            home_team = game.get("home_team")
            away_team = game.get("away_team")
            home_score = game.get("home_score", 0)
            away_score = game.get("away_score", 0)
            total_points = home_score + away_score

            # Extract clock data from ESPN (already included!)
            period = game.get("period", 0)
            time_remaining_minutes = game.get("minutes_remaining", 0)
            time_remaining_seconds = game.get("seconds_remaining", 0)

            # Calculate total time remaining
            if self.sport_mode == "nba":
                # NBA: 4 quarters of 12 minutes (48 total)
                if period >= 5:
                    # Overtime - each OT is 5 minutes
                    total_time_remaining = (time_remaining_minutes + time_remaining_seconds / 60)
                elif period == 4:
                    total_time_remaining = (time_remaining_minutes + time_remaining_seconds / 60)
                elif period == 3:
                    total_time_remaining = 12 + (time_remaining_minutes + time_remaining_seconds / 60)
                elif period == 2:
                    total_time_remaining = 24 + (time_remaining_minutes + time_remaining_seconds / 60)
                elif period == 1:
                    total_time_remaining = 36 + (time_remaining_minutes + time_remaining_seconds / 60)
                else:
                    total_time_remaining = 48
            else:
                # NCAA: 2 halves of 20 minutes (40 total)
                if period >= 3:
                    # Overtime - each OT is 5 minutes
                    total_time_remaining = (time_remaining_minutes + time_remaining_seconds / 60)
                elif period == 2:
                    total_time_remaining = (time_remaining_minutes + time_remaining_seconds / 60)
                elif period == 1:
                    total_time_remaining = 20 + (time_remaining_minutes + time_remaining_seconds / 60)
                else:
                    total_time_remaining = 40

            # Get O/U line from bookmakers (use default or first available)
            ou_line = self._get_totals_line(game)
            ou_open = ou_line  # The Odds API doesn't provide opening lines in free tier

            # Get all available bookmaker lines for frontend display
            all_bookmaker_lines = self._get_all_bookmaker_lines(game)

            # Determine which bookmaker was actually used
            sportsbook_used = config.DEFAULT_SPORTSBOOK
            bookmakers = game.get("bookmakers", [])
            for bookmaker in bookmakers:
                if bookmaker.get("key") == config.DEFAULT_SPORTSBOOK:
                    markets = bookmaker.get("markets", [])
                    for market in markets:
                        if market.get("key") == "totals":
                            sportsbook_used = bookmaker.get("title", config.DEFAULT_SPORTSBOOK)
                            break
                    break

            # If default not found, find which one was actually used
            if sportsbook_used == config.DEFAULT_SPORTSBOOK and all_bookmaker_lines:
                # Use the first available bookmaker
                first_book = list(all_bookmaker_lines.values())[0]
                sportsbook_used = first_book.get("title", "Unknown")

            if not ou_line:
                logger.debug(f"No O/U line for {home_team} vs {away_team}")
                return

            logger.debug(f"Using ESPN data - {away_team} @ {home_team}: {away_score}-{home_score}, Period {period}, {time_remaining_minutes}:{time_remaining_seconds:02d} remaining")

            # Calculate required PPM to hit over
            points_needed = ou_line - total_points
            required_ppm = (points_needed / total_time_remaining) if total_time_remaining > 0 else 0

            # Calculate current scoring pace
            minutes_elapsed = (48 if self.sport_mode == "nba" else 40) - total_time_remaining
            current_ppm = (total_points / minutes_elapsed) if minutes_elapsed > 0 else 0

            # Calculate PPM difference
            ppm_difference = current_ppm - required_ppm

            # Calculate projected final score
            # Early game (< 5 min): Weight toward O/U line, Late game: Use current pace
            if minutes_elapsed < 5:
                # Blend O/U line with current trajectory (favor O/U line early)
                weight_line = 1 - (minutes_elapsed / 5)  # 1.0 at start, 0.0 at 5 min
                projected_final_score = (ou_line * weight_line) + ((total_points + current_ppm * total_time_remaining) * (1 - weight_line))
            else:
                # Use current pace projection
                projected_final_score = total_points + (current_ppm * total_time_remaining)

            # Get team metrics FIRST (needed for dynamic threshold)
            home_metrics, away_metrics = self.stats_manager.get_matchup_metrics(home_team, away_team)

            # Calculate DYNAMIC PPM threshold based on team pace
            # Formula: Max team's avg PPM × 2
            home_avg_ppm = home_metrics.get("avg_ppm", 0) if home_metrics else 0
            away_avg_ppm = away_metrics.get("avg_ppm", 0) if away_metrics else 0
            max_avg_ppm = max(home_avg_ppm, away_avg_ppm)

            # Dynamic threshold = fastest team's avg PPM × 2
            # If no team stats available, fall back to static config threshold
            dynamic_ppm_threshold = (max_avg_ppm * 2) if max_avg_ppm > 0 else config.PPM_THRESHOLD_UNDER

            # Apply TIME-WEIGHTED adjustment
            # Games score faster near end of halves (fouling, urgency, etc.)
            time_multiplier = self._calculate_time_weight(period, time_remaining_minutes)
            time_weighted_threshold = dynamic_ppm_threshold * time_multiplier

            logger.debug(f"Dynamic PPM threshold for {away_team} @ {home_team}: {dynamic_ppm_threshold:.2f} (home avg: {home_avg_ppm:.2f}, away avg: {away_avg_ppm:.2f})")
            logger.debug(f"Time-weighted threshold: {time_weighted_threshold:.2f} (period {period}, {time_remaining_minutes}:{time_remaining_seconds:02d} remaining, multiplier: {time_multiplier:.2f}x)")

            # Determine bet type and if trigger condition is met
            bet_type = None
            trigger_flag = False
            trigger_reasons = []

            # Trigger 1: Required PPM thresholds (DYNAMIC + TIME-WEIGHTED based on team pace)
            if required_ppm > time_weighted_threshold:
                # High required PPM = they need to score fast to hit over = UNDER is good
                bet_type = "under"
                trigger_flag = True
                trigger_reasons.append(f"required_ppm={required_ppm:.2f} > time_weighted_threshold={time_weighted_threshold:.2f}")
            elif required_ppm < 0.5:
                # Very low/negative required PPM = scoring fast already = OVER is good
                bet_type = "over"
                trigger_flag = True
                trigger_reasons.append(f"required_ppm={required_ppm:.2f} < 0.5 (scoring fast)")

            # Trigger 2: PPM difference (significant pace mismatch)
            abs_ppm_difference = abs(ppm_difference)
            if abs_ppm_difference > config.PPM_DIFFERENCE_THRESHOLD:
                trigger_flag = True
                trigger_reasons.append(f"ppm_diff={abs_ppm_difference:.2f} > {config.PPM_DIFFERENCE_THRESHOLD}")

                # If bet_type not already set, determine from PPM difference
                if bet_type is None:
                    if ppm_difference > 0:
                        # Current pace is faster than needed = likely to go OVER
                        bet_type = "over"
                    else:
                        # Current pace is slower than needed = likely to go UNDER
                        bet_type = "under"

            # Fetch ESPN closing line and fouls FIRST (needed for confidence calculation)
            espn_closing_total = None
            home_fouls = None
            away_fouls = None
            try:
                espn_odds = self.espn_odds_fetcher.fetch_game_odds(game_id)
                if espn_odds:
                    espn_closing_total = espn_odds.get("closing_total")
                    home_fouls = espn_odds.get("home_fouls")
                    away_fouls = espn_odds.get("away_fouls")
            except Exception as e:
                logger.debug(f"Could not fetch ESPN closing line for {game_id}: {e}")

            # Calculate confidence score (even if not triggered, for logging)
            # NOW includes foul data
            confidence_data = self.confidence_scorer.calculate_confidence(
                home_metrics or {},
                away_metrics or {},
                required_ppm,
                total_points,
                ou_line,
                bet_type=bet_type,
                current_ppm=current_ppm,
                home_fouls=home_fouls,
                away_fouls=away_fouls
            )

            confidence_score = confidence_data["confidence"]
            unit_recommendation = confidence_data["unit_recommendation"]

            # Prepare log data
            log_data = {
                "timestamp": datetime.now().isoformat(),
                "game_id": game_id,
                "home_team": home_team,
                "away_team": away_team,
                "period": period,
                "minutes_remaining": time_remaining_minutes,
                "seconds_remaining": time_remaining_seconds,
                "home_score": home_score,
                "away_score": away_score,
                "total_points": total_points,
                "ou_line": ou_line,
                "sportsbook": sportsbook_used,
                "all_bookmaker_lines": all_bookmaker_lines,
                "ou_open": ou_open,
                "espn_closing_total": espn_closing_total,
                "home_fouls": home_fouls,
                "away_fouls": away_fouls,
                "required_ppm": round(required_ppm, 2),
                "time_weighted_threshold": round(time_weighted_threshold, 2),
                "current_ppm": round(current_ppm, 2),
                "ppm_difference": round(ppm_difference, 2),
                "projected_final_score": round(projected_final_score, 1),
                "total_time_remaining": round(total_time_remaining, 1),
                "bet_type": bet_type or "",
                "trigger_flag": trigger_flag,
                "trigger_reasons": "; ".join(trigger_reasons) if trigger_reasons else "",
                "home_metrics": home_metrics or {},
                "away_metrics": away_metrics or {},
                "confidence_score": round(confidence_score, 1),
                "unit_size": unit_recommendation,
                "notes": ""
            }

            # Log to CSV
            self.csv_logger.log_live_poll(log_data)

            # Send real-time update for triggered games or high confidence
            if trigger_flag or confidence_score > 40:
                update_type = "trigger" if trigger_flag else "game_update"
                await self.send_realtime_update(log_data, update_type)

                # Special alert for exceptional confidence
                if confidence_score >= 85:
                    logger.warning("🔥" * 40)
                    logger.warning(f"⚠️  EXCEPTIONAL CONFIDENCE: {confidence_score:.0f}% ⚠️")
                    logger.warning(f"Game: {away_team} @ {home_team}")
                    logger.warning(f"Bet: {bet_type.upper() if bet_type else 'N/A'} | Units: {unit_recommendation}")
                    logger.warning(f"Required PPM: {required_ppm:.2f} | Current PPM: {current_ppm:.2f}")
                    logger.warning("🔥" * 40)

            # Check if this is a new trigger
            if trigger_flag and game_id not in self.triggered_games:
                self._handle_new_trigger(game, log_data, confidence_data)

            # Update game state tracking
            self._update_game_state(game, log_data, confidence_data)

            # Check if game ended
            if game.get("completed", False):
                await self._handle_game_end(game)

        except Exception as e:
            logger.error(f"Error analyzing game: {e}")

    def _calculate_time_weight(self, period: int, minutes_remaining: int) -> float:
        """
        Calculate time-weighted multiplier for PPM threshold
        Games score faster near end of halves due to fouling, urgency, etc.

        Args:
            period: Current period (1 = 1st half, 2 = 2nd half, >2 = OT)
            minutes_remaining: Minutes remaining in period

        Returns:
            Multiplier for PPM threshold (1.0 = normal, >1.0 = higher threshold)
        """
        # Only adjust for regulation (periods 1 and 2)
        if period not in [1, 2]:
            return 1.0

        # Last 1 minute: 1.5x multiplier (games get very fast)
        if minutes_remaining <= 1:
            return 1.5
        # Last 3 minutes: 1.3x multiplier (games speed up)
        elif minutes_remaining <= 3:
            return 1.3
        # Last 5 minutes: 1.15x multiplier (slight increase)
        elif minutes_remaining <= 5:
            return 1.15
        # Middle of half: normal
        else:
            return 1.0

    def _handle_new_trigger(self, game: Dict, log_data: Dict, confidence_data: Dict):
        """Handle a new PPM threshold trigger"""
        game_id = game.get("GameID")
        home_team = log_data["home_team"]
        away_team = log_data["away_team"]
        confidence = log_data["confidence_score"]
        units = log_data["unit_size"]
        required_ppm = log_data["required_ppm"]
        bet_type = log_data.get("bet_type", "under").upper()

        # Store trigger info
        self.triggered_games[game_id] = {
            "timestamp": datetime.now(),
            "confidence": confidence,
            "units": units,
            "required_ppm": required_ppm,
            "bet_type": bet_type
        }

        # Log alert
        logger.warning("=" * 80)
        logger.warning(f"🚨 TRIGGER [{bet_type}]: {home_team} vs {away_team}")
        logger.warning(f"Bet Type: {bet_type}")
        if "trigger_reasons" in log_data and log_data["trigger_reasons"]:
            logger.warning(f"Trigger Reasons: {log_data['trigger_reasons']}")
        logger.warning(f"Required PPM: {required_ppm}")
        if "current_ppm" in log_data:
            logger.warning(f"Current PPM: {log_data['current_ppm']}")
        if "ppm_difference" in log_data:
            logger.warning(f"PPM Difference: {log_data['ppm_difference']}")
        logger.warning(f"Confidence Score: {confidence}/100")
        logger.warning(f"Unit Recommendation: {units} units")
        logger.warning(f"Breakdown: {confidence_data['breakdown']}")
        logger.warning("=" * 80)

        # TODO: Add alert integrations (SMS, Discord, email, etc.)

    def _get_totals_line(self, game: Dict, preferred_book: str = None) -> Optional[float]:
        """
        Extract over/under totals line from bookmakers data

        Args:
            game: Game data with bookmakers list
            preferred_book: Preferred bookmaker key (e.g., "fanduel", "draftkings")

        Returns:
            O/U line from preferred bookmaker, or first available
        """
        try:
            bookmakers = game.get("bookmakers", [])
            if not bookmakers:
                return None

            # Use default from config if not specified
            if preferred_book is None:
                preferred_book = config.DEFAULT_SPORTSBOOK

            # Try to find preferred bookmaker first
            for bookmaker in bookmakers:
                if bookmaker.get("key") == preferred_book:
                    markets = bookmaker.get("markets", [])
                    for market in markets:
                        if market.get("key") == "totals":
                            outcomes = market.get("outcomes", [])
                            if outcomes:
                                return float(outcomes[0].get("point", 0))

            # Fallback: Try supported bookmakers in priority order
            for book_key in config.SUPPORTED_SPORTSBOOKS:
                for bookmaker in bookmakers:
                    if bookmaker.get("key") == book_key:
                        markets = bookmaker.get("markets", [])
                        for market in markets:
                            if market.get("key") == "totals":
                                outcomes = market.get("outcomes", [])
                                if outcomes:
                                    return float(outcomes[0].get("point", 0))

            # Last resort: Use first available bookmaker
            for bookmaker in bookmakers:
                markets = bookmaker.get("markets", [])
                for market in markets:
                    if market.get("key") == "totals":
                        outcomes = market.get("outcomes", [])
                        if outcomes:
                            return float(outcomes[0].get("point", 0))

            return None

        except Exception as e:
            logger.error(f"Error extracting totals line: {e}")
            return None

    def _get_all_bookmaker_lines(self, game: Dict) -> Dict[str, float]:
        """
        Extract O/U lines from all available bookmakers

        Returns:
            Dict mapping bookmaker key to O/U line
            Example: {"fanduel": 145.5, "draftkings": 146.0, "betmgm": 145.5}
        """
        try:
            bookmakers = game.get("bookmakers", [])
            if not bookmakers:
                return {}

            all_lines = {}

            for bookmaker in bookmakers:
                book_key = bookmaker.get("key")
                book_title = bookmaker.get("title")
                markets = bookmaker.get("markets", [])

                for market in markets:
                    if market.get("key") == "totals":
                        outcomes = market.get("outcomes", [])
                        if outcomes:
                            line = float(outcomes[0].get("point", 0))
                            all_lines[book_key] = {
                                "line": line,
                                "title": book_title,
                                "key": book_key
                            }
                            break

            return all_lines

        except Exception as e:
            logger.error(f"Error extracting all bookmaker lines: {e}")
            return {}

    def _update_game_state(self, game: Dict, log_data: Dict, confidence_data: Dict):
        """Update tracking for game state (for end-of-game logging)"""
        game_id = game.get("id")

        if game_id not in self.game_states:
            self.game_states[game_id] = {
                "max_confidence": 0,
                "max_units": 0,
                "triggered": False,
                "trigger_timestamp": None
            }

        # Update max confidence seen
        if log_data["confidence_score"] > self.game_states[game_id]["max_confidence"]:
            self.game_states[game_id]["max_confidence"] = log_data["confidence_score"]
            self.game_states[game_id]["max_units"] = log_data["unit_size"]

        # Update trigger status
        if log_data["trigger_flag"]:
            self.game_states[game_id]["triggered"] = True
            if not self.game_states[game_id]["trigger_timestamp"]:
                self.game_states[game_id]["trigger_timestamp"] = log_data["timestamp"]

    async def _handle_game_end(self, game: Dict):
        """Handle game completion - log final result"""
        game_id = game.get("id")

        # Avoid duplicate logging
        if f"{game_id}_final" in self.triggered_games:
            return

        home_team = game.get("home_team")
        away_team = game.get("away_team")

        # Parse final scores
        scores = game.get("scores", [])
        final_home = 0
        final_away = 0
        for score_data in scores:
            team_name = score_data.get("name")
            score = int(score_data.get("score", 0))
            if team_name == home_team:
                final_home = score
            elif team_name == away_team:
                final_away = score

        final_total = final_home + final_away

        ou_line = self._get_totals_line(game)
        ou_open = ou_line

        # Determine O/U result
        if final_total > ou_line:
            ou_result = "over"
        elif final_total < ou_line:
            ou_result = "under"
        else:
            ou_result = "push"

        # Get our trigger state
        game_state = self.game_states.get(game_id, {})
        our_trigger = game_state.get("triggered", False)

        # Determine outcome if we bet
        outcome = ""
        unit_profit = 0

        if our_trigger:
            # We bet under (based on high PPM required)
            if ou_result == "under":
                outcome = "win"
                unit_profit = game_state.get("max_units", 0)  # Win 1:1
            elif ou_result == "over":
                outcome = "loss"
                unit_profit = -game_state.get("max_units", 0)
            else:
                outcome = "push"
                unit_profit = 0

        # Check if OT (estimate based on high score)
        if self.sport_mode == "nba":
            went_to_ot = final_total > 240  # NBA OT threshold
        else:
            went_to_ot = final_total > 180  # NCAA OT threshold

        # Log result
        result_data = {
            "game_id": game_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "home_team": home_team,
            "away_team": away_team,
            "final_home_score": final_home,
            "final_away_score": final_away,
            "final_total": final_total,
            "ou_line": ou_line,
            "ou_open": ou_open,
            "ou_result": ou_result,
            "went_to_ot": went_to_ot,
            "our_trigger": our_trigger,
            "max_confidence": game_state.get("max_confidence", 0),
            "max_units": game_state.get("max_units", 0),
            "trigger_timestamp": game_state.get("trigger_timestamp", ""),
            "outcome": outcome,
            "unit_profit": unit_profit,
            "notes": "OT" if went_to_ot else ""
        }

        self.csv_logger.log_game_result(result_data)

        logger.info(f"Game finished: {home_team} {final_home} - {away_team} {final_away}")
        if our_trigger:
            logger.info(f"Result: {outcome.upper()} ({unit_profit:+.1f} units)")

        # Mark as logged
        self.triggered_games[f"{game_id}_final"] = True


async def main():
    """Main entry point"""
    logger.info("=" * 80)
    sport_display = config.SPORT_MODE.upper()
    logger.info(f"{sport_display} Basketball Live Betting Monitor - SMART EDITION")
    logger.info("=" * 80)

    monitor = NCAABettingMonitor()

    # Initialize
    await monitor.initialize()

    # Run monitoring loop
    await monitor.run()


if __name__ == "__main__":
    asyncio.run(main())

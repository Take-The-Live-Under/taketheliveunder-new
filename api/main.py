"""
FastAPI Backend for NCAA Basketball Betting Monitor
"""
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging
import asyncio
import config

from api.auth import (
    authenticate_user,
    create_access_token,
    create_user,
    delete_user,
    list_users,
    get_current_user,
    get_current_admin_user,
    User,
    Token,
    UserCreate
)
from utils.team_stats import get_stats_manager
from utils.confidence_scorer import get_confidence_scorer
from utils.csv_logger import get_csv_logger
from utils.ppm_analyzer import get_ppm_analyzer
from utils.ai_summary import get_ai_summary_generator
from api.websocket_manager import manager as ws_manager

# Configure logging
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="NCAA Basketball Betting Monitor API",
    description="Real-time NCAA basketball betting intelligence platform",
    version="1.0.0"
)

# CORS - Allow all origins for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== MODELS ==========

class LoginRequest(BaseModel):
    username: str
    password: str


class LiveGameResponse(BaseModel):
    game_id: str
    home_team: str
    away_team: str
    period: int
    time_remaining: str
    home_score: int
    away_score: int
    total_points: int
    ou_line: float
    required_ppm: float
    trigger_flag: bool
    confidence_score: float
    unit_recommendation: float
    breakdown: dict


class PerformanceStats(BaseModel):
    total_bets: int
    wins: int
    losses: int
    pushes: int
    win_rate: float
    total_units_wagered: float
    total_unit_profit: float
    roi: float
    by_confidence: Dict


class ConfidenceWeightsUpdate(BaseModel):
    weights: Dict


class TriggerUpdate(BaseModel):
    game_data: Dict
    update_type: str = "game_update"  # game_update, trigger, alert


# ========== AUTH ENDPOINTS ==========

@app.post("/api/auth/login", response_model=Token)
async def login(request: LoginRequest):
    """Authenticate and get access token"""
    user = authenticate_user(request.username, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user["username"], "is_admin": user.get("is_admin", False)}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


# ========== GAME DATA ENDPOINTS ==========

def map_game_data(game: dict) -> dict:
    """
    Map CSV column names to frontend-friendly field names

    Args:
        game: Raw game data from CSV with columns like "Team 1", "Score 1", etc.

    Returns:
        Mapped game dictionary with fields like "away_team", "away_score", etc.
    """
    return {
        "game_id": game.get("Game ID") or game.get("game_id"),
        "home_team": game.get("Team 2") or game.get("home_team"),
        "away_team": game.get("Team 1") or game.get("away_team"),
        "home_score": game.get("Score 2") or game.get("home_score"),
        "away_score": game.get("Score 1") or game.get("away_score"),
        "total_points": int(game.get("Score 1", 0)) + int(game.get("Score 2", 0)),
        "period": game.get("Period") or game.get("period"),
        "minutes_remaining": game.get("Mins Remaining") or game.get("minutes_remaining"),
        "seconds_remaining": game.get("Secs Remaining") or game.get("seconds_remaining"),
        "ou_line": game.get("OU Line") or game.get("ou_line"),
        "sportsbook": game.get("Sportsbook") or game.get("sportsbook", ""),
        "espn_closing_total": game.get("ESPN Closing Total") or game.get("espn_closing_total"),
        "home_moneyline": game.get("Home Moneyline") or game.get("home_moneyline", ""),
        "away_moneyline": game.get("Away Moneyline") or game.get("away_moneyline", ""),
        "moneyline_book": game.get("Moneyline Book") or game.get("moneyline_book", ""),
        "home_spread": game.get("Home Spread") or game.get("home_spread", ""),
        "home_spread_odds": game.get("Home Spread Odds") or game.get("home_spread_odds", ""),
        "away_spread": game.get("Away Spread") or game.get("away_spread", ""),
        "away_spread_odds": game.get("Away Spread Odds") or game.get("away_spread_odds", ""),
        "spread_book": game.get("Spread Book") or game.get("spread_book", ""),
        "home_fouls": game.get("Home Fouls") or game.get("home_fouls"),
        "away_fouls": game.get("Away Fouls") or game.get("away_fouls"),
        "required_ppm": game.get("Required PPM") or game.get("required_ppm"),
        "time_weighted_threshold": game.get("Time Weighted Threshold") or game.get("time_weighted_threshold"),
        "current_ppm": game.get("Current PPM") or game.get("current_ppm"),
        "ppm_difference": game.get("PPM Diff") or game.get("ppm_difference"),
        "projected_final_score": game.get("Projected Final") or game.get("projected_final_score"),
        "total_time_remaining": game.get("Total Time Left") or game.get("total_time_remaining"),
        "bet_type": game.get("Bet Type") or game.get("bet_type", ""),
        "trigger_flag": game.get("Trigger") in ["YES", "True", True] or game.get("trigger_flag") in ["True", True],
        "confidence_score": game.get("Confidence") or game.get("confidence_score", 0),
        "unit_size": game.get("Units") or game.get("unit_size", 0),
        "timestamp": game.get("Timestamp") or game.get("timestamp"),
        "home_kenpom_rank": game.get("Home KenPom Rank") or game.get("home_kenpom_rank"),
        "away_kenpom_rank": game.get("Away KenPom Rank") or game.get("away_kenpom_rank"),
        "home_off_eff": game.get("Home Off Eff") or game.get("home_off_eff"),
        "away_off_eff": game.get("Away Off Eff") or game.get("away_off_eff"),
        "home_pace": game.get("Home Pace") or game.get("home_pace"),
        "away_pace": game.get("Away Pace") or game.get("away_pace"),
        "home_def_eff": game.get("Home Def Eff") or game.get("home_def_eff"),
        "away_def_eff": game.get("Away Def Eff") or game.get("away_def_eff"),
        "home_adj_em": game.get("Home AdjEM") or game.get("home_adj_em"),
        "away_adj_em": game.get("Away AdjEM") or game.get("away_adj_em"),
        "home_avg_ppm": game.get("Home Avg PPM") or game.get("home_avg_ppm"),
        "away_avg_ppm": game.get("Away Avg PPM") or game.get("away_avg_ppm"),
        "home_avg_ppg": game.get("Home Avg PPG") or game.get("home_avg_ppg"),
        "away_avg_ppg": game.get("Away Avg PPG") or game.get("away_avg_ppg"),
        "home_efg_pct": game.get("Home eFG%") or game.get("home_efg_pct"),
        "away_efg_pct": game.get("Away eFG%") or game.get("away_efg_pct"),
        "home_ts_pct": game.get("Home TS%") or game.get("home_ts_pct"),
        "away_ts_pct": game.get("Away TS%") or game.get("away_ts_pct"),
        "home_2p_pct": game.get("Home 2P%") or game.get("home_2p_pct"),
        "away_2p_pct": game.get("Away 2P%") or game.get("away_2p_pct"),
        "home_eff_margin": game.get("Home Eff Margin") or game.get("home_eff_margin"),
        "away_eff_margin": game.get("Away Eff Margin") or game.get("away_eff_margin"),
        "ou_peak": game.get("OU Peak") or game.get("ou_peak"),
        "ou_valley": game.get("OU Valley") or game.get("ou_valley"),
        "ou_position": game.get("OU Position") or game.get("ou_position"),
    }

@app.get("/api/games/live")
async def get_live_games():  # Auth disabled for testing
    """Get all live games with confidence scores"""
    from datetime import datetime, timedelta
    import config

    csv_logger = get_csv_logger()

    # Get recent logs (last 100 entries)
    logs = csv_logger.get_recent_logs(limit=100)

    # Group by game_id and get most recent entry for each game
    games_dict = {}

    for log in logs:
        game_id = log.get("Game ID") or log.get("game_id")  # Support both new and old format
        timestamp = log.get("Timestamp") or log.get("timestamp", "")

        # Only include if more recent or first entry
        if game_id not in games_dict or timestamp > games_dict[game_id].get("Timestamp", games_dict[game_id].get("timestamp", "")):
            games_dict[game_id] = log

    # Filter to only games updated in last 30 minutes (actively being monitored)
    cutoff_time = datetime.now() - timedelta(minutes=30)
    active_games = []

    for game in games_dict.values():
        timestamp_str = game.get("Timestamp") or game.get("timestamp", "")
        try:
            game_time = datetime.fromisoformat(timestamp_str)
            if game_time > cutoff_time:
                # Filter out games in their last minute if configured
                if config.FILTER_LAST_MINUTE_GAMES:
                    total_time_left = float(game.get("Total Time Left") or game.get("total_time_remaining", 999))
                    if total_time_left <= config.MIN_TIME_REMAINING:
                        logger.debug(f"Filtering out game in last minute: {game.get('Team 1')} @ {game.get('Team 2')} ({total_time_left:.2f} min remaining)")
                        continue  # Skip this game

                active_games.append(game)
        except:
            # If timestamp parsing fails, skip this game
            continue

    # Sort by confidence score (highest first)
    active_games.sort(key=lambda x: float(x.get("Confidence") or x.get("confidence_score", 0)), reverse=True)

    # Calculate O/U peak/valley for each game
    def calculate_ou_peak_valley(game_id, all_logs):
        """Calculate peak/valley info for O/U line based on game history"""
        game_logs = [log for log in all_logs if (log.get("Game ID") or log.get("game_id")) == game_id]
        if not game_logs:
            return None, None, None, None

        ou_lines = []
        for log in game_logs:
            ou_line = log.get("OU Line") or log.get("ou_line")
            if ou_line:
                try:
                    ou_lines.append(float(ou_line))
                except (ValueError, TypeError):
                    pass

        if not ou_lines:
            return None, None, None, None

        peak = max(ou_lines)  # Highest O/U line
        valley = min(ou_lines)  # Lowest O/U line
        current = ou_lines[-1]  # Most recent O/U line

        # Calculate distance to peak vs valley
        dist_to_peak = abs(current - peak)
        dist_to_valley = abs(current - valley)

        # Determine position
        if peak == valley:
            position = "STABLE"  # Line hasn't moved
        elif dist_to_peak < dist_to_valley:
            position = "PEAK"  # Closer to peak (high)
        elif dist_to_valley < dist_to_peak:
            position = "VALLEY"  # Closer to valley (low)
        else:
            position = "NEUTRAL"  # Exactly in the middle

        return peak, valley, position, current

    # Map new column names to old names for frontend compatibility
    mapped_games = []
    for game in active_games:
        game_id = game.get("Game ID") or game.get("game_id")
        ou_peak, ou_valley, ou_position, current_ou = calculate_ou_peak_valley(game_id, logs)

        # Use helper function to map CSV data to frontend format
        mapped_game = map_game_data(game)

        # Add OU peak/valley data
        mapped_game["ou_peak"] = ou_peak
        mapped_game["ou_valley"] = ou_valley
        mapped_game["ou_position"] = ou_position

        mapped_games.append(mapped_game)

    return {"games": mapped_games, "count": len(mapped_games)}


@app.get("/api/games/triggered")
async def get_triggered_games():  # Auth disabled for testing
    """Get only games that have triggered (confidence > 40)"""
    csv_logger = get_csv_logger()

    # Get recent logs
    logs = csv_logger.get_recent_logs(limit=200)

    # Filter triggered games (confidence > 40) and get most recent for each
    games_dict = {}

    for log in logs:
        if log.get("trigger_flag") == "True":
            confidence = float(log.get("confidence_score", 0))

            if confidence > 40:
                game_id = log.get("game_id")
                timestamp = log.get("timestamp", "")

                if game_id not in games_dict or timestamp > games_dict[game_id].get("timestamp", ""):
                    games_dict[game_id] = log

    games = list(games_dict.values())
    games.sort(key=lambda x: float(x.get("confidence_score", 0)), reverse=True)

    return {"games": games, "count": len(games)}


@app.get("/api/games/{game_id}/history")
async def get_game_history(game_id: str):  # Auth disabled for testing
    """Get historical data for a specific game"""
    csv_logger = get_csv_logger()

    logs = csv_logger.get_recent_logs(limit=1000)

    # Support both old and new column names
    game_logs = [log for log in logs if (log.get("Game ID") or log.get("game_id")) == game_id]
    game_logs.sort(key=lambda x: x.get("Timestamp") or x.get("timestamp", ""))

    # Map new column names to old names for frontend compatibility
    mapped_logs = []
    for log in game_logs:
        mapped_log = {
            "game_id": log.get("Game ID") or log.get("game_id"),
            "home_team": log.get("Team 2") or log.get("home_team"),
            "away_team": log.get("Team 1") or log.get("away_team"),
            "home_score": log.get("Score 2") or log.get("home_score"),
            "away_score": log.get("Score 1") or log.get("away_score"),
            "total_points": int(log.get("Score 1", 0) or 0) + int(log.get("Score 2", 0) or 0),
            "period": log.get("Period") or log.get("period"),
            "minutes_remaining": log.get("Mins Remaining") or log.get("minutes_remaining"),
            "seconds_remaining": log.get("Secs Remaining") or log.get("seconds_remaining"),
            "ou_line": log.get("OU Line") or log.get("ou_line"),
            "required_ppm": log.get("Required PPM") or log.get("required_ppm"),
            "current_ppm": log.get("Current PPM") or log.get("current_ppm"),
            "ppm_difference": log.get("PPM Diff") or log.get("ppm_difference"),
            "projected_final_score": log.get("Projected Final") or log.get("projected_final_score"),
            "total_time_remaining": log.get("Total Time Left") or log.get("total_time_remaining"),
            "bet_type": log.get("Bet Type") or log.get("bet_type", ""),
            "trigger_flag": log.get("Trigger") in ["YES", "True", True] or log.get("trigger_flag") in ["True", True],
            "confidence_score": log.get("Confidence") or log.get("confidence_score", 0),
            "unit_size": log.get("Units") or log.get("unit_size", 0),
            "timestamp": log.get("Timestamp") or log.get("timestamp"),
        }
        mapped_logs.append(mapped_log)

    return {"game_id": game_id, "history": mapped_logs, "count": len(mapped_logs)}


@app.post("/api/games/{game_id}/ai-summary")
async def generate_ai_summary(game_id: str):  # Auth disabled for testing
    """
    Generate AI-powered betting summary for a specific game

    Uses OpenAI to analyze game data and team metrics to provide:
    - Intelligent betting recommendation (BET OVER / BET UNDER / PASS)
    - Confidence level (1-5 stars)
    - Concise summary of the game situation
    - Key factors supporting the recommendation
    """
    try:
        csv_logger = get_csv_logger()
        stats_manager = get_stats_manager()
        ai_generator = get_ai_summary_generator()

        # Get latest game data from CSV logs
        logs = csv_logger.get_recent_logs(limit=1000)
        game_logs = [log for log in logs if (log.get("Game ID") or log.get("game_id")) == game_id]

        if not game_logs:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for game {game_id}"
            )

        # Get most recent log entry for this game
        game_logs.sort(key=lambda x: x.get("Timestamp") or x.get("timestamp", ""), reverse=True)
        latest_log = game_logs[0]

        # Extract game data
        home_team = latest_log.get("Team 2") or latest_log.get("home_team")
        away_team = latest_log.get("Team 1") or latest_log.get("away_team")

        # Build game data dict for AI
        game_data = {
            "game_id": game_id,
            "home_team": home_team,
            "away_team": away_team,
            "home_score": int(latest_log.get("Score 2", 0) or 0),
            "away_score": int(latest_log.get("Score 1", 0) or 0),
            "total_points": int(latest_log.get("Score 1", 0) or 0) + int(latest_log.get("Score 2", 0) or 0),
            "period": latest_log.get("Period") or latest_log.get("period", 1),
            "minutes_remaining": latest_log.get("Mins Remaining") or latest_log.get("minutes_remaining", 20),
            "ou_line": float(latest_log.get("OU Line", 0) or 0),
            "required_ppm": float(latest_log.get("Required PPM", 0) or 0),
            "current_ppm": float(latest_log.get("Current PPM", 0) or 0),
            "confidence_score": float(latest_log.get("Confidence", 0) or 0),
            "bet_type": latest_log.get("Bet Type") or latest_log.get("bet_type", "under"),
        }

        # Get team metrics if available
        home_metrics = None
        away_metrics = None

        try:
            home_metrics = stats_manager.get_team_metrics(home_team)
            away_metrics = stats_manager.get_team_metrics(away_team)
        except Exception as e:
            logger.warning(f"Could not fetch team metrics: {e}")

        # Generate AI summary
        summary_result = ai_generator.generate_summary(
            game_data=game_data,
            home_metrics=home_metrics,
            away_metrics=away_metrics
        )

        return {
            "game_id": game_id,
            "summary": summary_result.get("summary", ""),
            "recommendation": summary_result.get("recommendation", "PASS"),
            "reasoning": summary_result.get("reasoning", ""),
            "game_data": game_data,
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating AI summary for game {game_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate AI summary: {str(e)}"
        )


@app.get("/api/games/completed")
async def get_completed_games(limit: Optional[int] = 20):
    """Get games with historical data from live log"""
    csv_logger = get_csv_logger()

    # Get all logs and group by game_id
    logs = csv_logger.get_recent_logs(limit=5000)

    # Group by game_id
    games_by_id = {}
    for log in logs:
        game_id = log.get("Game ID") or log.get("game_id")
        if game_id:
            if game_id not in games_by_id:
                games_by_id[game_id] = []
            games_by_id[game_id].append(log)

    # Build completed games list
    completed_games_with_history = []

    for game_id, game_logs in list(games_by_id.items())[:limit]:
        # Sort by timestamp
        game_logs.sort(key=lambda x: x.get("Timestamp") or x.get("timestamp", ""))

        if not game_logs:
            continue

        # Get first and last entries
        first_entry = game_logs[0]
        last_entry = game_logs[-1]

        # Extract team names and scores
        away_team = first_entry.get("Team 1") or first_entry.get("away_team", "Unknown")
        home_team = first_entry.get("Team 2") or first_entry.get("home_team", "Unknown")

        final_away = int(last_entry.get("Score 1", 0) or 0)
        final_home = int(last_entry.get("Score 2", 0) or 0)
        final_total = final_away + final_home

        ou_line = float(last_entry.get("OU Line") or last_entry.get("ou_line", 0))

        # Determine O/U result
        if final_total > ou_line:
            ou_result = "over"
        elif final_total < ou_line:
            ou_result = "under"
        else:
            ou_result = "push"

        # Get timestamp
        timestamp = last_entry.get("Timestamp") or last_entry.get("timestamp", "")
        date = timestamp.split("T")[0] if timestamp else ""

        # Map historical data
        mapped_history = []
        for log in game_logs:
            mapped_log = {
                "timestamp": log.get("Timestamp") or log.get("timestamp"),
                "total_points": int(log.get("Score 1", 0) or 0) + int(log.get("Score 2", 0) or 0),
                "ou_line": float(log.get("OU Line") or log.get("ou_line", 0)),
                "period": log.get("Period") or log.get("period"),
                "minutes_remaining": float(log.get("Mins Remaining") or log.get("minutes_remaining", 0)),
                "bet_type": log.get("Bet Type") or log.get("bet_type", ""),
            }
            mapped_history.append(mapped_log)

        completed_game = {
            "game_id": game_id,
            "date": date,
            "home_team": home_team,
            "away_team": away_team,
            "away_score": final_away,
            "home_score": final_home,
            "final_total": final_total,
            "ou_line": ou_line,
            "ou_result": ou_result,
            "our_trigger": last_entry.get("Bet Type") or "",
            "outcome": "",  # Not available without results CSV
            "unit_profit": 0,  # Not available without results CSV
            "history": mapped_history,
        }

        completed_games_with_history.append(completed_game)

    # Sort by date/timestamp descending
    completed_games_with_history.sort(key=lambda x: x.get("date", ""), reverse=True)

    return {"games": completed_games_with_history, "count": len(completed_games_with_history)}


# ========== STATS ENDPOINTS ==========

@app.get("/api/stats/performance", response_model=PerformanceStats)
async def get_performance_stats():  # Auth disabled for testing
    """Get betting performance statistics"""
    csv_logger = get_csv_logger()
    stats = csv_logger.get_performance_stats()
    return stats


@app.get("/api/stats/results")
async def get_results(
    limit: Optional[int] = 50,
    current_user: User = Depends(get_current_user)
):
    """Get game results history"""
    csv_logger = get_csv_logger()
    results = csv_logger.get_results(limit=limit)

    # Sort by date descending
    results.sort(key=lambda x: x.get("date", ""), reverse=True)

    return {"results": results, "count": len(results)}


@app.get("/api/stats/team/{team_name}")
async def get_team_stats(
    team_name: str,
    current_user: User = Depends(get_current_user)
):
    """Get statistics for a specific team"""
    stats_manager = get_stats_manager()
    metrics = stats_manager.get_team_metrics(team_name)

    if not metrics:
        raise HTTPException(status_code=404, detail=f"Team not found: {team_name}")

    return metrics


@app.get("/api/stats/ppm-analysis")
async def get_ppm_analysis(
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    """
    Get PPM threshold analysis across different trigger levels

    Analyzes performance at 0.1 PPM intervals from 0.5 to 10.0
    Shows win rate, ROI, and sample size for each threshold
    Recommends optimal threshold based on historical performance
    """
    analyzer = get_ppm_analyzer()
    analysis = analyzer.analyze_ppm_performance(days=days)
    return analysis


@app.get("/api/stats/daily-summary")
async def get_daily_summary(
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get daily summary report

    Args:
        date: Date in ISO format (YYYY-MM-DD), defaults to today

    Returns:
        Summary of all games monitored on that date including:
        - Number of games
        - Number of triggers
        - PPM distribution
        - Per-game summaries
    """
    analyzer = get_ppm_analyzer()

    if date:
        try:
            from datetime import datetime
            target_date = datetime.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = None

    summary = analyzer.generate_daily_summary(date=target_date)
    return summary


@app.post("/api/stats/refresh")
async def refresh_team_stats(
    current_user: User = Depends(get_current_admin_user)
):
    """Refresh team statistics (admin only)"""
    stats_manager = get_stats_manager()

    try:
        stats_manager.fetch_all_stats(force_refresh=True)
        return {"status": "success", "message": "Team stats refreshed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========== ADMIN ENDPOINTS ==========

@app.get("/api/admin/users")
async def admin_list_users(current_user: User = Depends(get_current_admin_user)):
    """List all users (admin only)"""
    users = list_users()
    return {"users": users}


@app.post("/api/admin/users")
async def admin_create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new user (admin only)"""
    success = create_user(
        user_data.username,
        user_data.password,
        user_data.is_admin
    )

    if not success:
        raise HTTPException(status_code=400, detail="Username already exists")

    return {"status": "success", "username": user_data.username}


@app.delete("/api/admin/users/{username}")
async def admin_delete_user(
    username: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a user (admin only)"""
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    success = delete_user(username)

    if not success:
        raise HTTPException(status_code=400, detail="User not found or cannot delete last admin")

    return {"status": "success", "username": username}


@app.get("/api/admin/config")
async def admin_get_config(current_user: User = Depends(get_current_admin_user)):
    """Get current configuration (admin only)"""
    return {
        "data_source": "kenpom" if config.USE_KENPOM else "espn",
        "poll_interval": config.POLL_INTERVAL,
        "ppm_threshold": config.PPM_THRESHOLD,
        "confidence_weights": config.CONFIDENCE_WEIGHTS,
        "unit_sizes": config.UNIT_SIZES
    }


@app.post("/api/admin/config/weights")
async def admin_update_weights(
    update: ConfidenceWeightsUpdate,
    current_user: User = Depends(get_current_admin_user)
):
    """Update confidence scoring weights (admin only)"""
    scorer = get_confidence_scorer()
    scorer.update_weights(update.weights)

    return {"status": "success", "weights": update.weights}


@app.get("/api/admin/system/status")
async def admin_system_status(current_user: User = Depends(get_current_admin_user)):
    """Get system status (admin only)"""
    stats_manager = get_stats_manager()

    return {
        "status": "running",
        "data_source": "kenpom" if config.USE_KENPOM else "espn",
        "environment": config.ENVIRONMENT,
        "last_stats_fetch": getattr(stats_manager.fetcher, "last_fetch", None),
        "stats_cached": stats_manager.fetcher.stats_cache is not None
    }


# ========== DATA EXPORT ENDPOINTS ==========

@app.get("/api/export/live-log")
async def export_live_log(current_user: User = Depends(get_current_admin_user)):
    """Download live log CSV (admin only)"""
    if not config.LIVE_LOG_FILE.exists():
        raise HTTPException(status_code=404, detail="Live log file not found")

    return FileResponse(
        path=config.LIVE_LOG_FILE,
        filename=f"ncaa_live_log_{datetime.now().strftime('%Y%m%d')}.csv",
        media_type="text/csv"
    )


@app.get("/api/export/results")
async def export_results(current_user: User = Depends(get_current_admin_user)):
    """Download results CSV (admin only)"""
    if not config.RESULTS_FILE.exists():
        raise HTTPException(status_code=404, detail="Results file not found")

    return FileResponse(
        path=config.RESULTS_FILE,
        filename=f"ncaa_results_{datetime.now().strftime('%Y%m%d')}.csv",
        media_type="text/csv"
    )


# ========== WEBSOCKET ENDPOINTS ==========

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time game updates

    Connects clients and keeps the connection alive with periodic pings.
    Clients receive:
    - connection_established: Welcome message
    - game_update: Individual game updates
    - games_update: Full games list updates
    - alert: High-confidence opportunity alerts
    - ping: Keep-alive messages
    """
    await ws_manager.connect(websocket)

    # Send initial games list to new client
    try:
        csv_logger = get_csv_logger()
        logs = csv_logger.get_recent_logs(limit=1000)

        # Get latest log entry for each unique game_id
        games_dict = {}
        for log in reversed(logs):
            game_id = log.get("Game ID") or log.get("game_id")
            if game_id and game_id not in games_dict:
                games_dict[game_id] = log

        # Filter to only games updated in last 30 minutes (actively being monitored)
        # This matches the filtering logic in /api/games/live endpoint
        cutoff_time = datetime.now() - timedelta(minutes=30)
        active_games = []

        for game in games_dict.values():
            timestamp_str = game.get("Timestamp") or game.get("timestamp", "")
            try:
                game_time = datetime.fromisoformat(timestamp_str)
                if game_time > cutoff_time:
                    # Filter out games in their last minute if configured
                    if config.FILTER_LAST_MINUTE_GAMES:
                        total_time_left = float(game.get("Total Time Left") or game.get("total_time_remaining", 999))
                        if total_time_left <= config.MIN_TIME_REMAINING:
                            logger.debug(f"WebSocket: Filtering out game in last minute")
                            continue  # Skip this game

                    active_games.append(game)
            except:
                # If timestamp parsing fails, skip this game
                continue

        # Map CSV data to frontend format using the same helper function
        mapped_games = [map_game_data(game) for game in active_games]

        # Send mapped games to the newly connected client
        await ws_manager.send_personal_message(
            {
                "type": "games_update",
                "timestamp": datetime.now().isoformat(),
                "count": len(mapped_games),
                "data": mapped_games
            },
            websocket
        )
        logger.info(f"Sent initial {len(mapped_games)} active games to new WebSocket client (filtered by 30-min cutoff)")
    except Exception as e:
        logger.error(f"Error sending initial games: {e}")

    try:
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client (for ping/pong or control messages)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)

                # Handle client ping
                if data == "ping":
                    await ws_manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.now().isoformat()},
                        websocket
                    )

            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({
                        "type": "ping",
                        "timestamp": datetime.now().isoformat()
                    })
                except:
                    # Connection likely closed
                    break

            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        ws_manager.disconnect(websocket)


@app.post("/api/internal/trigger-update")
async def internal_trigger_update(update: TriggerUpdate):
    """
    Internal endpoint for monitor to send game updates

    This endpoint receives updates from monitor.py and broadcasts them
    to all connected WebSocket clients.

    Args:
        update: TriggerUpdate containing game_data and update_type

    update_type can be:
    - "game_update": Regular game state update
    - "trigger": PPM threshold exceeded
    - "alert": High-confidence opportunity (>= 75)
    """
    try:
        # Map CSV column names to frontend-friendly field names
        mapped_game_data = map_game_data(update.game_data)
        confidence = float(mapped_game_data.get("confidence_score", 0))

        # Broadcast mapped game update to all connected clients
        await ws_manager.broadcast_game_update(mapped_game_data)

        # Send special alert for high confidence opportunities
        if confidence >= 75:
            await ws_manager.send_alert(
                game_data=mapped_game_data,
                confidence=confidence,
                alert_type="high_confidence"
            )
            logger.info(
                f"High confidence alert sent: {mapped_game_data.get('away_team')} @ "
                f"{mapped_game_data.get('home_team')} ({confidence:.0f}%)"
            )

        # Send trigger alert if this is a new trigger
        if update.update_type == "trigger":
            await ws_manager.send_trigger_alert(mapped_game_data)
            logger.info(
                f"Trigger alert sent: {mapped_game_data.get('away_team')} @ "
                f"{mapped_game_data.get('home_team')} (PPM: {mapped_game_data.get('required_ppm')})"
            )

        return {
            "status": "success",
            "message": "Update broadcast to connected clients",
            "active_connections": len(ws_manager.active_connections),
            "confidence": confidence
        }

    except Exception as e:
        logger.error(f"Error processing trigger update: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process update: {str(e)}"
        )


@app.get("/api/websocket/stats")
async def websocket_stats():
    """Get WebSocket connection statistics"""
    return ws_manager.get_stats()


# ========== HEALTH CHECK ==========

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "websocket_connections": len(ws_manager.active_connections)
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NCAA Basketball Betting Monitor API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=not config.IS_PRODUCTION
    )

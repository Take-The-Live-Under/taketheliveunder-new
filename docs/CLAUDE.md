# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NCAA Basketball Live Betting Monitor - An intelligent, real-time betting monitoring system that:
- Polls live NCAA basketball games every 30 seconds from The Odds API
- Gets live betting odds (over/under lines) from major sportsbooks
- Calculates required Points Per Minute (PPM) to hit over/under lines
- Fetches advanced team statistics from KenPom or ESPN
- Calculates smart confidence scores (0-100) for betting opportunities
- Recommends unit sizing based on confidence levels
- Provides real-time dashboard and admin panel
- Logs all data to CSV for analysis

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn
- **Data Sources**:
  - The Odds API (live game scores and betting odds)
  - KenPom via kenpompy (premium team stats) OR ESPN via sportsdataverse-py (free)
- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Storage**: CSV files (simple, portable)
- **Deployment**: Railway (backend) + Vercel (frontend)

## Architecture

### High-Level Data Flow

1. **monitor.py** (runs 24/7):
   - Polls The Odds API every 30 seconds for live games and odds
   - Fetches team stats from KenPom or ESPN (cached, refreshed daily)
   - Extracts over/under lines from bookmakers
   - Calculates PPM required to hit over/under
   - Triggers when PPM > 4.5
   - Calculates confidence score using team metrics
   - Logs everything to CSV (live polls + end-of-game results)

2. **api/main.py** (FastAPI server):
   - Serves REST API endpoints for dashboard
   - Reads CSV logs for live data
   - Provides performance analytics
   - Admin endpoints for user/system management
   - Simple file-based auth (JWT tokens)

3. **frontend/** (Next.js app):
   - Polls backend API every 30 seconds
   - Displays live games with confidence scores
   - Color-coded by confidence tier
   - Admin panel for management

### Key Components

**Data Fetchers** (`utils/`):
- `team_stats_kenpom.py`: Fetches from KenPom using kenpompy (requires subscription)
- `team_stats_espn.py`: Calculates metrics from ESPN box scores (free)
- `team_stats.py`: Unified manager that switches between sources via config

**Confidence Scoring** (`utils/confidence_scorer.py`):
- Base score: 50 (trigger met)
- Evaluates pace (slow = good for under)
- Evaluates 3-point shooting (low volume = good)
- Evaluates defense (strong = good)
- Evaluates free throws, turnovers
- Matchup bonuses (both slow, both strong defense)
- PPM severity adjustment (higher PPM = more confident in under)
- Returns 0-100 score + unit recommendation (0, 0.5, 1, 2, or 3 units)

**CSV Logging** (`utils/csv_logger.py`):
- `ncaa_live_log.csv`: Every poll logged (timestamp, scores, PPM, confidence, team stats, etc.)
- `ncaa_results.csv`: Final game results (score, O/U result, our outcome, unit profit)
- Performance analytics calculated from results

## Common Development Tasks

### Running the System Locally

```bash
# Terminal 1 - Backend API
python api/main.py

# Terminal 2 - Monitor (live polling)
python monitor.py

# Terminal 3 - Frontend
cd frontend && npm run dev
```

### Testing Components Individually

```bash
# Test KenPom fetcher
python -c "from utils.team_stats_kenpom import get_kenpom_fetcher; f = get_kenpom_fetcher(); f.fetch_team_stats(); print(f.get_team_metrics('Duke'))"

# Test ESPN fetcher
python -c "from utils.team_stats_espn import get_espn_fetcher; f = get_espn_fetcher(); f.fetch_team_stats(); print(f.get_team_metrics('Duke'))"

# Test confidence scorer
python -c "from utils.confidence_scorer import get_confidence_scorer; from utils.team_stats import get_stats_manager; sm = get_stats_manager(); h, a = sm.get_matchup_metrics('Duke', 'UNC'); cs = get_confidence_scorer(); print(cs.calculate_confidence(h, a, 5.2, 60, 145))"
```

### Switching Data Sources

In `.env` or `config.py`:
```python
USE_KENPOM = True   # Use KenPom (requires subscription)
USE_KENPOM = False  # Use ESPN (free)
```

Restart monitor after changing.

### Adjusting Confidence Weights

Either:
1. Edit `config.py` → `CONFIDENCE_WEIGHTS` dict
2. Use admin panel → "Adjust Weights" (live updates)

### Deploying

**Railway (Backend)**:
1. Push to GitHub
2. Railway auto-deploys from `main` branch
3. Set environment variables in Railway dashboard
4. Both API and monitor run via Procfile

**Vercel (Frontend)**:
1. Push to GitHub
2. Vercel auto-deploys from `main` branch
3. Set `NEXT_PUBLIC_API_URL` to Railway backend URL

## File Organization

```
/
├── api/                      # FastAPI backend
│   ├── main.py              # All API endpoints
│   └── auth.py              # JWT auth, user management
├── utils/                   # Core logic
│   ├── team_stats.py        # Unified stats manager (facade)
│   ├── team_stats_kenpom.py # KenPom integration
│   ├── team_stats_espn.py   # ESPN integration
│   ├── confidence_scorer.py # Scoring algorithm
│   └── csv_logger.py        # CSV logging & analytics
├── frontend/                # Next.js dashboard
│   ├── src/app/            # Pages (page.tsx, login/page.tsx, admin/page.tsx)
│   ├── src/components/     # React components (GameCard.tsx, etc.)
│   └── src/lib/api.ts      # API client
├── monitor.py               # Main polling script (runs 24/7)
├── config.py                # All configuration (data source, weights, paths)
├── requirements.txt         # Python dependencies
├── data/                    # CSV logs and cache (gitignored)
├── cache/                   # Team stats cache (gitignored)
└── logs/                    # Application logs (gitignored)
```

## Configuration Files

**`config.py`**: Central configuration
- Data source toggle (`USE_KENPOM`)
- API credentials
- Polling interval (`POLL_INTERVAL = 30`)
- PPM threshold (`PPM_THRESHOLD = 4.5`)
- Confidence weights (all adjustable)
- Unit sizing tiers
- File paths

**`.env`**: Secrets (not committed)
- `SPORTSDATA_API_KEY`
- `KENPOM_EMAIL`, `KENPOM_PASSWORD`
- `SECRET_KEY` (for JWT)
- `ENVIRONMENT` (development/production)

## API Endpoints

### Public
- `POST /api/auth/login` - Get JWT token
- `GET /health` - Health check

### Authenticated
- `GET /api/games/live` - All live games with latest poll data
- `GET /api/games/triggered` - Only triggered games (confidence > 40)
- `GET /api/stats/performance` - Win rate, ROI, performance by tier
- `GET /api/stats/results?limit=50` - Game results history

### Admin Only
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `DELETE /api/admin/users/{username}` - Delete user
- `POST /api/stats/refresh` - Force refresh team stats
- `GET /api/admin/config` - Get configuration
- `POST /api/admin/config/weights` - Update confidence weights
- `GET /api/export/live-log` - Download live log CSV
- `GET /api/export/results` - Download results CSV

## Data Models

### Game Log Entry (CSV)
```csv
timestamp, game_id, home_team, away_team, period, minutes_remaining, seconds_remaining,
home_score, away_score, total_points, ou_line, ou_open, required_ppm, trigger_flag,
home_pace, home_3p_rate, home_def_eff, away_pace, away_3p_rate, away_def_eff,
confidence_score, unit_size, notes
```

### Game Result (CSV)
```csv
game_id, date, home_team, away_team, final_home_score, final_away_score, final_total,
ou_line, ou_open, ou_result, went_to_ot, our_trigger, max_confidence, max_units,
trigger_timestamp, outcome, unit_profit, notes
```

## Important Conventions

1. **Pace Normalization**:
   - KenPom uses per-40-minute pace
   - ESPN calculates per-game pace
   - Both converted to `pace_per_game` for consistency in `team_stats.py`

2. **Team Name Matching**:
   - Flexible matching in fetchers (case-insensitive, partial match)
   - Sportsdata.io may use abbreviations ("UNC"), stats use full names ("North Carolina")
   - Fetchers handle this with `_find_team()` method

3. **Error Handling**:
   - All fetchers have CSV cache fallback
   - Missing team stats → confidence score defaults to 0 (no bet)
   - API errors logged but don't crash monitor

4. **Caching Strategy**:
   - Team stats cached for `STATS_REFRESH_HOURS` (default 24)
   - Saved to CSV daily as backup
   - Can force refresh via admin panel or `force_refresh=True` param

5. **Authentication**:
   - Simple file-based user storage (`data/users.json`)
   - JWT tokens with 7-day expiration
   - Cannot delete last admin user

## Debugging Tips

### Monitor not triggering alerts
1. Check `config.PPM_THRESHOLD` - default is 4.5
2. Verify games are actually live (check Sportsdata.io response)
3. Check CSV logs to see if polls are being logged

### Team stats missing
1. Check data source: `print(config.USE_KENPOM)`
2. If KenPom: verify credentials, check browser login in fetcher
3. If ESPN: may need to wait for season games to be played
4. Check cache: `ls cache/` for recent CSV files

### Confidence scores always 0
1. Verify team stats loaded: `get_stats_manager().stats_manager.fetcher.stats_cache`
2. Check team name matching (run `_find_team()` test)
3. Ensure both home and away metrics exist

### Frontend not updating
1. Check API URL in `.env.local`
2. Verify backend is running (`curl http://localhost:8000/health`)
3. Check browser console for errors
4. Verify JWT token in localStorage

## Performance Considerations

- **CSV Performance**: Current approach works for thousands of logs. If scaling beyond 100k+ entries, consider SQLite
- **API Rate Limits**: Sportsdata.io free tier has limits. Monitor polls every 30s, plan accordingly
- **Memory**: Stats cache kept in memory. ~1-2MB for full season. Not an issue for typical deployments
- **Concurrent Users**: FastAPI handles ~1000 concurrent users easily with default settings

## Future Enhancement Ideas

- SMS/Discord/Email alerts for high-confidence triggers
- Machine learning to optimize confidence weights based on historical performance
- Live betting odds integration (compare to bookmaker lines)
- Player injury data integration
- Weather data for outdoor sports
- Mobile app (React Native)
- PostgreSQL database instead of CSV
- WebSocket for true real-time updates instead of polling

## Critical Files (Don't Delete)

- `config.py` - Everything breaks without this
- `monitor.py` - Core polling logic
- `utils/confidence_scorer.py` - The intelligence
- `api/main.py` - All endpoints defined here
- `data/users.json` - Will be recreated with default admin if deleted

## Environment Variables Required

**Minimum for local dev**:
```env
ODDS_API_KEY=your-key-here
USE_KENPOM=false  # or true if you have subscription
```

**For production**:
```env
ODDS_API_KEY=xxx
USE_KENPOM=true
KENPOM_EMAIL=xxx
KENPOM_PASSWORD=xxx
SECRET_KEY=random-secret-here
ENVIRONMENT=production
BACKEND_URL=https://your-app.railway.app
```

## Testing

No formal test suite yet. Manual testing workflow:

1. Test data fetchers individually (see commands above)
2. Run monitor.py with live games and check CSV logs
3. Test API endpoints with curl or Postman
4. Test frontend in dev mode
5. Deploy to staging before production

## Support

This is a custom build. For issues:
1. Check logs in `/logs/monitor.log`
2. Review CSV files in `/data/` for data issues
3. Check Railway/Vercel deployment logs
4. Verify environment variables set correctly

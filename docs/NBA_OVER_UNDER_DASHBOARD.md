# NBA Over/Under Live Betting Dashboard

## Project Overview

A real-time NBA betting monitoring system that tracks live games, calculates Points Per Minute (PPM) metrics, and provides intelligent confidence scoring for over/under betting opportunities.

**Last Updated**: October 29, 2025

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- The Odds API key (https://the-odds-api.com/)

### Installation & Startup

```bash
# 1. Backend API
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python api/main.py

# 2. Monitor (live polling)
source venv/bin/activate
PYTHONPATH=/Users/brookssawyer/Desktop/basketball-betting:$PYTHONPATH python monitor.py

# 3. Frontend
cd frontend
npm run dev
```

Access dashboard at: http://localhost:3000

---

## System Architecture

### Data Flow

```
ESPN API          The Odds API
    |                  |
    v                  v
Game Clock    +    Betting Lines
    |                  |
    +------------------+
            |
            v
    Monitor (monitor.py)
            |
            v
    CSV Logging (data/)
            |
            v
    FastAPI Backend (api/main.py)
            |
            v
    Next.js Frontend (frontend/)
```

### Key Components

1. **ESPN API**: Provides accurate, real-time game clock and scores
2. **The Odds API**: Provides live betting lines (over/under)
3. **Monitor**: Polls every 40 seconds, joins data, calculates PPM metrics
4. **CSV Logger**: Stores all polls and final results
5. **Backend API**: Serves data to frontend via REST endpoints
6. **Frontend**: React dashboard displaying live games and betting opportunities

---

## Configuration

### Environment Variables (.env)

```env
# The Odds API
ODDS_API_KEY=your-odds-api-key-here

# Sport Mode
SPORT_MODE=nba

# Data Source (for team stats)
USE_KENPOM=false
```

### Key Settings (config.py)

```python
# Polling interval: 40 seconds
POLL_INTERVAL = 40

# PPM Thresholds
PPM_THRESHOLD_UNDER = 4.5   # Trigger UNDER when required PPM > 4.5
PPM_THRESHOLD_OVER = 1.5    # Trigger OVER when required PPM < 1.5

# Kill Switch: Auto-shutdown after 5 minutes of no live games
# (Built into monitor.py, no config needed)
```

---

## Core Metrics Explained

### Points Per Minute (PPM)

**Required PPM** = Points needed to hit line / Minutes remaining
- For UNDER bets: Higher required PPM = better (need to score fast to hit over)
- For OVER bets: Lower required PPM = better (already scoring fast)

**Current PPM** = Current total points / Minutes elapsed
- Actual scoring pace of the game

**PPM Difference** = Current PPM - Required PPM
- Positive = scoring faster than needed
- Negative = scoring slower than needed

### Example Calculation

```
Game: Lakers vs Timberwolves
O/U Line: 234.5
Current Score: 111-114 = 225 total points
Time: 1:09 remaining in Q4 (1.15 total minutes left)

Required PPM = (234.5 - 225) / 1.15 = 8.26 PPM
Current PPM = 225 / 46.85 minutes = 4.80 PPM
PPM Difference = 4.80 - 8.26 = -3.46 (negative = good for UNDER)

Trigger: UNDER (required PPM > 4.5)
Projected Final Score = 225 + (4.80 * 1.15) = 230.5
```

---

## Confidence Scoring System

Base score starts at **50** when trigger threshold is met.

### Factors (for UNDER bets):

**Pace (possessions per game)**
- Slow pace (<67): +12 per team
- Medium pace (67-72): +5 per team
- Fast pace (>72): -10 per team
- Both teams slow: +15 bonus

**3-Point Shooting**
- Low 3P rate (<30%): +8 per team
- High 3P accuracy (>38%): -5 per team

**Free Throws**
- Low FT rate (<18 FTA/gm): +6 per team
- High FT rate (>24 FTA/gm): -6 per team

**Turnovers**
- High TO rate (>14/gm): +5 per team

**Defense**
- Strong defense (<95 pts/100 poss): +10 per team
- Both teams strong defense: +10 bonus

**PPM Severity**
- Higher required PPM = more confident in UNDER
- Adds up to +20 points based on how high PPM is

### Confidence Tiers & Unit Sizing

| Tier | Score Range | Units | Recommendation |
|------|-------------|-------|----------------|
| NO BET | 0-40 | 0 | Don't bet |
| LOW | 41-60 | 0.5 | Small bet |
| MEDIUM | 61-75 | 1 | Standard bet |
| HIGH | 76-85 | 2 | Strong bet |
| MAX | 86-100 | 3 | Maximum confidence |

---

## File Structure

```
/Users/brookssawyer/Desktop/basketball-betting/
├── monitor.py                  # Main polling script (runs 24/7)
├── config.py                   # All configuration settings
├── requirements.txt            # Python dependencies
├── .env                        # API keys and secrets
│
├── api/
│   ├── main.py                 # FastAPI backend (all endpoints)
│   └── auth.py                 # JWT authentication
│
├── utils/
│   ├── team_stats.py           # Team statistics manager
│   ├── team_stats_nba.py       # ESPN team stats fetcher
│   ├── confidence_scorer.py    # Confidence scoring algorithm
│   └── csv_logger.py           # CSV logging system
│
├── frontend/
│   ├── src/app/page.tsx        # Main dashboard
│   ├── src/components/
│   │   └── GameCard.tsx        # Individual game card component
│   └── src/lib/api.ts          # API client
│
├── data/
│   ├── ncaa_live_log.csv       # All polls logged here
│   └── ncaa_results.csv        # Final game results
│
└── cache/
    └── nba_stats_*.csv         # Team stats cache
```

---

## Key Files & Functions

### monitor.py

**Main Functions:**
- `_fetch_espn_scoreboard()`: Gets live clock data from ESPN (lines 108-197)
- `_fetch_live_games()`: Gets betting lines from The Odds API (lines 199-267)
- `analyze_game()`: Joins data and calculates all metrics (lines 269-411)
- `poll_live_games()`: Main polling loop (lines 107-125)

**Kill Switch Logic** (lines 52-54, 88-97):
```python
self.last_live_games_time = None
self.no_games_timeout = 300  # 5 minutes

# In run loop:
if time_since_live_games > self.no_games_timeout:
    logger.warning("🛑 Kill switch activated - shutting down monitor")
    break
```

### utils/csv_logger.py

**CSV Headers** (lines 27-56):
```csv
timestamp,game_id,home_team,away_team,period,minutes_remaining,seconds_remaining,
home_score,away_score,total_points,ou_line,ou_open,required_ppm,current_ppm,
ppm_difference,projected_final_score,total_time_remaining,bet_type,trigger_flag,
home_pace,home_3p_rate,home_def_eff,away_pace,away_3p_rate,away_def_eff,
confidence_score,unit_size,notes
```

### frontend/src/components/GameCard.tsx

**Key Metrics Display** (lines 11-24):
```typescript
const confidence = parseFloat(game.confidence_score || 0);
const units = parseFloat(game.unit_size || 0);
const requiredPpm = parseFloat(game.required_ppm || 0);
const currentPpm = parseFloat(game.current_ppm || 0);
const ppmDifference = parseFloat(game.ppm_difference || 0);
const projectedFinalScore = parseFloat(game.projected_final_score || 0);
const totalMinutesRemaining = parseFloat(game.total_time_remaining || 0);
```

---

## API Endpoints

### Public
- `POST /api/auth/login` - Get JWT token
- `GET /health` - Health check

### Authenticated
- `GET /api/games/live` - All live games with latest data
- `GET /api/games/triggered` - Only games meeting trigger threshold
- `GET /api/stats/performance` - Win rate, ROI, performance stats
- `GET /api/stats/results?limit=50` - Game results history

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/config` - Get system configuration
- `POST /api/admin/config/weights` - Update confidence weights

---

## Data Sources

### ESPN API
**URL**: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`

**Why**: Provides accurate, real-time game clock that updates properly

**Data Retrieved**:
- Live game status
- Period (quarter)
- Game clock (MM:SS format)
- Team names
- Scores

**Cost**: FREE ✅

### The Odds API
**URL**: `https://api.the-odds-api.com/v4`

**Why**: Provides live betting lines from major sportsbooks

**Data Retrieved**:
- Over/under lines
- Live game scores
- Game IDs

**Cost**: 500 requests/month on free tier
- At 40-second polling: ~90 requests/hour
- Runtime: ~5.5 hours per day before quota exhausted

---

## Recent Bug Fixes

### Issue #1: CSV Header Mismatch (RESOLVED)
**Problem**: Frontend showing "0.0 min left" for all games

**Root Cause**: CSV headers missing new columns (`ppm_difference`, `projected_final_score`, `total_time_remaining`), causing `csv.DictReader` to misalign fields

**Fix**: Updated CSV header row in `data/ncaa_live_log.csv` to include all columns in correct order

**File**: `/Users/brookssawyer/Desktop/basketball-betting/data/ncaa_live_log.csv` (line 1)

### Issue #2: Clock Not Updating (RESOLVED)
**Problem**: Game clock showing static time, not counting down

**Root Cause**: NBA Official API (`cdn.nba.com`) was returning stale clock data

**Fix**: Replaced NBA Official API with ESPN API for clock data
- Changed `_fetch_nba_scoreboard()` to `_fetch_espn_scoreboard()`
- ESPN clock updates in real-time
- Joined ESPN clock with The Odds API betting lines

**Files Modified**:
- `monitor.py` (lines 108-197, 288-301)

### Issue #3: API Efficiency (RESOLVED)
**Problem**: Burning through API quota too fast (60-second polling = 8.3 hours)

**Fix**: Reduced polling interval to 40 seconds
- 40 seconds = 90 requests/hour
- Still provides frequent updates while conserving quota

**File**: `config.py` (line 29)

---

## Performance Tracking

Results are logged to `data/ncaa_results.csv` with:
- Final scores
- O/U result (over/under/push)
- Whether we triggered on the game
- Our confidence score
- Units bet
- Outcome (win/loss/push)
- Unit profit/loss

View performance via:
```bash
curl http://localhost:8000/api/stats/performance
```

Returns:
```json
{
  "total_bets": 15,
  "wins": 9,
  "losses": 5,
  "pushes": 1,
  "win_rate": 60.0,
  "total_units_wagered": 18.5,
  "total_unit_profit": 3.2,
  "roi": 17.3,
  "by_confidence": {
    "low (41-60)": {"bets": 5, "wins": 2, "profit": -0.5, "win_rate": 40.0},
    "medium (61-75)": {"bets": 7, "wins": 5, "profit": 2.1, "win_rate": 71.4},
    "high (76-85)": {"bets": 3, "wins": 2, "profit": 1.6, "win_rate": 66.7},
    "max (86-100)": {"bets": 0, "wins": 0, "profit": 0, "win_rate": 0}
  }
}
```

---

## Troubleshooting

### Monitor not finding games
```bash
# Check if games are actually live
curl "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" | python -c "import sys, json; data = json.load(sys.stdin); live = [g for g in data['events'] if g['status']['type']['state'] == 'in']; print(f'Live games: {len(live)}')"
```

### Frontend not updating
```bash
# Check backend is running
curl http://localhost:8000/health

# Check recent data
curl http://localhost:8000/api/games/live
```

### Clock showing wrong time
```bash
# Check CSV logs
tail -5 /Users/brookssawyer/Desktop/basketball-betting/data/ncaa_live_log.csv

# Should show decreasing time values
```

### Kill switch activating too early
```python
# Edit monitor.py line 54
self.no_games_timeout = 600  # Change to 10 minutes
```

---

## NCAA Basketball Setup

### Team Name Matching System

**Problem**: NCAA has 350+ teams with inconsistent naming across APIs:
- ESPN: "North Carolina Tar Heels"
- The Odds API: "UNC"
- KenPom: "North Carolina"

**Solution**: Intelligent team name matcher with multiple fallback layers

#### How It Works

1. **Exact Match** - Direct string comparison
2. **Canonical Name Lookup** - Check against mapping database
3. **Normalization** - Remove mascots, punctuation, common words
4. **Fuzzy Matching** - 80%+ similarity score using Levenshtein distance
5. **Partial Matching** - Handle "Duke" vs "Duke Blue Devils"
6. **Qualifier Detection** - Prevent false matches like "Michigan" vs "Michigan State"

#### Mapping Database

File: `/data/ncaa_team_mappings.json`

Contains 50+ common NCAA teams with their variations:
```json
{
  "north carolina": ["north carolina", "unc", "nc", "north carolina tar heels", "tar heels"],
  "louisiana state": ["lsu", "louisiana state", "louisiana st"],
  "michigan state": ["michigan state", "michigan st", "mich state", "spartans", "msu"]
}
```

#### Adding New Teams

When the system encounters unmatched teams, you can add them:

```python
from utils.team_name_matcher import get_team_matcher

matcher = get_team_matcher()
matcher.add_mapping("canonical_name", "variation_name")
# Automatically saves to JSON file
```

#### Switching to NCAA Mode

1. Update `.env`:
```env
SPORT_MODE=ncaa
```

2. Restart monitor:
```bash
python monitor.py
```

3. System automatically uses:
   - NCAA ESPN API endpoint
   - NCAA Odds API endpoint
   - Team name matcher for all game matching

#### Testing Team Matching

```bash
python test_team_matcher.py
```

Validates 22 test cases including:
- Abbreviations (UNC, LSU, VCU)
- St./Saint variations
- State variations
- Special cases (Texas A&M, Miami FL)
- Mascot removal
- False positive prevention

## PPM Threshold Analysis & Optimization

### Overview

The system includes comprehensive PPM threshold analysis to help you optimize trigger thresholds based on actual performance data. This allows you to fine-tune the model by analyzing win rates, ROI, and sample sizes at every 0.1 PPM interval.

### What It Analyzes

**For each 0.1 PPM threshold (0.5, 0.6, 0.7... up to 10.0):**
- Number of triggers
- Win/Loss/Push record
- Win rate percentage
- Average confidence score
- Total units wagered
- Total profit/loss
- ROI percentage

**Recommendations Include:**
- Best ROI threshold (highest profit percentage)
- Best win rate threshold (highest success rate with positive ROI)
- Optimal threshold based on risk-adjusted returns

### Using the CLI Tool

**Generate PPM Threshold Analysis:**
```bash
python generate_ppm_report.py --days 30
```

**Daily Summary Report:**
```bash
# Today's summary
python generate_ppm_report.py --daily

# Specific date
python generate_ppm_report.py --date 2025-11-15
```

**Export to JSON:**
```bash
python generate_ppm_report.py --days 30 --export analysis.json
```

### API Endpoints

**PPM Threshold Analysis:**
```bash
GET /api/stats/ppm-analysis?days=30
```

Returns analysis across all PPM thresholds with optimal recommendations.

**Daily Summary:**
```bash
GET /api/stats/daily-summary?date=2025-11-15
```

Returns summary of all games monitored on that date including PPM distribution and per-game breakdowns.

### Sample Output

```
====================================================================================================
PPM THRESHOLD ANALYSIS - Last 30 Days
Total Games Analyzed: 45
====================================================================================================

🎯 OPTIMAL THRESHOLD: 5.2 PPM
   Reason: Highest ROI (24.5%) with 18 samples

💰 Best ROI: 5.2 PPM
   ROI: 24.5% | Win Rate: 66.7% | Triggers: 18

🏆 Best Win Rate: 4.8 PPM
   Win Rate: 71.4% | ROI: 18.2% | Triggers: 21

----------------------------------------------------------------------------------------------------
Threshold    Triggers   W-L-P           Win%     Avg Conf   Units      Profit     ROI%
----------------------------------------------------------------------------------------------------
3.5          5          2-3-0           40.0     45.2       2.5        🔴 -1.50    -60.0
4.0          8          5-3-0           62.5     52.8       4.5        🟡 0.90     20.0
4.5          15         9-6-0           60.0     58.3       9.0        🟢 2.10     23.3
5.0          12         8-4-0           66.7     62.1       7.5        🟢 2.85     38.0
5.5          6          4-2-0           66.7     68.4       4.0        🟢 1.20     30.0
====================================================================================================
```

### How to Adjust the Model

Based on the analysis, you can adjust thresholds in `config.py`:

```python
# Current setting
PPM_THRESHOLD_UNDER = 4.5

# If analysis shows 5.2 PPM performs better:
PPM_THRESHOLD_UNDER = 5.2
```

**Considerations:**
- **Higher threshold** = Fewer triggers, higher confidence bets
- **Lower threshold** = More triggers, lower confidence average
- **Sample size matters** - Need at least 10-15 samples for reliability
- **Monitor over time** - Performance can change with different game flows

### Daily Summary Features

- **Games Monitored**: Total unique games tracked
- **Trigger Rate**: Percentage of games that triggered alerts
- **PPM Distribution**: Histogram showing game count per PPM range
- **Per-Game Analysis**:
  - PPM min/max/average throughout game
  - Number of polls
  - Whether it triggered
  - Final score vs line

### Automation

Set up automated daily reports:

```bash
# Add to crontab for daily 9 AM report
0 9 * * * cd /path/to/basketball-betting && python generate_ppm_report.py --daily --export daily_$(date +\%Y\%m\%d).json
```

### Performance Tracking Files

- **Live Log**: `data/ncaa_live_log.csv` - Every poll recorded
- **Results**: `data/ncaa_results.csv` - Final game outcomes
- **Analysis**: Generated on-demand from these source files

## Future Enhancements

1. **Live Odds Movement Tracking**
   - Track how O/U line moves during game
   - Identify value opportunities when line moves against current pace

2. **Historical Pattern Analysis**
   - Track how teams perform in different game states
   - "4th quarter under" specialists
   - Time-of-day trends

3. **Alerts & Notifications**
   - Discord/Telegram webhook when high-confidence trigger occurs
   - Email daily summary

4. **Advanced Visualizations**
   - PPM trend chart throughout game
   - Win probability graph
   - Live odds movement overlay

5. **Machine Learning Optimization**
   - Train model on historical results
   - Optimize confidence weights automatically
   - Predict final score using ML instead of linear projection

---

## Important Notes

### API Usage
- The Odds API free tier: 500 requests/month
- At 40s polling with 2 live games: ~90 requests/hour
- Kill switch prevents wasted requests when no games live
- Plan accordingly during heavy game nights

### Team Name Matching
ESPN and The Odds API may use slightly different team names:
- ESPN: "Los Angeles Lakers"
- The Odds API: "Los Angeles Lakers"
- System handles fuzzy matching automatically

### Timezone
All timestamps are in local system time (Pacific).

### Data Persistence
CSV files grow continuously. Archive old data periodically:
```bash
# Archive logs older than 30 days
find data/ -name "*.csv" -mtime +30 -exec gzip {} \;
```

---

## Credits

**Developer**: Built with Claude Code
**APIs Used**:
- ESPN (scoreboard data)
- The Odds API (betting lines)
- sportsdataverse-py (team statistics)

**Tech Stack**:
- Backend: Python 3.10, FastAPI, asyncio
- Frontend: Next.js 14, React, TypeScript, TailwindCSS
- Storage: CSV files
- Deployment: Railway (backend), Vercel (frontend)

---

## Support & Maintenance

### Logs Location
```bash
# Monitor logs
/Users/brookssawyer/Desktop/basketball-betting/logs/monitor.log

# View live
tail -f logs/monitor.log
```

### Restart All Services
```bash
# Kill all processes
ps aux | grep -E "python.*(monitor|api/main)" | grep -v grep | awk '{print $2}' | xargs kill
pkill -f "npm run dev"

# Restart (run in separate terminals)
python api/main.py
python monitor.py
cd frontend && npm run dev
```

### Update Team Stats
Team stats are cached for 24 hours. Force refresh:
```bash
curl -X POST http://localhost:8000/api/stats/refresh
```

---

## Quick Reference

| Metric | Good for UNDER | Good for OVER |
|--------|----------------|---------------|
| Required PPM | High (>4.5) | Low (<1.5) |
| Current PPM | Low | High |
| PPM Difference | Negative | Positive |
| Team Pace | Slow (<67) | Fast (>72) |
| 3P Rate | Low (<30%) | High |
| Free Throws | Low (<18) | High (>24) |
| Turnovers | High (>14) | Low |
| Defense | Strong (<95) | Weak |

---

**End of Documentation**

For questions or issues, review logs and check API connectivity first.

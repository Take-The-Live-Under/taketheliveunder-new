# 🏀 NCAA BASKETBALL BETTING MONITOR - RUN INSTRUCTIONS

## 🎯 SYSTEM FEATURES

✅ **ALL D1 Games Covered** - ESPN API fetches every D1 basketball game, not just top 25
✅ **Comprehensive Spreadsheet Logging** - Every single poll logged to CSV with 29 data columns
✅ **Intelligent Team Matching** - Handles 350+ NCAA teams with name variations
✅ **Real-time Confidence Scoring** - 11-factor analysis for every opportunity
✅ **Auto-Shutdown** - Stops 5 minutes after last live game ends

---

## 🚀 HOW TO RUN (3 Terminals)

### Terminal 1: Backend API Server

```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python api/main.py
```

**You'll see**:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Leave this running** - It serves the dashboard and provides API endpoints

---

### Terminal 2: Frontend Dashboard

```bash
cd /Users/brookssawyer/Desktop/basketball-betting/frontend
npm run dev
```

**You'll see**:
```
▲ Next.js 14.0.4
- Local:        http://localhost:3001
✓ Ready in Xs
```

**Open in browser**: http://localhost:3001

**Leave this running** - It's your real-time monitoring dashboard

---

### Terminal 3: Live Game Monitor

```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python monitor.py
```

**You'll see**:
```
INFO | Starting monitoring loop...
INFO | Polling interval: 40 seconds
INFO | PPM threshold: 4.5
INFO | Fetching live NCAA basketball games...
```

**This is the main engine** - It:
- Polls ESPN API for ALL D1 live games every 40 seconds
- Gets betting lines from The Odds API
- Matches team names intelligently
- Calculates PPM and confidence scores
- **LOGS EVERY POLL TO CSV** (even non-triggers!)
- Updates dashboard in real-time
- Auto-stops 5 minutes after last game ends

---

## 📊 COMPREHENSIVE SPREADSHEET LOGGING

### Where to Find Your Data

**Live Polls CSV** (Every 40-second poll):
```bash
/Users/brookssawyer/Desktop/basketball-betting/data/ncaa_live_log.csv
```

**Open in Excel/Google Sheets** - This has EVERYTHING:

#### 29 Columns Per Row:
1. `timestamp` - Exact time of poll
2. `game_id` - Unique game identifier
3. `home_team` - Home team name
4. `away_team` - Away team name
5. `period` - Current quarter/half
6. `minutes_remaining` - Minutes left in period
7. `seconds_remaining` - Seconds left in period
8. `home_score` - Home team score
9. `away_score` - Away team score
10. `total_points` - Combined score
11. `ou_line` - Over/Under betting line
12. `ou_open` - Opening O/U line
13. `required_ppm` - Points per minute needed
14. `current_ppm` - Current scoring pace
15. `ppm_difference` - Difference from required
16. `projected_final_score` - Estimated final total
17. `total_time_remaining` - Total minutes left
18. `bet_type` - OVER or UNDER recommendation
19. `trigger_flag` - TRUE if triggered alert
20. `home_pace` - Home team pace metric
21. `home_3p_rate` - Home team 3-point rate
22. `home_def_eff` - Home defense efficiency
23. `away_pace` - Away team pace metric
24. `away_3p_rate` - Away team 3-point rate
25. `away_def_eff` - Away defense efficiency
26. `confidence_score` - 0-100 confidence rating
27. `unit_size` - Recommended bet size
28. `notes` - Additional information
29. **(Auto-calculated in Excel)** - You can add formulas!

**Game Results CSV** (Final outcomes):
```bash
/Users/brookssawyer/Desktop/basketball-betting/data/ncaa_results.csv
```

Contains final scores, whether trigger won/lost/pushed, unit profit/loss

---

## 📈 VIEWING YOUR DATA IN EXCEL

### Quick Open Commands:

**Mac**:
```bash
open -a "Microsoft Excel" data/ncaa_live_log.csv
# or
open data/ncaa_live_log.csv  # Opens in default app
```

**Windows**:
```bash
start excel data\ncaa_live_log.csv
```

### Excel Analysis Tips:

1. **Filter by Trigger Flag**: See only games that triggered
2. **Sort by Confidence Score**: Find highest confidence plays
3. **Pivot Tables**: Analyze by team, time remaining, PPM ranges
4. **Charts**: Graph PPM progression throughout games
5. **Conditional Formatting**: Color-code by confidence tiers

---

## 🎮 DASHBOARD FEATURES

### Main Dashboard (http://localhost:3001)

**Tabs**:
- **Live Games** - All active games with confidence scores
- **Trends & Analysis** - Performance stats and insights

**Filters**:
- **Triggered Only** - Show only high-confidence opportunities
- **All Games** - Show everything being monitored
- **Sort by Confidence** - Best opportunities first
- **Sort by Time** - Newest updates first

**Game Cards Show**:
- Team names and current score
- Quarter/half and time remaining
- Over/Under line
- Required PPM
- Confidence score (0-100)
- Unit recommendation (0.5 to 3 units)
- Confidence breakdown factors

**Auto-Refresh**: Dashboard updates every 30 seconds automatically

---

## 📋 WHAT YOU'LL SEE IN TERMINAL 3 (Monitor)

### When Games Are Live:

```
INFO | Fetching live NCAA basketball games...
INFO | ESPN reports 15 actually live games
INFO | Found 15 live NCAA games
INFO | Processing: Duke vs North Carolina
INFO | Duke @ UNC: PPM=5.2, Confidence=78, Trigger=UNDER
INFO | Logged 15 polls to CSV
```

**Every 40 seconds**, you'll see:
- How many live games ESPN found
- How many have betting lines
- Which games triggered (if any)
- Confirmation of CSV logging

### When Specific Games Trigger:

```
🚨 TRIGGER: Duke @ North Carolina
   Line: 145.5
   Total: 98 points
   Time: 15:23 remaining
   Required PPM: 5.2 (UNDER)
   Confidence: 78/100
   Recommendation: 2 units

   Confidence Breakdown:
   ✅ Both teams slow pace (+15)
   ✅ Strong defense (+10)
   ✅ Low 3P rate (+8)
   ⚠️  Moderate FT rate (+0)
```

### When Games End:

```
INFO | Game finished: Duke 68 - North Carolina 72 (Final: 140)
INFO | O/U Line: 145.5
INFO | Result: UNDER won by 5.5 points
INFO | Logged result to ncaa_results.csv
```

### Auto-Shutdown:

```
INFO | No live games found
INFO | Last live game was 5 minutes ago
⚠️  Kill switch activated - shutting down monitor
```

---

## 🔍 MONITORING YOUR DATA IN REAL-TIME

### Watch the CSV file grow:

```bash
# In a 4th terminal (optional)
tail -f data/ncaa_live_log.csv
```

This shows new rows being added every 40 seconds!

### Count today's polls:

```bash
grep "$(date +%Y-%m-%d)" data/ncaa_live_log.csv | wc -l
```

### See just triggers:

```bash
grep "True" data/ncaa_live_log.csv | tail -20
```

### Check results:

```bash
cat data/ncaa_results.csv
```

---

## 📊 END OF DAY REPORTING

### Generate Daily Summary:

```bash
source venv/bin/activate
python generate_ppm_report.py --daily
```

**Shows**:
- Total games monitored today
- Total polls conducted
- Trigger rate (%)
- PPM distribution histogram
- Per-game details:
  - PPM ranges (min/max/avg)
  - Max confidence scores
  - Whether it triggered
  - Final scores

### Example Output:

```
================================================================================
DAILY SUMMARY - 2025-11-04
================================================================================

Games Monitored: 47
Total Polls: 2,350
Triggers: 8 (17.0%)

📊 PPM Distribution:
  0.0-1.0    ████████████ 850
  1.1-2.0    ████████ 620
  2.1-3.0    █████ 430
  3.1-4.0    ███ 280
  4.1-5.0    ██ 120
  5.1-6.0    █ 50

--------------------------------------------------------------------------------
Game Details:
--------------------------------------------------------------------------------
🚨 Duke @ North Carolina
   Line: 145.5 | Final: 140
   PPM Range: 2.1 - 5.8 (avg: 3.6)
   Polls: 52 | Max Confidence: 78.5
   ✅ Triggered: UNDER

   Villanova @ Marquette
   Line: 152.0 | Final: 154
   PPM Range: 1.2 - 3.4 (avg: 2.1)
   Polls: 48 | Max Confidence: 42.0

[... 45 more games ...]
================================================================================
```

---

## 🎯 SYSTEM SPECIFICATIONS

### Coverage:
- **All D1 Basketball Games** - 350+ teams
- **ESPN API** - Authoritative game state source
- **The Odds API** - Live betting lines

### Polling:
- **Interval**: Every 40 seconds
- **Quota**: ~90 requests/hour = 5.5 hours per 500 API calls
- **Logged**: Every single poll (even non-triggers)

### Data Captured Per Poll:
- Game state (score, time, period)
- Betting lines (O/U)
- Required PPM calculations
- Team statistics (6 metrics per team)
- Confidence analysis (11 factors)
- Betting recommendations

### Triggers:
- **UNDER**: When required PPM ≥ 4.5 (need to score fast)
- **OVER**: When required PPM ≤ 1.5 (already scoring fast)

---

## 🛠️ TROUBLESHOOTING

### No games showing?

**Check ESPN for live games**:
```bash
curl -s "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard" | python -m json.tool | grep -A5 '"state"'
```

If you see `"state": "in"` then games are live.

**Verify monitor is running**: Look at Terminal 3

**Check API quota**: Look for "x-requests-remaining" in monitor logs

### CSV not updating?

**Check file permissions**:
```bash
ls -l data/ncaa_live_log.csv
```

**Verify monitor is logging**:
Monitor terminal should show "Logged X polls to CSV" every 40 seconds

### Dashboard not showing data?

1. **Refresh browser** (Cmd/Ctrl + R)
2. **Check API is running** (Terminal 1)
3. **Verify CSV has recent data**:
   ```bash
   tail -5 data/ncaa_live_log.csv
   ```

### Team names not matching?

**Check monitor logs** for "No matching team found"

**Add manual mapping**:
```bash
python -c "
from utils.team_name_matcher import get_team_matcher
matcher = get_team_matcher()
matcher.add_mapping('north carolina', 'UNC Tar Heels')
"
```

---

## 📦 DATA BACKUP

### Automatic Backups:

The system creates daily backups automatically:
```
data/ncaa_live_log_backup_20251104.csv
```

### Manual Backup:

```bash
# Copy today's data
cp data/ncaa_live_log.csv backups/log_$(date +%Y%m%d).csv
cp data/ncaa_results.csv backups/results_$(date +%Y%m%d).csv
```

---

## 📊 SPREADSHEET ANALYSIS EXAMPLES

### Excel Pivot Table Ideas:

1. **Triggers by Team**: Which teams trigger most often?
2. **Triggers by Time Remaining**: When do best opportunities appear?
3. **Confidence by PPM Range**: Which PPM levels have highest confidence?
4. **Win Rate by Confidence Tier**: Do higher confidence bets perform better?

### Excel Formulas to Add:

```excel
# Convert timestamp to time only
=TEXT(A2,"HH:MM:SS")

# Calculate if trigger was correct (needs final score)
=IF(trigger_flag="True", IF(bet_type="under", IF(final_total<ou_line,"WIN","LOSS"), IF(final_total>ou_line,"WIN","LOSS")), "")

# Time remaining in decimal minutes
=minutes_remaining + (seconds_remaining/60)

# Points needed to hit line
=ou_line - total_points
```

---

## 🎊 YOU'RE READY TO RUN!

### Start Command Summary:

**Terminal 1**: `python api/main.py`
**Terminal 2**: `npm run dev`  (in frontend/ folder)
**Terminal 3**: `python monitor.py`

**Browser**: http://localhost:3001

**Your CSV**: `data/ncaa_live_log.csv` (opens in Excel)

---

## 📞 QUICK REFERENCE

**Stop Everything**:
- Press `Ctrl+C` in each terminal

**Check System Status**:
```bash
curl http://localhost:8000/health
```

**View Real-Time Logs**:
```bash
tail -f logs/monitor.log
```

**Today's Poll Count**:
```bash
grep "$(date +%Y-%m-%d)" data/ncaa_live_log.csv | wc -l
```

**Open Spreadsheet**:
```bash
open data/ncaa_live_log.csv
```

**Daily Summary**:
```bash
python generate_ppm_report.py --daily
```

---

**System Ready! Let's monitor some games! 🏀📊**

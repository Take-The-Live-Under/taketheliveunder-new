# 🏀 NCAA BASKETBALL BETTING MONITOR - MONDAY LAUNCH CHECKLIST

**Launch Date**: Monday, November 4th (or first game day)
**System Status**: ✅ READY FOR PRODUCTION

---

## 🚀 PRE-LAUNCH CHECKLIST (Do This First!)

### 1. Environment Verification
```bash
# Check that NCAA mode is active
grep SPORT_MODE .env
# Should show: SPORT_MODE=ncaa

# Verify API key is set
grep ODDS_API_KEY .env | head -c 20
# Should show: ODDS_API_KEY=c1e9...
```

**Status**: ✅ NCAA mode configured
**API Key**: ✅ Set and valid

---

### 2. System Components Test
```bash
# Activate virtual environment
source venv/bin/activate

# Run component verification
python -c "
from utils.team_name_matcher import get_team_matcher
from utils.ppm_analyzer import get_ppm_analyzer
from utils.csv_logger import get_csv_logger
import config

print('Sport Mode:', config.SPORT_MODE)
print('Team Mappings:', len(get_team_matcher().mappings))
print('PPM Threshold:', config.PPM_THRESHOLD)
print('✅ All components loaded')
"

# Test team name matcher
python test_team_matcher.py
# Should show: 22 passed, 0 failed
```

**Status**: ✅ All 22 tests passing

---

### 3. Clean Data Directory (Fresh Start)
```bash
# Backup old data
mv data/ncaa_live_log.csv data/ncaa_live_log_backup_$(date +%Y%m%d).csv 2>/dev/null || true

# The system will auto-create fresh files when monitor starts
```

**Note**: Keep `data/ncaa_results.csv` if you want to preserve historical results

---

## 🎯 LAUNCH DAY - MONDAY MORNING

### Step 1: Start Backend API (Terminal 1)
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python api/main.py
```

**Expected Output**:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Verify**: Open http://localhost:8000/health
Should return: `{"status": "healthy", ...}`

---

### Step 2: Start Frontend Dashboard (Terminal 2)
```bash
cd /Users/brookssawyer/Desktop/basketball-betting/frontend
npm run dev
```

**Expected Output**:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in Xs
```

**Verify**: Open http://localhost:3000
Should show the dashboard (may be empty if no games yet)

---

### Step 3: Start Live Monitor (Terminal 3)
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python monitor.py
```

**Expected Output**:
```
2025-11-04 09:00:00.123 | INFO | Fetching live NCAA basketball games...
2025-11-04 09:00:01.456 | INFO | Found X live games
2025-11-04 09:00:01.789 | INFO | Processing game: Duke vs North Carolina
...
```

**What It Does**:
- Polls The Odds API every 40 seconds
- Gets live NCAA games from ESPN
- Matches team names intelligently
- Calculates PPM and confidence scores
- Logs everything to CSV
- Auto-stops 5 minutes after last live game ends

---

## 📊 MONITORING THROUGHOUT THE DAY

### Check Dashboard
- **Live Games**: http://localhost:3000
- Shows all active games with confidence scores
- Color-coded by confidence tier
- Updates every 30 seconds

### Check Terminal Logs
Monitor should show activity like:
```
INFO | Found 5 live games
INFO | Duke @ UNC: PPM=5.2, Confidence=78, Trigger=UNDER
INFO | Logged 5 polls to CSV
```

### Check CSV Logs
```bash
# See latest live polls
tail -20 data/ncaa_live_log.csv

# Count total polls today
grep "$(date +%Y-%m-%d)" data/ncaa_live_log.csv | wc -l
```

---

## 🎓 NCAA-SPECIFIC FEATURES ACTIVE

### ✅ Team Name Matching
The system intelligently handles NCAA team name variations:
- **ESPN**: "North Carolina Tar Heels"
- **Odds API**: "UNC"
- **KenPom**: "North Carolina"

All three will match correctly! 61 teams pre-mapped.

### ✅ Automatic Team Discovery
As monitor runs, it will:
- Find new team name variations
- Add them to the mapping database
- Save to `data/ncaa_team_mappings.json`

### ✅ PPM Threshold Analysis (Week 2+)
After 20+ completed games:
```bash
source venv/bin/activate
python generate_ppm_report.py --days 30
```

See `PPM_ANALYSIS_GUIDE.md` for full details.

---

## ⚠️ TROUBLESHOOTING

### No games showing in dashboard?
1. Check if NCAA games are actually live (ESPN.com)
2. Verify SPORT_MODE=ncaa in .env
3. Check monitor terminal for errors
4. Verify Odds API quota: https://the-odds-api.com/account/

### Team names not matching?
1. Check monitor logs for "No matching team found"
2. The system will still log unmatched games
3. Manually add mapping if needed (see below)

### API quota running low?
- Current quota: Check response headers in logs
- 40-second polling = ~90 requests/hour
- ~5.5 hours runtime per 500 requests
- Monitor will show remaining quota in logs

---

## 🔧 ADVANCED CONFIGURATION

### Add Team Mapping Manually
```bash
python -c "
from utils.team_name_matcher import get_team_matcher

matcher = get_team_matcher()
matcher.add_mapping('north carolina', 'Carolina')
matcher.add_mapping('louisiana state', 'LSU Tigers')
print('✅ Mappings added')
"
```

### Adjust PPM Threshold (After Analysis)
Edit `.env`:
```bash
# In config.py or via .env override
PPM_THRESHOLD_UNDER=4.5  # Default
# Change to 3.8 or 5.2 based on analysis
```

Restart monitor for changes to take effect.

### Change Poll Interval
Edit `config.py`:
```python
POLL_INTERVAL = 40  # seconds (default)
# Set to 60 for less API usage
# Set to 30 for more frequent updates
```

---

## 📈 DAILY REPORTS

### End of Day Summary
```bash
source venv/bin/activate
python generate_ppm_report.py --daily
```

Shows:
- Total games monitored
- Trigger rate
- PPM distribution
- Per-game details

### Export Data
```bash
# Export live log
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/export/live-log \
  -o live_log_$(date +%Y%m%d).csv

# Or just copy the file
cp data/ncaa_live_log.csv backups/log_$(date +%Y%m%d).csv
```

---

## 🎯 FIRST WEEK EXPECTATIONS

### Week 1 Goals
- ✅ Monitor runs successfully for full game days
- ✅ Team name matching works (check logs for errors)
- ✅ CSV logging is continuous
- ✅ Dashboard updates in real-time
- ✅ Confidence scores are being calculated

### Don't Expect Yet
- ❌ PPM threshold optimization (need 20+ games)
- ❌ Reliable ROI data (need larger sample)
- ❌ Perfect team matching (will improve over time)

### Data Collection Phase
**Focus**: Let the system run and collect data
**Don't**: Make threshold adjustments yet
**Do**: Review daily summaries to understand patterns

---

## 🔐 SECURITY NOTES

### Default Admin Credentials
```
Username: admin
Password: admin123
```

**⚠️ CHANGE THESE IMMEDIATELY** if exposing to internet!

### Change Admin Password
```bash
python -c "
from api.auth import create_user, delete_user
delete_user('admin')
create_user('admin', 'YOUR_SECURE_PASSWORD', is_admin=True)
print('✅ Password changed')
"
```

---

## 📞 QUICK REFERENCE COMMANDS

### Start Everything
```bash
# Terminal 1
source venv/bin/activate && python api/main.py

# Terminal 2
cd frontend && npm run dev

# Terminal 3
source venv/bin/activate && python monitor.py
```

### Check Status
```bash
# API health
curl http://localhost:8000/health

# Monitor is running?
ps aux | grep monitor.py

# Live games count
curl -s http://localhost:8000/api/games/live | grep count
```

### Stop Everything
```bash
# Ctrl+C in each terminal
# Or kill all:
pkill -f "python api/main.py"
pkill -f "python monitor.py"
pkill -f "npm run dev"
```

---

## 📋 POST-LAUNCH (Week 2+)

### Week 2 Tasks
- [ ] Run first PPM threshold analysis
- [ ] Review team name matching accuracy
- [ ] Check API quota usage patterns
- [ ] Analyze confidence score distribution

### Week 3 Tasks
- [ ] Consider threshold adjustments
- [ ] Add any missing team mappings
- [ ] Review and refine confidence weights
- [ ] Export data for external analysis

### Month 2
- [ ] Optimize system based on data
- [ ] Fine-tune confidence scoring
- [ ] Consider KenPom subscription for better stats
- [ ] Set up automated daily reports

---

## ✅ SYSTEM READY CONFIRMATION

Run this final check before Monday:

```bash
source venv/bin/activate && python -c "
import config
from utils.team_name_matcher import get_team_matcher

print('=' * 60)
print('NCAA BASKETBALL BETTING MONITOR - LAUNCH READY CHECK')
print('=' * 60)

checks = {
    'Sport Mode': config.SPORT_MODE == 'ncaa',
    'API Key Set': bool(config.ODDS_API_KEY),
    'PPM Threshold': config.PPM_THRESHOLD == 4.5,
    'Poll Interval': config.POLL_INTERVAL == 40,
    'Team Matcher': len(get_team_matcher().mappings) >= 60,
}

all_ready = all(checks.values())

for check, status in checks.items():
    symbol = '✅' if status else '❌'
    print(f'{symbol} {check}: {status}')

print('=' * 60)
if all_ready:
    print('🚀 SYSTEM READY FOR MONDAY LAUNCH!')
else:
    print('⚠️  Some checks failed - review above')
print('=' * 60)
"
```

---

## 🎊 LAUNCH DAY - YOU'RE READY!

**Everything is configured and tested.**

**Monday morning checklist**:
1. ☕ Get coffee
2. 🖥️ Start API (Terminal 1)
3. 🌐 Start Frontend (Terminal 2)
4. 🔄 Start Monitor (Terminal 3)
5. 🏀 Wait for games to start
6. 📊 Watch the data roll in!

**Good luck! 🍀**

---

## 📞 Support Resources

- **Main Documentation**: `NBA_OVER_UNDER_DASHBOARD.md`
- **PPM Analysis Guide**: `PPM_ANALYSIS_GUIDE.md`
- **Team Matcher Tests**: `test_team_matcher.py`
- **Config Reference**: `config.py`
- **API Documentation**: http://localhost:8000/docs (when running)

**System designed and built**: October 2025
**Ready for**: NCAA Basketball 2025-26 Season
**Status**: Production Ready ✅

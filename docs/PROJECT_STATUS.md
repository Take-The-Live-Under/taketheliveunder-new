# Project Status - Basketball Betting Monitor

**Last Updated:** October 25, 2025
**Status:** ✅ 75% Complete (3 of 4 components working)

---

## ✅ What's Working (Ready to Use)

### 1. Live Game Monitor ✅
- ✅ Polls The Odds API every 20 seconds
- ✅ Gets accurate game clock from ESPN
- ✅ Calculates required PPM (Points Per Minute)
- ✅ Detects OVER and UNDER betting opportunities
- ✅ Smart confidence scoring (0-100)
- ✅ Unit recommendations (0.5, 1, 2, 3 units)
- ✅ Logs everything to CSV files
- ✅ Works for both NBA and NCAA

**How to start:**
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python monitor.py
```

---

### 2. API Server ✅
- ✅ Serves data to dashboard
- ✅ Live games endpoint
- ✅ Triggered games endpoint
- ✅ Performance analytics
- ✅ CSV export endpoints
- ✅ Runs on http://localhost:8000

**How to start:**
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python -m api.main
```

---

### 3. Web Dashboard ✅
- ✅ Real-time updates every 20 seconds
- ✅ Color-coded betting recommendations
  - 🟢 GREEN = OVER bets
  - 🔵 BLUE = UNDER bets
- ✅ Confidence scores and unit sizing
- ✅ Projected final scores
- ✅ Filter: All Games vs Triggered Only
- ✅ Clean, modern interface
- ✅ Works on http://localhost:3000

**How to start:**
```bash
cd /Users/brookssawyer/Desktop/basketball-betting/frontend
npm run dev
```

---

## ⏳ What's Built But Not Configured

### 4. Daily Email Reports ⏳
- ✅ Code is written
- ✅ Analysis logic complete
- ✅ HTML email template ready
- ❌ Gmail app password NOT configured
- ❌ Not tested yet

**What it will do:**
- Email you every morning at 9 AM
- Shows yesterday's performance
- Win/loss record, units profit, ROI
- Best and worst bets
- Performance by bet type (OVER/UNDER)
- Performance by confidence tier

**To finish (next session):**
1. Get Gmail app password
2. Add to `.env` file
3. Test with `python daily_scheduler.py --now`
4. Run scheduler 24/7

---

## 📊 Current Configuration

### Sport Mode:
```
NBA (for testing - change to NCAA when season starts)
```

### Betting Thresholds:
```
UNDER: Required PPM > 4.5 (need to score fast = under is good)
OVER: Required PPM < 1.5 (scoring fast already = over is good)
```

### Confidence Tiers:
```
0-40:   NO BET (don't bet)
41-60:  LOW (0.5 units)
61-75:  MEDIUM (1 unit)
76-85:  HIGH (2 units)
86-100: MAX (3 units)
```

### Refresh Rate:
```
Monitor polls games: Every 20 seconds
Dashboard updates: Every 20 seconds
```

### API Keys:
```
The Odds API: a54ddf24de4903decd6af619d4bdff5a ✅
KenPom: Not being used (ESPN free data instead) ⏸️
```

---

## 📁 Important Files

### Configuration:
- **`.env`** - Your settings and API keys
- **`config.py`** - System configuration

### Data Files:
- **`data/nba_live_log.csv`** - Every poll logged
- **`data/nba_results.csv`** - Final game results
- **`data/team_stats.csv`** - Cached team stats

### Documentation:
- **`HOW_TO_USE.md`** - Complete beginner's guide ⭐ READ THIS
- **`PROJECT_STATUS.md`** - This file (project status)
- **`DAILY_REPORTS_SETUP.md`** - Email setup guide (for next session)
- **`CLAUDE.md`** - Technical documentation

### Code:
- **`monitor.py`** - Main monitoring script
- **`api/main.py`** - API server
- **`frontend/`** - Web dashboard
- **`daily_scheduler.py`** - Email scheduler (not running yet)
- **`utils/`** - All the smart logic

---

## 🎯 Tomorrow's Checklist

### To Start Using:

1. **Open Terminal 1** - Start API
   ```bash
   cd /Users/brookssawyer/Desktop/basketball-betting
   source venv/bin/activate
   python -m api.main
   ```

2. **Open Terminal 2** - Start Monitor
   ```bash
   cd /Users/brookssawyer/Desktop/basketball-betting
   source venv/bin/activate
   python monitor.py
   ```

3. **Open Terminal 3** - Start Dashboard
   ```bash
   cd /Users/brookssawyer/Desktop/basketball-betting/frontend
   npm run dev
   ```

4. **Open Browser**
   - Go to: http://localhost:3000
   - Watch live games and betting opportunities!

---

## 🔧 To Complete (Next Session)

### Email Reports:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Create App Password for "Basketball Betting"
4. Update `.env` file:
   ```
   EMAIL_FROM=brookssawyer@gmail.com
   EMAIL_PASSWORD=your-16-char-password-here
   ```
5. Test: `python daily_scheduler.py --now`

---

## 💡 Key Features

### Smart Analysis Factors:
- ✅ Team pace (possessions per game)
- ✅ Defensive efficiency
- ✅ 3-point shooting volume and accuracy
- ✅ Free throw rate
- ✅ Turnover rate
- ✅ Pace matchups (slow vs slow, fast vs fast, etc.)
- ✅ Current game flow vs expected

### What Makes It Unique:
- Dual API integration (The Odds + ESPN)
- Accurate game clock (not estimated)
- OVER and UNDER detection
- Color-coded recommendations
- Projected final scores
- Live updates every 20 seconds
- Comprehensive CSV logging
- Beautiful web dashboard

---

## 📈 Performance Tracking

All betting results are logged to CSV files. You can:
- Open `data/nba_results.csv` in Excel
- See every bet recommendation
- Check win/loss record
- Calculate your ROI
- Analyze which confidence tiers perform best

Once emails are set up, you'll get this automatically every morning!

---

## 🆘 Quick Help

### Dashboard won't load?
- Make sure all 3 terminals are running
- Check http://localhost:3000

### No games showing?
- Make sure there are live NBA games right now
- Check The Odds API is working (monitor.py will show errors)

### No triggered games?
- This is NORMAL - system is selective
- Click "All Games" to see what's being monitored
- Most games won't trigger (that's good!)

### Need to stop?
- Press `Ctrl + C` in each terminal
- Close the windows

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   THE ODDS API                       │
│              (Live Games + Betting Odds)             │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ Every 20 seconds
                       ▼
┌─────────────────────────────────────────────────────┐
│                    MONITOR.PY                        │
│                                                      │
│  1. Fetch live games and odds                       │
│  2. Get accurate clock from ESPN                    │
│  3. Fetch team stats (ESPN/KenPom)                  │
│  4. Calculate required PPM                          │
│  5. Detect OVER/UNDER opportunities                 │
│  6. Calculate confidence score                      │
│  7. Log to CSV                                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ Writes to
                       ▼
┌─────────────────────────────────────────────────────┐
│                  CSV FILES                           │
│  • nba_live_log.csv (every poll)                    │
│  • nba_results.csv (final results)                  │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ Reads from
                       ▼
┌─────────────────────────────────────────────────────┐
│                   API SERVER                         │
│              (FastAPI on port 8000)                  │
│                                                      │
│  Endpoints:                                          │
│  • GET /api/games/live                              │
│  • GET /api/games/triggered                         │
│  • GET /api/stats/performance                       │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ HTTP requests
                       │ Every 20 seconds
                       ▼
┌─────────────────────────────────────────────────────┐
│               WEB DASHBOARD                          │
│           (Next.js on port 3000)                     │
│                                                      │
│  Shows:                                              │
│  • Live games with scores                           │
│  • OVER/UNDER recommendations                       │
│  • Confidence scores                                │
│  • Unit sizing                                      │
│  • Projected final scores                           │
└─────────────────────────────────────────────────────┘

                    (COMING SOON)
                         ↓
┌─────────────────────────────────────────────────────┐
│              DAILY SCHEDULER                         │
│         (Runs 9 AM every morning)                    │
│                                                      │
│  1. Read yesterday's results from CSV               │
│  2. Calculate win rate, ROI, profit                 │
│  3. Generate HTML email report                      │
│  4. Send to brookssawyer@gmail.com                  │
└─────────────────────────────────────────────────────┘
```

---

## ✨ Summary

You have built a **professional-grade live betting monitoring system** that:

✅ Monitors live games in real-time
✅ Uses advanced analytics to find opportunities
✅ Provides clear betting recommendations
✅ Beautiful web interface
✅ Comprehensive data logging

**You're 75% done!** Just need to finish email setup next session.

---

**Next Session: Set up daily email reports (15 minutes)**

Read `HOW_TO_USE.md` for detailed instructions.
Read `DAILY_REPORTS_SETUP.md` for email setup steps.

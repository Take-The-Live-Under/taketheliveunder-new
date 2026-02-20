# 🏀 START HERE - 3 SIMPLE STEPS

## ⚡ QUICK START (Copy & Paste These Commands)

### 1️⃣ Open Terminal #1 - Start API

```bash
cd /Users/brookssawyer/Desktop/basketball-betting && source venv/bin/activate && python api/main.py
```

✅ **Wait for**: `Uvicorn running on http://0.0.0.0:8000`

---

### 2️⃣ Open Terminal #2 - Start Dashboard

```bash
cd /Users/brookssawyer/Desktop/basketball-betting/frontend && npm run dev
```

✅ **Wait for**: `✓ Ready in Xs`
🌐 **Then open**: http://localhost:3001

---

### 3️⃣ Open Terminal #3 - Start Monitor

```bash
cd /Users/brookssawyer/Desktop/basketball-betting && source venv/bin/activate && python monitor.py
```

✅ **Watch**: Live game updates every 40 seconds

---

## 📊 YOUR DATA SPREADSHEET

**Every 40 seconds**, the system logs ALL games (even non-triggers) to:

```
/Users/brookssawyer/Desktop/basketball-betting/data/ncaa_live_log.csv
```

**Open in Excel**:
```bash
open data/ncaa_live_log.csv
```

**29 columns per row** including:
- Timestamp, teams, scores, period, time
- O/U line, required PPM, current PPM
- Team stats (pace, 3P rate, defense)
- Confidence score, unit recommendation
- Trigger flag (TRUE/FALSE)

---

## 🎯 WHAT IT DOES

✅ Monitors **ALL D1 basketball games** (not just top 25)
✅ Polls ESPN every 40 seconds
✅ Gets betting lines from The Odds API
✅ Matches 350+ NCAA team names intelligently
✅ Calculates confidence scores (0-100)
✅ **Logs EVERY poll to CSV** for your review
✅ Shows triggers on dashboard
✅ Auto-stops 5 minutes after games end

---

## 📖 FULL DOCUMENTATION

**Complete Instructions**: `RUN_INSTRUCTIONS.md`
**Monday Launch Guide**: `MONDAY_LAUNCH_CHECKLIST.md`
**Quick Start**: `MONDAY_QUICK_START.md`

---

## 🛑 TO STOP

Press `Ctrl+C` in each terminal window

---

**That's it! You're ready to monitor games! 🏀**

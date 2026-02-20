# Quick Start Guide - Basketball Betting Monitor

## 🚀 How to Start Tomorrow (Copy & Paste These)

### Step 1: Open Terminal #1 - Start API Server
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python -m api.main
```
✅ You should see: `Uvicorn running on http://0.0.0.0:8000`
**LEAVE THIS RUNNING**

---

### Step 2: Open Terminal #2 - Start Monitor
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python monitor.py
```
✅ You should see: `Starting NCAA Basketball Betting Monitor`
**LEAVE THIS RUNNING**

---

### Step 3: Open Terminal #3 - Start Dashboard
```bash
cd /Users/brookssawyer/Desktop/basketball-betting/frontend
npm run dev
```
✅ You should see: `Local: http://localhost:3000`
**LEAVE THIS RUNNING**

---

### Step 4: Open Your Browser
Go to: **http://localhost:3000**

---

## 🎯 What You'll See

### Game Cards Show:
- **Teams and Scores**
- **Time Remaining**
- **Bet Type:**
  - 🟢 **GREEN = OVER** (game scoring fast)
  - 🔵 **BLUE = UNDER** (game scoring slow)
- **Confidence Score** (0-100)
- **Units to Bet:**
  - 0.5 units = Low confidence
  - 1 unit = Medium confidence
  - 2 units = High confidence
  - 3 units = MAX confidence
- **Projected Final Score**

---

## 🛑 How to Stop

1. Go to each Terminal window
2. Press `Ctrl + C`
3. Close the window

---

## 📚 More Info

- **`HOW_TO_USE.md`** - Complete beginner's guide
- **`PROJECT_STATUS.md`** - What's done, what's left
- **`DAILY_REPORTS_SETUP.md`** - Email setup (next session)

---

## ✅ Status

- ✅ Monitor working
- ✅ API working
- ✅ Dashboard working
- ⏳ Email reports (next session)

**You're 75% done!**

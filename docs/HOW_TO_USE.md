# Basketball Betting Monitor - Complete Guide
## What You Have Built

You now have a **4-part intelligent betting system** that monitors live NBA and NCAA basketball games and tells you when to bet:

### The 4 Parts:
1. **Monitor** - Watches live games every 20 seconds and finds betting opportunities
2. **API Server** - Stores and serves data to your dashboard
3. **Web Dashboard** - Beautiful interface to see live games and betting recommendations
4. **Daily Email Reports** - Sends you a summary email each morning (NOT YET ACTIVE - we'll finish this next time)

---

## What It Does (In Simple Terms)

### Real-Time Game Monitoring:
- Checks live NBA/NCAA games every 20 seconds
- Looks at the current score and how much time is left
- Calculates if the game is scoring too fast or too slow
- Compares it to the betting line (over/under)

### Smart Betting Alerts:
When it finds a good opportunity, it shows you:
- **OVER bets** (when the game is scoring FAST) - shown in GREEN
- **UNDER bets** (when the game is scoring SLOW) - shown in BLUE
- **Confidence Score** (0-100) - how confident we are
- **Unit Recommendation** (0.5, 1, 2, or 3 units) - how much to bet

### Smart Analysis:
The system looks at:
- Team pace (do they play fast or slow?)
- Defense quality (do they prevent scoring?)
- 3-point shooting (do they take lots of 3s?)
- Free throw rates
- Turnovers
- And more...

Then it calculates a confidence score and tells you if it's a good bet.

---

## How to Start Everything Tomorrow

You need **4 separate Terminal windows** running at the same time. Here's exactly what to do:

### Terminal 1: Start the API Server

1. Open Terminal
2. Copy and paste this EXACTLY:
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python -m api.main
```
3. Press Enter
4. You should see: `Uvicorn running on http://0.0.0.0:8000`
5. **LEAVE THIS RUNNING** - minimize the window but don't close it

### Terminal 2: Start the Monitor

1. Open a NEW Terminal window (File → New Window)
2. Copy and paste this EXACTLY:
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python monitor.py
```
3. Press Enter
4. You should see: `Starting NCAA Basketball Betting Monitor`
5. **LEAVE THIS RUNNING** - minimize the window but don't close it

### Terminal 3: Start the Web Dashboard

1. Open a NEW Terminal window (File → New Window)
2. Copy and paste this EXACTLY:
```bash
cd /Users/brookssawyer/Desktop/basketball-betting/frontend
npm run dev
```
3. Press Enter
4. You should see: `Local: http://localhost:3000`
5. **LEAVE THIS RUNNING** - minimize the window but don't close it

### Terminal 4: Daily Email Scheduler (OPTIONAL - NOT SET UP YET)

**SKIP THIS FOR NOW - We'll set this up in the next session**

This will be the 4th part that sends you daily performance emails.

---

## How to Use the Dashboard

### Open the Dashboard:
1. Open your web browser (Chrome, Safari, etc.)
2. Go to: `http://localhost:3000`

### What You'll See:

#### Top of Page:
- **Total Games** - How many games are currently being watched
- **Triggered Games** - How many betting opportunities found
- **Filter Buttons:**
  - "All Games" - Shows every live game
  - "Triggered Only" - Shows only games with betting opportunities

#### Game Cards:
Each game shows:
- **Team names and scores**
- **Time remaining** (updates every 20 seconds)
- **Current total points**
- **Over/Under line** (the betting line from sportsbooks)
- **Required PPM** (Points Per Minute needed to hit the line)
- **Current PPM** (Points Per Minute the game is actually scoring)
- **Projected Final Score** (if they keep this pace, what will the final score be?)
- **Bet Type Badge:**
  - 🟢 **GREEN "OVER"** - Game is scoring fast, bet the OVER
  - 🔵 **BLUE "UNDER"** - Game is scoring slow, bet the UNDER
- **Confidence Score** (0-100)
- **Unit Recommendation:**
  - 0.5 units = Low confidence (41-60 score)
  - 1 unit = Medium confidence (61-75 score)
  - 2 units = High confidence (76-85 score)
  - 3 units = MAX confidence (86-100 score)

#### How to Read a Game:

Example:
```
Lakers vs Celtics
Q3 - 8:23 remaining
Lakers 85, Celtics 79
Total: 164 | O/U: 225.5
Required PPM: 7.4 | Current PPM: 19.5
Projected Final: 238.7 (OVER)

🟢 OVER | 78/100 | 2 UNITS
```

**What this means:**
- Game is in the 3rd quarter with 8 minutes 23 seconds left
- Current total is 164 points
- The betting line is 225.5 (over/under)
- They need to score 7.4 points per minute to hit the over
- They're ACTUALLY scoring 19.5 points per minute (way faster!)
- If they keep this pace, final score will be 238.7 (over the 225.5 line)
- **Recommendation: Bet OVER with 2 units** (78/100 confidence = HIGH)

---

## Understanding the Thresholds

### When Does It Trigger?

**UNDER Trigger:** Required PPM > 4.5
- Meaning: They need to score MORE than 4.5 points per minute
- Why this matters: If they need to score fast but they're NOT, bet UNDER

**OVER Trigger:** Required PPM < 1.5
- Meaning: They only need to score LESS than 1.5 points per minute
- Why this matters: If they barely need to score but they're scoring FAST, bet OVER

### Color Coding:
- 🟢 **GREEN** = OVER bet (game scoring fast)
- 🔵 **BLUE** = UNDER bet (game scoring slow)

### Confidence Tiers:
- **0-40** = NO BET (don't bet, not confident enough)
- **41-60** = LOW (0.5 units) - small bet
- **61-75** = MEDIUM (1 unit) - standard bet
- **76-85** = HIGH (2 units) - confident bet
- **86-100** = MAX (3 units) - very confident bet

---

## Current Settings

### Sport Mode:
- **Currently set to: NBA** (for testing since NCAA season hasn't started)
- Located in `.env` file: `SPORT_MODE=nba`
- Can change to `ncaa` when season starts

### Data Sources:
- **Live Games & Odds:** The Odds API (updates every 20 seconds)
- **Game Clock:** ESPN API (accurate time remaining)
- **Team Stats:** ESPN (free) - can upgrade to KenPom ($20/year) for NCAA

### API Key:
- Currently using: `a54ddf24de4903decd6af619d4bdff5a`
- This is a higher-limit tier key you provided

### Refresh Rate:
- Dashboard refreshes every **20 seconds** automatically
- Monitor polls live games every **20 seconds**

---

## Files & Data

### Where Data is Stored:

**`data/` folder** contains:
- `nba_live_log.csv` - Every single poll logged (every 20 seconds per game)
- `nba_results.csv` - Final results of games (did our bet win/lose?)
- `team_stats.csv` - Cached team statistics

You can open these in Excel or Google Sheets to analyze performance.

### Where Settings Are:

**`.env` file** contains:
- API keys
- Email settings (not configured yet)
- Sport mode (NBA/NCAA)

**`config.py` file** contains:
- Confidence scoring weights
- PPM thresholds
- Unit sizing rules
- All system settings

---

## What's NOT Done Yet (Next Session)

### Email Reports Setup:
The 4th component (daily email reports) is built but NOT configured. Next time we'll:

1. Get a Gmail "App Password" (special password for automated emails)
2. Add it to your `.env` file
3. Test the email system
4. Set it to run every morning at 9 AM

The email will show:
- Yesterday's win/loss record
- Total profit/loss in units
- Win rate percentage
- Best and worst bets
- Performance by bet type (OVER vs UNDER)
- Performance by confidence level

---

## Troubleshooting

### Nothing showing up in dashboard?
1. Check that all 3 terminals are running
2. Make sure there are actually live NBA games right now
3. Check http://localhost:3000 in your browser

### Dashboard says "Failed to fetch"?
- The API server (Terminal 1) is not running
- Go to Terminal 1 and make sure you see `Uvicorn running`

### No games are triggering?
- This is normal! The system only alerts when it finds good opportunities
- Click "All Games" to see all live games being monitored
- Most games won't trigger - that's a good thing (quality over quantity)

### Need to stop everything?
- Go to each Terminal window
- Press `Ctrl + C` to stop the program
- Close the Terminal window

### Need to restart tomorrow?
- Just follow the "How to Start Everything Tomorrow" section above
- Start all 3 terminals again

---

## Quick Reference Commands

### Start Everything:
```bash
# Terminal 1 - API
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python -m api.main

# Terminal 2 - Monitor
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python monitor.py

# Terminal 3 - Dashboard
cd /Users/brookssawyer/Desktop/basketball-betting/frontend
npm run dev
```

### View Dashboard:
- Open browser to: http://localhost:3000

### Stop Everything:
- Press `Ctrl + C` in each Terminal window

---

## Files to Reference

- **THIS FILE** (`HOW_TO_USE.md`) - Overall guide
- **`DAILY_REPORTS_SETUP.md`** - Email setup guide (for next session)
- **`CLAUDE.md`** - Technical documentation for developers
- **`.env`** - Your settings and API keys

---

## What Makes This System Smart?

Instead of just looking at basic stats, it analyzes:

1. **Pace Matchup** - Are both teams slow? Both fast? Mismatch?
2. **Defensive Strength** - Do they prevent scoring?
3. **Shooting Style** - Do they take lots of 3s? (volatile)
4. **Free Throw Rate** - Do they get to the line a lot? (slows game)
5. **Turnover Rate** - Do they turn it over? (fewer possessions)
6. **Current Game Flow** - Is the game actually playing out as expected?

All of this gets combined into a single confidence score (0-100) and a unit recommendation.

---

## Remember:

✅ **3 Terminals must be running** (API, Monitor, Dashboard)
✅ **Dashboard is at** http://localhost:3000
✅ **Green = OVER, Blue = UNDER**
✅ **Higher confidence = more units**
✅ **Data refreshes every 20 seconds**
✅ **All data saved to CSV files**

❌ **Email reports NOT set up yet** (next session)

---

## Next Session Goals:

1. Set up Gmail App Password
2. Configure email in `.env` file
3. Test daily report email
4. Start the 4th terminal (daily scheduler)

---

## Questions?

When you come back tomorrow:
1. Read this guide
2. Start the 3 terminals (API, Monitor, Dashboard)
3. Open http://localhost:3000 in your browser
4. Watch it work!

Everything else is automatic. The system will monitor games, calculate opportunities, and show you what to bet. 🏀📊

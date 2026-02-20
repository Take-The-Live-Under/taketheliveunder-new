# Daily Performance Reports - Setup Guide

## Overview

The daily reporting system analyzes your betting performance from the previous day and emails you a comprehensive summary each morning at 9:00 AM (configurable).

## What's Included in the Report

### Overall Performance
- **Total Triggers**: Number of bet recommendations made
- **Win/Loss/Push Record**: Your daily record
- **Win Rate**: Percentage of winning bets
- **Units Profit/Loss**: Net profit or loss in units
- **ROI**: Return on investment percentage
- **Units Risked**: Total units wagered

### Detailed Breakdowns
- **Performance by Bet Type**: OVER vs UNDER win rates and profits
- **Performance by Confidence Tier**: How each confidence level performed (MAX, HIGH, MEDIUM, LOW)
- **Best Performing Bets**: Top 3 most profitable bets with details
- **Worst Performing Bets**: Bottom 3 bets to learn from

## Setup Instructions

### Step 1: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left navigation
3. Enable "2-Step Verification" if not already enabled
4. Search for "App passwords" and click it
5. Click "Select app" → "Other (Custom name)"
6. Enter "Basketball Betting Monitor"
7. Click "Generate"
8. **Copy the 16-character password** (you'll only see this once)

### Step 2: Configure Email Settings

Edit your `.env` file and update these values:

```env
# Email Configuration
EMAIL_ENABLED=true
EMAIL_FROM=your-email@gmail.com          # Your Gmail address
EMAIL_TO=brookssawyer@gmail.com          # Where to send reports (already set)
EMAIL_SMTP_SERVER=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx       # 16-char app password from Step 1
DAILY_REPORT_TIME=09:00                  # When to send (HH:MM format, 24-hour)
```

### Step 3: Run the Scheduler

The scheduler runs as a **4th separate process** alongside your monitor, API, and frontend.

**To start it:**
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python daily_scheduler.py
```

**To test it immediately (without waiting until 9 AM):**
```bash
python daily_scheduler.py --now
```

This will generate and send a report right away based on yesterday's data.

### Step 4: Keep It Running

To receive daily emails, keep the `daily_scheduler.py` process running 24/7.

**Option 1: Run in Background (macOS/Linux)**
```bash
nohup python daily_scheduler.py > logs/scheduler.log 2>&1 &
```

**Option 2: Use PM2 (Recommended)**
```bash
npm install -g pm2
pm2 start daily_scheduler.py --name betting-reports --interpreter python
pm2 save
pm2 startup  # Follow instructions to start on boot
```

**Option 3: Add to Your Startup Script**
Add this to your startup script alongside the monitor:
```bash
# Terminal 4 - Daily Reports
source venv/bin/activate
python daily_scheduler.py
```

## How It Works

1. **Data Collection**: The monitor logs all game data to CSV files during the day
2. **Analysis**: Each morning at 9 AM, the scheduler:
   - Reads yesterday's game results from `data/ncaa_results.csv` (or `nba_results.csv`)
   - Calculates win rate, ROI, and performance metrics
   - Identifies best and worst performing bets
3. **Email Generation**: Creates a beautiful HTML email with all stats
4. **Delivery**: Sends via Gmail SMTP to your inbox

## Sample Report

Your email will look like this:

```
Subject: 🏀 Daily Betting Report - 2025-10-25 | 5-2-1 | +3.50u

─────────────────────────────────
📊 OVERALL PERFORMANCE
─────────────────────────────────
Total Triggers: 8
Win Rate: 62.5%
Units Profit: +3.50
ROI: +43.8%
Record: 5-2-1

─────────────────────────────────
📊 PERFORMANCE BY BET TYPE
─────────────────────────────────
UNDER: 4 wins, +2.50u
OVER: 1 wins, +1.00u

─────────────────────────────────
🎯 PERFORMANCE BY CONFIDENCE
─────────────────────────────────
HIGH (76-85): 2 wins, +2.00u
MEDIUM (61-75): 2 wins, +1.50u
LOW (41-60): 1 wins, +0.00u

✅ BEST BETS
✅ WORST BETS
```

## Troubleshooting

### Email Not Sending

**Check logs:**
```bash
tail -f logs/monitor.log | grep -i email
```

**Common issues:**
1. **Wrong app password**: Make sure you're using the 16-char app password, not your regular Gmail password
2. **2FA not enabled**: Gmail requires 2-factor authentication for app passwords
3. **EMAIL_ENABLED=false**: Check your `.env` file
4. **Firewall blocking port 587**: Check your network settings

### No Data in Report

If the report says "No games found":
- Check that games were actually logged yesterday
- Verify CSV files exist: `ls -la data/`
- Make sure the monitor ran and logged completed games

### Test Without Waiting

To test immediately:
```bash
python daily_scheduler.py --now
```

This generates a report for yesterday's data and sends it right away.

## Customization

### Change Report Time

Edit `.env`:
```env
DAILY_REPORT_TIME=08:30  # Send at 8:30 AM
DAILY_REPORT_TIME=21:00  # Send at 9:00 PM
```

### Change Email Recipients

Edit `.env`:
```env
EMAIL_TO=email1@gmail.com,email2@yahoo.com  # Multiple recipients (coming soon)
```

### Disable Reports

Edit `.env`:
```env
EMAIL_ENABLED=false
```

The scheduler will still run but won't send emails.

## File Structure

```
/
├── daily_scheduler.py           # 4th process - runs scheduler
├── utils/
│   └── daily_report.py          # Report generation logic
├── data/
│   ├── ncaa_results.csv         # Game results (source data)
│   └── nba_results.csv
├── logs/
│   └── monitor.log              # Check for email sending logs
└── .env                         # Email configuration
```

## What's Next

Once you have this running, you'll receive a detailed performance report every morning at 9 AM with:
- Your daily record and profit/loss
- What's working (best bets, best confidence tiers)
- What's not working (worst bets, areas to improve)
- All the data you need to refine your strategy

This helps you:
1. **Track performance** without manually checking CSVs
2. **Identify patterns** (are OVER bets better than UNDER? Are HIGH confidence bets performing?)
3. **Stay disciplined** with daily accountability
4. **Improve your system** based on data-driven insights

Happy betting! 🏀📊

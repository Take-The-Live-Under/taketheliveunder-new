# PPM Analysis System - Quick Reference Guide

## System Status: ✅ READY FOR DATA

The PPM threshold analysis system is fully built and waiting for completed game results. Once you have 10+ completed games in `data/ncaa_results.csv`, you can start using these reports to optimize your model.

---

## 📊 Available Reports

### 1. PPM Threshold Analysis (Recommended after 20+ games)

**Purpose**: Find the optimal PPM threshold by analyzing performance at every 0.1 increment

**Command**:
```bash
source venv/bin/activate
python generate_ppm_report.py --days 30
```

**What it shows**:
- Performance at 95 different PPM thresholds (0.5 to 10.0)
- Win rate, ROI, sample size at each level
- **Optimal threshold recommendation** based on:
  - Highest ROI with ≥10 samples
  - Best risk-adjusted returns
  - Highest win rate with positive ROI
- Color-coded performance indicators

**Use case**: "Should I keep 4.5 PPM or adjust to 3.8? Or 5.2?"

**Sample output**:
```
====================================================================================================
PPM THRESHOLD ANALYSIS - Last 30 Days
Total Games Analyzed: 45
====================================================================================================

🎯 OPTIMAL THRESHOLD: 3.8 PPM
   Reason: Highest ROI (18.5%) with 23 samples

💰 Best ROI: 3.8 PPM
   ROI: 18.5% | Win Rate: 65.2% | Triggers: 23

🏆 Best Win Rate: 4.2 PPM
   Win Rate: 70.0% | ROI: 15.2% | Triggers: 15

----------------------------------------------------------------------------------------------------
Threshold    Triggers   W-L-P           Win%     Avg Conf   Units      Profit     ROI%
----------------------------------------------------------------------------------------------------
3.5          32         18-12-2         60.0     68.3       45.5       🟢 7.25    15.9
3.8          23         15-7-1          68.2     71.2       32.0       🟢 5.92    18.5
4.0          19         12-6-1          66.7     73.1       26.5       🟢 4.15    15.7
4.5          12         7-4-1           63.6     78.5       18.0       🟡 2.10    11.7
5.0          8          5-3-0           62.5     82.1       12.5       🟡 1.25    10.0
====================================================================================================
```

---

### 2. Daily Summary Report

**Purpose**: Review today's (or any day's) monitoring activity

**Command**:
```bash
# Today's summary
python generate_ppm_report.py --daily

# Specific date
python generate_ppm_report.py --daily --date 2025-10-29
```

**What it shows**:
- Total games monitored
- Total polls conducted
- Trigger rate (what % of games triggered)
- PPM distribution histogram
- Per-game breakdown:
  - PPM range (min/max/average)
  - Max confidence score
  - Whether it triggered and bet type
  - Final score vs O/U line

**Use case**: "How active was the system today? Did we see a lot of high-PPM situations?"

**Sample output**:
```
================================================================================
DAILY SUMMARY - 2025-10-29
================================================================================

Games Monitored: 8
Total Polls: 356
Triggers: 5 (62.5%)

📊 PPM Distribution:
  0.0-1.0    ███████ 35
  1.1-2.0    █████ 25
  2.1-3.0    ███ 15
  3.1-4.0    ██ 10
  4.1-5.0    █ 8
  5.1-6.0    ▌ 3

--------------------------------------------------------------------------------
Game Details:
--------------------------------------------------------------------------------
🚨 Duke @ North Carolina
   Line: 145.5 | Final: 138
   PPM Range: 2.1 - 5.8 (avg: 3.6)
   Polls: 47 | Max Confidence: 78.5
   ✅ Triggered: UNDER

   Louisville @ Syracuse
   Line: 150.0 | Final: 152
   PPM Range: 1.2 - 3.1 (avg: 2.3)
   Polls: 44 | Max Confidence: 42.1

================================================================================
```

---

### 3. Export to JSON

**Purpose**: Feed analysis data into Excel, Python scripts, or dashboards

**Commands**:
```bash
# Export threshold analysis
python generate_ppm_report.py --days 30 --export analysis.json

# Export daily summary
python generate_ppm_report.py --daily --export today.json
```

**Use case**: Custom analysis, visualization, record-keeping

---

## 🔧 API Endpoints (for Dashboard Integration)

### PPM Threshold Analysis
```
GET /api/stats/ppm-analysis?days=30
Authorization: Bearer <token>
```

Returns JSON with full analysis data.

### Daily Summary
```
GET /api/stats/daily-summary?date=2025-10-29
Authorization: Bearer <token>
```

Returns JSON with daily monitoring summary.

---

## 📅 Recommended Usage Timeline

### Week 1-2 (First 10-20 games)
- Run daily summaries to monitor system activity
- Check PPM distributions to see typical ranges
- **Don't adjust threshold yet** - not enough data

### Week 3-4 (20-40 games)
- Start running threshold analysis weekly
- Look for patterns in optimal thresholds
- Compare current 4.5 PPM to recommendations
- Consider small adjustments (±0.2 PPM)

### Month 2+ (40+ games)
- Run threshold analysis bi-weekly
- Confident threshold optimization
- Track ROI improvements
- Fine-tune confidence weights based on findings

---

## 🎯 How to Interpret Results

### When to LOWER the threshold (e.g., 4.5 → 3.8):
- Lower thresholds show significantly better ROI
- Sample sizes are adequate (20+ triggers)
- You want more betting opportunities
- Win rate is solid at lower levels (>55%)

### When to RAISE the threshold (e.g., 4.5 → 5.2):
- Higher thresholds show better win rates
- Current threshold has marginal ROI (<5%)
- You want fewer, higher-quality bets
- Confidence at higher levels is exceptional (>80)

### When to KEEP the threshold:
- Current threshold is within top 3 performers
- ROI is positive and competitive (>10%)
- Sample size at current level is strong
- Risk-adjusted returns look good

---

## 📁 Data Files

**Live polling data**: `data/ncaa_live_log.csv`
- Every 40-second poll logged here
- Includes PPM, confidence, scores, time remaining

**Game results**: `data/ncaa_results.csv`
- Final outcomes logged here when games complete
- **This is what PPM analysis reads**
- Format: game_id, date, teams, scores, O/U result, outcome, profit

**Backup**: `data/ncaa_live_log_backup_*.csv`
- Automatic backups created daily

---

## ⚠️ Important Notes

1. **Minimum sample sizes matter**
   - Analysis requires ≥10 triggers per threshold for recommendations
   - First week: expect "Continue collecting data" message
   - This is normal and expected

2. **Results must be finalized**
   - PPM analysis only works with completed games
   - Monitor must finish games and log to `ncaa_results.csv`
   - Live log alone won't generate analysis

3. **Time period selection**
   - Default: 30 days (recommended)
   - Shorter periods (7-14 days) for recent form
   - Longer periods (60-90 days) for seasonal trends

4. **Don't over-optimize**
   - Small differences in ROI may be variance
   - Focus on thresholds with strong sample sizes
   - Make changes gradually (0.2-0.5 PPM at a time)

---

## 🚀 Current System Configuration

- **Active PPM Threshold**: 4.5
- **Polling Interval**: 40 seconds
- **Kill Switch**: 5 minutes after last live game
- **Data Source**: The Odds API + ESPN
- **Confidence Scoring**: 11 weighted factors

**Next Steps**:
1. ✅ System monitoring live games
2. ⏳ Waiting for games to complete
3. ⏳ Results logged to CSV
4. 🎯 Run first analysis after 20+ games
5. 📊 Optimize threshold based on data

---

## 📞 Quick Commands Cheat Sheet

```bash
# Activate environment (always do this first)
source venv/bin/activate

# 30-day threshold analysis
python generate_ppm_report.py --days 30

# Today's daily summary
python generate_ppm_report.py --daily

# Yesterday's summary
python generate_ppm_report.py --daily --date 2025-10-28

# Export analysis to JSON
python generate_ppm_report.py --days 30 --export results.json

# Check how many completed games you have
wc -l data/ncaa_results.csv
# (Result - 1 = number of games, since line 1 is header)
```

---

**Status**: System ready. Collecting data. Analysis tools operational. 🎯

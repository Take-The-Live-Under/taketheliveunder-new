# KenPom Data Collection Bot

Automated bot that fetches, cleans, and archives KenPom team statistics daily.

## Features

- 🤖 **Automated data collection** from KenPom
- 🧹 **Data cleaning & validation**
- 📅 **Date-stamped archives** for historical tracking
- 📊 **Multiple formats** (CSV, Excel)
- 📝 **Detailed logging** of all operations
- 🗑️ **Auto-cleanup** of old files (30 day retention)

## Quick Start

### 1. Install Dependencies

```bash
pip install kenpompy pandas openpyxl
```

### 2. Set Your KenPom Password

```bash
export KENPOM_PASSWORD="your_kenpom_password"
```

Or add to your `.env` file:
```
KENPOM_PASSWORD=your_kenpom_password
```

### 3. Run the Bot Manually

```bash
python kenpom_data_bot.py
```

## Output Files

The bot creates files in `data/kenpom_historical/`:

- `cleaned_kenpom_data_YYYY-MM-DD_HHMMSS.csv` - Timestamped snapshot
- `cleaned_kenpom_data_YYYY-MM-DD.csv` - Latest for that day
- `cleaned_kenpom_data_latest.csv` - Always current (symlink equivalent)
- `cleaned_kenpom_data_YYYY-MM-DD_HHMMSS.xlsx` - Excel format

## Automated Scheduling

### macOS/Linux (cron)

1. Edit your crontab:
```bash
crontab -e
```

2. Add this line to run daily at 2 AM:
```bash
0 2 * * * cd /Users/brookssawyer/Desktop/basketball-betting && /bin/bash schedule_kenpom_bot.sh >> logs/kenpom_bot_cron.log 2>&1
```

3. Or use the helper command:
```bash
# Run daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && /bin/bash schedule_kenpom_bot.sh >> logs/kenpom_bot_cron.log 2>&1") | crontab -
```

### Manual Scheduling Options

**Run immediately:**
```bash
python kenpom_data_bot.py
```

**Run via bash script:**
```bash
./schedule_kenpom_bot.sh
```

**Run in background:**
```bash
nohup python kenpom_data_bot.py > logs/kenpom_bot_manual.log 2>&1 &
```

## What Gets Collected

The bot fetches:

- **Efficiency Ratings**: AdjOE, AdjDE, AdjEM
- **Tempo**: Adjusted tempo/pace
- **Four Factors**:
  - Offensive: eFG%, TO%, OR%, FTR
  - Defensive: eFG%, TO%, OR%, FTR
- **Team Stats**: Various advanced metrics
- **Height Data**: Team height/experience
- **Rankings**: KenPom rank, conference rank

## Data Cleaning

The bot automatically:

1. ✅ Removes duplicate columns from merges
2. ✅ Standardizes column names (lowercase, underscores)
3. ✅ Converts numeric columns to proper types
4. ✅ Removes rows with missing team names
5. ✅ Adds metadata (fetch_date, fetch_timestamp, season)
6. ✅ Validates data quality (>300 teams, required columns)

## Validation Checks

- Minimum 300 teams (NCAA D1 has ~350)
- Required columns present
- Checks for duplicate teams
- Validates efficiency ranges (70-130)

## Logs

Logs are written to `logs/kenpom_bot_YYYY-MM-DD.log`:

- Timestamped entries for all operations
- Error tracking and warnings
- Summary statistics
- Saved file paths

## File Retention

- Automatically deletes files older than 30 days
- Keeps "latest" file always current
- Configurable retention period in code

## Troubleshooting

### "KENPOM_PASSWORD not set"
Set the environment variable:
```bash
export KENPOM_PASSWORD="your_password"
```

### "kenpompy not installed"
Install it:
```bash
pip install kenpompy
```

### "Could not fetch any data"
1. Check KenPom credentials are correct
2. Verify KenPom subscription is active
3. Check internet connection
4. Review logs for specific errors

### "Validation failed - Only X teams"
- KenPom may be updating data
- Try again in a few minutes
- Check if it's off-season

## Integration with Betting System

The cleaned data can be used by your betting monitor:

```python
# In your monitor or analysis code:
import pandas as pd

# Load latest KenPom data
kenpom_df = pd.read_csv('data/kenpom_historical/cleaned_kenpom_data_latest.csv')

# Use for team lookups
def get_team_efficiency(team_name):
    team_data = kenpom_df[kenpom_df['team'] == team_name]
    if not team_data.empty:
        return {
            'adj_oe': team_data['adjoe'].values[0],
            'adj_de': team_data['adjde'].values[0],
            'tempo': team_data['adjt'].values[0]
        }
    return None
```

## Advanced Usage

### Run with custom season
```python
# Edit kenpom_data_bot.py
CURRENT_SEASON = 2024  # Change year
```

### Change retention period
```python
# In kenpom_data_bot.py, find:
cleanup_old_files(logger, days_to_keep=30)  # Change to 60, 90, etc.
```

### Disable auto-cleanup
```python
# Comment out the cleanup step in run_bot():
# cleanup_old_files(logger, days_to_keep=30)
```

## Support

For issues:
1. Check logs in `logs/` directory
2. Verify KenPom credentials
3. Ensure dependencies are installed
4. Check KenPom website is accessible

## File Structure

```
basketball-betting/
├── kenpom_data_bot.py          # Main bot script
├── schedule_kenpom_bot.sh      # Cron helper script
├── data/
│   └── kenpom_historical/      # Archived data
│       ├── cleaned_kenpom_data_latest.csv
│       ├── cleaned_kenpom_data_2025-01-16.csv
│       └── cleaned_kenpom_data_2025-01-16_143022.csv
└── logs/
    └── kenpom_bot_2025-01-16.log
```

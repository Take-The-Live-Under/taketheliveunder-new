# 🚀 Quick Start Guide

Get your NCAA Basketball Betting Monitor running in minutes!

## Step 1: Get API Keys

### Required: The Odds API
1. Visit https://the-odds-api.com
2. Sign up for free account
3. Get your API key from dashboard
4. Free tier: 500 requests/month (plenty for monitoring!)

### Recommended: KenPom Subscription
1. Visit https://kenpom.com
2. Subscribe (~$20/year)
3. Save your login credentials

**OR use free ESPN data** (no subscription needed)

## Step 2: Setup Backend

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

**Edit `.env` file:**
```env
# Required
ODDS_API_KEY=your-odds-api-key-here

# If using KenPom (recommended)
USE_KENPOM=true
KENPOM_EMAIL=your-email@example.com
KENPOM_PASSWORD=your-password

# If using free ESPN alternative
USE_KENPOM=false
```

## Step 3: Test Data Sources

```bash
# Test team stats fetching
python -c "from utils.team_stats import get_stats_manager; sm = get_stats_manager(); sm.fetch_all_stats(); print('✓ Stats loaded successfully')"
```

You should see team stats being fetched. This might take 1-2 minutes on first run.

## Step 4: Start Backend

**Terminal 1 - API Server:**
```bash
python api/main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 - Live Monitor:**
```bash
python monitor.py
```

You should see:
```
NCAA Basketball Live Betting Monitor - SMART EDITION
Initialized NCAA Betting Monitor
Using data source: kenpom (or espn)
```

## Step 5: Setup Frontend

**Terminal 3:**
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

## Step 6: Login

1. Open http://localhost:3000
2. Login with:
   - Username: `admin`
   - Password: `changeme`
3. **IMPORTANT**: Change the admin password in the admin panel!

## Step 7: Watch It Work!

### When games are live:
- Monitor polls every 30 seconds
- Dashboard updates automatically
- Triggers show when PPM > 4.5
- Confidence scores displayed in real-time

### When no games are live:
- Dashboard will show "No live games right now"
- Check back during game days (typically evenings/weekends)
- View historical performance in admin panel

## Testing Without Live Games

You can test the system components individually:

**Test confidence calculation:**
```bash
python -c "
from utils.team_stats import get_stats_manager
from utils.confidence_scorer import get_confidence_scorer

sm = get_stats_manager()
cs = get_confidence_scorer()

# Get metrics for Duke and UNC
home, away = sm.get_matchup_metrics('Duke', 'North Carolina')

# Calculate confidence for hypothetical scenario
result = cs.calculate_confidence(
    home_metrics=home,
    away_metrics=away,
    required_ppm=5.2,  # High PPM needed
    current_total=60,
    ou_line=145
)

print(f'Confidence: {result[\"confidence\"]}/100')
print(f'Units: {result[\"unit_recommendation\"]}')
print(f'Breakdown: {result[\"breakdown\"]}')
"
```

## Next Steps

1. **Customize Confidence Weights**
   - Go to Admin Panel → Settings
   - Adjust weights based on your preferences
   - See changes in real-time

2. **Add Users**
   - Admin Panel → Users → Add User
   - Create accounts for friends/partners

3. **Review Performance**
   - Dashboard shows win rate, ROI
   - Performance by confidence tier
   - Download CSVs for detailed analysis

4. **Deploy to Production**
   - See README.md for Railway + Vercel deployment
   - Set environment variables in deployment platforms
   - Monitor runs 24/7 in cloud

## Troubleshooting

### "No module named 'kenpompy'"
```bash
pip install -r requirements.txt
```

### "Failed to login to KenPom"
- Check credentials in `.env`
- Verify subscription is active
- Try switching to ESPN: `USE_KENPOM=false`

### "No live games found"
- This is normal when no games are in progress
- Check The Odds API dashboard for remaining requests
- Monitor will automatically find games when they start
- NCAA season: November through April (March Madness!)

### "Frontend won't load"
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### "Confidence scores always 0"
- Wait for team stats to load (1-2 min on first run)
- Check cache folder has recent CSV files
- Verify team names match between Sportsdata and stats source

## File Locations

- **Logs**: `logs/monitor.log`
- **Live data**: `data/ncaa_live_log.csv`
- **Results**: `data/ncaa_results.csv`
- **Team stats cache**: `cache/`
- **Users**: `data/users.json`

## Daily Usage

1. Start monitor in morning: `python monitor.py`
2. Leave running all day
3. Check dashboard when games are live
4. Review results CSV at end of night

## Need Help?

- Read `README.md` for detailed documentation
- Check `CLAUDE.md` for technical details
- Review API docs at http://localhost:8000/docs
- Check logs in `logs/monitor.log`

---

**That's it! You're ready to make smarter NCAA basketball bets! 🏀💰**

# 🏀 MONDAY MORNING - QUICK START GUIDE

**Ready for NCAA Basketball Season!**

---

## ⚡ 3-TERMINAL LAUNCH (5 minutes)

### Terminal 1: Backend API
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python api/main.py
```
**Wait for**: `Uvicorn running on http://0.0.0.0:8000`

---

### Terminal 2: Frontend Dashboard
```bash
cd /Users/brookssawyer/Desktop/basketball-betting/frontend
npm run dev
```
**Wait for**: `Ready in Xs` then open http://localhost:3001

---

### Terminal 3: Live Monitor
```bash
cd /Users/brookssawyer/Desktop/basketball-betting
source venv/bin/activate
python monitor.py
```
**Watch**: Live game updates every 40 seconds

---

## ✅ YOU'RE READY WHEN YOU SEE:

**Terminal 1 (API)**:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 (Frontend)**:
```
▲ Next.js 14.0.4
- Local:        http://localhost:3001
✓ Ready in Xs
```

**Terminal 3 (Monitor)**:
```
INFO | Fetching live NCAA basketball games...
INFO | Found X live games
```

---

## 📊 WHAT TO WATCH

### Dashboard (http://localhost:3001)
- Shows live games with confidence scores
- Auto-refreshes every 30 seconds
- Color-coded by confidence tier:
  - 🟢 Green = High confidence (76-85%)
  - 🔵 Blue = Medium confidence (61-75%)
  - 🟡 Yellow = Low confidence (41-60%)

### Monitor Terminal
```
INFO | Duke @ UNC: PPM=5.2, Confidence=78, Trigger=UNDER
INFO | Logged 5 polls to CSV
```

### CSV Logs
```bash
# Watch live polling
tail -f data/ncaa_live_log.csv
```

---

## 🎯 CURRENT CONFIGURATION

- **Sport**: NCAA Basketball ✅
- **PPM Threshold**: 4.5 (UNDER), 1.5 (OVER)
- **Poll Interval**: 40 seconds
- **Team Mappings**: 61 NCAA teams pre-configured
- **API Quota**: ~90 requests/hour = 5.5 hours runtime per 500 requests

---

## 📋 END OF DAY

### Daily Summary Report
```bash
source venv/bin/activate
python generate_ppm_report.py --daily
```

Shows today's activity, triggers, and PPM distribution.

---

## 📚 FULL DOCUMENTATION

- **Complete Guide**: `MONDAY_LAUNCH_CHECKLIST.md`
- **PPM Analysis**: `PPM_ANALYSIS_GUIDE.md` (for Week 2+)
- **Main Docs**: `NBA_OVER_UNDER_DASHBOARD.md`

---

## 🚨 TROUBLESHOOTING

**No games showing?**
- Check if NCAA games are actually live (espn.com)
- Verify monitor is running (Terminal 3)

**API errors?**
- Check ODDS_API_KEY in .env
- Verify quota at: https://the-odds-api.com/account/

**Dashboard not updating?**
- Refresh page (Cmd/Ctrl + R)
- Check API is running (Terminal 1)

---

## 🎊 YOU'RE ALL SET!

Everything is configured and tested. Just start the 3 terminals and watch the data roll in!

**Good luck! 🍀🏀**

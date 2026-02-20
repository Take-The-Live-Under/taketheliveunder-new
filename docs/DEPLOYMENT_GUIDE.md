# Deployment Guide - Basketball Betting Monitor

## Quick Deploy (One Command)

```bash
./deploy.sh
```

This will:
1. ✅ Commit your changes
2. ✅ Push to GitHub
3. ✅ Deploy backend to Railway
4. ✅ Deploy frontend to Vercel
5. ✅ Output both URLs

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (Next.js)                         │
│  Deployed to: Vercel                        │
│  Auto-deploys from: GitHub (NEWSITE11)      │
└─────────────────────────────────────────────┘
                    │
                    │ API calls
                    ▼
┌─────────────────────────────────────────────┐
│  Backend (FastAPI + Monitor)                │
│  Deployed to: Railway                       │
│  - Web Process: FastAPI (port $PORT)        │
│  - Worker Process: monitor.py (24/7)        │
└─────────────────────────────────────────────┘
```

---

## Manual Deployment Steps

### Step 1: Deploy Backend to Railway

First time setup:
```bash
# Login to Railway
railway login

# Link to existing project OR create new one
railway link   # Choose existing project
# OR
railway init   # Create new project

# Set environment variables
railway variables set ODDS_API_KEY=397dbb85888a18d4b7d05774babfa1c5
railway variables set SPORT_MODE=ncaa
railway variables set USE_KENPOM=false
railway variables set KENPOM_EMAIL=brookssawyer@gmail.com
railway variables set KENPOM_PASSWORD="Suttonruth9424$$"
railway variables set ENVIRONMENT=production
railway variables set LOG_LEVEL=INFO
railway variables set OPENAI_API_KEY=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

# Deploy backend
railway up

# Generate public URL
railway domain

# Get your backend URL
railway status
```

**Save your Railway URL** - you'll need it for the frontend!
Example: `https://basketball-betting-production.up.railway.app`

### Step 2: Deploy Frontend to Vercel

```bash
cd frontend

# Login to Vercel (first time only)
vercel login

# Deploy to production
vercel --prod

# During deployment, set environment variable:
# NEXT_PUBLIC_API_URL = https://your-railway-url.railway.app
```

Or set via Vercel dashboard:
1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add: `NEXT_PUBLIC_API_URL` = `https://your-railway-url.railway.app`
4. Redeploy

---

## Environment Variables

### Railway (Backend)
```env
ODDS_API_KEY=397dbb85888a18d4b7d05774babfa1c5
SPORT_MODE=ncaa
USE_KENPOM=false
KENPOM_EMAIL=brookssawyer@gmail.com
KENPOM_PASSWORD=Suttonruth9424$$
ENVIRONMENT=production
LOG_LEVEL=INFO
SECRET_KEY=<generate-random-secret>
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
OPENAI_API_KEY=<your-key>
```

### Vercel (Frontend)
```env
NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app
```

---

## Monitoring Deployments

### Check Backend Logs (Railway)
```bash
railway logs          # View recent logs
railway logs -f       # Follow logs in real-time
railway status        # Check deployment status
```

### Check Frontend Logs (Vercel)
```bash
vercel logs           # View recent logs
vercel logs -f        # Follow logs in real-time
vercel ls             # List deployments
```

---

## Troubleshooting

### Backend not responding
1. Check Railway logs: `railway logs`
2. Verify environment variables are set: `railway variables`
3. Check service status in Railway dashboard

### Frontend can't connect to backend
1. Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
2. Check CORS settings in `config.py` - add your Vercel URL to `ALLOWED_ORIGINS`
3. Test backend directly: `curl https://your-railway-url.railway.app/health`

### No live games showing
1. Check Railway worker process is running (monitor.py)
2. Check Odds API quota: logs should show quota remaining
3. Verify monitor.py is polling (check logs for "Monitoring X live games")

---

## Redeployment

### Quick redeploy everything:
```bash
./deploy.sh
```

### Redeploy backend only:
```bash
git push origin NEWSITE11  # Railway auto-deploys on push
# OR
railway up  # Manual deploy
```

### Redeploy frontend only:
```bash
cd frontend
vercel --prod
```

---

## Useful Links

After deployment, save these:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-app.railway.app
- **Backend Health**: https://your-app.railway.app/health
- **Live Games API**: https://your-app.railway.app/api/games/live

---

## Cost Estimate

- **Vercel**: Free tier (sufficient for this app)
- **Railway**: ~$5-10/month for hobby use (includes both web + worker processes)
- **The Odds API**: Based on your API calls (you have 19,997 requests remaining)

---

## Railway Procfile Explanation

The `Procfile` tells Railway how to run your app:

```
web: uvicorn api.main:app --host 0.0.0.0 --port $PORT
worker: python monitor.py
```

- **web**: Your FastAPI server (handles HTTP requests)
- **worker**: The monitor script that runs 24/7 polling for live games

Both processes run simultaneously on Railway.

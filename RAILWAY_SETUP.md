# Railway Deployment - One-Time Setup Guide

This guide will help you set up automated deployment for your basketball betting app using Railway CLI. After this one-time setup, deployment will be fully automated!

## Prerequisites

- GitHub account (already have)
- Railway account (free tier available)
- Node.js installed (for Railway CLI)

---

## Step 1: Create Railway Account (5 minutes)

1. Go to https://railway.app
2. Click **"Login with GitHub"**
3. Authorize Railway to access your GitHub account
4. You'll be taken to your Railway dashboard

**Done!** ✅ Railway account created

---

## Step 2: Install Railway CLI (2 minutes)

Run this command in your terminal:

```bash
npm install -g @railway/cli
```

Verify installation:

```bash
railway --version
```

You should see a version number (e.g., `3.x.x`)

**Done!** ✅ Railway CLI installed

---

## Step 3: Login to Railway (1 minute)

```bash
railway login
```

This will:
- Open your browser
- Ask you to authorize the CLI
- Automatically link your terminal to your Railway account

**Done!** ✅ Authenticated with Railway

---

## Step 4: Create New Railway Project (3 minutes)

Option A: **Via Web Dashboard** (Recommended for first time)

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose `brookssawyer/testsite`
5. Railway will auto-detect your `Procfile` ✅
6. Click **"Deploy"**

Option B: **Via CLI** (Faster if you prefer terminal)

```bash
cd /Users/brookssawyer/Desktop/basketball-betting
railway init
```

Follow the prompts to create a new project.

**Done!** ✅ Railway project created

---

## Step 5: Link Your Local Project (1 minute)

From your basketball-betting directory:

```bash
cd /Users/brookssawyer/Desktop/basketball-betting
railway link
```

Select your project from the list.

**Done!** ✅ Project linked

---

## Step 6: Set Environment Variables (5 minutes)

Set all required environment variables using the CLI:

```bash
# Required variables
railway variables set ODDS_API_KEY=your-odds-api-key-from-theoddsapi-com
railway variables set SECRET_KEY=generate-a-random-secret-key-here
railway variables set USE_KENPOM=false
railway variables set SPORT_MODE=ncaa
railway variables set ENVIRONMENT=production

# Optional (KenPom - if you have subscription)
railway variables set KENPOM_EMAIL=your-email@example.com
railway variables set KENPOM_PASSWORD=your-kenpom-password

# Optional (OpenAI for summaries)
railway variables set OPENAI_API_KEY=sk-proj-YOUR-OPENAI-API-KEY-HERE

# API Configuration
railway variables set API_HOST=0.0.0.0
railway variables set API_PORT=8000
```

**Verify variables were set:**

```bash
railway variables
```

You should see all your variables listed.

**Done!** ✅ Environment variables configured

---

## Step 7: Get Railway API Token for GitHub Actions (2 minutes)

For automated deployments via GitHub Actions:

1. Go to https://railway.app/account/tokens
2. Click **"Create Token"**
3. Name it: `GitHub Actions Deploy`
4. Copy the token (you won't see it again!)
5. Go to your GitHub repo: https://github.com/brookssawyer/testsite/settings/secrets/actions
6. Click **"New repository secret"**
7. Name: `RAILWAY_TOKEN`
8. Value: [paste the token you copied]
9. Click **"Add secret"**

**Done!** ✅ GitHub Actions can now auto-deploy to Railway

---

## Step 8: Test Manual Deployment (1 minute)

Test that everything works:

```bash
railway up
```

This will:
- Build your app
- Deploy to Railway
- Start both web service (API) and worker (monitor)

Watch the logs:

```bash
railway logs
```

**Done!** ✅ Manual deployment works

---

## Step 9: Get Your Railway URL (1 minute)

```bash
railway status
```

Or visit your Railway dashboard and click on your project. You'll see:

- **Backend URL**: Something like `https://basketball-betting-production.up.railway.app`
- Copy this URL - you'll need it for Vercel!

**Done!** ✅ Backend URL obtained

---

## Step 10: Configure Custom Domain (Optional - 5 minutes)

If you want to use `bettheliveunder.com` for your backend:

1. In Railway dashboard → Your Project → Settings
2. Scroll to **"Domains"**
3. Click **"Add Domain"**
4. Enter: `api.bettheliveunder.com` (or any subdomain)
5. Railway will provide DNS records
6. Add those records to your domain registrar

**Done!** ✅ Custom domain configured (optional)

---

## Summary: What You've Accomplished

✅ Railway account created
✅ Railway CLI installed and authenticated
✅ Project created and linked
✅ Environment variables set
✅ GitHub Actions configured for auto-deploy
✅ Manual deployment tested
✅ Backend URL obtained

---

## Next: Deploy Frontend

Now that backend is set up, follow the Vercel setup guide to deploy your frontend!

---

## Daily Usage (After Setup)

### Automated Deployment (Recommended)

Just push your code:

```bash
git add .
git commit -m "Your changes"
git push origin NEWSITE11
```

GitHub Actions will automatically deploy to Railway! 🎉

### Manual Deployment (Alternative)

Use the one-command script:

```bash
./deploy.sh
```

Or deploy just the backend:

```bash
railway up
```

---

## Useful Railway Commands

```bash
# View logs
railway logs

# Check status
railway status

# Open dashboard
railway open

# View environment variables
railway variables

# SSH into your deployment (for debugging)
railway shell

# View deployments
railway list
```

---

## Troubleshooting

### "railway: command not found"

Install the CLI:
```bash
npm install -g @railway/cli
```

### "Not linked to a project"

Link your project:
```bash
railway link
```

### "Deployment failed"

Check logs:
```bash
railway logs
```

Common issues:
- Missing environment variables → Set them with `railway variables set`
- Python dependency errors → Check `requirements.txt`
- Port binding issues → Railway automatically sets `$PORT`

### Need to start over?

```bash
railway unlink  # Unlink current project
railway link    # Link to different project
```

---

## Cost Information

**Free Tier:**
- $5 credit per month
- ~500 hours of usage
- Perfect for hobby projects
- Sleeps after inactivity (wakes on request)

**Hobby Plan ($5/month):**
- Always-on (no sleeping)
- Better for production use
- Persistent storage included

**Monitor your usage:**
```bash
railway open  # Go to dashboard → Billing
```

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Issues: Create issue in your GitHub repo

---

## Security Notes

⚠️ **IMPORTANT:**

1. **Never commit your Railway token** to git
2. **Rotate secrets** before production (change SECRET_KEY, API keys)
3. **Keep your `.env` file gitignored**
4. **Use GitHub Secrets** for sensitive data

---

You're all set! 🚀

Next step: Set up Vercel for your frontend following a similar process.

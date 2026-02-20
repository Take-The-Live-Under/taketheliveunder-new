# Deploy to Render - Step-by-Step Guide

## ✅ CHUNK 1: Prepare (You are here!)

### What We Just Created:
- `render.yaml` - Auto-configuration file for Render
- This guide!

### Before You Deploy - Checklist:
- [ ] Have your **Odds API key** ready (from the-odds-api.com)
- [ ] Have a **GitHub account** (Render connects to your repo)
- [ ] Code is pushed to GitHub
- [ ] (Optional) KenPom credentials if using premium stats

---

## 📋 CHUNK 2: Deploy Backend to Render

### Step 1: Push to GitHub (if not already)
```bash
cd /Users/brookssawyer/Desktop/basketball-betting

# Initialize git if needed
git init
git add .
git commit -m "Initial commit - ready for deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/basketball-betting.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Render

1. Go to **https://render.com** and sign up/login
2. Click **"New +" → "Blueprint"**
3. Connect your GitHub account
4. Select your `basketball-betting` repository
5. Render will automatically detect `render.yaml`
6. Click **"Apply"**

### Step 3: Set Environment Variables

After Render creates your services, set these variables in **BOTH services**:

#### Required:
- `ODDS_API_KEY` = your-key-from-the-odds-api.com

#### Optional (if using KenPom):
- `USE_KENPOM` = true
- `KENPOM_EMAIL` = your-kenpom-email
- `KENPOM_PASSWORD` = your-kenpom-password

**Where to set them:**
1. Go to your service dashboard
2. Click "Environment" tab
3. Add each variable
4. Click "Save Changes" (will trigger redeploy)

### Step 4: Wait for Deployment

- **API Service**: Will be live at `https://basketball-betting-api-xxxxx.onrender.com`
- **Monitor Worker**: Runs in background, no URL
- First deploy takes ~5-10 minutes (Render installs dependencies)

### Step 5: Test Your API

```bash
# Check health endpoint
curl https://your-api-url.onrender.com/health

# Check live games
curl https://your-api-url.onrender.com/api/games/live
```

✅ **CHUNK 2 COMPLETE** when you see game data!

---

## 🎨 CHUNK 3: Deploy Frontend

### Option A: Vercel (Recommended - Easier for Next.js)

1. Go to **https://vercel.com** and login with GitHub
2. Click **"New Project"**
3. Select your `basketball-betting` repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (auto-detected)
   - **Environment Variables**:
     ```
     NEXT_PUBLIC_API_URL=https://your-render-api-url.onrender.com
     ```
5. Click **"Deploy"**
6. Done! Your site will be live at `https://basketball-betting-xxxxx.vercel.app`

### Option B: Render Static Site

1. In Render dashboard → **"New +" → "Static Site"**
2. Select your repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `out` or `.next`
   - **Environment**:
     ```
     NEXT_PUBLIC_API_URL=https://your-render-api-url.onrender.com
     ```
4. Deploy!

✅ **CHUNK 3 COMPLETE** when you can see your dashboard live!

---

## 🧪 CHUNK 4: Test & Verify

### Smoke Test Checklist:
- [ ] Visit your live URL
- [ ] See live games on dashboard
- [ ] Click on a game card
- [ ] Check that ESPN closing total shows up
- [ ] Wait 30 seconds, verify data updates
- [ ] Check different browsers/devices

### If Something's Wrong:

**API not responding?**
- Check Render logs: Dashboard → Logs tab
- Verify environment variables are set
- Check Odds API key is valid

**Frontend can't reach API?**
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Try API URL directly in browser
- Check browser console for CORS errors

**Monitor not running?**
- Check worker service logs in Render
- Verify Odds API key is working
- Check data folder permissions

---

## 💰 Cost Estimate

**Render Free Tier:**
- ✅ Web Service (API): FREE - 750 hours/month
- ✅ Background Worker (Monitor): FREE - 750 hours/month
- ⚠️ Services sleep after 15 min of inactivity
- ⚠️ Wake-up time: ~30 seconds

**To prevent sleeping ($7/month per service):**
- Upgrade to Starter plan
- Keeps services always-on
- Total: ~$14/month for both

**Vercel:**
- ✅ FREE for hobby/personal projects
- Unlimited bandwidth
- Auto-scaling

**Total Cost:**
- **$0/month** (free tier, services may sleep)
- **$14/month** (always-on backend)

---

## 🎯 Next Steps After Deployment

1. **Share with testers** - Get feedback on current UX
2. **Monitor usage** - Check Render dashboard for errors
3. **Add features incrementally**:
   - Confidence meter (we have the code ready!)
   - Enhanced game cards
   - Triggers sidebar
4. **Iterate** based on user feedback

---

## 🆘 Need Help?

**Render Docs:** https://render.com/docs
**Vercel Docs:** https://vercel.com/docs
**Next.js Deployment:** https://nextjs.org/docs/deployment

**Common Issues:**
- API key not working → Check spelling, regenerate key
- CORS errors → Ensure API allows your frontend domain
- Monitor not polling → Check logs, verify API key

---

**Ready for CHUNK 2?** Push your code to GitHub and follow Step 2 above!

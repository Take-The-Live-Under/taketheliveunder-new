# TTLU Automation Quick Start
## Get set up in 1 hour. Post once, publish everywhere.

---

## Your Stack (All Free)

```
┌─────────────────────────────────────────────────────────┐
│                     YOU WRITE HERE                       │
│                        Buffer                            │
│                    buffer.com (FREE)                     │
└─────────────────────────┬───────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌─────────┐     ┌──────────┐     ┌─────────┐
    │ Twitter │     │Instagram │     │Facebook │
    │  Auto   │     │   Auto   │     │  Auto   │
    └────┬────┘     └──────────┘     └─────────┘
         │
         ▼ (Zapier trigger)
    ┌─────────┐
    │ Discord │
    │  Auto   │
    └─────────┘

    ┌─────────┐
    │ Reddit  │ ← Manual copy-paste (2 min)
    └─────────┘

    ┌─────────┐
    │ TikTok  │ ← Later.com for scheduling
    └─────────┘
```

---

## Step 1: Buffer Setup (10 min)

1. Go to **buffer.com**
2. Click "Get Started Free"
3. Connect these accounts:
   - [ ] Twitter/X (click Connect → authorize)
   - [ ] Instagram Business (must be business account)
   - [ ] Facebook Page (create one if needed)

**Settings to configure:**
- Posting schedule: Set times for each platform
- Suggested: 9am, 12pm, 6pm, 9pm EST (game hours)

**Test it:**
- Write a post: "Testing our new analytics tool 🏀"
- Click "Add to Queue"
- Verify it shows up scheduled for all 3 platforms

---

## Step 2: Discord Webhook (5 min)

**In your Discord server:**

1. Go to Server Settings (click server name → Settings)
2. Click "Integrations"
3. Click "Webhooks" → "New Webhook"
4. Name it: "TTLU Bot"
5. Choose channel: #announcements or #updates
6. Click "Copy Webhook URL"
7. Save it somewhere (you'll need it for Zapier)

**Your webhook URL looks like:**
```
https://discord.com/api/webhooks/123456789/abcdefg...
```

---

## Step 3: Zapier Connection (15 min)

1. Go to **zapier.com**
2. Create free account
3. Click "Create Zap"

**Zap 1: Buffer → Discord**

```
TRIGGER:
- App: Buffer
- Event: "New Update Sent"
- Connect your Buffer account

ACTION:
- App: Webhooks by Zapier
- Event: "POST"
- URL: [paste your Discord webhook URL]
- Payload Type: JSON
- Data:
  {
    "content": "📢 New post is live!\n\n{{text}}\n\n{{url}}"
  }
```

Click "Test" → Check Discord → Should see test message

**Turn on the Zap!**

---

## Step 4: TikTok Scheduling with Later (10 min)

1. Go to **later.com**
2. Create free account
3. Connect TikTok account
4. Upload videos → Schedule for later

**Why Later for TikTok:**
- Buffer doesn't support TikTok well
- Later sends you a notification to post
- Still saves time with drafts ready to go

---

## Step 5: Create Your Content Template (20 min)

**In Notion, Google Docs, or just a note:**

```markdown
## Content Template

**HOOK:** [One attention-grabbing line]

**STAT:**
- Team 1: [stat]
- Team 2: [stat]

**INSIGHT:** [What this means]

**CTA:** Check the full matchup: taketheliveunder.com/research

**HASHTAGS:** #CollegeBasketball #NCAAB #MarchMadness
```

**Example filled in:**
```markdown
**HOOK:** Duke is playing 15% faster than last year

**STAT:**
- 2024 pace: 68.2 possessions/game
- 2025 pace: 78.4 possessions/game

**INSIGHT:** More possessions = more scoring opportunities

**CTA:** Compare any teams free: taketheliveunder.com/research

**HASHTAGS:** #CollegeBasketball #Duke #NCAAB
```

---

## Your Daily Workflow (15 min total)

### Morning (5 min)
```
1. Open TTLU → Research page
2. Find interesting matchup/stat
3. Fill in your template
4. Paste into Buffer
5. Click "Add to Queue"
   → Auto-posts to Twitter, IG, Facebook
   → Zapier sends to Discord
6. Copy-paste to Reddit (slightly modify for Reddit style)
```

### During Games (5 min)
```
1. Keep TTLU open
2. See interesting live stat
3. Quick tweet from Buffer mobile app
4. Discord auto-updates
```

### End of Day (5 min)
```
1. Check engagement on each platform
2. Reply to comments (algorithm loves this)
3. Note what worked for tomorrow
```

---

## Automation Checklist

### One-Time Setup:
- [ ] Buffer account created
- [ ] Twitter connected to Buffer
- [ ] Instagram connected to Buffer
- [ ] Facebook connected to Buffer
- [ ] Discord webhook created
- [ ] Zapier account created
- [ ] Buffer → Discord Zap running
- [ ] Later account for TikTok
- [ ] Content template created

### Weekly:
- [ ] Sunday: Batch create 7 days of content in Buffer
- [ ] Schedule all posts for the week
- [ ] Prep any TikTok videos in Later

### Daily:
- [ ] Check Buffer queue has content
- [ ] Add any real-time posts as needed
- [ ] Manual Reddit post (2 min)
- [ ] Engage with comments (5 min)

---

## Platform Posting Times (EST)

Based on sports audience behavior:

| Platform | Best Times | Why |
|----------|------------|-----|
| Twitter | 12pm, 7pm, 9pm | Lunch + game time |
| Instagram | 11am, 7pm | Scrolling hours |
| Facebook | 9am, 1pm, 7pm | Older audience, different schedule |
| Reddit | 10am, 8pm | High activity windows |
| TikTok | 7pm, 9pm, 11pm | Night scrolling |
| Discord | Instant | Real-time community |

**Buffer schedule recommendation:**
- Slot 1: 11:00 AM EST
- Slot 2: 7:00 PM EST
- Slot 3: 9:30 PM EST

---

## Troubleshooting

**Buffer post didn't go to Instagram:**
- Must be Instagram Business account
- Must connect through Facebook
- Check: Settings → Channels → Reconnect

**Zapier not triggering:**
- Check Zap is "On" (green)
- Check Buffer account is connected
- Test trigger manually

**Discord webhook not working:**
- Verify URL is correct
- Check channel permissions
- Test with simple JSON: `{"content": "test"}`

**TikTok won't auto-post:**
- TikTok doesn't allow true auto-posting
- Use Later for reminders + drafts
- You still need to tap "Post" on your phone

---

## Upgrade Path (When You're Ready)

**$0/month (Start here):**
- Buffer Free (3 channels, 10 posts each)
- Zapier Free (100 tasks/month)
- Later Free (30 posts)
- Canva Free

**~$20/month (Scaling up):**
- Buffer Essentials: $6/mo (unlimited posts)
- Canva Pro: $13/mo (brand kit, resize)

**~$50/month (Full automation):**
- Add Repurpose.io: $25/mo (TikTok → everywhere)
- Now ONE video goes to TikTok, IG, YT, Twitter automatically

---

## TL;DR - The 5-Platform Post

1. Write post in **Buffer**
2. Buffer posts to **Twitter, Instagram, Facebook**
3. Zapier triggers **Discord** webhook
4. You copy-paste to **Reddit** (2 min)
5. TikTok videos go through **Later**

**Time: 7 min per post instead of 33 min**

**Weekly time saved: 9+ hours**

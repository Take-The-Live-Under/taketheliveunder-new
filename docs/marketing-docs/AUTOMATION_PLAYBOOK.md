# TTLU Content Automation Playbook
## 1 Post → 5 Platforms (15 min vs 2 hours)

---

## The Hub-and-Spoke Model

Instead of creating unique content for each platform, create ONE piece of content and automatically distribute it everywhere.

```
                    ┌─────────────┐
                    │   TWITTER   │ (Auto-post)
                    └──────▲──────┘
                           │
┌─────────────┐     ┌──────┴──────┐     ┌─────────────┐
│  INSTAGRAM  │◄────│   BUFFER    │────►│   REDDIT    │
│   (Reels)   │     │   (HUB)     │     │  (Manual)   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   DISCORD   │ (Webhook)
                    └─────────────┘

        ┌─────────────────────────────────────┐
        │              TIKTOK                 │
        │    (Creates → Repurpose.io)         │
        │         ↓           ↓               │
        │   IG Reels    YouTube Shorts        │
        └─────────────────────────────────────┘
```

---

## Recommended Tool Stack

### FREE Tier Setup ($0/month)
| Tool | Purpose | Free Limit |
|------|---------|------------|
| Buffer | Schedule Twitter, IG, LinkedIn | 3 channels, 10 posts/channel |
| Later | Schedule TikTok, IG | 30 posts/month |
| Zapier | Connect apps | 100 tasks/month |
| Make (Integromat) | Advanced automation | 1,000 ops/month |
| Discord Webhooks | Auto-post to Discord | Unlimited |
| IFTTT | Simple automations | 2 applets |

### PAID Upgrade (When Ready) (~$30/month)
| Tool | Purpose | Cost |
|------|---------|------|
| Repurpose.io | TikTok → IG/YT/Twitter | $25/mo |
| Buffer Essentials | More channels/posts | $6/mo |
| Publer | All-in-one alternative | $12/mo |

---

## Workflow 1: Written Content (Stats/Analysis)

### You Write Once → Posts to 5 Places

**Step 1: Write in Notion/Google Doc**
```
HEADLINE: Duke's pace is 15% faster than last year

STAT BLOCK:
- 2024: 68.2 possessions/game
- 2025: 78.4 possessions/game
- Result: More scoring opportunities

INSIGHT: This makes Duke overs more attractive

LINK: taketheliveunder.com/research
```

**Step 2: Buffer Auto-Formats for Each Platform**

| Platform | Format | Character Limit |
|----------|--------|-----------------|
| Twitter | Short + link | 280 chars |
| LinkedIn | Professional angle | 3,000 chars |
| Facebook | Casual + image | 63,206 chars |
| Threads | Twitter-style | 500 chars |

**Step 3: Zapier Triggers**
```
TRIGGER: New Buffer post published
ACTION 1: Post to Discord #announcements channel
ACTION 2: Add to Reddit draft queue (Notion)
ACTION 3: Log to Google Sheet for tracking
```

### Actual Setup Steps:

1. **Create Buffer Account** (free)
   - Connect: Twitter, LinkedIn, Facebook Page
   - buffer.com

2. **Create Zapier Account** (free)
   - Create Zap: Buffer → Discord Webhook
   - zapier.com

3. **Set Up Discord Webhook**
   - Server Settings → Integrations → Webhooks
   - Copy webhook URL
   - Use in Zapier

4. **Reddit (Manual but Templated)**
   - Reddit doesn't allow auto-posting
   - BUT: Use Buffer to remind you + pre-write content
   - Copy-paste from your queue

---

## Workflow 2: Video Content (TikTok-First)

### Record Once → Publish to 4 Video Platforms

**The TikTok-First Strategy:**
TikTok's format works everywhere. Create there, distribute everywhere.

```
TIKTOK VIDEO (9:16 vertical, 30-60 sec)
         │
         ▼
    Repurpose.io (or manual)
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
IG Reels  YT Shorts  Twitter   Facebook
                      Video     Reels
```

### Free Method (Manual, 10 min/video):

1. **Post to TikTok first**
2. **Download without watermark**: ssstik.io or snaptik.app
3. **Upload to each platform:**
   - Instagram Reels (same video)
   - YouTube Shorts (same video)
   - Twitter (same video, auto-plays)
   - Facebook Reels (same video)

### Automated Method ($25/mo - Repurpose.io):

1. Connect TikTok account
2. Connect IG, YouTube, Twitter, Facebook
3. Set rules: "When I post to TikTok → auto-post to all"
4. Done. One upload, four platforms.

**Repurpose.io Setup:**
```
repurpose.io

Connections:
- TikTok (source)
- Instagram (destination)
- YouTube (destination)
- Twitter (destination)

Workflow:
WHEN: New TikTok video
THEN:
  - Resize for YouTube Shorts (if needed)
  - Remove TikTok watermark
  - Add to Instagram Reels queue
  - Add to YouTube Shorts queue
  - Post to Twitter immediately
```

---

## Workflow 3: Game Day Live Content

### During Games → Real-Time Multi-Platform

**The 2-Phone Method (Free):**
- Phone 1: Watch game + TTLU dashboard open
- Phone 2: Twitter app ready

**Live Posting Flow:**
```
1. See interesting stat on TTLU
2. Screenshot or quick note
3. Post to Twitter (fastest, real-time platform)
4. Buffer auto-queues for other platforms later
5. TikTok: Record 15-sec reaction for later
```

**Discord Integration (Instant):**
Set up a Zapier to mirror Twitter to Discord:
```
TRIGGER: New tweet from @TakeTheLiveUnder
ACTION: Post to Discord #live-games channel
```

---

## Workflow 4: Weekly Content Batch

### Sunday Prep → Full Week Scheduled

**2-Hour Sunday Session:**

| Time | Task | Output |
|------|------|--------|
| 0:00-0:30 | Review upcoming games | List of 5-7 matchups |
| 0:30-1:00 | Write stat blocks for each | 5-7 content pieces |
| 1:00-1:30 | Create graphics in Canva | 5-7 images |
| 1:30-2:00 | Schedule in Buffer | Mon-Sun queued |

**Canva Batch Creation:**
1. Create one template with your branding
2. Duplicate for each matchup
3. Just change team names + stats
4. Export all, upload to Buffer

**Buffer Queue Setup:**
```
Monday 8am: Matchup preview #1
Monday 7pm: Game day reminder #1
Tuesday 8am: Matchup preview #2
Tuesday 7pm: Game day reminder #2
...etc
```

---

## Platform-Specific Auto-Posting Rules

### What CAN Be Automated:

| Platform | Auto-Post? | Best Tool |
|----------|------------|-----------|
| Twitter | ✅ Yes | Buffer, Hootsuite, Zapier |
| Instagram | ✅ Yes (with business account) | Buffer, Later |
| Facebook | ✅ Yes | Buffer, Meta Business Suite |
| LinkedIn | ✅ Yes | Buffer |
| YouTube | ✅ Yes | Repurpose.io |
| Discord | ✅ Yes | Webhooks + Zapier |
| TikTok | ⚠️ Schedule only | Later, TikTok native |
| Reddit | ❌ No (against TOS) | Manual only |
| Threads | ⚠️ Limited | Later (beta) |

### Reddit Strategy (Can't Automate):
Since Reddit can't be automated, use this system:
1. Buffer posts to Twitter
2. Zapier adds a task to your to-do list: "Post to Reddit"
3. Copy-paste the content with Reddit-specific formatting
4. Takes 2 min per post

---

## Complete Automation Setup (Step-by-Step)

### Step 1: Create Accounts (30 min)
- [ ] Buffer.com (free)
- [ ] Zapier.com (free)
- [ ] Canva.com (free, upgrade for brand kit)
- [ ] Later.com (free, for TikTok scheduling)
- [ ] Discord server with webhook enabled

### Step 2: Connect Platforms to Buffer (15 min)
- [ ] Twitter/X
- [ ] Instagram Business
- [ ] Facebook Page
- [ ] LinkedIn Page (optional)

### Step 3: Set Up Zapier Automations (30 min)

**Zap 1: Buffer → Discord**
```
Trigger: New post published in Buffer
Action: Post message to Discord webhook
Message: {{post_text}} {{post_link}}
```

**Zap 2: Twitter → Google Sheet (Tracking)**
```
Trigger: New tweet by @TakeTheLiveUnder
Action: Create row in Google Sheet
Data: Tweet text, Date, Link, Impressions (add manually later)
```

**Zap 3: New Email Subscriber → Discord Welcome**
```
Trigger: New subscriber in Mailerlite/Buttondown
Action: Post to Discord #signups channel
Message: "🎉 New signup: {{email}}"
```

### Step 4: Create Content Templates in Canva (1 hour)
- [ ] Matchup preview template (square for IG, Twitter)
- [ ] Stat card template
- [ ] Game day graphic template
- [ ] Story/Reels template (9:16)

### Step 5: Test the Flow (15 min)
1. Create a test post in Buffer
2. Verify it posts to Twitter, IG, Facebook
3. Verify Zapier triggers Discord
4. Verify tracking sheet updates

---

## Daily Time Savings

### Before Automation:
| Task | Time |
|------|------|
| Write Twitter post | 5 min |
| Write Instagram caption | 5 min |
| Write Facebook post | 5 min |
| Write LinkedIn post | 5 min |
| Write Reddit post | 10 min |
| Post to Discord | 3 min |
| **Total per piece of content** | **33 min** |

### After Automation:
| Task | Time |
|------|------|
| Write ONE post in Buffer | 5 min |
| Auto-posts to Twitter, IG, FB, LinkedIn | 0 min |
| Discord auto-posts via Zapier | 0 min |
| Copy-paste to Reddit | 2 min |
| **Total per piece of content** | **7 min** |

**Time saved: 26 min per post × 3 posts/day = 78 min/day = 9+ hours/week**

---

## Content Repurposing Matrix

One piece of content, multiple formats:

| Original | Twitter | Instagram | TikTok | Reddit | Discord |
|----------|---------|-----------|--------|--------|---------|
| Stat insight | Tweet | Carousel | Talking head | Analysis post | Embed |
| Game prediction | Thread | Story | Quick take | Game thread | Alert |
| Tool tutorial | Tweet + link | Reel | Tutorial | [OC] post | Pinned |
| Hot take | Tweet | Quote graphic | Rant video | Discussion | Debate |
| Weekly recap | Thread | Carousel | Compilation | Roundup post | Summary |

---

## Zapier Recipes (Copy These)

### Recipe 1: Content Syndication
```
App 1: Buffer
Trigger: Post published

App 2: Discord (Webhooks)
Action: Send message
Webhook URL: [your webhook]
Message: 📢 New post: {{message}} {{link}}
```

### Recipe 2: Email to Discord
```
App 1: Mailerlite (or your email tool)
Trigger: New subscriber

App 2: Discord
Action: Send message
Message: 🎉 New subscriber joined! Total: {{subscriber_count}}
```

### Recipe 3: Track Everything
```
App 1: Twitter
Trigger: New tweet by me

App 2: Google Sheets
Action: Create row
Columns: Date, Tweet, Link
```

### Recipe 4: Reddit Reminder
```
App 1: Buffer
Trigger: Post published

App 2: Todoist/Notion
Action: Create task
Task: "Cross-post to Reddit: {{message}}"
Due: Today
```

---

## Quick Reference: The 15-Minute Daily Routine

**Morning (5 min):**
1. Open TTLU, find interesting stat
2. Write one post in Buffer
3. Schedule for optimal time
4. Auto-distributes to 4 platforms
5. Manually post to Reddit (2 min)

**Game Time (5 min total):**
1. Tweet live insights (Buffer mobile)
2. Discord auto-updates
3. Screenshot good moments for tomorrow

**Night (5 min):**
1. Check engagement across platforms
2. Reply to comments (builds algorithm favor)
3. Queue tomorrow's morning post if inspired

**Weekly (2 hours Sunday):**
1. Batch create 7 days of content
2. Schedule all in Buffer
3. Prep TikTok videos for the week
4. Review what worked last week

---

## Tools Cheat Sheet

| Need | Free Tool | Paid Upgrade |
|------|-----------|--------------|
| Multi-platform scheduling | Buffer | Buffer Essentials ($6/mo) |
| TikTok scheduling | Later | Later Growth ($25/mo) |
| Video repurposing | Manual download | Repurpose.io ($25/mo) |
| Automation/connections | Zapier (100 tasks) | Zapier Starter ($20/mo) |
| Graphics | Canva Free | Canva Pro ($13/mo) |
| Link tracking | Bitly Free | Bitly Core ($35/mo) |
| Discord bots | Webhooks | MEE6/Carl-bot (free) |

**Minimum Viable Stack (FREE):**
Buffer + Zapier + Canva + Discord Webhooks + Manual Reddit

**Recommended Stack (~$30/mo when scaling):**
Buffer + Repurpose.io + Canva Pro + Zapier

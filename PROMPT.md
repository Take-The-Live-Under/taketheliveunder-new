Build a production-ready web dashboard for taketheliveunder.com.

IMPORTANT: First step is to investigate the example data and any scripts inside the folder:
- ./basketball betting app
Read everything you need in that folder (scripts, sample outputs, json, csv, etc).
Use that as the source of truth for field names, how the ESPN data looks, how Odds API lines look, and how game IDs/team names are mapped.

SPORT: NCAA Men's Basketball only.

STACK DECISION:
- Use Next.js (App Router) + TypeScript + Tailwind.
- Build to deploy on Vercel.

DATA INPUTS:
- I already have a script that pulls:
  1) live NCAA games from ESPN
  2) live over/under lines from The Odds API
You must integrate using the simplest working approach:
Preferred: Build Next.js API routes that fetch ESPN + Odds API directly using the same logic you find in ./basketball betting app.
If there are working scripts already, reuse them (or port them) instead of reinventing.

ENV VARS:
- ODDS_API_KEY (required)
- PASSWORD (optional; if set, gate the page behind a simple password screen)
Create .env.example and document setup in README.

UI REQUIREMENTS:
- Page with two tabs:
  1) Triggered Games
  2) All Games
- Auto-refresh every 15 seconds.
- Each game row must show:
  - Matchup (Away @ Home)
  - Game status + live clock
  - Score (away-home)
  - Live total points
  - Live O/U line (Odds API)
  - Current PPM
  - Required PPM (PPM needed to reach the live O/U line)
  - Minutes remaining (regulation only)
  - Trigger highlight

MATH DEFINITIONS (do not deviate):
Let:
- total_points = away_score + home_score
- regulation_minutes = 40.0
- minutes_remaining_regulation comes from ESPN live clock (do not assume)
- minutes_elapsed = regulation_minutes - minutes_remaining_regulation
Then:
- Current PPM = total_points / minutes_elapsed
- Points Needed = max(live_ou_line - total_points, 0)
- Required PPM = Points Needed / minutes_remaining_regulation
Edge cases:
- If minutes_elapsed <= 0, Current PPM is "—"
- If minutes_remaining_regulation <= 0, Required PPM is "—"
- If live_ou_line missing, Required PPM is "—"

TRIGGER LOGIC (Triggered Games tab):
Show ONLY games that satisfy all:
- Game is live (in progress)
- minutes_remaining_regulation < 29.0
- Required PPM >= 4.5
- Exclude overtime games entirely from Triggered.
Overtime detection must use ESPN fields (period/OT indicator) from your discovered data.

ALL GAMES tab:
- Show all games for the day you can parse.
- Overtime games can appear here but must be labeled "OT".

PASSWORD GATE (optional):
- If PASSWORD is set, require a simple password screen before showing tabs.
- Keep it simple (not enterprise auth).

ENGINEERING REQUIREMENTS:
- Normalize into a single Game type:
  id, startTime, status, period, clock, minutesRemainingReg,
  awayTeam, homeTeam, awayScore, homeScore,
  liveTotal, ouLine, currentPPM, requiredPPM,
  triggeredFlag, isOvertime
- Robust parser + graceful error handling.
- Sorting: Required PPM desc by default in Triggered tab.
- Search box for team name.

DELIVERABLES:
- Working Next.js app.
- README with:
  - how to run locally
  - env vars
  - where data comes from
  - trigger math
- Make small commits.

STOP CONDITION:
When both tabs work locally and computations match definitions, output: DONE

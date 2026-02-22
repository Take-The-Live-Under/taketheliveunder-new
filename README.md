# Take The Live Under - Monorepo 🏀

An intelligent, real-time NCAA basketball betting monitoring system with smart confidence scoring, built as a Turborepo monorepo.

## Project Structure

This project is structured as a **Turborepo** monorepo to gracefully manage multiple applications from a single codebase.

```
taketheliveunder/
├── apps/
│   ├── api/             # Python FastAPI Backend (Port: 8000)
│   ├── monitor/         # Python Background Tracker/Monitor
│   ├── marketing-site/  # Next.js 16 Marketing Frontend (Port: 3001)
│   └── product-site/    # Next.js 14 Main Dashboard Frontend (Port: 3000)
├── turbo.json           # Turborepo configuration
├── package.json         # Root package file for workspace management
└── .gitignore           # Root gitignore rules applied recursively to all apps
```

## Features

### 📊 Smart Confidence Scoring
- Analyzes team statistics (pace, efficiency, shooting, defense)
- Calculates confidence scores (0-100) for betting opportunities
- Recommends unit sizing (0.5, 1, 2, or 3 units) based on confidence
- Detailed breakdown showing how each factor contributes to the score

### 🎯 Live Game Monitoring
- Polls The Odds API every 30 seconds for live game data and odds
- Calculates Required PPM (Points Per Minute) to hit Over/Under
- Triggers alerts when PPM > 4.5
- Real-time updates in dashboard
- Includes live betting odds from major sportsbooks

### 📈 Dual Data Sources
- **KenPom** (Recommended): Premium advanced metrics (requires subscription ~$20/year)
- **ESPN** (Free): Calculated metrics from box score data
- Easy config toggle between sources

### 📝 Comprehensive Logging
- CSV and Database logging of every 30-second poll
- Historical accuracy tracking
- Trigger logging with Admin panel export capability

## Tech Stack

- **Backend (API + Monitor)**: Python 3.13, FastAPI
- **Frontend (Product App)**: Next.js 14, TailwindCSS, TypeScript, Supabase
- **Frontend (Marketing Site)**: Next.js 16, Tailwind v4, Framer Motion, Three.js
- **Monorepo Management**: Turborepo, npm workspaces
- **Data Sources**: The Odds API (live games & odds), KenPom or ESPN (team stats)

## Quick Start (Local Development)

### Prerequisites
1. **Node.js** (v18+)
2. **Python 3.13** (required for `api` and `monitor` compatibilities)
3. **The Odds API Key** (required)
   - Sign up at https://the-odds-api.com
4. **KenPom Subscription** (optional but recommended)
   - Subscribe at https://kenpom.com
   - Or use free ESPN data source
5. **Supabase Database** (required for new logging structure)
   - Set up project at https://supabase.com

### Installation & Running

Thanks to **Turborepo**, setting up and running all applications is streamlined into root-level commands.

1. **Clone the repository**:
```bash
git clone git@github.com:Take-The-Live-Under/taketheliveunder-new.git
cd taketheliveunder
```

2. **Install node dependencies (this links the workspaces)**:
```bash
npm install
```

3. **Configure Environment Variables**:
   - For `apps/product-site`: Create `.env.local` using `.env.example` as a template and provide your Supabase details.
   - For `apps/api`: Create `.env.local` with your Odds API key, KenPom credentials, etc.

4. **Start the Monorepo Development Environment**:
```bash
npm run dev
# or
turbo run dev
```
*This command will automatically:*
- Set up the Python virtual environments (`venv`) for the `api` and `monitor` apps.
- Install the required Python packages (`requirements.txt`).
- Spin up the Next.js product dashboard (`apps/product-site` on http://localhost:3000).
- Spin up the Next.js marketing site (`apps/marketing-site` on http://localhost:3001).
- Spin up the FastAPI backend (`apps/api` on http://localhost:8000).
- Start the live monitoring script (`apps/monitor`).

## Building for Production

To build all applications in the monorepo:

```bash
npm run build
# or
turbo run build
```

## Confidence Scoring Logic

Base score starts at 50 (trigger met), then:

**Pace Analysis** (+12, +5, or -10 per team):
- Slow pace (< 67 poss/game): Bonus
- Fast pace (> 72): Penalty

**3-Point Analysis** (+8, -5):
- Low attempt rate (< 30%): Bonus
- High accuracy (> 38%): Penalty

**Defense** (+10 per team):
- Strong defense (< 95 pts/100 poss): Bonus

**Matchup Bonuses** (+15, +10, -5):
- Both teams slow: Big bonus
- Both strong defense: Bonus
- Pace mismatch: Penalty

**PPM Severity** (+0 to +15):
- Higher required PPM = more confident in under

Final score capped at 0-100.

## Support & Usage

- **Product Dashboard**: Access via `http://localhost:3000` to see real-time triggers, confidence scores, and live pipelines.
- **Admin**: Access via `http://localhost:3000/admin` to view historical trigger logs, export CSVs, and more.
- **Marketing Site**: Access via `http://localhost:3001` to view your marketing landing pages.

## License

Private use only.

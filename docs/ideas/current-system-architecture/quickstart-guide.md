# NCAA Basketball Live Betting Monitor - Monorepo Quickstart Guide 🏀

This project manages an intelligent, real-time NCAA basketball betting monitor and its frontend dashboard using a **Turborepo** monorepo structure.

## Repository Structure

The codebase is split into specific apps:
- `apps/web/`: The Next.js 14 frontend dashboard.
- `apps/data-pipeline/`: The Python FastAPI backend and continuous monitoring scripts.
- `apps/marketing/`: Documentation, budget tracking, and product marketing plans.

---

## 🚀 Step 1: Root Initialization

First, install the Node dependencies needed for Turborepo and the web frontend. This handles all Next.js packaging.

```bash
# In the root of the repository:
npm install
```

---

## ⚙️ Step 2: Environment Configuration

Because this is a monorepo, **each app needs its own environment file** (`.env.local`). Avoid dropping a generic `.env` in the root.

### 1. Web Frontend Environment (`apps/web/.env.local`)
Create `apps/web/.env.local` and add the following required variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"

# External API Keys
ODDS_API_KEY="your-odds-api-key"
KENPOM_API_KEY="your-kenpom-api-key"

# Backend API Configuration
NEXT_PUBLIC_API_URL="http://localhost:8000"

# Authentication & Security
PASSWORD="your-admin-password"
JWT_SECRET="ttlu-secret-key-change-in-production"
```

### 2. Data Pipeline Environment (`apps/data-pipeline/.env.local`)
Create `apps/data-pipeline/.env.local` and add the following required variables:

```env
# Data Source Configuration
USE_KENPOM="true" # or "false" to use free ESPN data
KENPOM_EMAIL="your-email@example.com"
KENPOM_PASSWORD="your-kenpom-password"
ODDS_API_KEY="your-odds-api-key"
OPENAI_API_KEY="your-openai-api-key" # required for AI summaries

# API Configuration
API_HOST="0.0.0.0"
API_PORT="8000"
SECRET_KEY="change-this-to-a-random-secret-key"
ALLOWED_ORIGINS="http://localhost:3000"

# Application Settings
ENVIRONMENT="development"
SPORT_MODE="basketball_ncaab" # or adjust to intended sport
DEFAULT_SPORTSBOOK="fanduel"
```

---

## 🐍 Step 3: Data Pipeline Setup (Python Backend)

The Python backend and monitor scripts need their own virtual environment to avoid version collisions.

```bash
# Ensure you are inside the data-pipeline app directory:
cd apps/data-pipeline

# Create the virtual environment
python3 -m venv venv

# Activate it (Mac/Linux)
source venv/bin/activate
# Or on Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## 🚦 Step 4: Running the Application Locally

You need to run three separate processes to have the full system functional: the Next.js frontend, the FastAPI backend, and the monitoring script. Open **three separate terminal window tabs**.

### Terminal 1: Web Frontend
Turborepo handles starting the Next.js dev server.
```bash
# Run this from the ROOT directory of the repository:
npm run dev
# Dashboard will be available at http://localhost:3000
```

### Terminal 2: FastAPI Backend
Provides the JSON API endpoints used by the React dashboard.
```bash
# Run this from the apps/data-pipeline directory:
cd apps/data-pipeline
source venv/bin/activate

python api/main.py
# API runs on http://localhost:8000
```

### Terminal 3: Polling Monitor
Continuously polls sports data providers and logs events to CSV files in `/data/`.
```bash
# Run this from the apps/data-pipeline directory:
cd apps/data-pipeline
source venv/bin/activate

python monitor.py
```

---

## Support & Troubleshooting

- **Team Stats not loading**: Check that the `apps/data-pipeline/data/` folder directory exists, or manually refresh stats by running `python -c "from utils.team_stats import get_stats_manager; get_stats_manager().fetch_all_stats(force_refresh=True)"` inside `apps/data-pipeline` using your activated `venv`.
- **No live games showing**: Check your Odds API quota limits on The Odds API dashboard.
- **Next.js crashes on start**: Ensure `apps/web/.env.local` exists and contains valid required keys.

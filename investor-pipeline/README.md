# Investor Prospecting Pipeline

A Python pipeline for discovering and enriching investor prospects in the sports betting/gaming space.

## Overview

This pipeline:
1. **Discovers prospects** from multiple sources (Google Search, GitHub, Wellfound, Crunchbase, Podcasts, Conferences)
2. **Deduplicates** across sources by email, LinkedIn URL, and name+company
3. **Enriches** with contact information using Hunter.io or Apollo.io
4. **Classifies** into buckets with confidence scores
5. **Outputs** daily and master CSV files

## Target: 100 prospects/day for 14 days = 1,400 total prospects

## Installation

```bash
# Navigate to the pipeline directory
cd investor-pipeline

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

1. Copy and edit the config file:
```bash
cp config.yaml config.local.yaml
```

2. Set API keys via environment variables or directly in config:

```bash
# Required for enrichment (choose one)
export HUNTER_API_KEY=your-hunter-key
export APOLLO_API_KEY=your-apollo-key

# Optional (for source APIs)
export GOOGLE_SEARCH_API_KEY=your-google-key
export GOOGLE_SEARCH_ENGINE_ID=your-cx-id
export GITHUB_TOKEN=your-github-token
export CRUNCHBASE_API_KEY=your-crunchbase-key
```

## Usage

### Run Full Pipeline (14 days)
```bash
python pipeline.py
```

### Run Single Day
```bash
python pipeline.py --day 1
```

### Resume from Specific Day
```bash
python pipeline.py --start-day 5
```

### Verbose Output
```bash
python pipeline.py -v
```

### Custom Config
```bash
python pipeline.py --config config.local.yaml
```

## Output

Files are written to the `output/` directory:

- `day01_20240115_prospects.csv` - Daily prospects
- `day02_20240116_prospects.csv`
- ...
- `master_prospects_20240128.csv` - All unique prospects combined

### CSV Columns

| Column | Description |
|--------|-------------|
| name | Full name |
| email | Email address (if found) |
| company | Current company |
| title | Job title |
| linkedin_url | LinkedIn profile URL |
| source | Where we found them (google_search, github, etc.) |
| bucket | Classification (sportsbetting_ops, angels, etc.) |
| confidence | Score 0-100 |
| geography | Location if known |
| notes | Additional context |
| enriched | Yes/No if email was enriched |
| date_added | When they were added |

## Prospect Buckets

1. **sportsbetting_ops** - Current operators at sportsbooks
2. **sportsbook_alumni** - Former sportsbook employees
3. **data_science_leaders** - Data science/analytics leaders
4. **angels** - Angel investors in the space
5. **exited_founders** - Founders with successful exits

## Data Sources

### Google Custom Search
- Searches for LinkedIn profiles and public mentions
- Uses configured keywords and target titles
- Requires Google Custom Search API key

### GitHub
- Finds developers of sports analytics projects
- Searches by topic, bio, and organization
- Works with or without authentication

### Wellfound (AngelList)
- Scrapes public company and investor profiles
- No authentication required
- Respects rate limits

### Crunchbase
- Finds founders, executives, and investors
- Searches by company and keyword
- Requires API key for full access

### Podcasts
- Finds podcast guests from industry shows
- Extracts names from episode titles
- Searches multiple podcast directories

### Conferences
- Finds speakers from industry conferences
- Scrapes public speaker pages
- Targets major gaming/betting events

## Enrichment Providers

### Hunter.io
- Email finder and verifier
- Pattern-based email generation
- Free tier: 25 requests/month

### Apollo.io
- Full contact enrichment
- LinkedIn-based lookup
- More generous API limits

## Customization

### Adding Keywords
Edit `config.yaml`:
```yaml
keywords:
  primary:
    - your new keyword
```

### Adding Target Companies
```yaml
seed_companies:
  - name: "New Company"
    domain: "newcompany.com"
```

### Adjusting Daily Goal
```yaml
pipeline:
  daily_goal: 150  # Increase to 150/day
```

### Switching Enrichment Provider
```yaml
enrichment:
  provider: apollo  # or hunter
```

## Troubleshooting

### No prospects found
- Check API keys are set correctly
- Verify network connectivity
- Check logs for rate limiting

### Low confidence scores
- Add more specific keywords
- Focus on fewer, better-targeted companies

### Missing emails
- Upgrade to paid enrichment tier
- Try alternative enrichment provider
- Some prospects genuinely have no public email

### Rate limiting
- Reduce `rate_limit_per_minute` in config
- Space out pipeline runs
- Use authenticated APIs when available

## Project Structure

```
investor-pipeline/
├── config.yaml         # Configuration
├── pipeline.py         # Main orchestrator
├── requirements.txt    # Dependencies
├── README.md          # This file
├── sources/           # Data source modules
│   ├── __init__.py
│   ├── base.py        # Base class
│   ├── google_search.py
│   ├── github.py
│   ├── wellfound.py
│   ├── crunchbase.py
│   ├── podcasts.py
│   └── conferences.py
├── enrich/            # Enrichment modules
│   ├── __init__.py
│   ├── base.py
│   ├── hunter.py
│   └── apollo.py
├── utils/             # Utilities
│   ├── __init__.py
│   ├── config.py
│   ├── dedup.py
│   ├── rate_limiter.py
│   └── logger.py
└── output/            # CSV output (gitignored)
```

## Legal & Ethical Considerations

- This pipeline only accesses **publicly available** information
- No LinkedIn scraping or authenticated content access
- Respects robots.txt and rate limits
- Uses official APIs where available
- Complies with GDPR for EU prospects (no data retention beyond necessity)

## License

Internal use only.

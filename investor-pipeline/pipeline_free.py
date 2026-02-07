#!/usr/bin/env python3
"""
Free-Tier Investor Prospecting Pipeline

Optimized for zero/minimal cost:
- GitHub API (free, 60 req/hr unauthenticated)
- Hunter.io (25 free lookups/month - used sparingly)
- Manual CSV import for prospects you find
"""

import csv
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FreePipeline:
    """Budget-friendly prospecting pipeline."""

    def __init__(self, hunter_api_key: str = None):
        self.hunter_api_key = hunter_api_key or os.environ.get('HUNTER_API_KEY')
        self.output_dir = Path('output')
        self.output_dir.mkdir(exist_ok=True)

        self.prospects = []
        self.seen_names = set()

        # Sports betting related search terms
        self.github_topics = [
            'sports-betting',
            'sports-analytics',
            'betting-odds',
            'sportsbook',
            'nba-analytics',
            'nfl-analytics',
            'fantasy-sports',
        ]

    def fetch_github_users(self, limit: int = 50) -> List[Dict]:
        """
        Fetch users from GitHub who work in sports analytics.
        FREE: 60 requests/hour without auth.
        """
        logger.info("Fetching from GitHub (free tier)...")
        users = []
        seen = set()

        for topic in self.github_topics:
            if len(users) >= limit:
                break

            # Search for users with topic in bio
            url = "https://api.github.com/search/users"
            params = {'q': f'{topic} in:bio', 'per_page': 10}

            try:
                resp = requests.get(url, params=params, timeout=30)
                if resp.status_code == 403:
                    logger.warning("GitHub rate limit hit, waiting...")
                    break
                resp.raise_for_status()

                for user in resp.json().get('items', []):
                    username = user.get('login')
                    if username in seen:
                        continue
                    seen.add(username)

                    # Get user details
                    detail_resp = requests.get(
                        f"https://api.github.com/users/{username}",
                        timeout=30
                    )
                    if detail_resp.status_code != 200:
                        continue

                    details = detail_resp.json()
                    name = details.get('name') or username

                    # Skip if no real name
                    if name == username and not details.get('company'):
                        continue

                    users.append({
                        'name': name,
                        'email': details.get('email'),  # Often public
                        'company': (details.get('company') or '').lstrip('@'),
                        'title': self._extract_title(details.get('bio', '')),
                        'linkedin_url': self._extract_linkedin(details.get('bio', '')),
                        'source': 'github',
                        'source_url': f"https://github.com/{username}",
                        'notes': details.get('bio', '')[:200] if details.get('bio') else f"GitHub: {topic}",
                        'location': details.get('location', ''),
                    })

                    if len(users) >= limit:
                        break

            except Exception as e:
                logger.error(f"GitHub error: {e}")
                continue

        logger.info(f"  Found {len(users)} prospects from GitHub")
        return users

    def _extract_title(self, bio: str) -> str:
        """Extract job title from bio."""
        if not bio:
            return ""
        patterns = [
            r'(CEO|CTO|Founder|Co-Founder|Director|VP|Head of \w+)',
            r'(Data Scientist|ML Engineer|Software Engineer|Analyst)',
        ]
        for pattern in patterns:
            match = re.search(pattern, bio, re.IGNORECASE)
            if match:
                return match.group(1)
        return ""

    def _extract_linkedin(self, text: str) -> Optional[str]:
        """Extract LinkedIn URL from text."""
        if not text:
            return None
        match = re.search(r'linkedin\.com/in/([^\s/]+)', text, re.I)
        if match:
            return f"https://linkedin.com/in/{match.group(1)}"
        return None

    def load_manual_csv(self, csv_path: str) -> List[Dict]:
        """
        Load manually-found prospects from CSV.

        CSV format: name,company,title,linkedin_url,notes
        """
        if not os.path.exists(csv_path):
            logger.info(f"No manual CSV at {csv_path}")
            return []

        prospects = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                prospects.append({
                    'name': row.get('name', ''),
                    'email': row.get('email', ''),
                    'company': row.get('company', ''),
                    'title': row.get('title', ''),
                    'linkedin_url': row.get('linkedin_url', ''),
                    'source': 'manual',
                    'source_url': '',
                    'notes': row.get('notes', ''),
                    'location': row.get('location', ''),
                })

        logger.info(f"  Loaded {len(prospects)} prospects from manual CSV")
        return prospects

    def enrich_with_hunter(self, prospects: List[Dict], max_lookups: int = 10) -> List[Dict]:
        """
        Enrich top prospects with Hunter.io (25 free/month).
        Only enriches prospects WITHOUT email.
        """
        if not self.hunter_api_key:
            logger.warning("No Hunter API key - skipping enrichment")
            return prospects

        # Only enrich prospects without emails
        needs_email = [p for p in prospects if not p.get('email') and p.get('company')]

        # Limit to max_lookups to preserve free credits
        to_enrich = needs_email[:max_lookups]

        logger.info(f"Enriching {len(to_enrich)} prospects with Hunter (free tier)...")

        for prospect in to_enrich:
            name_parts = prospect['name'].split()
            if len(name_parts) < 2:
                continue

            first_name = name_parts[0]
            last_name = name_parts[-1]

            # Guess domain from company
            company = prospect['company']
            domain = re.sub(r'[^\w]', '', company.lower()) + '.com'

            try:
                url = "https://api.hunter.io/v2/email-finder"
                params = {
                    'domain': domain,
                    'first_name': first_name,
                    'last_name': last_name,
                    'api_key': self.hunter_api_key,
                }
                resp = requests.get(url, params=params, timeout=30)

                if resp.status_code == 200:
                    data = resp.json().get('data', {})
                    if data.get('email'):
                        prospect['email'] = data['email']
                        prospect['email_confidence'] = data.get('score', 0)
                        logger.info(f"  Found email for {prospect['name']}: {data['email']}")

            except Exception as e:
                logger.error(f"Hunter error for {prospect['name']}: {e}")
                continue

        return prospects

    def classify_bucket(self, prospect: Dict) -> str:
        """Classify prospect into a bucket."""
        title = (prospect.get('title') or '').lower()
        company = (prospect.get('company') or '').lower()
        notes = (prospect.get('notes') or '').lower()

        # Check for sportsbook companies
        sportsbooks = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet', 'fanatics']
        for sb in sportsbooks:
            if sb in company or sb in notes:
                if 'former' in notes or 'ex-' in notes:
                    return 'sportsbook_alumni'
                return 'sportsbetting_ops'

        # Check for data science
        if any(kw in title for kw in ['data', 'analytics', 'ml', 'scientist']):
            return 'data_science_leaders'

        # Check for investors
        if any(kw in title for kw in ['angel', 'investor', 'partner', 'venture']):
            return 'angels'

        # Check for founders
        if any(kw in title for kw in ['founder', 'ceo', 'exited']):
            return 'exited_founders'

        return 'data_science_leaders'  # Default

    def calculate_confidence(self, prospect: Dict) -> int:
        """Calculate confidence score 0-100."""
        score = 20  # Base

        if prospect.get('email'):
            score += 35
        if prospect.get('linkedin_url'):
            score += 25
        if prospect.get('company'):
            score += 10
        if prospect.get('title'):
            score += 10

        return min(100, score)

    def deduplicate(self, prospects: List[Dict]) -> List[Dict]:
        """Remove duplicate prospects."""
        unique = []
        for p in prospects:
            key = p['name'].lower().strip()
            if key not in self.seen_names and len(key) > 2:
                self.seen_names.add(key)
                unique.append(p)
        return unique

    def run(self, manual_csv: str = None, hunter_lookups: int = 10) -> str:
        """
        Run the free pipeline.

        Args:
            manual_csv: Path to manual prospects CSV
            hunter_lookups: Max Hunter API calls (default 10, max 25/month free)

        Returns:
            Path to output CSV
        """
        logger.info("=" * 50)
        logger.info("RUNNING FREE TIER PIPELINE")
        logger.info("=" * 50)

        all_prospects = []

        # 1. GitHub (free)
        github_prospects = self.fetch_github_users(limit=50)
        all_prospects.extend(github_prospects)

        # 2. Manual CSV if provided
        if manual_csv:
            manual_prospects = self.load_manual_csv(manual_csv)
            all_prospects.extend(manual_prospects)

        # 3. Deduplicate
        unique = self.deduplicate(all_prospects)
        logger.info(f"Total unique prospects: {len(unique)}")

        # 4. Classify and score
        for p in unique:
            p['bucket'] = self.classify_bucket(p)
            p['confidence'] = self.calculate_confidence(p)

        # 5. Sort by confidence (highest first)
        unique.sort(key=lambda x: x['confidence'], reverse=True)

        # 6. Enrich top prospects with Hunter (uses free credits)
        unique = self.enrich_with_hunter(unique, max_lookups=hunter_lookups)

        # Re-score after enrichment
        for p in unique:
            p['confidence'] = self.calculate_confidence(p)

        # 7. Write output
        output_path = self.output_dir / f"prospects_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

        fieldnames = [
            'name', 'email', 'company', 'title', 'linkedin_url',
            'source', 'bucket', 'confidence', 'location', 'notes'
        ]

        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(unique)

        # Summary
        with_email = sum(1 for p in unique if p.get('email'))

        logger.info("")
        logger.info("=" * 50)
        logger.info("PIPELINE COMPLETE")
        logger.info("=" * 50)
        logger.info(f"Total prospects: {len(unique)}")
        logger.info(f"With email: {with_email}")
        logger.info(f"Output: {output_path}")
        logger.info("")
        logger.info("Bucket breakdown:")
        buckets = {}
        for p in unique:
            b = p['bucket']
            buckets[b] = buckets.get(b, 0) + 1
        for bucket, count in sorted(buckets.items()):
            logger.info(f"  {bucket}: {count}")

        return str(output_path)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Free-tier Investor Pipeline')
    parser.add_argument('--manual-csv', '-m', help='Path to manual prospects CSV')
    parser.add_argument('--hunter-lookups', '-l', type=int, default=10,
                       help='Max Hunter lookups (default 10, save credits)')
    parser.add_argument('--hunter-key', '-k', help='Hunter API key (or set HUNTER_API_KEY env)')

    args = parser.parse_args()

    pipeline = FreePipeline(hunter_api_key=args.hunter_key)
    pipeline.run(
        manual_csv=args.manual_csv,
        hunter_lookups=args.hunter_lookups
    )


if __name__ == '__main__':
    main()

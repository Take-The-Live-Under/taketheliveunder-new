"""Podcast source for finding sports betting industry speakers and guests."""

import re
import logging
from typing import Any, Dict, List, Optional
from bs4 import BeautifulSoup

from .base import BaseSource, SourceResult
from utils.config import get_api_key

logger = logging.getLogger(__name__)


class PodcastSource(BaseSource):
    """
    Podcast guest discovery source.

    Finds industry experts and investors who have appeared on
    sports betting and gaming podcasts.
    """

    name = "podcasts"
    rate_limit_per_minute = 15

    def _init_from_config(self):
        """Initialize from configuration."""
        source_config = self.config.get('sources', {}).get('podcasts', {})
        self.target_podcasts = source_config.get('shows', [])

        # Default podcast shows if not configured
        if not self.target_podcasts:
            self.target_podcasts = [
                {'name': 'The Betting Startups Podcast', 'feed': None},
                {'name': 'iGaming Next', 'feed': None},
                {'name': 'Sports Betting Dime', 'feed': None},
                {'name': 'SBC Podcast', 'feed': None},
                {'name': 'The Action Network Podcast', 'feed': None},
                {'name': 'Bet The Process', 'feed': None},
                {'name': 'Gaming in America', 'feed': None},
            ]

        self.keywords = self.config.get('keywords', {}).get('primary', [])

        # Update headers for web requests
        self.session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        })

    def _search_listen_notes(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Search ListenNotes for podcast episodes (uses free tier).

        Args:
            query: Search query
            limit: Max results

        Returns:
            List of episode data
        """
        # ListenNotes has a paid API, but we can try their public search
        # This is a simplified version - in production, use their API
        url = "https://www.listennotes.com/search/"
        params = {
            'q': query,
            'type': 'episode',
        }

        response = self._make_request(url, params=params)
        if not response:
            return []

        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            episodes = []

            # Find episode cards
            cards = soup.find_all('div', class_=re.compile(r'episode', re.I))[:limit]

            for card in cards:
                title_elem = card.find(['h2', 'h3', 'a'], class_=re.compile(r'title', re.I))
                title = title_elem.get_text(strip=True) if title_elem else ""

                podcast_elem = card.find(['span', 'p'], class_=re.compile(r'podcast', re.I))
                podcast_name = podcast_elem.get_text(strip=True) if podcast_elem else ""

                desc_elem = card.find(['p', 'div'], class_=re.compile(r'desc', re.I))
                description = desc_elem.get_text(strip=True) if desc_elem else ""

                link_elem = card.find('a', href=True)
                url = link_elem['href'] if link_elem else ""

                if title:
                    episodes.append({
                        'title': title,
                        'podcast': podcast_name,
                        'description': description,
                        'url': url,
                    })

            return episodes

        except Exception as e:
            logger.error(f"Error parsing ListenNotes: {e}")
            return []

    def _search_google_podcasts(self, query: str) -> List[Dict]:
        """
        Search for podcast episodes via Google.

        Args:
            query: Search query

        Returns:
            List of episode info
        """
        # Use a targeted Google search for podcast content
        search_url = f"https://www.google.com/search"
        params = {
            'q': f'{query} site:podcasts.apple.com OR site:open.spotify.com/episode',
        }

        response = self._make_request(search_url, params=params)
        if not response:
            return []

        results = []
        try:
            soup = BeautifulSoup(response.text, 'html.parser')

            # Parse Google results
            for result in soup.find_all('div', class_='g')[:10]:
                title_elem = result.find('h3')
                title = title_elem.get_text(strip=True) if title_elem else ""

                link_elem = result.find('a', href=True)
                url = link_elem['href'] if link_elem else ""

                snippet_elem = result.find('div', class_=re.compile(r'VwiC3b', re.I))
                snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""

                if title and 'podcast' in title.lower():
                    results.append({
                        'title': title,
                        'url': url,
                        'description': snippet,
                    })

        except Exception as e:
            logger.error(f"Error parsing Google podcast search: {e}")

        return results

    def _extract_guest_from_title(self, title: str, description: str = "") -> Optional[Dict]:
        """
        Extract guest name from episode title.

        Common patterns:
        - "Episode 123: John Smith on Sports Betting"
        - "Interview with Jane Doe, CEO of Company"
        - "John Smith | Building the Future of Betting"

        Args:
            title: Episode title
            description: Episode description

        Returns:
            Dict with guest info or None
        """
        patterns = [
            # "with John Smith" pattern
            r'(?:with|featuring|ft\.?|interview:?)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            # "John Smith |" or "John Smith -" pattern
            r'^([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[\||\-]',
            # ": John Smith" pattern (after episode number)
            r'(?:Episode \d+)?:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)',
            # "John Smith, Title" pattern
            r'^([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(?:CEO|Founder|Director|VP)',
        ]

        name = None
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                potential_name = match.group(1).strip()
                # Validate it looks like a name (not common words)
                skip_words = ['the', 'and', 'for', 'how', 'why', 'what', 'episode']
                if potential_name.lower().split()[0] not in skip_words:
                    name = potential_name
                    break

        if not name:
            return None

        # Try to extract title/company from description
        person_title = ""
        company = ""

        title_patterns = [
            r'(CEO|CTO|Founder|Co-Founder|Director|VP|Partner|Head of [A-Za-z]+)',
            r'(?:of|at|from)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)',
        ]

        combined_text = f"{title} {description}"

        for pattern in title_patterns:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                if 'CEO' in pattern or 'CTO' in pattern:
                    person_title = match.group(1)
                else:
                    company = match.group(1).strip()[:50]

        return {
            'name': name,
            'title': person_title,
            'company': company,
        }

    def _extract_linkedin_from_notes(self, description: str) -> Optional[str]:
        """Extract LinkedIn URL from episode description."""
        linkedin_match = re.search(r'linkedin\.com/in/([^\s/\)]+)', description, re.I)
        if linkedin_match:
            return f"https://linkedin.com/in/{linkedin_match.group(1)}"
        return None

    def fetch(self, limit: int = 100) -> List[SourceResult]:
        """
        Fetch prospects from podcast episodes.

        Args:
            limit: Maximum number of prospects

        Returns:
            List of SourceResult objects
        """
        results = []
        seen_names = set()

        logger.info(f"Podcasts: Fetching prospects (limit: {limit})")

        # 1. Search for episodes about sports betting/gaming
        search_queries = [
            'sports betting CEO interview podcast',
            'sportsbook founder podcast episode',
            'gaming industry investor podcast',
            'sports analytics executive interview',
            'betting startup founder interview',
        ]

        for query in search_queries:
            if len(results) >= limit:
                break

            logger.debug(f"Podcasts: Searching '{query[:40]}...'")

            # Try ListenNotes first
            episodes = self._search_listen_notes(query, limit=10)

            # Fallback to Google
            if not episodes:
                episodes = self._search_google_podcasts(query)

            for episode in episodes:
                if len(results) >= limit:
                    break

                title = episode.get('title', '')
                description = episode.get('description', '')
                url = episode.get('url', '')

                # Extract guest info
                guest_info = self._extract_guest_from_title(title, description)
                if not guest_info:
                    continue

                name = guest_info['name']
                if name in seen_names:
                    continue
                seen_names.add(name)

                # Check for LinkedIn in description
                linkedin_url = self._extract_linkedin_from_notes(description)

                result = SourceResult(
                    name=name,
                    title=guest_info.get('title', ''),
                    company=guest_info.get('company', ''),
                    linkedin_url=linkedin_url,
                    source_url=url,
                    notes=f"Podcast guest: {title[:100]}",
                )

                if result.is_valid():
                    result = self.enrich_result(result)
                    results.append(result)

        # 2. Search for specific target podcasts
        for podcast in self.target_podcasts[:5]:
            if len(results) >= limit:
                break

            podcast_name = podcast.get('name', '')
            if not podcast_name:
                continue

            logger.debug(f"Podcasts: Searching show '{podcast_name}'")

            # Search for recent episodes
            query = f'"{podcast_name}" CEO OR founder OR investor interview'
            episodes = self._search_google_podcasts(query)

            for episode in episodes:
                if len(results) >= limit:
                    break

                guest_info = self._extract_guest_from_title(
                    episode.get('title', ''),
                    episode.get('description', '')
                )
                if not guest_info:
                    continue

                name = guest_info['name']
                if name in seen_names:
                    continue
                seen_names.add(name)

                result = SourceResult(
                    name=name,
                    title=guest_info.get('title', ''),
                    company=guest_info.get('company', ''),
                    source_url=episode.get('url', ''),
                    notes=f"Guest on {podcast_name}",
                )

                if result.is_valid():
                    result = self.enrich_result(result)
                    results.append(result)

        logger.info(f"Podcasts: Found {len(results)} prospects")
        return results

    def calculate_confidence(self, result: SourceResult) -> int:
        """Calculate confidence for podcast guest results."""
        score = 25  # Base score for podcast mentions

        if result.linkedin_url:
            score += 30

        if result.email:
            score += 25

        if result.company:
            score += 10

        if result.title:
            score += 10

        return min(100, score)

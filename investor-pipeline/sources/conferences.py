"""Conference speaker source for finding industry experts and investors."""

import re
import logging
from typing import Any, Dict, List, Optional
from bs4 import BeautifulSoup

from .base import BaseSource, SourceResult

logger = logging.getLogger(__name__)


class ConferenceSource(BaseSource):
    """
    Conference speaker discovery source.

    Finds speakers and panelists from sports betting and gaming conferences.
    Scrapes public speaker pages from conference websites.
    """

    name = "conferences"
    rate_limit_per_minute = 10  # Be respectful of conference sites

    def _init_from_config(self):
        """Initialize from configuration."""
        source_config = self.config.get('sources', {}).get('conferences', {})
        self.target_events = source_config.get('events', [])

        # Default conferences if not configured
        if not self.target_events:
            self.target_events = [
                {
                    'name': 'SBC Summit',
                    'url': 'https://sbcevents.com',
                    'speakers_path': '/speakers',
                },
                {
                    'name': 'ICE London',
                    'url': 'https://www.icelondon.uk.com',
                    'speakers_path': '/visiting/speakers',
                },
                {
                    'name': 'G2E Las Vegas',
                    'url': 'https://www.globalgamingexpo.com',
                    'speakers_path': '/education/speakers',
                },
                {
                    'name': 'Betting on Sports America',
                    'url': 'https://sbcevents.com/betting-on-sports-america',
                    'speakers_path': '/speakers',
                },
                {
                    'name': 'Sports Betting USA',
                    'url': 'https://www.terrapinn.com/conference/sports-betting-usa',
                    'speakers_path': '/speakers',
                },
            ]

        # Update headers for web scraping
        self.session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        })

    def _fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """
        Fetch and parse a web page.

        Args:
            url: Page URL

        Returns:
            BeautifulSoup object or None
        """
        response = self._make_request(url)
        if not response:
            return None

        try:
            return BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            logger.error(f"Error parsing page {url}: {e}")
            return None

    def _extract_speakers_from_page(self, soup: BeautifulSoup, event_name: str) -> List[SourceResult]:
        """
        Extract speaker information from a conference page.

        Args:
            soup: BeautifulSoup of speakers page
            event_name: Name of the conference

        Returns:
            List of SourceResult for speakers
        """
        results = []

        # Common patterns for speaker cards/sections
        speaker_patterns = [
            ('div', re.compile(r'speaker', re.I)),
            ('article', re.compile(r'speaker|person', re.I)),
            ('li', re.compile(r'speaker', re.I)),
            ('div', re.compile(r'team-member|person-card', re.I)),
        ]

        for tag, pattern in speaker_patterns:
            speakers = soup.find_all(tag, class_=pattern)
            if speakers:
                break
        else:
            # Fallback: look for any container with multiple h3/h4 tags
            speakers = soup.find_all('div', class_=re.compile(r'card|item|member', re.I))

        for speaker in speakers:
            # Extract name
            name_elem = speaker.find(['h2', 'h3', 'h4', 'span', 'p'], class_=re.compile(r'name|title', re.I))
            if not name_elem:
                name_elem = speaker.find(['h2', 'h3', 'h4'])

            name = ""
            if name_elem:
                name = name_elem.get_text(strip=True)
                # Clean up name
                name = re.sub(r'^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s*', '', name)

            if not name or len(name) < 3:
                continue

            # Validate it looks like a name (not a role)
            if any(word in name.lower() for word in ['keynote', 'panel', 'session', 'moderator']):
                continue

            # Extract title/role
            title_elem = speaker.find(['span', 'p', 'div'], class_=re.compile(r'role|position|job|title', re.I))
            if not title_elem:
                # Try next sibling after name
                title_elem = name_elem.find_next_sibling(['span', 'p']) if name_elem else None

            title = ""
            if title_elem:
                title = title_elem.get_text(strip=True)
                # Clean up common prefixes
                title = re.sub(r'^[\-\|]\s*', '', title)

            # Extract company
            company_elem = speaker.find(['span', 'p', 'div'], class_=re.compile(r'company|org|employer', re.I))
            company = ""
            if company_elem:
                company = company_elem.get_text(strip=True)
            elif title_elem:
                # Company might be after title with @ or "at"
                company_match = re.search(r'(?:@|at|,)\s*([A-Z][a-zA-Z\s]+)', title)
                if company_match:
                    company = company_match.group(1).strip()

            # Extract LinkedIn if available
            linkedin_link = speaker.find('a', href=re.compile(r'linkedin\.com', re.I))
            linkedin_url = linkedin_link.get('href') if linkedin_link else None

            # Get speaker page URL if available
            profile_link = speaker.find('a', href=True)
            source_url = profile_link.get('href', '') if profile_link else ""
            if source_url and not source_url.startswith('http'):
                source_url = ""  # Skip relative URLs

            result = SourceResult(
                name=name,
                title=title[:100] if title else "",
                company=company[:100] if company else "",
                linkedin_url=linkedin_url,
                source_url=source_url,
                notes=f"Speaker at {event_name}",
            )

            if result.is_valid():
                results.append(result)

        return results

    def _search_conference_speakers(self, query: str) -> List[Dict]:
        """
        Search Google for conference speaker pages.

        Args:
            query: Search query

        Returns:
            List of page info
        """
        # This is a fallback when we can't scrape directly
        search_url = "https://www.google.com/search"
        params = {
            'q': f'{query} speaker conference 2024 OR 2025',
        }

        response = self._make_request(search_url, params=params)
        if not response:
            return []

        results = []
        try:
            soup = BeautifulSoup(response.text, 'html.parser')

            for result in soup.find_all('div', class_='g')[:10]:
                title_elem = result.find('h3')
                title = title_elem.get_text(strip=True) if title_elem else ""

                link_elem = result.find('a', href=True)
                url = link_elem['href'] if link_elem else ""

                if title and url and 'speaker' in title.lower():
                    results.append({
                        'title': title,
                        'url': url,
                    })

        except Exception as e:
            logger.error(f"Error parsing Google conference search: {e}")

        return results

    def fetch(self, limit: int = 100) -> List[SourceResult]:
        """
        Fetch prospects from conference speaker pages.

        Args:
            limit: Maximum number of prospects

        Returns:
            List of SourceResult objects
        """
        results = []
        seen_names = set()

        logger.info(f"Conferences: Fetching prospects (limit: {limit})")

        # 1. Scrape target conference speaker pages
        for event in self.target_events:
            if len(results) >= limit:
                break

            event_name = event.get('name', '')
            base_url = event.get('url', '')
            speakers_path = event.get('speakers_path', '/speakers')

            if not base_url:
                continue

            speakers_url = f"{base_url.rstrip('/')}{speakers_path}"
            logger.debug(f"Conferences: Fetching '{event_name}' speakers")

            soup = self._fetch_page(speakers_url)
            if not soup:
                # Try without path
                soup = self._fetch_page(base_url)

            if not soup:
                continue

            speakers = self._extract_speakers_from_page(soup, event_name)

            for speaker in speakers:
                if len(results) >= limit:
                    break

                if speaker.name in seen_names:
                    continue
                seen_names.add(speaker.name)

                speaker = self.enrich_result(speaker)
                results.append(speaker)

        # 2. Search for additional conference speaker pages
        search_queries = [
            'sports betting summit speakers 2024',
            'igaming conference speakers',
            'gambling industry conference panelists',
            'fantasy sports conference speakers',
        ]

        for query in search_queries:
            if len(results) >= limit:
                break

            logger.debug(f"Conferences: Searching '{query[:40]}...'")
            pages = self._search_conference_speakers(query)

            for page in pages:
                if len(results) >= limit:
                    break

                url = page.get('url', '')
                if not url or 'speaker' not in url.lower():
                    continue

                soup = self._fetch_page(url)
                if not soup:
                    continue

                # Guess event name from page title
                title_elem = soup.find('title')
                event_name = title_elem.get_text(strip=True)[:50] if title_elem else "Industry Conference"

                speakers = self._extract_speakers_from_page(soup, event_name)

                for speaker in speakers:
                    if speaker.name in seen_names:
                        continue
                    seen_names.add(speaker.name)

                    speaker = self.enrich_result(speaker)
                    results.append(speaker)

                    if len(results) >= limit:
                        break

        logger.info(f"Conferences: Found {len(results)} prospects")
        return results

    def calculate_confidence(self, result: SourceResult) -> int:
        """Calculate confidence for conference speaker results."""
        score = 35  # Higher base for conference speakers (publicly validated)

        if result.linkedin_url:
            score += 25

        if result.email:
            score += 20

        if result.company:
            score += 10

        if result.title:
            score += 10

        return min(100, score)

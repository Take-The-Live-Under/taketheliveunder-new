"""Wellfound (formerly AngelList) source for investor discovery."""

import re
import logging
from typing import Any, Dict, List, Optional
from bs4 import BeautifulSoup

from .base import BaseSource, SourceResult

logger = logging.getLogger(__name__)


class WellfoundSource(BaseSource):
    """
    Wellfound (AngelList Talent) public page scraper.

    Fetches publicly available investor and startup founder profiles
    from Wellfound's public pages. Does NOT scrape authenticated content.
    """

    name = "wellfound"
    rate_limit_per_minute = 10  # Be respectful of their servers

    def _init_from_config(self):
        """Initialize from configuration."""
        self.base_url = "https://wellfound.com"

        # Update headers for web scraping
        self.session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        })

        self.keywords = self.config.get('keywords', {}).get('primary', [])
        self.seed_companies = [c['name'] for c in self.config.get('seed_companies', [])]

    def _fetch_public_page(self, url: str) -> Optional[BeautifulSoup]:
        """
        Fetch and parse a public Wellfound page.

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
            logger.error(f"Error parsing Wellfound page: {e}")
            return None

    def _search_companies(self, query: str) -> List[Dict]:
        """
        Search for companies on Wellfound.

        Uses their public search which doesn't require auth.

        Args:
            query: Search query

        Returns:
            List of company data
        """
        # Note: Wellfound's public API is limited, so we use their search page
        url = f"{self.base_url}/search?q={query}"

        soup = self._fetch_public_page(url)
        if not soup:
            return []

        companies = []
        # Look for company cards in search results
        # This structure may change - keeping it simple
        company_links = soup.find_all('a', href=re.compile(r'/company/'))

        for link in company_links[:20]:
            href = link.get('href', '')
            name = link.get_text(strip=True)
            if name and href:
                companies.append({
                    'name': name,
                    'url': f"{self.base_url}{href}" if not href.startswith('http') else href
                })

        return companies

    def _get_company_team(self, company_url: str) -> List[SourceResult]:
        """
        Get team members from a company's public page.

        Args:
            company_url: Company page URL

        Returns:
            List of SourceResult for team members
        """
        results = []

        soup = self._fetch_public_page(company_url)
        if not soup:
            return results

        # Look for team section
        # Wellfound structure varies - try multiple patterns
        team_sections = soup.find_all(['section', 'div'], class_=re.compile(r'team|founders|people', re.I))

        for section in team_sections:
            # Find people cards
            people = section.find_all(['div', 'article'], class_=re.compile(r'person|member|founder', re.I))

            for person in people:
                # Extract name
                name_elem = person.find(['h3', 'h4', 'span', 'a'], class_=re.compile(r'name', re.I))
                if not name_elem:
                    name_elem = person.find(['h3', 'h4'])

                name = name_elem.get_text(strip=True) if name_elem else ""

                # Extract title
                title_elem = person.find(['span', 'p', 'div'], class_=re.compile(r'title|role', re.I))
                title = title_elem.get_text(strip=True) if title_elem else ""

                # Extract LinkedIn if available
                linkedin_link = person.find('a', href=re.compile(r'linkedin\.com'))
                linkedin_url = linkedin_link.get('href') if linkedin_link else None

                if name:
                    results.append(SourceResult(
                        name=name,
                        title=title,
                        linkedin_url=linkedin_url,
                        source_url=company_url,
                        notes=f"Team member from Wellfound company page",
                    ))

        return results

    def _get_investor_profiles(self, query: str = "sports betting") -> List[SourceResult]:
        """
        Find investor profiles mentioning sports betting.

        Args:
            query: Search query

        Returns:
            List of SourceResult
        """
        results = []

        # Try to find investors through search
        url = f"{self.base_url}/search?q={query}+investor"

        soup = self._fetch_public_page(url)
        if not soup:
            return results

        # Look for people/investor profiles
        profile_links = soup.find_all('a', href=re.compile(r'/u/|/p/'))

        for link in profile_links[:30]:
            href = link.get('href', '')
            profile_url = f"{self.base_url}{href}" if not href.startswith('http') else href

            # Get profile page
            profile_soup = self._fetch_public_page(profile_url)
            if not profile_soup:
                continue

            # Extract profile info
            name_elem = profile_soup.find(['h1', 'h2'], class_=re.compile(r'name', re.I))
            name = name_elem.get_text(strip=True) if name_elem else ""

            title_elem = profile_soup.find(['span', 'p'], class_=re.compile(r'headline|title', re.I))
            title = title_elem.get_text(strip=True) if title_elem else ""

            bio_elem = profile_soup.find(['p', 'div'], class_=re.compile(r'bio|about', re.I))
            bio = bio_elem.get_text(strip=True)[:200] if bio_elem else ""

            linkedin_link = profile_soup.find('a', href=re.compile(r'linkedin\.com'))
            linkedin_url = linkedin_link.get('href') if linkedin_link else None

            if name:
                results.append(SourceResult(
                    name=name,
                    title=title,
                    linkedin_url=linkedin_url,
                    source_url=profile_url,
                    notes=bio,
                ))

        return results

    def fetch(self, limit: int = 100) -> List[SourceResult]:
        """
        Fetch prospects from Wellfound public pages.

        Args:
            limit: Maximum prospects

        Returns:
            List of SourceResult
        """
        results = []

        logger.info(f"Wellfound: Fetching prospects (limit: {limit})")

        # 1. Search for sports betting related companies and get their teams
        for keyword in self.keywords[:3]:
            if len(results) >= limit:
                break

            logger.debug(f"Wellfound: Searching '{keyword}'")
            companies = self._search_companies(keyword)

            for company in companies[:5]:
                if len(results) >= limit:
                    break

                team = self._get_company_team(company['url'])
                for member in team:
                    member.company = company['name']
                    member = self.enrich_result(member)
                    results.append(member)

                    if len(results) >= limit:
                        break

        # 2. Search for investor profiles
        for keyword in ['sports betting investor', 'gaming investor', 'sportsbook angel']:
            if len(results) >= limit:
                break

            investors = self._get_investor_profiles(keyword)
            for investor in investors:
                investor = self.enrich_result(investor)
                results.append(investor)

                if len(results) >= limit:
                    break

        logger.info(f"Wellfound: Found {len(results)} prospects")
        return results

    def calculate_confidence(self, result: SourceResult) -> int:
        """Calculate confidence for Wellfound results."""
        score = 30  # Base for Wellfound profiles

        if result.linkedin_url:
            score += 25

        if result.email:
            score += 25

        if result.title:
            score += 10

        if result.company:
            score += 10

        return min(100, score)

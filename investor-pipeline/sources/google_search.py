"""Google Custom Search API source for prospect discovery."""

import re
import logging
from typing import Any, Dict, List, Optional

from .base import BaseSource, SourceResult
from utils.config import get_api_key

logger = logging.getLogger(__name__)


class GoogleSearchSource(BaseSource):
    """
    Google Custom Search API source.

    Uses Google's programmable search to find investors and founders
    in the sports betting / analytics space.
    """

    name = "google_search"
    rate_limit_per_minute = 10  # Google API limit: 100 queries/day free tier

    def _init_from_config(self):
        """Initialize from configuration."""
        self.api_key = get_api_key(self.config, 'google_search_api_key')
        self.search_engine_id = get_api_key(self.config, 'google_search_engine_id')

        source_config = self.config.get('sources', {}).get('google_search', {})
        self.max_results_per_query = source_config.get('max_results_per_query', 50)

        # Build search queries from config
        self.keywords = self.config.get('keywords', {}).get('primary', [])
        self.titles = []
        for title_category in self.config.get('target_titles', {}).values():
            if isinstance(title_category, list):
                self.titles.extend(title_category)

        self.regions = self.config.get('geography', {}).get('primary_regions', [])

    def _build_search_queries(self) -> List[str]:
        """
        Build list of search queries to execute.

        Combines keywords, titles, and region filters.
        """
        queries = []

        # Query patterns
        patterns = [
            '"{title}" "{keyword}" investor',
            '"{title}" sports betting "{region}"',
            '"{keyword}" "angel investor" startup',
            '"{keyword}" founder CEO exited',
            'site:linkedin.com/in "{title}" "{keyword}"',
            '"{company}" alumni "{title}"',
        ]

        seed_companies = [c['name'] for c in self.config.get('seed_companies', [])]

        # Generate queries
        for pattern in patterns:
            for keyword in self.keywords[:5]:  # Limit keywords
                for title in self.titles[:5]:  # Limit titles
                    query = pattern.format(
                        title=title,
                        keyword=keyword,
                        region=self.regions[0] if self.regions else "USA",
                        company=seed_companies[0] if seed_companies else "DraftKings"
                    )
                    if query not in queries:
                        queries.append(query)

        # Add company-specific queries
        for company in seed_companies[:5]:
            queries.append(f'"{company}" former employee founder investor')
            queries.append(f'site:linkedin.com/in "{company}" "data science" director')

        return queries[:20]  # Limit total queries

    def _search(self, query: str, start: int = 1) -> List[Dict]:
        """
        Execute a single search query.

        Args:
            query: Search query string
            start: Starting index for pagination

        Returns:
            List of search result items
        """
        if not self.api_key or not self.search_engine_id:
            logger.warning("Google Search API credentials not configured")
            return []

        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': self.api_key,
            'cx': self.search_engine_id,
            'q': query,
            'start': start,
            'num': 10,  # Max per request
        }

        response = self._make_request(url, params=params)
        if not response:
            return []

        try:
            data = response.json()
            return data.get('items', [])
        except Exception as e:
            logger.error(f"Error parsing Google search response: {e}")
            return []

    def _extract_linkedin_profile(self, url: str, snippet: str, title: str) -> Optional[SourceResult]:
        """
        Extract prospect info from a LinkedIn search result.

        Args:
            url: LinkedIn profile URL
            snippet: Search result snippet
            title: Search result title

        Returns:
            SourceResult or None
        """
        # Parse LinkedIn URL
        linkedin_pattern = r'linkedin\.com/in/([^/?\s]+)'
        match = re.search(linkedin_pattern, url)
        if not match:
            return None

        # Extract name from title (usually "Name - Title - Company | LinkedIn")
        name_match = re.match(r'^([^-|]+)', title)
        if not name_match:
            return None

        name = name_match.group(1).strip()

        # Clean up name (remove "Dr.", "Jr.", etc.)
        name = re.sub(r'\b(Dr|Mr|Mrs|Ms|Jr|Sr)\b\.?', '', name).strip()

        if len(name) < 2:
            return None

        # Try to extract title and company from the rest
        person_title = ""
        company = ""

        parts = title.split(' - ')
        if len(parts) >= 2:
            person_title = parts[1].strip() if len(parts) > 1 else ""
        if len(parts) >= 3:
            company = parts[2].replace(' | LinkedIn', '').strip()

        # Extract more info from snippet
        if not person_title and snippet:
            # Look for title patterns in snippet
            title_patterns = [
                r'(CEO|CTO|CFO|COO|Founder|Co-Founder|Partner|Director|VP|Head of)',
                r'(Data Scientist|Analyst|Engineer)',
            ]
            for pattern in title_patterns:
                match = re.search(pattern, snippet, re.IGNORECASE)
                if match:
                    person_title = match.group(1)
                    break

        return SourceResult(
            name=name,
            linkedin_url=url,
            title=person_title,
            company=company,
            source_url=url,
            notes=snippet[:200] if snippet else "",
        )

    def _extract_generic_result(self, item: Dict) -> Optional[SourceResult]:
        """
        Extract prospect info from a generic search result.

        Args:
            item: Google search result item

        Returns:
            SourceResult or None
        """
        url = item.get('link', '')
        title = item.get('title', '')
        snippet = item.get('snippet', '')

        # Try to find a name in the title
        # Common patterns: "Name - Company", "Name | Title", "Name, Title"
        name_patterns = [
            r'^([A-Z][a-z]+ [A-Z][a-z]+)',  # "John Smith"
            r'^([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)',  # "John M. Smith"
        ]

        name = ""
        for pattern in name_patterns:
            match = re.search(pattern, title)
            if match:
                name = match.group(1)
                break

        if not name or len(name) < 3:
            return None

        # Try to extract company/title from title and snippet
        company = ""
        person_title = ""

        # Look for company names (capitalize words after "at" or "of")
        company_match = re.search(r'\b(?:at|of|from)\s+([A-Z][a-zA-Z\s]+)', title + " " + snippet)
        if company_match:
            company = company_match.group(1).strip()[:50]

        return SourceResult(
            name=name,
            company=company,
            title=person_title,
            source_url=url,
            notes=snippet[:200] if snippet else "",
        )

    def fetch(self, limit: int = 100) -> List[SourceResult]:
        """
        Fetch prospects using Google Custom Search.

        Args:
            limit: Maximum number of prospects to return

        Returns:
            List of SourceResult objects
        """
        results = []
        queries = self._build_search_queries()

        logger.info(f"GoogleSearch: Executing {len(queries)} queries (limit: {limit})")

        for query in queries:
            if len(results) >= limit:
                break

            logger.debug(f"GoogleSearch: Query '{query[:50]}...'")

            # Get search results
            items = self._search(query)

            for item in items:
                if len(results) >= limit:
                    break

                url = item.get('link', '')

                # Try to extract based on URL type
                if 'linkedin.com/in/' in url:
                    result = self._extract_linkedin_profile(
                        url,
                        item.get('snippet', ''),
                        item.get('title', '')
                    )
                else:
                    result = self._extract_generic_result(item)

                if result and result.is_valid():
                    # Enrich with bucket and confidence
                    result = self.enrich_result(result)
                    results.append(result)

        logger.info(f"GoogleSearch: Found {len(results)} prospects")
        return results

    def calculate_confidence(self, result: SourceResult) -> int:
        """Calculate confidence for Google search results."""
        score = 20  # Lower base score for search results

        if result.linkedin_url:
            score += 35  # LinkedIn profiles are more reliable

        if result.email:
            score += 25

        if result.company:
            score += 10

        if result.title:
            score += 10

        return min(100, score)

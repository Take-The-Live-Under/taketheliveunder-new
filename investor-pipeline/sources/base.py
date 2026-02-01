"""Base class for all prospect sources."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import logging
import time

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from utils.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


@dataclass
class SourceResult:
    """Result from a source query."""
    name: str
    email: Optional[str] = None
    company: str = ""
    title: str = ""
    linkedin_url: Optional[str] = None
    source_url: str = ""
    bucket: str = ""
    confidence: int = 0
    geography: str = ""
    notes: str = ""
    raw_data: Dict = field(default_factory=dict)

    def is_valid(self) -> bool:
        """Check if result has minimum required fields."""
        return bool(self.name and len(self.name) > 1)


class BaseSource(ABC):
    """
    Abstract base class for all prospect sources.

    Provides common functionality:
    - Rate limiting
    - HTTP session management
    - Retry logic
    - Error handling
    """

    name: str = "base"
    rate_limit_per_minute: int = 60

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize source with configuration.

        Args:
            config: Pipeline configuration dictionary
        """
        self.config = config
        self.rate_limiter = RateLimiter(calls_per_minute=self.rate_limit_per_minute)
        self.session = self._create_session()
        self._init_from_config()

    def _init_from_config(self):
        """Override in subclasses to extract source-specific config."""
        pass

    def _create_session(self) -> requests.Session:
        """Create HTTP session with retry logic."""
        session = requests.Session()

        # Retry configuration
        retry_config = self.config.get('retry', {})
        retries = Retry(
            total=retry_config.get('max_attempts', 3),
            backoff_factor=retry_config.get('backoff_factor', 2),
            status_forcelist=retry_config.get('retry_on_status', [429, 500, 502, 503, 504]),
        )

        adapter = HTTPAdapter(max_retries=retries)
        session.mount('http://', adapter)
        session.mount('https://', adapter)

        # Default headers
        session.headers.update({
            'User-Agent': 'InvestorProspectingPipeline/1.0',
            'Accept': 'application/json',
        })

        return session

    def _make_request(
        self,
        url: str,
        method: str = 'GET',
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        timeout: int = 30
    ) -> Optional[requests.Response]:
        """
        Make an HTTP request with rate limiting and error handling.

        Args:
            url: Request URL
            method: HTTP method
            params: Query parameters
            data: Request body (for POST)
            headers: Additional headers
            timeout: Request timeout in seconds

        Returns:
            Response object or None on failure
        """
        # Wait for rate limit
        self.rate_limiter.wait()

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data,
                headers=headers,
                timeout=timeout
            )

            if response.status_code == 429:
                # Rate limited - extract retry-after if available
                retry_after = response.headers.get('Retry-After', 60)
                logger.warning(f"Rate limited by {self.name}. Waiting {retry_after}s")
                time.sleep(int(retry_after))
                # Retry once
                return self._make_request(url, method, params, data, headers, timeout)

            response.raise_for_status()
            return response

        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {self.name}: {e}")
            return None

    @abstractmethod
    def fetch(self, limit: int = 100) -> List[SourceResult]:
        """
        Fetch prospects from this source.

        Args:
            limit: Maximum number of prospects to fetch

        Returns:
            List of SourceResult objects
        """
        pass

    def classify_bucket(self, result: SourceResult) -> str:
        """
        Classify a prospect into a bucket.

        Args:
            result: Source result to classify

        Returns:
            Bucket name
        """
        title_lower = result.title.lower() if result.title else ""
        company_lower = result.company.lower() if result.company else ""
        notes_lower = result.notes.lower() if result.notes else ""

        # Check for sportsbook alumni
        seed_companies = [c['name'].lower() for c in self.config.get('seed_companies', [])]
        for company in seed_companies:
            if company in company_lower or company in notes_lower:
                if 'former' in notes_lower or 'ex-' in notes_lower or 'alumni' in notes_lower:
                    return 'sportsbook_alumni'
                return 'sportsbetting_ops'

        # Check for data science leaders
        ds_keywords = ['data science', 'analytics', 'ml', 'machine learning', 'ai', 'data']
        if any(kw in title_lower for kw in ds_keywords):
            return 'data_science_leaders'

        # Check for angels
        angel_keywords = ['angel', 'investor', 'seed', 'venture']
        if any(kw in title_lower for kw in angel_keywords):
            return 'angels'

        # Check for exited founders
        exit_keywords = ['exited', 'acquired', 'sold', 'former founder', 'serial entrepreneur']
        if any(kw in title_lower or kw in notes_lower for kw in exit_keywords):
            return 'exited_founders'

        # Check for founder titles
        founder_keywords = ['founder', 'ceo', 'co-founder']
        if any(kw in title_lower for kw in founder_keywords):
            return 'exited_founders'

        # Default to sportsbetting_ops if related keywords found
        sports_keywords = ['sports', 'betting', 'gaming', 'odds', 'sportsbook']
        if any(kw in title_lower or kw in company_lower for kw in sports_keywords):
            return 'sportsbetting_ops'

        return 'data_science_leaders'  # Default bucket

    def calculate_confidence(self, result: SourceResult) -> int:
        """
        Calculate confidence score for a result.

        Base implementation - override in subclasses for source-specific logic.

        Args:
            result: Source result

        Returns:
            Confidence score 0-100
        """
        score = 30  # Base score

        # Has email
        if result.email:
            score += 30

        # Has LinkedIn
        if result.linkedin_url:
            score += 20

        # Has company
        if result.company:
            score += 10

        # Has title
        if result.title:
            score += 10

        return min(100, score)

    def enrich_result(self, result: SourceResult) -> SourceResult:
        """
        Enrich a result with bucket classification and confidence.

        Args:
            result: Raw source result

        Returns:
            Enriched result
        """
        result.bucket = self.classify_bucket(result)
        result.confidence = self.calculate_confidence(result)
        return result

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(rate_limit={self.rate_limit_per_minute}/min)>"

"""Base class for enrichment providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import logging
import time

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from utils.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


@dataclass
class EnrichmentResult:
    """Result from enrichment lookup."""
    email: Optional[str] = None
    email_verified: bool = False
    email_confidence: int = 0
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    title: str = ""
    company: str = ""
    company_domain: str = ""
    location: str = ""
    raw_data: Dict = None

    def __post_init__(self):
        if self.raw_data is None:
            self.raw_data = {}

    def has_valid_email(self) -> bool:
        """Check if we found a valid email."""
        return bool(self.email and self.email_confidence >= 70)


class BaseEnricher(ABC):
    """
    Abstract base class for enrichment providers.

    Provides common functionality for enriching prospect data
    with contact information.
    """

    name: str = "base"
    rate_limit_per_minute: int = 30

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize enricher with configuration.

        Args:
            config: Pipeline configuration
        """
        self.config = config
        self.rate_limiter = RateLimiter(calls_per_minute=self.rate_limit_per_minute)
        self.session = self._create_session()
        self._init_from_config()

    def _init_from_config(self):
        """Override in subclasses to extract provider-specific config."""
        pass

    def _create_session(self) -> requests.Session:
        """Create HTTP session with retry logic."""
        session = requests.Session()

        retry_config = self.config.get('retry', {})
        retries = Retry(
            total=retry_config.get('max_attempts', 3),
            backoff_factor=retry_config.get('backoff_factor', 2),
            status_forcelist=[429, 500, 502, 503, 504],
        )

        adapter = HTTPAdapter(max_retries=retries)
        session.mount('http://', adapter)
        session.mount('https://', adapter)

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
        Make an HTTP request with rate limiting.

        Args:
            url: Request URL
            method: HTTP method
            params: Query parameters
            data: Request body
            headers: Additional headers
            timeout: Request timeout

        Returns:
            Response or None
        """
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
                retry_after = response.headers.get('Retry-After', 60)
                logger.warning(f"Rate limited by {self.name}. Waiting {retry_after}s")
                time.sleep(int(retry_after))
                return self._make_request(url, method, params, data, headers, timeout)

            response.raise_for_status()
            return response

        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {self.name}: {e}")
            return None

    @abstractmethod
    def find_email(
        self,
        name: str,
        company: Optional[str] = None,
        domain: Optional[str] = None
    ) -> EnrichmentResult:
        """
        Find email for a person.

        Args:
            name: Full name
            company: Company name (optional)
            domain: Company domain (optional)

        Returns:
            EnrichmentResult with email if found
        """
        pass

    @abstractmethod
    def verify_email(self, email: str) -> bool:
        """
        Verify if an email is valid/deliverable.

        Args:
            email: Email address to verify

        Returns:
            True if valid
        """
        pass

    def enrich_prospect(
        self,
        name: str,
        company: Optional[str] = None,
        domain: Optional[str] = None,
        existing_email: Optional[str] = None
    ) -> EnrichmentResult:
        """
        Full enrichment for a prospect.

        Args:
            name: Full name
            company: Company name
            domain: Company domain
            existing_email: Email to verify if already known

        Returns:
            EnrichmentResult with all found data
        """
        # If we already have an email, just verify it
        if existing_email:
            is_valid = self.verify_email(existing_email)
            return EnrichmentResult(
                email=existing_email if is_valid else None,
                email_verified=is_valid,
                email_confidence=90 if is_valid else 0,
                company=company or "",
                company_domain=domain or "",
            )

        # Otherwise, find email
        return self.find_email(name, company, domain)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(rate_limit={self.rate_limit_per_minute}/min)>"

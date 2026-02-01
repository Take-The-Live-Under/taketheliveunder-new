"""Hunter.io enrichment provider."""

import re
import logging
from typing import Optional

from .base import BaseEnricher, EnrichmentResult
from utils.config import get_api_key

logger = logging.getLogger(__name__)


class HunterEnricher(BaseEnricher):
    """
    Hunter.io API enrichment provider.

    Uses Hunter.io to find and verify email addresses.
    https://hunter.io/api-documentation
    """

    name = "hunter"
    rate_limit_per_minute = 10  # Hunter free tier: 25 requests/month, pay tiers higher

    def _init_from_config(self):
        """Initialize from configuration."""
        self.api_key = get_api_key(self.config, 'hunter_api_key')
        self.base_url = "https://api.hunter.io/v2"

    def _domain_search(self, domain: str) -> dict:
        """
        Search for email patterns at a domain.

        Args:
            domain: Company domain

        Returns:
            Domain search results
        """
        if not self.api_key:
            logger.warning("Hunter API key not configured")
            return {}

        url = f"{self.base_url}/domain-search"
        params = {
            'domain': domain,
            'api_key': self.api_key,
        }

        response = self._make_request(url, params=params)
        if not response:
            return {}

        try:
            return response.json().get('data', {})
        except Exception as e:
            logger.error(f"Error parsing Hunter domain search: {e}")
            return {}

    def _email_finder(self, domain: str, first_name: str, last_name: str) -> dict:
        """
        Find email for a specific person at a domain.

        Args:
            domain: Company domain
            first_name: Person's first name
            last_name: Person's last name

        Returns:
            Email finder results
        """
        if not self.api_key:
            return {}

        url = f"{self.base_url}/email-finder"
        params = {
            'domain': domain,
            'first_name': first_name,
            'last_name': last_name,
            'api_key': self.api_key,
        }

        response = self._make_request(url, params=params)
        if not response:
            return {}

        try:
            return response.json().get('data', {})
        except Exception as e:
            logger.error(f"Error parsing Hunter email finder: {e}")
            return {}

    def _email_verifier(self, email: str) -> dict:
        """
        Verify an email address.

        Args:
            email: Email to verify

        Returns:
            Verification results
        """
        if not self.api_key:
            return {}

        url = f"{self.base_url}/email-verifier"
        params = {
            'email': email,
            'api_key': self.api_key,
        }

        response = self._make_request(url, params=params)
        if not response:
            return {}

        try:
            return response.json().get('data', {})
        except Exception as e:
            logger.error(f"Error parsing Hunter verification: {e}")
            return {}

    def _parse_name(self, full_name: str) -> tuple:
        """
        Parse full name into first and last name.

        Args:
            full_name: Full name string

        Returns:
            Tuple of (first_name, last_name)
        """
        parts = full_name.strip().split()
        if len(parts) == 1:
            return parts[0], ""
        elif len(parts) == 2:
            return parts[0], parts[1]
        else:
            # Assume last word is last name, rest is first
            return " ".join(parts[:-1]), parts[-1]

    def _domain_from_company(self, company: str) -> Optional[str]:
        """
        Try to guess domain from company name.

        Args:
            company: Company name

        Returns:
            Guessed domain or None
        """
        if not company:
            return None

        # Clean company name
        company_clean = re.sub(r'[^\w\s]', '', company.lower())
        company_clean = re.sub(r'\s+', '', company_clean)

        # Common patterns
        patterns = [
            f"{company_clean}.com",
            f"{company_clean}.io",
            f"{company_clean}hq.com",
        ]

        return patterns[0]  # Return most common pattern

    def find_email(
        self,
        name: str,
        company: Optional[str] = None,
        domain: Optional[str] = None
    ) -> EnrichmentResult:
        """
        Find email for a person using Hunter.io.

        Args:
            name: Full name
            company: Company name
            domain: Company domain

        Returns:
            EnrichmentResult with email if found
        """
        result = EnrichmentResult(company=company or "", company_domain=domain or "")

        # Need a domain to search
        if not domain and company:
            domain = self._domain_from_company(company)
            result.company_domain = domain or ""

        if not domain:
            logger.debug(f"No domain available for {name}")
            return result

        # Parse name
        first_name, last_name = self._parse_name(name)
        if not first_name or not last_name:
            logger.debug(f"Could not parse name: {name}")
            return result

        # Try email finder
        finder_result = self._email_finder(domain, first_name, last_name)

        if finder_result.get('email'):
            email = finder_result['email']
            score = finder_result.get('score', 0)

            result.email = email
            result.email_confidence = score
            result.email_verified = score >= 90

            # Additional data from Hunter
            if finder_result.get('linkedin'):
                result.linkedin_url = finder_result['linkedin']

            if finder_result.get('twitter'):
                result.twitter_url = finder_result['twitter']

            if finder_result.get('position'):
                result.title = finder_result['position']

            result.raw_data = finder_result
            logger.info(f"Found email for {name}: {email} (confidence: {score})")

        else:
            # Try domain search to get email pattern
            domain_data = self._domain_search(domain)

            if domain_data.get('pattern'):
                pattern = domain_data['pattern']
                # Generate email from pattern
                if pattern == '{first}.{last}':
                    email = f"{first_name.lower()}.{last_name.lower()}@{domain}"
                elif pattern == '{first}{last}':
                    email = f"{first_name.lower()}{last_name.lower()}@{domain}"
                elif pattern == '{f}{last}':
                    email = f"{first_name[0].lower()}{last_name.lower()}@{domain}"
                elif pattern == '{first}':
                    email = f"{first_name.lower()}@{domain}"
                else:
                    email = f"{first_name.lower()}.{last_name.lower()}@{domain}"

                result.email = email
                result.email_confidence = 50  # Guessed from pattern
                result.email_verified = False
                logger.info(f"Generated email for {name}: {email} (pattern: {pattern})")

        return result

    def verify_email(self, email: str) -> bool:
        """
        Verify if an email is valid/deliverable.

        Args:
            email: Email to verify

        Returns:
            True if valid
        """
        result = self._email_verifier(email)

        if not result:
            return False

        status = result.get('status', '')
        score = result.get('score', 0)

        # Valid statuses: valid, webmail, accept_all
        valid_statuses = ['valid', 'webmail']

        if status in valid_statuses:
            return True

        # Accept if score is high enough
        if score >= 70:
            return True

        return False

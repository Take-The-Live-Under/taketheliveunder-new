"""Apollo.io enrichment provider."""

import re
import logging
from typing import Optional

from .base import BaseEnricher, EnrichmentResult
from utils.config import get_api_key

logger = logging.getLogger(__name__)


class ApolloEnricher(BaseEnricher):
    """
    Apollo.io API enrichment provider.

    Uses Apollo.io to find contact information.
    https://apolloio.github.io/apollo-api-docs/
    """

    name = "apollo"
    rate_limit_per_minute = 50  # Apollo has generous rate limits

    def _init_from_config(self):
        """Initialize from configuration."""
        self.api_key = get_api_key(self.config, 'apollo_api_key')
        self.base_url = "https://api.apollo.io/v1"

        if self.api_key:
            self.session.headers.update({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            })

    def _people_search(
        self,
        name: str,
        organization_name: Optional[str] = None,
        domain: Optional[str] = None
    ) -> dict:
        """
        Search for a person in Apollo.

        Args:
            name: Person's name
            organization_name: Company name
            domain: Company domain

        Returns:
            Search results
        """
        if not self.api_key:
            logger.warning("Apollo API key not configured")
            return {}

        url = f"{self.base_url}/people/search"

        # Parse name
        parts = name.strip().split()
        first_name = parts[0] if parts else ""
        last_name = parts[-1] if len(parts) > 1 else ""

        data = {
            'api_key': self.api_key,
            'first_name': first_name,
            'last_name': last_name,
            'per_page': 5,
        }

        if organization_name:
            data['organization_name'] = organization_name

        if domain:
            data['organization_domains'] = [domain]

        response = self._make_request(url, method='POST', data=data)
        if not response:
            return {}

        try:
            result = response.json()
            people = result.get('people', [])
            return people[0] if people else {}
        except Exception as e:
            logger.error(f"Error parsing Apollo search: {e}")
            return {}

    def _people_match(
        self,
        name: str,
        email: Optional[str] = None,
        organization_name: Optional[str] = None,
        domain: Optional[str] = None,
        linkedin_url: Optional[str] = None
    ) -> dict:
        """
        Match a person using Apollo's enrichment API.

        Args:
            name: Person's name
            email: Known email (optional)
            organization_name: Company name
            domain: Company domain
            linkedin_url: LinkedIn URL

        Returns:
            Match results
        """
        if not self.api_key:
            return {}

        url = f"{self.base_url}/people/match"

        # Parse name
        parts = name.strip().split()
        first_name = parts[0] if parts else ""
        last_name = parts[-1] if len(parts) > 1 else ""

        data = {
            'api_key': self.api_key,
            'first_name': first_name,
            'last_name': last_name,
        }

        if email:
            data['email'] = email

        if organization_name:
            data['organization_name'] = organization_name

        if domain:
            data['organization_domain'] = domain

        if linkedin_url:
            data['linkedin_url'] = linkedin_url

        response = self._make_request(url, method='POST', data=data)
        if not response:
            return {}

        try:
            result = response.json()
            return result.get('person', {})
        except Exception as e:
            logger.error(f"Error parsing Apollo match: {e}")
            return {}

    def _organization_search(self, domain: str) -> dict:
        """
        Get organization info from domain.

        Args:
            domain: Company domain

        Returns:
            Organization data
        """
        if not self.api_key:
            return {}

        url = f"{self.base_url}/organizations/enrich"
        params = {
            'api_key': self.api_key,
            'domain': domain,
        }

        response = self._make_request(url, params=params)
        if not response:
            return {}

        try:
            result = response.json()
            return result.get('organization', {})
        except Exception as e:
            logger.error(f"Error parsing Apollo org search: {e}")
            return {}

    def _domain_from_company(self, company: str) -> Optional[str]:
        """
        Try to find domain from company name via Apollo.

        Args:
            company: Company name

        Returns:
            Domain or None
        """
        if not self.api_key or not company:
            return None

        url = f"{self.base_url}/organizations/search"
        data = {
            'api_key': self.api_key,
            'organization_name': company,
            'per_page': 1,
        }

        response = self._make_request(url, method='POST', data=data)
        if not response:
            return None

        try:
            result = response.json()
            orgs = result.get('organizations', [])
            if orgs:
                return orgs[0].get('primary_domain')
        except Exception as e:
            logger.error(f"Error finding domain for {company}: {e}")

        return None

    def find_email(
        self,
        name: str,
        company: Optional[str] = None,
        domain: Optional[str] = None
    ) -> EnrichmentResult:
        """
        Find email for a person using Apollo.io.

        Args:
            name: Full name
            company: Company name
            domain: Company domain

        Returns:
            EnrichmentResult with email if found
        """
        result = EnrichmentResult(company=company or "", company_domain=domain or "")

        # Try to find domain if not provided
        if not domain and company:
            domain = self._domain_from_company(company)
            result.company_domain = domain or ""

        # First try people match (more accurate)
        person = self._people_match(name, organization_name=company, domain=domain)

        if not person:
            # Fall back to search
            person = self._people_search(name, organization_name=company, domain=domain)

        if not person:
            logger.debug(f"No Apollo match for {name}")
            return result

        # Extract email
        email = person.get('email')
        if email:
            result.email = email
            result.email_verified = person.get('email_status') == 'verified'
            result.email_confidence = 95 if result.email_verified else 70
            logger.info(f"Found email for {name}: {email} (verified: {result.email_verified})")

        # Extract other contact info
        if person.get('linkedin_url'):
            result.linkedin_url = person['linkedin_url']

        if person.get('twitter_url'):
            result.twitter_url = person['twitter_url']

        if person.get('title'):
            result.title = person['title']

        if person.get('organization_name') and not result.company:
            result.company = person['organization_name']

        if person.get('city') or person.get('state') or person.get('country'):
            parts = [
                person.get('city', ''),
                person.get('state', ''),
                person.get('country', '')
            ]
            result.location = ", ".join(p for p in parts if p)

        result.raw_data = person
        return result

    def verify_email(self, email: str) -> bool:
        """
        Verify if an email is valid.

        Apollo doesn't have a direct verification API,
        so we use people match with the email.

        Args:
            email: Email to verify

        Returns:
            True if valid
        """
        if not self.api_key:
            return False

        # Use people match with email
        url = f"{self.base_url}/people/match"
        data = {
            'api_key': self.api_key,
            'email': email,
        }

        response = self._make_request(url, method='POST', data=data)
        if not response:
            return False

        try:
            result = response.json()
            person = result.get('person', {})

            if person.get('email') == email:
                status = person.get('email_status', '')
                return status in ['verified', 'valid']

        except Exception as e:
            logger.error(f"Error verifying email: {e}")

        return False

    def enrich_from_linkedin(self, linkedin_url: str) -> EnrichmentResult:
        """
        Enrich a prospect from their LinkedIn URL.

        Args:
            linkedin_url: LinkedIn profile URL

        Returns:
            EnrichmentResult
        """
        result = EnrichmentResult(linkedin_url=linkedin_url)

        if not self.api_key or not linkedin_url:
            return result

        # Match by LinkedIn URL
        person = self._people_match("", linkedin_url=linkedin_url)

        if not person:
            return result

        # Extract all available data
        if person.get('email'):
            result.email = person['email']
            result.email_verified = person.get('email_status') == 'verified'
            result.email_confidence = 95 if result.email_verified else 70

        if person.get('title'):
            result.title = person['title']

        if person.get('organization_name'):
            result.company = person['organization_name']

        if person.get('organization', {}).get('primary_domain'):
            result.company_domain = person['organization']['primary_domain']

        if person.get('twitter_url'):
            result.twitter_url = person['twitter_url']

        if person.get('city') or person.get('state') or person.get('country'):
            parts = [
                person.get('city', ''),
                person.get('state', ''),
                person.get('country', '')
            ]
            result.location = ", ".join(p for p in parts if p)

        result.raw_data = person
        return result

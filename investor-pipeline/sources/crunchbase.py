"""Crunchbase source for investor and founder discovery."""

import re
import logging
from typing import Any, Dict, List, Optional

from .base import BaseSource, SourceResult
from utils.config import get_api_key

logger = logging.getLogger(__name__)


class CrunchbaseSource(BaseSource):
    """
    Crunchbase API source.

    Finds investors, founders, and executives in sports betting/gaming companies.
    Uses the Crunchbase Basic API.
    """

    name = "crunchbase"
    rate_limit_per_minute = 10  # Crunchbase has strict rate limits

    def _init_from_config(self):
        """Initialize from configuration."""
        self.api_key = get_api_key(self.config, 'crunchbase_api_key')

        if self.api_key:
            self.session.headers.update({
                'X-cb-user-key': self.api_key,
            })

        self.base_url = "https://api.crunchbase.com/api/v4"

        # Get keywords from config
        self.keywords = self.config.get('keywords', {}).get('primary', [])
        self.seed_companies = [c['name'] for c in self.config.get('seed_companies', [])]

    def _search_organizations(self, query: str, limit: int = 25) -> List[Dict]:
        """
        Search for organizations matching query.

        Args:
            query: Search query

        Returns:
            List of organization data
        """
        if not self.api_key:
            logger.warning("Crunchbase API key not configured")
            return []

        url = f"{self.base_url}/autocompletes"
        params = {
            'query': query,
            'collection_ids': 'organizations',
            'limit': limit,
        }

        response = self._make_request(url, params=params)
        if not response:
            return []

        try:
            data = response.json()
            return data.get('entities', [])
        except Exception as e:
            logger.error(f"Error parsing Crunchbase search: {e}")
            return []

    def _get_organization_details(self, permalink: str) -> Optional[Dict]:
        """
        Get detailed organization information.

        Args:
            permalink: Organization permalink/slug

        Returns:
            Organization details
        """
        url = f"{self.base_url}/entities/organizations/{permalink}"
        params = {
            'card_ids': 'founders,current_employees_featured_order_field,investors',
        }

        response = self._make_request(url, params=params)
        if not response:
            return None

        try:
            return response.json()
        except Exception as e:
            logger.error(f"Error parsing Crunchbase org details: {e}")
            return None

    def _get_person_details(self, permalink: str) -> Optional[Dict]:
        """
        Get detailed person information.

        Args:
            permalink: Person permalink/slug

        Returns:
            Person details
        """
        url = f"{self.base_url}/entities/people/{permalink}"
        params = {
            'card_ids': 'jobs,investments_list',
        }

        response = self._make_request(url, params=params)
        if not response:
            return None

        try:
            return response.json()
        except Exception as e:
            logger.error(f"Error parsing Crunchbase person details: {e}")
            return None

    def _search_people(self, query: str, limit: int = 25) -> List[Dict]:
        """
        Search for people matching query.

        Args:
            query: Search query
            limit: Max results

        Returns:
            List of people data
        """
        if not self.api_key:
            return []

        url = f"{self.base_url}/autocompletes"
        params = {
            'query': query,
            'collection_ids': 'people',
            'limit': limit,
        }

        response = self._make_request(url, params=params)
        if not response:
            return []

        try:
            data = response.json()
            return data.get('entities', [])
        except Exception as e:
            logger.error(f"Error parsing Crunchbase people search: {e}")
            return []

    def _parse_person_to_result(self, person: Dict, org_name: str = "") -> Optional[SourceResult]:
        """
        Convert Crunchbase person data to SourceResult.

        Args:
            person: Crunchbase person data
            org_name: Associated organization name

        Returns:
            SourceResult or None
        """
        props = person.get('properties', {})

        name = f"{props.get('first_name', '')} {props.get('last_name', '')}".strip()
        if not name:
            name = props.get('identifier', {}).get('value', '')

        if not name or len(name) < 2:
            return None

        permalink = props.get('identifier', {}).get('permalink', '')

        # Extract LinkedIn
        linkedin_url = None
        if props.get('linkedin'):
            linkedin_url = props['linkedin']

        # Get title from current job
        title = ""
        jobs = person.get('cards', {}).get('jobs', [])
        if jobs:
            current_job = jobs[0]
            title = current_job.get('job_type', '')
            if not org_name:
                org_name = current_job.get('organization_identifier', {}).get('value', '')

        # Get location
        location = props.get('location_identifiers', [])
        geography = location[0].get('value', '') if location else ""

        return SourceResult(
            name=name,
            title=title,
            company=org_name,
            linkedin_url=linkedin_url,
            source_url=f"https://www.crunchbase.com/person/{permalink}" if permalink else "",
            geography=geography,
            notes=f"Crunchbase profile",
        )

    def _get_founders_from_org(self, org_data: Dict) -> List[SourceResult]:
        """
        Extract founders from organization data.

        Args:
            org_data: Organization data with cards

        Returns:
            List of SourceResult for founders
        """
        results = []

        org_props = org_data.get('properties', {})
        org_name = org_props.get('identifier', {}).get('value', '')

        # Get founders
        founders = org_data.get('cards', {}).get('founders', [])
        for founder in founders:
            result = self._parse_person_to_result(founder, org_name)
            if result:
                result.notes = f"Founder at {org_name}. {result.notes}"
                results.append(result)

        # Get featured employees (often executives)
        employees = org_data.get('cards', {}).get('current_employees_featured_order_field', [])
        for emp in employees[:5]:  # Top 5
            result = self._parse_person_to_result(emp, org_name)
            if result:
                result.notes = f"Executive at {org_name}. {result.notes}"
                results.append(result)

        return results

    def _get_investors_from_org(self, org_data: Dict) -> List[SourceResult]:
        """
        Extract investors from organization data.

        Args:
            org_data: Organization data

        Returns:
            List of SourceResult for investors
        """
        results = []

        org_props = org_data.get('properties', {})
        org_name = org_props.get('identifier', {}).get('value', '')

        investors = org_data.get('cards', {}).get('investors', [])
        for investor in investors:
            props = investor.get('properties', {})

            # Check if this is a person investor
            if investor.get('type') == 'person':
                result = self._parse_person_to_result(investor, "")
                if result:
                    result.notes = f"Investor in {org_name}. {result.notes}"
                    results.append(result)

        return results

    def fetch(self, limit: int = 100) -> List[SourceResult]:
        """
        Fetch prospects from Crunchbase.

        Args:
            limit: Maximum number of prospects

        Returns:
            List of SourceResult objects
        """
        results = []
        seen_names = set()

        logger.info(f"Crunchbase: Fetching prospects (limit: {limit})")

        # 1. Get founders and executives from seed companies
        for company_name in self.seed_companies[:10]:
            if len(results) >= limit:
                break

            logger.debug(f"Crunchbase: Looking up '{company_name}'")

            # Search for the company
            orgs = self._search_organizations(company_name, limit=3)
            if not orgs:
                continue

            # Get first match
            org_permalink = orgs[0].get('identifier', {}).get('permalink')
            if not org_permalink:
                continue

            # Get detailed org info
            org_details = self._get_organization_details(org_permalink)
            if not org_details:
                continue

            # Extract founders
            founders = self._get_founders_from_org(org_details)
            for founder in founders:
                if founder.name in seen_names:
                    continue
                seen_names.add(founder.name)

                founder = self.enrich_result(founder)
                results.append(founder)

                if len(results) >= limit:
                    break

            # Extract investors
            investors = self._get_investors_from_org(org_details)
            for investor in investors:
                if investor.name in seen_names:
                    continue
                seen_names.add(investor.name)

                investor = self.enrich_result(investor)
                results.append(investor)

                if len(results) >= limit:
                    break

        # 2. Search for people by keywords
        for keyword in self.keywords[:5]:
            if len(results) >= limit:
                break

            logger.debug(f"Crunchbase: Searching people '{keyword}'")
            people = self._search_people(f"{keyword} investor", limit=20)

            for person in people:
                name = person.get('identifier', {}).get('value', '')
                if name in seen_names:
                    continue
                seen_names.add(name)

                # Get full details
                permalink = person.get('identifier', {}).get('permalink')
                if permalink:
                    details = self._get_person_details(permalink)
                    if details:
                        person = details

                result = self._parse_person_to_result(person)
                if result and result.is_valid():
                    result = self.enrich_result(result)
                    results.append(result)

                if len(results) >= limit:
                    break

        # 3. Search for sports betting organizations and get their people
        org_queries = ['sports betting', 'sportsbook', 'betting analytics', 'fantasy sports']
        for query in org_queries:
            if len(results) >= limit:
                break

            logger.debug(f"Crunchbase: Searching orgs '{query}'")
            orgs = self._search_organizations(query, limit=10)

            for org in orgs:
                if len(results) >= limit:
                    break

                permalink = org.get('identifier', {}).get('permalink')
                if not permalink:
                    continue

                org_details = self._get_organization_details(permalink)
                if not org_details:
                    continue

                # Get founders
                people = self._get_founders_from_org(org_details)
                for person in people:
                    if person.name in seen_names:
                        continue
                    seen_names.add(person.name)

                    person = self.enrich_result(person)
                    results.append(person)

                    if len(results) >= limit:
                        break

        logger.info(f"Crunchbase: Found {len(results)} prospects")
        return results

    def calculate_confidence(self, result: SourceResult) -> int:
        """Calculate confidence for Crunchbase results."""
        score = 40  # Higher base for Crunchbase (more reliable data)

        if result.linkedin_url:
            score += 25

        if result.email:
            score += 20

        if result.company:
            score += 10

        if result.title:
            score += 5

        return min(100, score)

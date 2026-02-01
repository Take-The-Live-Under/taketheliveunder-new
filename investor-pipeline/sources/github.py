"""GitHub source for finding sports analytics developers and contributors."""

import re
import logging
from typing import Any, Dict, List, Optional

from .base import BaseSource, SourceResult
from utils.config import get_api_key

logger = logging.getLogger(__name__)


class GitHubSource(BaseSource):
    """
    GitHub API source.

    Finds developers and maintainers of sports analytics projects
    who may be potential investors or well-connected in the space.
    """

    name = "github"
    rate_limit_per_minute = 30  # GitHub API: 60 req/hour unauthenticated, 5000/hour authenticated

    def _init_from_config(self):
        """Initialize from configuration."""
        self.token = get_api_key(self.config, 'github_token')

        if self.token:
            self.session.headers.update({
                'Authorization': f'token {self.token}',
                'Accept': 'application/vnd.github.v3+json',
            })
            self.rate_limit_per_minute = 60  # Higher limit with auth

        source_config = self.config.get('sources', {}).get('github', {})
        self.target_orgs = source_config.get('orgs', [])

        # Sports analytics related topics/keywords
        self.search_topics = [
            'sports-analytics',
            'sports-betting',
            'nfl-data',
            'nba-analytics',
            'sports-statistics',
            'betting-odds',
            'fantasy-sports',
            'sportsbook',
        ]

    def _get_org_members(self, org: str) -> List[Dict]:
        """
        Get public members of a GitHub organization.

        Args:
            org: Organization name

        Returns:
            List of member data
        """
        url = f"https://api.github.com/orgs/{org}/members"
        params = {'per_page': 100}

        response = self._make_request(url, params=params)
        if not response:
            return []

        try:
            return response.json()
        except Exception as e:
            logger.error(f"Error parsing GitHub org members: {e}")
            return []

    def _get_user_details(self, username: str) -> Optional[Dict]:
        """
        Get detailed user information.

        Args:
            username: GitHub username

        Returns:
            User data dictionary
        """
        url = f"https://api.github.com/users/{username}"

        response = self._make_request(url)
        if not response:
            return None

        try:
            return response.json()
        except Exception as e:
            logger.error(f"Error parsing GitHub user details: {e}")
            return None

    def _search_users(self, query: str, limit: int = 30) -> List[Dict]:
        """
        Search for GitHub users matching a query.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of user data
        """
        url = "https://api.github.com/search/users"
        params = {
            'q': query,
            'per_page': min(limit, 100),
        }

        response = self._make_request(url, params=params)
        if not response:
            return []

        try:
            data = response.json()
            return data.get('items', [])
        except Exception as e:
            logger.error(f"Error parsing GitHub search results: {e}")
            return []

    def _search_repos(self, query: str, limit: int = 30) -> List[Dict]:
        """
        Search for repositories and get their contributors.

        Args:
            query: Search query
            limit: Maximum repos to check

        Returns:
            List of contributor user data
        """
        url = "https://api.github.com/search/repositories"
        params = {
            'q': query,
            'sort': 'stars',
            'per_page': min(limit, 100),
        }

        response = self._make_request(url, params=params)
        if not response:
            return []

        contributors = []
        try:
            data = response.json()
            repos = data.get('items', [])[:10]  # Top 10 repos

            for repo in repos:
                # Get top contributors
                contrib_url = repo.get('contributors_url')
                if contrib_url:
                    contrib_response = self._make_request(contrib_url, params={'per_page': 10})
                    if contrib_response:
                        contributors.extend(contrib_response.json()[:5])

        except Exception as e:
            logger.error(f"Error getting repo contributors: {e}")

        return contributors

    def _parse_user_to_result(self, user_data: Dict, source: str = "github") -> Optional[SourceResult]:
        """
        Convert GitHub user data to SourceResult.

        Args:
            user_data: GitHub user API response
            source: Source identifier

        Returns:
            SourceResult or None
        """
        username = user_data.get('login', '')
        if not username:
            return None

        # Get detailed user info
        details = self._get_user_details(username)
        if not details:
            details = user_data

        name = details.get('name') or username
        company = details.get('company', '').lstrip('@')
        bio = details.get('bio', '') or ''
        location = details.get('location', '') or ''
        email = details.get('email')  # Often null for privacy
        blog = details.get('blog', '')

        # Build LinkedIn URL if mentioned in bio
        linkedin_url = None
        if bio:
            linkedin_match = re.search(r'linkedin\.com/in/([^\s/]+)', bio)
            if linkedin_match:
                linkedin_url = f"https://linkedin.com/in/{linkedin_match.group(1)}"

        # Skip users with very little info
        if name == username and not company and not bio:
            return None

        # Derive title from bio if possible
        title = ""
        title_patterns = [
            r'(CEO|CTO|Founder|Co-Founder|Director|VP|Head of [A-Za-z]+)',
            r'(Data Scientist|ML Engineer|Software Engineer|Analyst)',
        ]
        for pattern in title_patterns:
            match = re.search(pattern, bio, re.IGNORECASE)
            if match:
                title = match.group(1)
                break

        return SourceResult(
            name=name,
            email=email,
            company=company,
            title=title,
            linkedin_url=linkedin_url,
            source_url=f"https://github.com/{username}",
            geography=location,
            notes=f"GitHub: {bio[:150]}" if bio else f"GitHub profile: {username}",
        )

    def fetch(self, limit: int = 100) -> List[SourceResult]:
        """
        Fetch prospects from GitHub.

        Args:
            limit: Maximum number of prospects

        Returns:
            List of SourceResult objects
        """
        results = []
        seen_usernames = set()

        logger.info(f"GitHub: Fetching prospects (limit: {limit})")

        # 1. Get members from target organizations
        for org in self.target_orgs:
            if len(results) >= limit:
                break

            logger.debug(f"GitHub: Fetching members of org '{org}'")
            members = self._get_org_members(org)

            for member in members:
                username = member.get('login')
                if username in seen_usernames:
                    continue
                seen_usernames.add(username)

                result = self._parse_user_to_result(member, f"github_org:{org}")
                if result and result.is_valid():
                    result.notes = f"Member of {org} org. {result.notes}"
                    result = self.enrich_result(result)
                    results.append(result)

                if len(results) >= limit:
                    break

        # 2. Search for users by topic
        for topic in self.search_topics:
            if len(results) >= limit:
                break

            logger.debug(f"GitHub: Searching topic '{topic}'")
            users = self._search_users(f"{topic} in:bio", limit=20)

            for user in users:
                username = user.get('login')
                if username in seen_usernames:
                    continue
                seen_usernames.add(username)

                result = self._parse_user_to_result(user, f"github_topic:{topic}")
                if result and result.is_valid():
                    result = self.enrich_result(result)
                    results.append(result)

                if len(results) >= limit:
                    break

        # 3. Get contributors to popular sports analytics repos
        repo_queries = [
            'sports analytics stars:>100',
            'betting odds stars:>50',
            'nfl statistics stars:>100',
            'nba data stars:>100',
        ]

        for query in repo_queries:
            if len(results) >= limit:
                break

            logger.debug(f"GitHub: Searching repos '{query[:30]}...'")
            contributors = self._search_repos(query, limit=5)

            for contrib in contributors:
                username = contrib.get('login')
                if username in seen_usernames:
                    continue
                seen_usernames.add(username)

                result = self._parse_user_to_result(contrib, f"github_contrib:{query[:20]}")
                if result and result.is_valid():
                    result.notes = f"Top contributor to sports analytics repos. {result.notes}"
                    result = self.enrich_result(result)
                    results.append(result)

                if len(results) >= limit:
                    break

        logger.info(f"GitHub: Found {len(results)} prospects")
        return results

    def calculate_confidence(self, result: SourceResult) -> int:
        """Calculate confidence for GitHub results."""
        score = 25  # Base score for GitHub profiles

        if result.email:
            score += 30

        if result.linkedin_url:
            score += 25

        if result.company:
            score += 10

        if result.title:
            score += 10

        return min(100, score)

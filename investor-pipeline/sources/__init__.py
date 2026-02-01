"""Source modules for investor prospect discovery."""

from .base import BaseSource, SourceResult
from .google_search import GoogleSearchSource
from .github import GitHubSource
from .wellfound import WellfoundSource
from .crunchbase import CrunchbaseSource
from .podcasts import PodcastSource
from .conferences import ConferenceSource

__all__ = [
    'BaseSource',
    'SourceResult',
    'GoogleSearchSource',
    'GitHubSource',
    'WellfoundSource',
    'CrunchbaseSource',
    'PodcastSource',
    'ConferenceSource',
]


def get_all_sources(config: dict) -> list:
    """
    Get all enabled source instances based on config.

    Args:
        config: Pipeline configuration

    Returns:
        List of enabled source instances
    """
    sources = []
    source_config = config.get('sources', {})

    if source_config.get('google_search', {}).get('enabled', True):
        sources.append(GoogleSearchSource(config))

    if source_config.get('github', {}).get('enabled', True):
        sources.append(GitHubSource(config))

    if source_config.get('wellfound', {}).get('enabled', True):
        sources.append(WellfoundSource(config))

    if source_config.get('crunchbase', {}).get('enabled', True):
        sources.append(CrunchbaseSource(config))

    if source_config.get('podcasts', {}).get('enabled', True):
        sources.append(PodcastSource(config))

    if source_config.get('conferences', {}).get('enabled', True):
        sources.append(ConferenceSource(config))

    return sources

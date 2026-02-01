"""Enrichment modules for finding and validating contact information."""

from .base import BaseEnricher, EnrichmentResult
from .hunter import HunterEnricher
from .apollo import ApolloEnricher

__all__ = [
    'BaseEnricher',
    'EnrichmentResult',
    'HunterEnricher',
    'ApolloEnricher',
]


def get_enricher(config: dict) -> 'BaseEnricher':
    """
    Get the configured enrichment provider.

    Args:
        config: Pipeline configuration

    Returns:
        Enricher instance based on config
    """
    enrich_config = config.get('enrichment', {})
    provider = enrich_config.get('provider', 'hunter')

    if provider == 'apollo':
        return ApolloEnricher(config)
    else:
        return HunterEnricher(config)

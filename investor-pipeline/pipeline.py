#!/usr/bin/env python3
"""
Investor Prospecting Pipeline

Main orchestrator that runs the full prospecting pipeline:
1. Fetch prospects from multiple sources
2. Deduplicate across sources
3. Enrich with contact information
4. Classify into buckets with confidence scores
5. Output daily and master CSV files
"""

import argparse
import csv
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

from utils.config import load_config
from utils.dedup import Deduplicator, Prospect
from utils.logger import setup_logger
from sources import get_all_sources
from sources.base import SourceResult
from enrich import get_enricher

logger = logging.getLogger(__name__)


class InvestorPipeline:
    """Main pipeline orchestrator."""

    def __init__(self, config_path: str = "config.yaml"):
        """
        Initialize pipeline.

        Args:
            config_path: Path to configuration file
        """
        self.config = load_config(config_path)
        self.output_dir = Path(self.config.get('output', {}).get('directory', 'output'))
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Initialize components
        self.sources = get_all_sources(self.config)
        self.enricher = get_enricher(self.config)
        self.dedup = Deduplicator()

        # Pipeline settings
        self.daily_goal = self.config.get('pipeline', {}).get('daily_goal', 100)
        self.total_days = self.config.get('pipeline', {}).get('total_days', 14)

        logger.info(f"Pipeline initialized with {len(self.sources)} sources")
        logger.info(f"Daily goal: {self.daily_goal} prospects")

    def _source_result_to_prospect(self, result: SourceResult, source_name: str) -> Prospect:
        """Convert SourceResult to Prospect for deduplication."""
        return Prospect(
            name=result.name,
            email=result.email,
            company=result.company,
            title=result.title,
            linkedin_url=result.linkedin_url,
            source=source_name,
            bucket=result.bucket,
            confidence=result.confidence,
            geography=result.geography,
            notes=result.notes,
        )

    def _prospect_to_dict(self, prospect: Prospect, enriched: bool = False) -> Dict:
        """Convert Prospect to dictionary for CSV output."""
        return {
            'name': prospect.name,
            'email': prospect.email or '',
            'company': prospect.company,
            'title': prospect.title,
            'linkedin_url': prospect.linkedin_url or '',
            'source': prospect.source,
            'bucket': prospect.bucket,
            'confidence': prospect.confidence,
            'geography': prospect.geography,
            'notes': prospect.notes,
            'enriched': 'Yes' if enriched else 'No',
            'date_added': datetime.now().strftime('%Y-%m-%d'),
        }

    def fetch_from_sources(self, limit_per_source: int = 50) -> List[Prospect]:
        """
        Fetch prospects from all enabled sources.

        Args:
            limit_per_source: Max prospects per source

        Returns:
            List of Prospect objects
        """
        all_prospects = []

        for source in self.sources:
            try:
                logger.info(f"Fetching from {source.name}...")
                results = source.fetch(limit=limit_per_source)

                for result in results:
                    prospect = self._source_result_to_prospect(result, source.name)
                    all_prospects.append(prospect)

                logger.info(f"  -> {len(results)} prospects from {source.name}")

            except Exception as e:
                logger.error(f"Error fetching from {source.name}: {e}")
                continue

        return all_prospects

    def deduplicate(self, prospects: List[Prospect]) -> List[Prospect]:
        """
        Deduplicate prospects.

        Args:
            prospects: List of prospects to deduplicate

        Returns:
            Deduplicated list
        """
        logger.info(f"Deduplicating {len(prospects)} prospects...")

        unique = []
        for prospect in prospects:
            is_dup, _ = self.dedup.is_duplicate(prospect)
            if not is_dup:
                self.dedup.add(prospect)
                unique.append(prospect)

        removed = len(prospects) - len(unique)
        logger.info(f"  -> {len(unique)} unique (removed {removed} duplicates)")

        return unique

    def enrich_prospects(self, prospects: List[Prospect]) -> List[Prospect]:
        """
        Enrich prospects with contact information.

        Args:
            prospects: List of prospects

        Returns:
            Enriched prospects
        """
        logger.info(f"Enriching {len(prospects)} prospects...")

        enriched_count = 0
        for prospect in prospects:
            # Skip if already has email
            if prospect.email:
                continue

            try:
                # Get domain from LinkedIn if available
                domain = None
                if prospect.linkedin_url:
                    # Try to enrich from LinkedIn
                    result = self.enricher.enrich_prospect(
                        name=prospect.name,
                        company=prospect.company,
                        domain=domain,
                    )
                else:
                    result = self.enricher.enrich_prospect(
                        name=prospect.name,
                        company=prospect.company,
                    )

                if result.has_valid_email():
                    prospect.email = result.email
                    enriched_count += 1
                    logger.debug(f"  Enriched: {prospect.name} -> {result.email}")

                # Update other fields if found
                if result.linkedin_url and not prospect.linkedin_url:
                    prospect.linkedin_url = result.linkedin_url

                if result.title and not prospect.title:
                    prospect.title = result.title

            except Exception as e:
                logger.error(f"Error enriching {prospect.name}: {e}")
                continue

        logger.info(f"  -> Enriched {enriched_count} prospects with emails")
        return prospects

    def write_daily_csv(self, prospects: List[Prospect], day: int) -> str:
        """
        Write daily CSV file.

        Args:
            prospects: Prospects for this day
            day: Day number (1-14)

        Returns:
            Path to CSV file
        """
        date_str = datetime.now().strftime('%Y%m%d')
        filename = f"day{day:02d}_{date_str}_prospects.csv"
        filepath = self.output_dir / filename

        fieldnames = [
            'name', 'email', 'company', 'title', 'linkedin_url',
            'source', 'bucket', 'confidence', 'geography', 'notes',
            'enriched', 'date_added'
        ]

        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for prospect in prospects:
                enriched = bool(prospect.email)
                writer.writerow(self._prospect_to_dict(prospect, enriched))

        logger.info(f"Wrote {len(prospects)} prospects to {filepath}")
        return str(filepath)

    def write_master_csv(self) -> str:
        """
        Write master CSV combining all days.

        Returns:
            Path to master CSV
        """
        filename = f"master_prospects_{datetime.now().strftime('%Y%m%d')}.csv"
        filepath = self.output_dir / filename

        # Get all prospects from dedup engine
        all_prospects = self.dedup.prospects

        fieldnames = [
            'name', 'email', 'company', 'title', 'linkedin_url',
            'source', 'bucket', 'confidence', 'geography', 'notes',
            'enriched', 'date_added'
        ]

        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for prospect in all_prospects:
                enriched = bool(prospect.email)
                writer.writerow(self._prospect_to_dict(prospect, enriched))

        logger.info(f"Wrote master CSV with {len(all_prospects)} total prospects to {filepath}")
        return str(filepath)

    def generate_summary(self) -> Dict:
        """Generate pipeline run summary."""
        all_prospects = self.dedup.prospects

        # Bucket breakdown
        buckets = {}
        for prospect in all_prospects:
            bucket = prospect.bucket or 'uncategorized'
            buckets[bucket] = buckets.get(bucket, 0) + 1

        # Source breakdown
        sources = {}
        for prospect in all_prospects:
            source = prospect.source
            sources[source] = sources.get(source, 0) + 1

        # Email stats
        with_email = sum(1 for p in all_prospects if p.email)

        return {
            'total_prospects': len(all_prospects),
            'with_email': with_email,
            'email_rate': f"{(with_email / len(all_prospects) * 100):.1f}%" if all_prospects else "0%",
            'buckets': buckets,
            'sources': sources,
        }

    def run_day(self, day: int = 1) -> str:
        """
        Run pipeline for a single day.

        Args:
            day: Day number

        Returns:
            Path to daily CSV
        """
        logger.info(f"\n{'='*50}")
        logger.info(f"RUNNING DAY {day} OF PIPELINE")
        logger.info(f"{'='*50}\n")

        # Calculate how many to fetch from each source
        num_sources = len(self.sources)
        per_source = max(20, self.daily_goal // num_sources + 10)  # Extra buffer

        # 1. Fetch from all sources
        prospects = self.fetch_from_sources(limit_per_source=per_source)

        # 2. Deduplicate
        unique_prospects = self.deduplicate(prospects)

        # 3. Limit to daily goal
        daily_prospects = unique_prospects[:self.daily_goal]

        # 4. Enrich with contact info
        enriched_prospects = self.enrich_prospects(daily_prospects)

        # 5. Write daily CSV
        daily_csv = self.write_daily_csv(enriched_prospects, day)

        # Summary
        logger.info(f"\nDay {day} Summary:")
        logger.info(f"  Fetched: {len(prospects)}")
        logger.info(f"  Unique: {len(unique_prospects)}")
        logger.info(f"  Output: {len(daily_prospects)}")

        return daily_csv

    def run_full(self, start_day: int = 1) -> Dict:
        """
        Run full pipeline for all days.

        Args:
            start_day: Day to start from (for resuming)

        Returns:
            Run summary
        """
        logger.info(f"\n{'#'*60}")
        logger.info(f"STARTING FULL PIPELINE RUN")
        logger.info(f"Days: {start_day} to {self.total_days}")
        logger.info(f"Daily goal: {self.daily_goal}")
        logger.info(f"Total target: {self.daily_goal * self.total_days}")
        logger.info(f"{'#'*60}\n")

        daily_files = []

        for day in range(start_day, self.total_days + 1):
            try:
                daily_csv = self.run_day(day)
                daily_files.append(daily_csv)

            except Exception as e:
                logger.error(f"Error on day {day}: {e}")
                continue

        # Write master CSV
        master_csv = self.write_master_csv()

        # Generate summary
        summary = self.generate_summary()
        summary['daily_files'] = daily_files
        summary['master_file'] = master_csv

        # Print final summary
        logger.info(f"\n{'#'*60}")
        logger.info("PIPELINE RUN COMPLETE")
        logger.info(f"{'#'*60}")
        logger.info(f"\nFinal Summary:")
        logger.info(f"  Total prospects: {summary['total_prospects']}")
        logger.info(f"  With email: {summary['with_email']} ({summary['email_rate']})")
        logger.info(f"\nBy Bucket:")
        for bucket, count in summary['buckets'].items():
            logger.info(f"  {bucket}: {count}")
        logger.info(f"\nBy Source:")
        for source, count in summary['sources'].items():
            logger.info(f"  {source}: {count}")
        logger.info(f"\nMaster CSV: {master_csv}")

        return summary


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Investor Prospecting Pipeline')
    parser.add_argument(
        '--config', '-c',
        default='config.yaml',
        help='Path to configuration file'
    )
    parser.add_argument(
        '--day', '-d',
        type=int,
        help='Run only a specific day (1-14)'
    )
    parser.add_argument(
        '--start-day', '-s',
        type=int,
        default=1,
        help='Day to start from (for full run)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )

    args = parser.parse_args()

    # Setup logging
    log_level = "DEBUG" if args.verbose else "INFO"
    setup_logger(level=log_level)

    try:
        # Initialize pipeline
        pipeline = InvestorPipeline(config_path=args.config)

        if args.day:
            # Run single day
            pipeline.run_day(day=args.day)
        else:
            # Run full pipeline
            pipeline.run_full(start_day=args.start_day)

    except KeyboardInterrupt:
        logger.info("\nPipeline interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

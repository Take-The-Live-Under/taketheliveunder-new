"""Deduplication utilities for prospect management."""

import hashlib
import re
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
import pandas as pd
import logging

logger = logging.getLogger(__name__)


@dataclass
class Prospect:
    """Prospect data structure."""
    name: str
    email: Optional[str] = None
    company: str = ""
    title: str = ""
    linkedin_url: Optional[str] = None
    source_url: str = ""
    source: str = ""
    bucket: str = ""
    confidence: int = 0
    status: str = "new"
    geography: str = ""
    notes: str = ""

    def to_dict(self) -> Dict:
        """Convert to dictionary for CSV export."""
        return {
            'name': self.name,
            'email': self.email or '',
            'company': self.company,
            'title': self.title,
            'linkedin_url': self.linkedin_url or '',
            'source_url': self.source_url,
            'source': self.source,
            'bucket': self.bucket,
            'confidence': self.confidence,
            'status': self.status,
            'geography': self.geography,
            'notes': self.notes,
        }


class Deduplicator:
    """
    Deduplication engine for prospects.

    Dedupes by:
    - Email (exact match, case-insensitive)
    - LinkedIn URL (normalized)
    - Name + Company (fuzzy match)
    """

    def __init__(self):
        self.seen_emails: Set[str] = set()
        self.seen_linkedin: Set[str] = set()
        self.seen_name_company: Set[str] = set()
        self.prospects: List[Prospect] = []

    def _normalize_email(self, email: Optional[str]) -> Optional[str]:
        """Normalize email for comparison."""
        if not email:
            return None
        return email.lower().strip()

    def _normalize_linkedin(self, url: Optional[str]) -> Optional[str]:
        """
        Normalize LinkedIn URL for comparison.

        Extracts the profile ID from various LinkedIn URL formats.
        """
        if not url:
            return None

        url = url.lower().strip()

        # Remove trailing slashes
        url = url.rstrip('/')

        # Extract profile ID
        patterns = [
            r'linkedin\.com/in/([^/?\s]+)',
            r'linkedin\.com/pub/([^/?\s]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)

        return url

    def _normalize_name(self, name: str) -> str:
        """Normalize name for comparison."""
        # Remove titles, suffixes
        name = re.sub(r'\b(Mr|Mrs|Ms|Dr|Jr|Sr|III|II|IV|PhD|MD|MBA)\b\.?', '', name, flags=re.IGNORECASE)
        # Remove punctuation and extra spaces
        name = re.sub(r'[^\w\s]', '', name)
        name = ' '.join(name.lower().split())
        return name

    def _normalize_company(self, company: str) -> str:
        """Normalize company name for comparison."""
        # Remove common suffixes
        company = re.sub(r'\b(Inc|LLC|Ltd|Corp|Corporation|Company|Co)\b\.?', '', company, flags=re.IGNORECASE)
        # Remove punctuation and extra spaces
        company = re.sub(r'[^\w\s]', '', company)
        company = ' '.join(company.lower().split())
        return company

    def _create_name_company_key(self, name: str, company: str) -> str:
        """Create a normalized key from name and company."""
        norm_name = self._normalize_name(name)
        norm_company = self._normalize_company(company)
        combined = f"{norm_name}|{norm_company}"
        return hashlib.md5(combined.encode()).hexdigest()

    def is_duplicate(self, prospect: Prospect) -> Tuple[bool, str]:
        """
        Check if a prospect is a duplicate.

        Args:
            prospect: Prospect to check

        Returns:
            Tuple of (is_duplicate, reason)
        """
        # Check email
        if prospect.email:
            norm_email = self._normalize_email(prospect.email)
            if norm_email in self.seen_emails:
                return True, f"duplicate_email:{norm_email}"

        # Check LinkedIn
        if prospect.linkedin_url:
            norm_linkedin = self._normalize_linkedin(prospect.linkedin_url)
            if norm_linkedin and norm_linkedin in self.seen_linkedin:
                return True, f"duplicate_linkedin:{norm_linkedin}"

        # Check name + company
        if prospect.name and prospect.company:
            name_company_key = self._create_name_company_key(prospect.name, prospect.company)
            if name_company_key in self.seen_name_company:
                return True, f"duplicate_name_company:{prospect.name}@{prospect.company}"

        return False, ""

    def add(self, prospect: Prospect) -> bool:
        """
        Add a prospect if not duplicate.

        Args:
            prospect: Prospect to add

        Returns:
            True if added, False if duplicate
        """
        is_dup, reason = self.is_duplicate(prospect)
        if is_dup:
            logger.debug(f"Skipping duplicate prospect: {reason}")
            return False

        # Add to seen sets
        if prospect.email:
            self.seen_emails.add(self._normalize_email(prospect.email))

        if prospect.linkedin_url:
            norm_linkedin = self._normalize_linkedin(prospect.linkedin_url)
            if norm_linkedin:
                self.seen_linkedin.add(norm_linkedin)

        if prospect.name and prospect.company:
            name_company_key = self._create_name_company_key(prospect.name, prospect.company)
            self.seen_name_company.add(name_company_key)

        self.prospects.append(prospect)
        return True

    def add_batch(self, prospects: List[Prospect]) -> int:
        """
        Add multiple prospects, returning count of non-duplicates.

        Args:
            prospects: List of prospects to add

        Returns:
            Number of prospects added (non-duplicates)
        """
        added = 0
        for prospect in prospects:
            if self.add(prospect):
                added += 1
        return added

    def load_existing(self, csv_path: str):
        """
        Load existing prospects from CSV to populate dedup sets.

        Args:
            csv_path: Path to existing master CSV
        """
        try:
            df = pd.read_csv(csv_path)
            count = 0

            for _, row in df.iterrows():
                # Add to seen sets without adding to prospects list
                email = row.get('email')
                if email and pd.notna(email):
                    self.seen_emails.add(self._normalize_email(str(email)))

                linkedin = row.get('linkedin_url')
                if linkedin and pd.notna(linkedin):
                    norm = self._normalize_linkedin(str(linkedin))
                    if norm:
                        self.seen_linkedin.add(norm)

                name = row.get('name', '')
                company = row.get('company', '')
                if name and company and pd.notna(name) and pd.notna(company):
                    key = self._create_name_company_key(str(name), str(company))
                    self.seen_name_company.add(key)

                count += 1

            logger.info(f"Loaded {count} existing prospects for deduplication")

        except FileNotFoundError:
            logger.info(f"No existing CSV found at {csv_path}, starting fresh")
        except Exception as e:
            logger.error(f"Error loading existing CSV: {e}")

    def to_dataframe(self) -> pd.DataFrame:
        """Convert prospects to pandas DataFrame."""
        if not self.prospects:
            return pd.DataFrame(columns=[
                'name', 'email', 'company', 'title', 'linkedin_url',
                'source_url', 'bucket', 'confidence', 'status', 'geography', 'notes'
            ])

        return pd.DataFrame([p.to_dict() for p in self.prospects])

    def export_csv(self, path: str):
        """Export prospects to CSV file."""
        df = self.to_dataframe()
        df.to_csv(path, index=False)
        logger.info(f"Exported {len(df)} prospects to {path}")

    def clear(self):
        """Clear all prospects (but keep dedup sets)."""
        self.prospects = []

    def reset(self):
        """Full reset including dedup sets."""
        self.seen_emails.clear()
        self.seen_linkedin.clear()
        self.seen_name_company.clear()
        self.prospects = []

    @property
    def count(self) -> int:
        """Get current prospect count."""
        return len(self.prospects)

    def stats(self) -> Dict:
        """Get deduplication statistics."""
        return {
            'total_prospects': len(self.prospects),
            'unique_emails': len(self.seen_emails),
            'unique_linkedin': len(self.seen_linkedin),
            'unique_name_company': len(self.seen_name_company),
        }

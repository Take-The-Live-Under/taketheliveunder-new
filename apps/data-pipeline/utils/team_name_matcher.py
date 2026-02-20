"""
NCAA Team Name Matching System
Handles name variations across ESPN, The Odds API, and KenPom
"""
from typing import Optional, Dict, Set
from fuzzywuzzy import fuzz
from loguru import logger
import json
from pathlib import Path


class TeamNameMatcher:
    """
    Intelligent team name matching for NCAA basketball

    Handles variations like:
    - "North Carolina" vs "UNC" vs "North Carolina Tar Heels"
    - "St. John's" vs "Saint John's (NY)"
    - "Miami (FL)" vs "Miami Hurricanes"
    """

    def __init__(self, mappings_file: Optional[Path] = None):
        """
        Initialize matcher with optional custom mappings file

        Args:
            mappings_file: Path to JSON file with team name mappings
        """
        self.mappings_file = mappings_file or Path(__file__).parent.parent / "data" / "ncaa_team_mappings.json"

        # Load or initialize mappings
        self.mappings = self._load_mappings()

        # Load Odds API <-> ESPN mappings from CSV
        self.odds_espn_map = self._load_csv_mappings()

        # Common abbreviations and patterns
        self.common_abbrevs = {
            "Saint": ["St.", "St"],
            "State": ["St.", "St"],
            "University": ["U", "Univ"],
            "College": [],
            "Texas Christian": ["TCU"],
            "Southern Methodist": ["SMU"],
            "Brigham Young": ["BYU"],
            "Louisiana State": ["LSU"],
            "Virginia Commonwealth": ["VCU"],
            "Texas A&M": ["Texas A&M", "TAMU"],
            "North Carolina": ["UNC", "NC"],
            "South Carolina": ["SC"],
            "Massachusetts": ["UMass"],
            "Connecticut": ["UConn"],
            "Pennsylvania": ["Penn"],
        }

        # Words to ignore in matching
        # NOTE: "state" is NOT ignored because it's a team identifier
        # (Michigan vs Michigan State are different teams)
        self.ignore_words = {
            "university", "college", "the",
            "of", "at", "and", "&", "-"
        }

        # Mascot/nickname removal patterns
        self.mascots = {
            "tar heels", "blue devils", "crimson tide", "wildcats",
            "huskies", "spartans", "wolverines", "buckeyes", "bulldogs",
            "tigers", "bears", "panthers", "eagles", "cardinals",
            "jayhawks", "orangemen", "fighting irish", "trojans",
            "golden gophers", "badgers", "hawkeyes", "boilermakers",
            "hoosiers", "terrapins", "nittany lions", "scarlet knights"
        }

    def _load_mappings(self) -> Dict[str, Set[str]]:
        """Load team name mappings from JSON file"""
        if self.mappings_file.exists():
            try:
                with open(self.mappings_file, 'r') as f:
                    data = json.load(f)
                    # Convert lists to sets for faster lookup
                    return {k: set(v) for k, v in data.items()}
            except Exception as e:
                logger.warning(f"Error loading team mappings: {e}")

        return {}

    def _load_csv_mappings(self) -> Dict[str, str]:
        """Load Odds API <-> ESPN team name mappings from CSV"""
        csv_file = Path(__file__).parent.parent / "data" / "team_name_mapping.csv"
        mapping = {}

        if csv_file.exists():
            try:
                import pandas as pd
                df = pd.read_csv(csv_file)
                # Create bidirectional mapping: Odds API -> ESPN and ESPN -> Odds API
                for _, row in df.iterrows():
                    odds_name = str(row['full_name']).strip()
                    espn_name = str(row['espn_name']).strip()
                    mapping[odds_name.lower()] = espn_name
                    mapping[espn_name.lower()] = espn_name  # ESPN -> ESPN (canonical)
                logger.info(f"Loaded {len(df)} team name mappings from CSV")
            except Exception as e:
                logger.warning(f"Error loading CSV team mappings: {e}")

        return mapping

    def translate_to_espn(self, team_name: str) -> str:
        """
        Translate Odds API team name to ESPN team name using CSV mapping

        Args:
            team_name: Team name from Odds API

        Returns:
            ESPN team name if mapping exists, otherwise original name
        """
        name_lower = team_name.lower()
        if name_lower in self.odds_espn_map:
            return self.odds_espn_map[name_lower]
        return team_name

    def _save_mappings(self):
        """Save team name mappings to JSON file"""
        try:
            self.mappings_file.parent.mkdir(parents=True, exist_ok=True)
            # Convert sets to lists for JSON serialization
            data = {k: list(v) for k, v in self.mappings.items()}
            with open(self.mappings_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.debug(f"Saved {len(self.mappings)} team mappings")
        except Exception as e:
            logger.error(f"Error saving team mappings: {e}")

    def normalize_name(self, team_name: str) -> str:
        """
        Normalize team name for comparison

        Args:
            team_name: Original team name

        Returns:
            Normalized name (lowercase, no punctuation, no mascots)
        """
        if not team_name:
            return ""

        # Lowercase
        name = team_name.lower().strip()

        # Remove common punctuation
        name = name.replace(".", "").replace("'", "").replace("-", " ")

        # Remove parentheticals like (FL) or (NY)
        import re
        name = re.sub(r'\([^)]*\)', '', name).strip()

        # Remove mascots
        for mascot in self.mascots:
            if mascot in name:
                name = name.replace(mascot, "").strip()

        # Remove ignore words
        words = name.split()
        words = [w for w in words if w not in self.ignore_words]

        return " ".join(words)

    def get_canonical_name(self, team_name: str) -> str:
        """
        Get the canonical (standardized) name for a team

        Args:
            team_name: Any variation of team name

        Returns:
            Canonical name if known, otherwise normalized name
        """
        normalized = self.normalize_name(team_name)

        # Check if we already have a mapping
        for canonical, variations in self.mappings.items():
            if normalized in variations or team_name in variations:
                return canonical

        # Return normalized name as new canonical
        return normalized

    def add_mapping(self, canonical_name: str, variation: str):
        """
        Add a new team name variation to the mapping

        Args:
            canonical_name: The standardized name to use
            variation: A variation that should map to canonical_name
        """
        if canonical_name not in self.mappings:
            self.mappings[canonical_name] = set()

        self.mappings[canonical_name].add(variation)
        self.mappings[canonical_name].add(self.normalize_name(variation))
        self._save_mappings()

    def match_teams(self, name1: str, name2: str, threshold: int = 80) -> bool:
        """
        Determine if two team names refer to the same team

        Args:
            name1: First team name
            name2: Second team name
            threshold: Fuzzy match threshold (0-100)

        Returns:
            True if names match, False otherwise
        """
        if not name1 or not name2:
            return False

        # Exact match
        if name1.lower() == name2.lower():
            return True

        # Check CSV mappings first (Odds API <-> ESPN)
        name1_lower = name1.lower()
        name2_lower = name2.lower()

        if name1_lower in self.odds_espn_map and name2_lower in self.odds_espn_map:
            # Both names are in the mapping, check if they map to the same ESPN name
            if self.odds_espn_map[name1_lower].lower() == self.odds_espn_map[name2_lower].lower():
                logger.debug(f"CSV mapping match: '{name1}' <-> '{name2}'")
                return True

        # Check canonical names
        canonical1 = self.get_canonical_name(name1)
        canonical2 = self.get_canonical_name(name2)

        if canonical1 == canonical2:
            return True

        # Normalize and compare
        norm1 = self.normalize_name(name1)
        norm2 = self.normalize_name(name2)

        if norm1 == norm2:
            return True

        # Fuzzy matching as last resort
        # But prevent false matches like "Michigan" vs "Michigan State"
        fuzzy_score = fuzz.ratio(norm1, norm2)
        if fuzzy_score >= threshold:
            # Check for qualifier words that indicate different teams
            qualifiers = ["state", "tech", "christian", "methodist", "wesleyan"]
            norm1_has_qualifier = any(q in norm1 for q in qualifiers)
            norm2_has_qualifier = any(q in norm2 for q in qualifiers)

            # If one has a qualifier and the other doesn't, they're different teams
            if norm1_has_qualifier != norm2_has_qualifier:
                return False

            logger.debug(f"Fuzzy match: '{name1}' <-> '{name2}' (score: {fuzzy_score})")
            return True

        # Partial matching for cases like "Duke" in "Duke Blue Devils"
        # Be careful not to match "Michigan" with "Michigan State"
        if norm1 in norm2 or norm2 in norm1:
            shorter = norm1 if len(norm1) < len(norm2) else norm2
            longer = norm2 if len(norm1) < len(norm2) else norm1

            # Only match if shorter name is at the start of longer name
            # AND there are no additional significant words
            if longer.startswith(shorter):
                remaining = longer[len(shorter):].strip()
                # Allow mascots/common words but not other team identifiers like "state"
                if not remaining or remaining in self.mascots:
                    logger.debug(f"Partial match: '{name1}' <-> '{name2}'")
                    return True

        return False

    def find_best_match(self, target_name: str, candidates: list, threshold: int = 80) -> Optional[str]:
        """
        Find the best matching team name from a list of candidates

        Args:
            target_name: Team name to match
            candidates: List of potential matches
            threshold: Minimum fuzzy match score

        Returns:
            Best matching candidate or None
        """
        best_match = None
        best_score = 0

        target_norm = self.normalize_name(target_name)
        target_canonical = self.get_canonical_name(target_name)

        for candidate in candidates:
            # Exact match
            if candidate.lower() == target_name.lower():
                return candidate

            # Canonical match
            candidate_canonical = self.get_canonical_name(candidate)
            if candidate_canonical == target_canonical:
                return candidate

            # Fuzzy match
            candidate_norm = self.normalize_name(candidate)
            score = fuzz.ratio(target_norm, candidate_norm)

            if score > best_score:
                best_score = score
                best_match = candidate

        if best_score >= threshold:
            logger.debug(f"Best match for '{target_name}': '{best_match}' (score: {best_score})")
            return best_match

        return None


# Singleton instance
_team_matcher = None

def get_team_matcher() -> TeamNameMatcher:
    """Get singleton team name matcher instance"""
    global _team_matcher
    if _team_matcher is None:
        _team_matcher = TeamNameMatcher()
    return _team_matcher

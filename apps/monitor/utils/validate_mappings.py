"""
Team Name Mapping Validation Script
Validates that all teams can be matched across ESPN live scores, The Odds API, and ESPN stats
"""
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Set
from loguru import logger
import pandas as pd
from fuzzywuzzy import fuzz

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import config
from utils.espn_live_fetcher import ESPNLiveFetcher
from utils.team_stats_espn import get_espn_fetcher
from utils.team_name_matcher import TeamNameMatcher
import requests


class MappingValidator:
    """Validates team name mappings across all data sources"""

    def __init__(self):
        self.espn_live = ESPNLiveFetcher()
        self.espn_stats = get_espn_fetcher()
        self.matcher = TeamNameMatcher()

        self.results = {
            "total_live_games": 0,
            "successful_odds_matches": 0,
            "failed_odds_matches": [],
            "successful_stats_matches": 0,
            "failed_stats_matches": [],
            "suggestions": []
        }

    def fetch_odds_api_teams(self) -> Set[str]:
        """Fetch all team names from The Odds API"""
        teams = set()

        try:
            url = "https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/"
            params = {
                "apiKey": config.ODDS_API_KEY,
                "regions": "us",
                "markets": "totals",
                "oddsFormat": "american"
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            for game in data:
                teams.add(game.get("home_team", ""))
                teams.add(game.get("away_team", ""))

            logger.info(f"Fetched {len(teams)} unique teams from Odds API")

        except Exception as e:
            logger.error(f"Error fetching from Odds API: {e}")

        return teams

    def validate_live_games(self):
        """Validate current live games can match to odds and stats"""
        logger.info("=" * 80)
        logger.info("VALIDATING LIVE GAMES")
        logger.info("=" * 80)

        try:
            # Fetch live games from ESPN
            live_games = self.espn_live.fetch_live_games()
            self.results["total_live_games"] = len(live_games)

            logger.info(f"Found {len(live_games)} live games on ESPN")

            # Fetch odds from The Odds API
            odds_url = "https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/"
            odds_params = {
                "apiKey": config.ODDS_API_KEY,
                "regions": "us",
                "markets": "totals",
                "oddsFormat": "american"
            }

            odds_response = requests.get(odds_url, params=odds_params, timeout=10)
            odds_response.raise_for_status()
            odds_games = odds_response.json()

            logger.info(f"Found {len(odds_games)} games with odds on Odds API")

            # Check each live game
            for game in live_games:
                home_team = game.get("home_team")
                away_team = game.get("away_team")
                game_id = game.get("game_id")

                logger.info(f"\nValidating: {away_team} @ {home_team}")

                # Try to match to odds
                espn_matchup = f"{away_team} @ {home_team}"
                matched_game = None

                for odds_game in odds_games:
                    odds_home = odds_game.get("home_team", "")
                    odds_away = odds_game.get("away_team", "")

                    # Use the team matcher
                    home_match = self.matcher.match_teams(home_team, odds_home)
                    away_match = self.matcher.match_teams(away_team, odds_away)

                    if home_match and away_match:
                        matched_game = odds_game
                        logger.success(f"  ✓ Matched to odds: {odds_away} @ {odds_home}")
                        self.results["successful_odds_matches"] += 1
                        break

                if not matched_game:
                    logger.warning(f"  ✗ NO ODDS MATCH FOUND")
                    self.results["failed_odds_matches"].append({
                        "espn_home": home_team,
                        "espn_away": away_team,
                        "game_id": game_id
                    })

                # Try to get stats for both teams
                home_stats = self.espn_stats.get_team_metrics(home_team)
                away_stats = self.espn_stats.get_team_metrics(away_team)

                if home_stats and away_stats:
                    logger.success(f"  ✓ Stats found for both teams")
                    self.results["successful_stats_matches"] += 1
                else:
                    if not home_stats:
                        logger.warning(f"  ✗ NO STATS for {home_team}")
                        self.results["failed_stats_matches"].append(home_team)
                    if not away_stats:
                        logger.warning(f"  ✗ NO STATS for {away_team}")
                        self.results["failed_stats_matches"].append(away_team)

        except Exception as e:
            logger.error(f"Error validating live games: {e}")

    def validate_odds_to_stats(self):
        """Validate that Odds API teams can map to ESPN stats"""
        logger.info("\n" + "=" * 80)
        logger.info("VALIDATING ODDS API TEAMS -> ESPN STATS")
        logger.info("=" * 80)

        odds_teams = self.fetch_odds_api_teams()

        # Load current mapping CSV
        csv_file = Path(__file__).parent.parent / "data" / "team_name_mapping.csv"
        mapping_df = pd.read_csv(csv_file)

        logger.info(f"Loaded {len(mapping_df)} mappings from CSV")

        unmapped_teams = []
        mapped_teams = []

        for team in sorted(odds_teams):
            if not team:
                continue

            # Check if mapping exists
            mapping_row = mapping_df[mapping_df['full_name'].str.lower() == team.lower()]

            if mapping_row.empty:
                logger.warning(f"  ✗ No CSV mapping for: {team}")
                unmapped_teams.append(team)

                # Try to find best match in ESPN stats
                suggestions = self._find_best_espn_match(team)
                if suggestions:
                    self.results["suggestions"].append({
                        "odds_team": team,
                        "suggestions": suggestions
                    })
            else:
                espn_name = mapping_row.iloc[0]['espn_name']
                if pd.isna(espn_name) or espn_name == "":
                    logger.warning(f"  ✗ Empty ESPN mapping for: {team}")
                    unmapped_teams.append(team)
                else:
                    # Verify the mapped name exists in ESPN stats
                    stats = self.espn_stats.get_team_metrics(espn_name)
                    if stats:
                        logger.success(f"  ✓ {team} -> {espn_name}")
                        mapped_teams.append(team)
                    else:
                        logger.error(f"  ✗ Mapped to '{espn_name}' but NO STATS FOUND")
                        unmapped_teams.append(team)

        logger.info(f"\nMapped: {len(mapped_teams)}/{len(odds_teams)}")
        logger.info(f"Unmapped: {len(unmapped_teams)}/{len(odds_teams)}")

        return unmapped_teams

    def _find_best_espn_match(self, odds_team: str, limit: int = 3) -> List[Dict]:
        """Find best matching ESPN team names using fuzzy matching"""
        if self.espn_stats.stats_cache is None:
            self.espn_stats.fetch_team_stats()

        espn_teams = self.espn_stats.stats_cache['team_name'].tolist()

        # Calculate fuzzy match scores
        scores = []
        for espn_team in espn_teams:
            ratio = fuzz.ratio(odds_team.lower(), espn_team.lower())
            partial = fuzz.partial_ratio(odds_team.lower(), espn_team.lower())
            token_sort = fuzz.token_sort_ratio(odds_team.lower(), espn_team.lower())

            best_score = max(ratio, partial, token_sort)

            if best_score >= 60:  # Only include reasonable matches
                scores.append({
                    "espn_name": espn_team,
                    "score": best_score,
                    "ratio": ratio,
                    "partial": partial,
                    "token_sort": token_sort
                })

        # Sort by score and return top matches
        scores.sort(key=lambda x: x['score'], reverse=True)
        return scores[:limit]

    def generate_report(self):
        """Generate comprehensive validation report"""
        logger.info("\n" + "=" * 80)
        logger.info("VALIDATION REPORT")
        logger.info("=" * 80)

        # Summary statistics
        logger.info("\n📊 SUMMARY STATISTICS")
        logger.info(f"  Total live games validated: {self.results['total_live_games']}")
        logger.info(f"  Successful odds matches: {self.results['successful_odds_matches']}")
        logger.info(f"  Failed odds matches: {len(self.results['failed_odds_matches'])}")
        logger.info(f"  Successful stats matches: {self.results['successful_stats_matches']}")
        logger.info(f"  Failed stats matches: {len(set(self.results['failed_stats_matches']))}")

        # Failed odds matches
        if self.results['failed_odds_matches']:
            logger.warning("\n⚠️  GAMES WITHOUT ODDS MATCHES:")
            for failure in self.results['failed_odds_matches']:
                logger.warning(f"  • {failure['espn_away']} @ {failure['espn_home']} (Game ID: {failure['game_id']})")

        # Failed stats matches
        if self.results['failed_stats_matches']:
            unique_failures = set(self.results['failed_stats_matches'])
            logger.warning(f"\n⚠️  TEAMS WITHOUT STATS ({len(unique_failures)} unique):")
            for team in sorted(unique_failures):
                logger.warning(f"  • {team}")

        # Suggestions for unmapped teams
        if self.results['suggestions']:
            logger.info(f"\n💡 MAPPING SUGGESTIONS:")
            for suggestion in self.results['suggestions'][:10]:  # Show first 10
                logger.info(f"\n  Odds API Team: {suggestion['odds_team']}")
                logger.info(f"  Suggested ESPN matches:")
                for match in suggestion['suggestions']:
                    logger.info(f"    {match['score']}% - {match['espn_name']}")

        # Save detailed report to file
        self._save_report_file()

        return self.results

    def _save_report_file(self):
        """Save detailed report to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = Path(__file__).parent.parent / "data" / f"mapping_validation_{timestamp}.json"

        import json
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)

        logger.info(f"\n📄 Detailed report saved to: {report_path}")


def main():
    """Run mapping validation"""
    logger.info("🔍 Starting Team Name Mapping Validation")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")

    validator = MappingValidator()

    # Validate live games
    validator.validate_live_games()

    # Validate odds teams to stats
    validator.validate_odds_to_stats()

    # Generate report
    validator.generate_report()

    logger.success("\n✅ Validation complete!")


if __name__ == "__main__":
    main()

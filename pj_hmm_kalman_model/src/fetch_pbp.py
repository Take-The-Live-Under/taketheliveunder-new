#!/usr/bin/env python3
"""
Fetch Play-by-Play Data from ESPN and Convert to Minute Bins
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from loguru import logger
import time
import sys
import json
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
import config


class ESPNPlayByPlayFetcher:
    """Fetches and processes ESPN play-by-play data into minute bins"""

    BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball"

    def __init__(self, checkpoint_dir: str = None):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        })
        self.checkpoint_dir = Path(checkpoint_dir) if checkpoint_dir else Path(__file__).parent.parent / "outputs"
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

    def fetch_season_schedule(
        self,
        season: int = 2026,
        d1_only: bool = True,
        completed_only: bool = True
    ) -> pd.DataFrame:
        """
        Fetch complete season schedule from ESPN via sportsdataverse

        Args:
            season: Season year (e.g., 2026 for 2025-26 season)
            d1_only: Filter to Division I games only
            completed_only: Filter to completed games only

        Returns:
            DataFrame with schedule info including game_ids
        """
        try:
            from sportsdataverse.mbb import load_mbb_schedule
        except ImportError:
            logger.error("sportsdataverse not installed. Run: pip install sportsdataverse")
            raise

        logger.info(f"Fetching {season} season schedule from ESPN...")
        schedule = load_mbb_schedule(seasons=[season], return_as_pandas=True)

        logger.info(f"Raw schedule: {len(schedule)} games")

        if completed_only:
            # Check for completed games
            if 'status_type_completed' in schedule.columns:
                schedule = schedule[schedule['status_type_completed'] == True]
            elif 'status_type_state' in schedule.columns:
                schedule = schedule[schedule['status_type_state'] == 'post']
            logger.info(f"After completed filter: {len(schedule)} games")

        # Note: groups_id filtering is unreliable as many games have NA values
        # The schedule from sportsdataverse is primarily D1 games
        # If d1_only is True, we skip the groups_id filter since it filters too aggressively
        if d1_only:
            # Check if groups_id column exists and has valid values
            if 'groups_id' in schedule.columns:
                # Only filter if we have groups_id values for most games
                valid_groups = schedule['groups_id'].notna().sum()
                if valid_groups > len(schedule) * 0.5:
                    schedule = schedule[schedule['groups_id'] == 50]
                    logger.info(f"After D1 filter: {len(schedule)} games")
                else:
                    logger.info(f"Skipping D1 filter (groups_id mostly empty: {valid_groups}/{len(schedule)})")

        return schedule

    def get_checkpoint_path(self, prefix: str = "fetch") -> Path:
        """Get path to checkpoint file"""
        return self.checkpoint_dir / f"{prefix}_checkpoint.json"

    def load_checkpoint(self, prefix: str = "fetch") -> Dict:
        """Load checkpoint data"""
        checkpoint_path = self.get_checkpoint_path(prefix)
        if checkpoint_path.exists():
            with open(checkpoint_path, 'r') as f:
                return json.load(f)
        return {"completed_ids": [], "failed_ids": []}

    def save_checkpoint(self, data: Dict, prefix: str = "fetch"):
        """Save checkpoint data"""
        checkpoint_path = self.get_checkpoint_path(prefix)
        with open(checkpoint_path, 'w') as f:
            json.dump(data, f)

    def clear_checkpoint(self, prefix: str = "fetch"):
        """Clear checkpoint file"""
        checkpoint_path = self.get_checkpoint_path(prefix)
        if checkpoint_path.exists():
            checkpoint_path.unlink()
            logger.info(f"Cleared checkpoint: {checkpoint_path}")

    def fetch_game_pbp(self, game_id: str) -> Optional[Dict]:
        """
        Fetch play-by-play data for a single game (from summary endpoint)

        Args:
            game_id: ESPN game ID

        Returns:
            Raw PBP data dict or None if failed
        """
        # Use summary endpoint which contains plays
        url = f"{self.BASE_URL}/summary"
        params = {"event": game_id}

        try:
            response = self.session.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()

            # Extract plays and return in expected format
            return {"plays": data.get("plays", [])}
        except Exception as e:
            logger.warning(f"Failed to fetch PBP for game {game_id}: {e}")
            return None

    def fetch_game_summary(self, game_id: str) -> Optional[Dict]:
        """Fetch game summary for team names and final scores"""
        url = f"{self.BASE_URL}/summary"
        params = {"event": game_id}

        try:
            response = self.session.get(url, params=params, timeout=15)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Failed to fetch summary for game {game_id}: {e}")
            return None

    def parse_pbp_to_minute_bins(
        self,
        pbp_data: Dict,
        summary_data: Dict,
        game_id: str
    ) -> List[Dict]:
        """
        Convert raw PBP data to minute bins

        Args:
            pbp_data: Raw ESPN PBP response
            summary_data: Raw ESPN summary response
            game_id: Game identifier

        Returns:
            List of minute bin dicts
        """
        # Extract team info
        try:
            boxscore = summary_data.get("boxscore", {})
            teams = boxscore.get("teams", [])

            if len(teams) < 2:
                logger.warning(f"Game {game_id}: Not enough team data")
                return []

            # Determine home/away
            home_team = None
            away_team = None
            for team in teams:
                team_info = team.get("team", {})
                homeAway = team.get("homeAway", "")
                if homeAway == "home":
                    home_team = team_info.get("displayName", "Home")
                    home_id = team_info.get("id", "")
                else:
                    away_team = team_info.get("displayName", "Away")
                    away_id = team_info.get("id", "")

            if not home_team or not away_team:
                # Fallback
                home_team = teams[0].get("team", {}).get("displayName", "Team1")
                away_team = teams[1].get("team", {}).get("displayName", "Team2")
                home_id = teams[0].get("team", {}).get("id", "")
                away_id = teams[1].get("team", {}).get("id", "")

        except Exception as e:
            logger.warning(f"Game {game_id}: Error parsing teams: {e}")
            return []

        # Initialize minute bins (40 minutes for regulation)
        minute_bins = {i: {
            "game_id": game_id,
            "minute_index": i,
            "home_team": home_team,
            "away_team": away_team,
            "points_home": 0,
            "points_away": 0,
            "poss_home": 0,
            "poss_away": 0,
            "fouls_home": 0,
            "fouls_away": 0,
            "to_home": 0,
            "to_away": 0,
        } for i in range(50)}  # Up to 50 for OT

        # Parse plays
        plays = []
        for item in pbp_data.get("plays", []):
            plays.append(item)

        if not plays:
            logger.warning(f"Game {game_id}: No plays found")
            return []

        # Process each play
        for play in plays:
            try:
                # Get time info
                clock = play.get("clock", {})
                period = play.get("period", {}).get("number", 1)
                display_value = clock.get("displayValue", "20:00")

                # Parse time to get minute index
                # Format is typically "MM:SS" or "M:SS"
                try:
                    parts = display_value.split(":")
                    minutes_in_period = int(parts[0])
                    # Each half is 20 minutes, minute_index is elapsed time
                    if period <= 2:
                        # Regulation
                        period_start = (period - 1) * 20
                        minute_idx = period_start + (20 - minutes_in_period - 1)
                    else:
                        # Overtime (5 minute periods)
                        period_start = 40 + (period - 3) * 5
                        minute_idx = period_start + (5 - minutes_in_period - 1)

                    minute_idx = max(0, min(49, minute_idx))
                except:
                    continue

                # Get play type and team
                play_type = play.get("type", {}).get("text", "")
                scoring_play = play.get("scoringPlay", False)
                score_value = play.get("scoreValue", 0)

                # Determine which team made the play
                team_id = play.get("team", {}).get("id", "")

                is_home = str(team_id) == str(home_id)

                # Categorize play
                play_text = play.get("text", "").lower()

                # Scoring
                if scoring_play and score_value > 0:
                    if is_home:
                        minute_bins[minute_idx]["points_home"] += score_value
                    else:
                        minute_bins[minute_idx]["points_away"] += score_value

                # Possessions (estimate from shots, turnovers)
                if any(x in play_text for x in ["shot", "layup", "dunk", "three point", "free throw"]):
                    if is_home:
                        minute_bins[minute_idx]["poss_home"] += 1
                    else:
                        minute_bins[minute_idx]["poss_away"] += 1

                # Fouls
                if "foul" in play_text:
                    if is_home:
                        minute_bins[minute_idx]["fouls_home"] += 1
                    else:
                        minute_bins[minute_idx]["fouls_away"] += 1

                # Turnovers
                if "turnover" in play_text or "steal" in play_text:
                    if is_home:
                        minute_bins[minute_idx]["to_home"] += 1
                    else:
                        minute_bins[minute_idx]["to_away"] += 1

            except Exception as e:
                continue

        # Convert to list, only include minutes with activity
        result = []
        for minute_idx in sorted(minute_bins.keys()):
            bin_data = minute_bins[minute_idx]
            # Include if any activity or if within game time
            total_activity = (
                bin_data["points_home"] + bin_data["points_away"] +
                bin_data["poss_home"] + bin_data["poss_away"]
            )
            if total_activity > 0 or minute_idx < 40:
                result.append(bin_data)

        # Trim to actual game length
        # Find last minute with activity
        last_active = 39
        for i, bin_data in enumerate(result):
            if bin_data["points_home"] + bin_data["points_away"] > 0:
                last_active = max(last_active, bin_data["minute_index"])

        result = [r for r in result if r["minute_index"] <= last_active]

        return result

    def fetch_games_pbp(
        self,
        game_ids: List[str],
        delay: float = 0.3,
        use_checkpoint: bool = True,
        checkpoint_every: int = 50,
        save_incremental: bool = True,
        output_dir: str = None
    ) -> pd.DataFrame:
        """
        Fetch PBP for multiple games with progress tracking and checkpointing

        Args:
            game_ids: List of ESPN game IDs
            delay: Delay between requests (seconds)
            use_checkpoint: Resume from checkpoint if available
            checkpoint_every: Save checkpoint every N games
            save_incremental: Save data incrementally to avoid data loss
            output_dir: Directory for incremental saves

        Returns:
            DataFrame with minute bins for all games
        """
        all_bins = []
        failed_games = []

        # Convert to strings
        game_ids = [str(gid) for gid in game_ids]

        # Load checkpoint if resuming
        checkpoint_data = {"completed_ids": [], "failed_ids": []}
        if use_checkpoint:
            checkpoint_data = self.load_checkpoint("season_fetch")
            completed_set = set(checkpoint_data.get("completed_ids", []))
            remaining_ids = [gid for gid in game_ids if gid not in completed_set]

            if len(remaining_ids) < len(game_ids):
                logger.info(f"Resuming from checkpoint: {len(game_ids) - len(remaining_ids)} already completed")
                game_ids = remaining_ids

                # Load existing incremental data
                if save_incremental and output_dir:
                    incremental_path = Path(output_dir) / "incremental_pbp.csv"
                    if incremental_path.exists():
                        existing_df = pd.read_csv(incremental_path)
                        all_bins = existing_df.to_dict('records')
                        logger.info(f"Loaded {len(all_bins)} existing minute bins")

        if not game_ids:
            logger.info("All games already fetched!")
            if all_bins:
                return pd.DataFrame(all_bins)
            return pd.DataFrame()

        # Setup output directory
        if save_incremental:
            out_dir = Path(output_dir) if output_dir else self.checkpoint_dir
            out_dir.mkdir(parents=True, exist_ok=True)

        # Progress bar
        pbar = tqdm(game_ids, desc="Fetching PBP", unit="game")

        for i, game_id in enumerate(pbar):
            pbar.set_postfix({"game": game_id[:10], "bins": len(all_bins)})

            # Fetch summary (contains both PBP and team info)
            try:
                summary_data = self.fetch_game_summary(game_id)
                time.sleep(delay)
            except Exception as e:
                logger.warning(f"Error fetching game {game_id}: {e}")
                failed_games.append(game_id)
                continue

            if not summary_data:
                failed_games.append(game_id)
                continue

            # Extract plays from summary
            pbp_data = {"plays": summary_data.get("plays", [])}

            if not pbp_data["plays"]:
                failed_games.append(game_id)
                continue

            # Parse to minute bins
            bins = self.parse_pbp_to_minute_bins(pbp_data, summary_data, game_id)

            if bins:
                all_bins.extend(bins)
                checkpoint_data["completed_ids"].append(game_id)
            else:
                failed_games.append(game_id)
                checkpoint_data["failed_ids"].append(game_id)

            # Save checkpoint periodically
            if use_checkpoint and (i + 1) % checkpoint_every == 0:
                self.save_checkpoint(checkpoint_data, "season_fetch")

                # Save incremental data
                if save_incremental and all_bins:
                    incremental_path = out_dir / "incremental_pbp.csv"
                    pd.DataFrame(all_bins).to_csv(incremental_path, index=False)
                    logger.info(f"Checkpoint saved: {len(checkpoint_data['completed_ids'])} games, {len(all_bins)} bins")

        pbar.close()

        # Final checkpoint save
        if use_checkpoint:
            self.save_checkpoint(checkpoint_data, "season_fetch")

        if failed_games:
            logger.warning(f"Failed to fetch {len(failed_games)} games")

        if not all_bins:
            return pd.DataFrame()

        df = pd.DataFrame(all_bins)
        logger.info(f"Total: {len(df)} minute bins from {df['game_id'].nunique()} games")

        return df


def fetch_from_historical(
    historical_csv: str,
    output_path: str,
    max_games: int = 100,
    delay: float = 0.3
) -> str:
    """
    Fetch PBP data for games in historical CSV

    Args:
        historical_csv: Path to games CSV with game_id column
        output_path: Where to save minute bins CSV
        max_games: Maximum games to fetch
        delay: Delay between API calls

    Returns:
        Path to output CSV
    """
    # Load historical games
    df = pd.read_csv(historical_csv)

    # Get game IDs
    if "game_id" not in df.columns:
        raise ValueError("CSV must have 'game_id' column")

    game_ids = df["game_id"].astype(str).unique().tolist()
    logger.info(f"Found {len(game_ids)} unique games")

    # Limit if needed
    if len(game_ids) > max_games:
        logger.info(f"Limiting to {max_games} most recent games")
        game_ids = game_ids[:max_games]

    # Fetch PBP
    fetcher = ESPNPlayByPlayFetcher()
    pbp_df = fetcher.fetch_games_pbp(game_ids, delay=delay)

    if pbp_df.empty:
        raise ValueError("No PBP data fetched")

    # Save
    pbp_df.to_csv(output_path, index=False)
    logger.info(f"Saved to {output_path}")

    return output_path


if __name__ == "__main__":
    import click

    @click.command()
    @click.option("--historical", "-h", required=True, help="Path to historical games CSV")
    @click.option("--output", "-o", default="data/pbp_minute_bins.csv", help="Output path")
    @click.option("--max-games", "-n", default=100, type=int, help="Max games to fetch")
    @click.option("--delay", "-d", default=0.3, type=float, help="Delay between requests")
    def main(historical, output, max_games, delay):
        """Fetch ESPN play-by-play and convert to minute bins"""
        from loguru import logger
        import sys

        logger.remove()
        logger.add(sys.stderr, level="INFO")

        output_path = Path(output)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        fetch_from_historical(historical, str(output_path), max_games, delay)

    main()

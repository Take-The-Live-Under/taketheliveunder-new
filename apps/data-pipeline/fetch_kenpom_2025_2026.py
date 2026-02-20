"""
KenPom API Data Fetcher for 2025-2026 Season

Pulls comprehensive team-based data from KenPom API including:
- Team ratings and rankings
- Offensive/Defensive efficiency stats
- Tempo and pace metrics
- Four Factors (eFG%, TOV%, ORB%, FTR)
- Strength of schedule
- And more advanced metrics

Saves data to CSV for analysis.
"""

import requests
import pandas as pd
import json
from datetime import datetime
from typing import Dict, List, Optional
import time

class KenPomAPI:
    """KenPom API client for fetching 2025-2026 season data"""

    BASE_URL = "https://api.kenpom.com"

    def __init__(self, api_key: str):
        """
        Initialize KenPom API client

        Args:
            api_key: Your KenPom API key
        """
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.season = "2025-2026"  # KenPom uses YYYY-YYYY format

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        Make API request with error handling

        Args:
            endpoint: API endpoint path
            params: Optional query parameters

        Returns:
            JSON response as dict
        """
        url = f"{self.BASE_URL}/{endpoint}"

        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e}")
            print(f"Response: {response.text}")
            raise
        except requests.exceptions.RequestException as e:
            print(f"Request Error: {e}")
            raise

    def get_team_ratings(self) -> pd.DataFrame:
        """
        Get team ratings (efficiency, tempo, rankings)

        Returns:
            DataFrame with team ratings
        """
        print("Fetching team ratings...")
        data = self._make_request("ratings", params={"season": self.season})

        # Extract team data
        teams = []
        for team in data.get('teams', []):
            teams.append({
                'team_id': team.get('team_id'),
                'team_name': team.get('team'),
                'conf': team.get('conf'),
                'rank': team.get('rank'),
                'adj_em': team.get('adj_em'),  # Adjusted Efficiency Margin
                'adj_o': team.get('adj_o'),    # Adjusted Offensive Efficiency
                'adj_o_rank': team.get('adj_o_rank'),
                'adj_d': team.get('adj_d'),    # Adjusted Defensive Efficiency
                'adj_d_rank': team.get('adj_d_rank'),
                'adj_t': team.get('adj_t'),    # Adjusted Tempo
                'adj_t_rank': team.get('adj_t_rank'),
                'luck': team.get('luck'),
                'luck_rank': team.get('luck_rank'),
                'sos_adj_em': team.get('sos_adj_em'),  # Strength of Schedule
                'sos_adj_em_rank': team.get('sos_adj_em_rank'),
                'sos_opp_o': team.get('sos_opp_o'),
                'sos_opp_o_rank': team.get('sos_opp_o_rank'),
                'sos_opp_d': team.get('sos_opp_d'),
                'sos_opp_d_rank': team.get('sos_opp_d_rank'),
                'ncsos_adj_em': team.get('ncsos_adj_em'),  # Non-Conf SOS
                'ncsos_adj_em_rank': team.get('ncsos_adj_em_rank'),
            })

        df = pd.DataFrame(teams)
        print(f"Retrieved {len(df)} teams")
        return df

    def get_four_factors(self) -> pd.DataFrame:
        """
        Get Four Factors data (eFG%, TOV%, ORB%, FTR)

        Returns:
            DataFrame with four factors
        """
        print("Fetching Four Factors...")
        data = self._make_request("fourfactors", params={"season": self.season})

        teams = []
        for team in data.get('teams', []):
            teams.append({
                'team_id': team.get('team_id'),
                'team_name': team.get('team'),
                # Offensive Four Factors
                'off_efg': team.get('off_efg'),
                'off_efg_rank': team.get('off_efg_rank'),
                'off_tov': team.get('off_tov'),
                'off_tov_rank': team.get('off_tov_rank'),
                'off_orb': team.get('off_orb'),
                'off_orb_rank': team.get('off_orb_rank'),
                'off_ftr': team.get('off_ftr'),
                'off_ftr_rank': team.get('off_ftr_rank'),
                # Defensive Four Factors
                'def_efg': team.get('def_efg'),
                'def_efg_rank': team.get('def_efg_rank'),
                'def_tov': team.get('def_tov'),
                'def_tov_rank': team.get('def_tov_rank'),
                'def_orb': team.get('def_orb'),
                'def_orb_rank': team.get('def_orb_rank'),
                'def_ftr': team.get('def_ftr'),
                'def_ftr_rank': team.get('def_ftr_rank'),
            })

        df = pd.DataFrame(teams)
        print(f"Retrieved Four Factors for {len(df)} teams")
        return df

    def get_height_stats(self) -> pd.DataFrame:
        """
        Get team height and experience stats

        Returns:
            DataFrame with height/experience data
        """
        print("Fetching height/experience stats...")
        data = self._make_request("height", params={"season": self.season})

        teams = []
        for team in data.get('teams', []):
            teams.append({
                'team_id': team.get('team_id'),
                'team_name': team.get('team'),
                'avg_height': team.get('avg_hgt'),
                'avg_height_rank': team.get('avg_hgt_rank'),
                'eff_height': team.get('eff_hgt'),
                'eff_height_rank': team.get('eff_hgt_rank'),
                'experience': team.get('experience'),
                'experience_rank': team.get('experience_rank'),
                'bench_minutes': team.get('bench'),
                'bench_minutes_rank': team.get('bench_rank'),
                'continuity': team.get('continuity'),
                'continuity_rank': team.get('continuity_rank'),
            })

        df = pd.DataFrame(teams)
        print(f"Retrieved height/experience for {len(df)} teams")
        return df

    def get_pointdist_stats(self) -> pd.DataFrame:
        """
        Get point distribution stats (2pt%, 3pt%, FT%)

        Returns:
            DataFrame with scoring distribution
        """
        print("Fetching point distribution...")
        data = self._make_request("pointdist", params={"season": self.season})

        teams = []
        for team in data.get('teams', []):
            teams.append({
                'team_id': team.get('team_id'),
                'team_name': team.get('team'),
                # Offensive distribution
                'off_ftrd': team.get('off_ftrd'),  # % points from FT
                'off_ftrd_rank': team.get('off_ftrd_rank'),
                'off_2ptrd': team.get('off_2ptrd'),  # % points from 2PT
                'off_2ptrd_rank': team.get('off_2ptrd_rank'),
                'off_3ptrd': team.get('off_3ptrd'),  # % points from 3PT
                'off_3ptrd_rank': team.get('off_3ptrd_rank'),
                # Defensive distribution
                'def_ftrd': team.get('def_ftrd'),
                'def_ftrd_rank': team.get('def_ftrd_rank'),
                'def_2ptrd': team.get('def_2ptrd'),
                'def_2ptrd_rank': team.get('def_2ptrd_rank'),
                'def_3ptrd': team.get('def_3ptrd'),
                'def_3ptrd_rank': team.get('def_3ptrd_rank'),
            })

        df = pd.DataFrame(teams)
        print(f"Retrieved point distribution for {len(df)} teams")
        return df

    def get_team_schedule(self, team_id: Optional[int] = None) -> pd.DataFrame:
        """
        Get team schedule/results

        Args:
            team_id: Specific team ID (optional, if None gets all teams)

        Returns:
            DataFrame with game results
        """
        print(f"Fetching team schedule...")
        params = {"season": self.season}
        if team_id:
            params["team"] = team_id

        data = self._make_request("team", params=params)

        games = []
        for game in data.get('games', []):
            games.append({
                'game_id': game.get('game_id'),
                'date': game.get('date'),
                'team': game.get('team'),
                'opponent': game.get('opponent'),
                'location': game.get('location'),  # H/A/N
                'result': game.get('result'),  # W/L
                'score': game.get('score'),
                'opp_score': game.get('opp_score'),
                'tempo': game.get('tempo'),
                'off_eff': game.get('off_eff'),
                'def_eff': game.get('def_eff'),
            })

        df = pd.DataFrame(games)
        print(f"Retrieved {len(df)} games")
        return df

    def get_all_data(self) -> Dict[str, pd.DataFrame]:
        """
        Fetch all available team data from KenPom API

        Returns:
            Dictionary of DataFrames with all team data
        """
        print(f"\nFetching all KenPom data for {self.season} season...")
        print("=" * 60)

        all_data = {}

        # Add small delays between requests to be respectful to API
        try:
            all_data['ratings'] = self.get_team_ratings()
            time.sleep(0.5)

            all_data['four_factors'] = self.get_four_factors()
            time.sleep(0.5)

            all_data['height'] = self.get_height_stats()
            time.sleep(0.5)

            all_data['point_dist'] = self.get_pointdist_stats()
            time.sleep(0.5)

            # Schedule can be large, optional
            # all_data['schedule'] = self.get_team_schedule()

        except Exception as e:
            print(f"\nError fetching data: {e}")
            print("Returning partial data collected so far...")

        print("\n" + "=" * 60)
        print("Data collection complete!")
        return all_data

    def merge_all_team_data(self, data_dict: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Merge all team datasets into single comprehensive DataFrame

        Args:
            data_dict: Dictionary of DataFrames from get_all_data()

        Returns:
            Single merged DataFrame with all team stats
        """
        print("\nMerging all datasets...")

        # Start with ratings as base
        merged = data_dict['ratings'].copy()

        # Merge other datasets on team_id and team_name
        for key, df in data_dict.items():
            if key == 'ratings':
                continue
            if key == 'schedule':
                continue  # Skip schedule (game-level data)

            # Merge on both team_id and team_name for safety
            merged = merged.merge(
                df,
                on=['team_id', 'team_name'],
                how='left',
                suffixes=('', f'_{key}')
            )

        print(f"Merged dataset has {len(merged)} teams and {len(merged.columns)} columns")
        return merged


def main():
    """Main execution function"""

    # Your KenPom API key
    API_KEY = "a0155e1f2bc4453f1d6943bd7ed1cf52a1ddfa35ba0df2fde24fff294d70444c"

    # Initialize API client
    kenpom = KenPomAPI(API_KEY)

    # Fetch all data
    all_data = kenpom.get_all_data()

    # Save individual datasets
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = "data/kenpom_2025_2026"

    import os
    os.makedirs(output_dir, exist_ok=True)

    print(f"\nSaving datasets to {output_dir}/")
    for name, df in all_data.items():
        filename = f"{output_dir}/kenpom_{name}_{timestamp}.csv"
        df.to_csv(filename, index=False)
        print(f"  ✓ Saved {name}: {filename}")

    # Create comprehensive merged dataset
    if len(all_data) > 1:
        merged_df = kenpom.merge_all_team_data(all_data)
        merged_filename = f"{output_dir}/kenpom_complete_{timestamp}.csv"
        merged_df.to_csv(merged_filename, index=False)
        print(f"  ✓ Saved merged dataset: {merged_filename}")

        # Display summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total teams: {len(merged_df)}")
        print(f"Total columns: {len(merged_df.columns)}")
        print(f"\nSample of top 10 teams:")
        print(merged_df[['rank', 'team_name', 'conf', 'adj_em', 'adj_o', 'adj_d', 'adj_t']].head(10))

        # Save JSON version too
        json_filename = f"{output_dir}/kenpom_complete_{timestamp}.json"
        merged_df.to_json(json_filename, orient='records', indent=2)
        print(f"\n  ✓ Also saved as JSON: {json_filename}")

    print("\n" + "=" * 60)
    print("Done! All KenPom 2025-2026 data has been downloaded.")
    print("=" * 60)

    return all_data


if __name__ == "__main__":
    # Run the fetcher
    data = main()

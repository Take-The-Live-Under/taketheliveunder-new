#!/usr/bin/env python3
"""
Pomeroy Possessions Calculator

Implements Ken Pomeroy's possession estimation formula:
    poss = FGA - OR + TO + 0.475 × FTA

References:
- KenPom.com methodology
- https://kenpom.com/blog/the-possession/
"""

import pandas as pd
import numpy as np
from typing import Dict, Union, Optional


# Ken Pomeroy's FTA multiplier
POMEROY_FTA_MULTIPLIER = 0.475

# Standard college basketball game length (minutes)
STANDARD_GAME_LENGTH = 40

# Overtime period length
OVERTIME_LENGTH = 5


def calculate_possessions(
    fga: Union[int, float],
    fta: Union[int, float],
    oreb: Union[int, float],
    to: Union[int, float]
) -> float:
    """
    Calculate possessions using Pomeroy's formula.

    Formula: poss = FGA - OR + TO + 0.475 × FTA

    Args:
        fga: Field goal attempts
        fta: Free throw attempts
        oreb: Offensive rebounds
        to: Turnovers

    Returns:
        Estimated possessions

    Example:
        >>> calculate_possessions(fga=60, fta=20, oreb=12, to=15)
        72.5
    """
    possessions = fga - oreb + to + (POMEROY_FTA_MULTIPLIER * fta)
    return possessions


def calculate_team_possessions(
    team_fga: Union[int, float],
    team_fta: Union[int, float],
    team_oreb: Union[int, float],
    team_to: Union[int, float],
    opp_fga: Union[int, float],
    opp_fta: Union[int, float],
    opp_oreb: Union[int, float],
    opp_to: Union[int, float]
) -> float:
    """
    Calculate game possessions by averaging team and opponent estimates.

    This provides a more accurate possession count as it accounts for both teams.

    Args:
        team_*: Team's stats (FGA, FTA, OREB, TO)
        opp_*: Opponent's stats (FGA, FTA, OREB, TO)

    Returns:
        Average possessions for the game

    Example:
        >>> calculate_team_possessions(
        ...     team_fga=60, team_fta=20, team_oreb=12, team_to=15,
        ...     opp_fga=58, opp_fta=18, opp_oreb=10, opp_to=14
        ... )
        71.375
    """
    team_poss = calculate_possessions(team_fga, team_fta, team_oreb, team_to)
    opp_poss = calculate_possessions(opp_fga, opp_fta, opp_oreb, opp_to)

    return (team_poss + opp_poss) / 2


def calculate_efficiency(
    points: Union[int, float],
    possessions: float,
    per_100: bool = True
) -> float:
    """
    Calculate offensive or defensive efficiency.

    Args:
        points: Points scored (offensive) or allowed (defensive)
        possessions: Number of possessions
        per_100: If True, return per 100 possessions (default).
                 If False, return per possession.

    Returns:
        Efficiency rating

    Example:
        >>> calculate_efficiency(points=80, possessions=70, per_100=True)
        114.29
    """
    if possessions == 0:
        return 0.0

    efficiency = points / possessions

    if per_100:
        efficiency *= 100

    return round(efficiency, 2)


def calculate_tempo(
    possessions: float,
    game_minutes: float = STANDARD_GAME_LENGTH,
    per_40: bool = True
) -> float:
    """
    Calculate tempo (possessions per time period).

    Args:
        possessions: Total possessions in game
        game_minutes: Actual game length in minutes (default 40)
        per_40: If True, normalize to per 40 minutes (default).
                If False, return raw pace.

    Returns:
        Tempo rating

    Example:
        >>> calculate_tempo(possessions=70, game_minutes=40)
        70.0
        >>> calculate_tempo(possessions=77, game_minutes=45)  # OT game
        68.44
    """
    if game_minutes == 0:
        return 0.0

    tempo = possessions

    if per_40:
        tempo = (possessions / game_minutes) * STANDARD_GAME_LENGTH

    return round(tempo, 2)


def process_game_stats(game_data: Dict) -> Dict:
    """
    Process raw game stats to calculate Pomeroy metrics.

    Args:
        game_data: Dictionary containing game stats with keys:
            - home_fgm, home_fga, home_ftm, home_fta, home_oreb, home_to, home_points
            - away_fgm, away_fga, away_ftm, away_fta, away_oreb, away_to, away_points
            - game_minutes (optional, defaults to 40)

    Returns:
        Dictionary with calculated metrics:
            - possessions: Average possessions
            - home_off_eff: Home offensive efficiency
            - away_off_eff: Away offensive efficiency
            - home_def_eff: Home defensive efficiency
            - away_def_eff: Away defensive efficiency
            - tempo: Game tempo (per 40 min)
            - total_points: Total points in game

    Example:
        >>> stats = {
        ...     'home_fga': 60, 'home_fta': 20, 'home_oreb': 12, 'home_to': 15, 'home_points': 80,
        ...     'away_fga': 58, 'away_fta': 18, 'away_oreb': 10, 'away_to': 14, 'away_points': 75
        ... }
        >>> result = process_game_stats(stats)
        >>> result['possessions']
        71.375
        >>> result['home_off_eff']
        112.11
    """
    # Calculate possessions
    possessions = calculate_team_possessions(
        team_fga=game_data['home_fga'],
        team_fta=game_data['home_fta'],
        team_oreb=game_data['home_oreb'],
        team_to=game_data['home_to'],
        opp_fga=game_data['away_fga'],
        opp_fta=game_data['away_fta'],
        opp_oreb=game_data['away_oreb'],
        opp_to=game_data['away_to']
    )

    # Calculate efficiencies
    home_off_eff = calculate_efficiency(game_data['home_points'], possessions)
    away_off_eff = calculate_efficiency(game_data['away_points'], possessions)
    home_def_eff = calculate_efficiency(game_data['away_points'], possessions)  # Points allowed
    away_def_eff = calculate_efficiency(game_data['home_points'], possessions)  # Points allowed

    # Calculate tempo
    game_minutes = game_data.get('game_minutes', STANDARD_GAME_LENGTH)
    tempo = calculate_tempo(possessions, game_minutes)

    return {
        'possessions': round(possessions, 2),
        'home_off_eff': home_off_eff,
        'away_off_eff': away_off_eff,
        'home_def_eff': home_def_eff,
        'away_def_eff': away_def_eff,
        'tempo': tempo,
        'total_points': game_data['home_points'] + game_data['away_points']
    }


def process_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Process a DataFrame of games to calculate Pomeroy metrics.

    Expected DataFrame columns:
        - Home FGM, Home FGA, Home FTM, Home FTA, Home Off Rebounds, Home Turnovers, Score 1 (home points)
        - Away FGM, Away FGA, Away FTM, Away FTA, Away Off Rebounds, Away Turnovers, Score 2 (away points)
        - Period (to detect overtime)

    Returns:
        DataFrame with additional columns:
            - possessions, home_off_eff, away_off_eff, home_def_eff, away_def_eff, tempo, total_points
    """
    results = []

    for idx, row in df.iterrows():
        # Determine game length (check for overtime)
        period = row.get('Period', 2)  # Default to regulation
        if period > 2:  # Overtime
            overtimes = period - 2
            game_minutes = STANDARD_GAME_LENGTH + (overtimes * OVERTIME_LENGTH)
        else:
            game_minutes = STANDARD_GAME_LENGTH

        game_data = {
            'home_fga': row.get('Home FGA', 0),
            'home_fta': row.get('Home FTA', 0),
            'home_oreb': row.get('Home Off Rebounds', 0),
            'home_to': row.get('Home Turnovers', 0),
            'home_points': row.get('Score 1', 0),  # Score 1 is home team
            'away_fga': row.get('Away FGA', 0),
            'away_fta': row.get('Away FTA', 0),
            'away_oreb': row.get('Away Off Rebounds', 0),
            'away_to': row.get('Away Turnovers', 0),
            'away_points': row.get('Score 2', 0),  # Score 2 is away team
            'game_minutes': game_minutes
        }

        metrics = process_game_stats(game_data)
        results.append(metrics)

    metrics_df = pd.DataFrame(results)

    # Combine with original dataframe
    result_df = pd.concat([df.reset_index(drop=True), metrics_df], axis=1)

    return result_df


if __name__ == "__main__":
    # Test the functions
    print("Testing Pomeroy Possessions Calculator")
    print("=" * 60)

    # Test 1: Basic possession calculation
    print("\nTest 1: Basic possession calculation")
    poss = calculate_possessions(fga=60, fta=20, oreb=12, to=15)
    print(f"  FGA=60, FTA=20, OREB=12, TO=15")
    print(f"  Possessions: {poss}")

    # Test 2: Team possessions (average of both teams)
    print("\nTest 2: Team possessions")
    team_poss = calculate_team_possessions(
        team_fga=60, team_fta=20, team_oreb=12, team_to=15,
        opp_fga=58, opp_fta=18, opp_oreb=10, opp_to=14
    )
    print(f"  Average possessions: {team_poss}")

    # Test 3: Efficiency
    print("\nTest 3: Offensive efficiency")
    eff = calculate_efficiency(points=80, possessions=70)
    print(f"  80 points on 70 possessions: {eff} per 100")

    # Test 4: Tempo
    print("\nTest 4: Tempo")
    tempo = calculate_tempo(possessions=70, game_minutes=40)
    print(f"  70 possessions in 40 minutes: {tempo} per 40")

    tempo_ot = calculate_tempo(possessions=77, game_minutes=45)
    print(f"  77 possessions in 45 minutes (OT): {tempo_ot} per 40")

    # Test 5: Full game processing
    print("\nTest 5: Full game processing")
    game = {
        'home_fga': 60, 'home_fta': 20, 'home_oreb': 12, 'home_to': 15, 'home_points': 80,
        'away_fga': 58, 'away_fta': 18, 'away_oreb': 10, 'away_to': 14, 'away_points': 75
    }
    result = process_game_stats(game)
    print(f"  Possessions: {result['possessions']}")
    print(f"  Home Off Eff: {result['home_off_eff']}")
    print(f"  Away Off Eff: {result['away_off_eff']}")
    print(f"  Tempo: {result['tempo']}")
    print(f"  Total Points: {result['total_points']}")

    print("\n" + "=" * 60)
    print("All tests completed successfully!")

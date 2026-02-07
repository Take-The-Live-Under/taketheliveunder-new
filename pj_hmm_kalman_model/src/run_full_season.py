#!/usr/bin/env python3
"""
Run Full Season Analysis with HMM + Kalman Filter Model

Fetches all NCAA D1 games for the season, processes play-by-play data,
and generates comprehensive team breakdowns and projections.

Enhanced with:
- Team profiles and matchup adjustments
- Team-adaptive Kalman filtering
- Betting signal generation
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
from datetime import datetime
from loguru import logger
import click
import pickle

import config
from src.fetch_pbp import ESPNPlayByPlayFetcher
from src.hmm_model import HMMRegimeDetector
from src.kalman_filter import AdaptiveKalmanFilter, TeamAdaptiveKalmanFilter
from src.team_breakdown import TeamBreakdownAnalyzer
from src.visualize import PJVisualizer

# Enhanced imports (conditionally loaded based on feature flags)
if getattr(config, 'USE_TEAM_KALMAN', False) or getattr(config, 'USE_ENHANCED_FEATURES', False):
    from src.team_profiles import TeamProfileManager, get_team_profile_manager
    from src.matchup_model import MatchupAdjuster, get_matchup_adjuster

if getattr(config, 'GENERATE_BETTING_SIGNALS', False):
    from src.betting_signals import BettingSignalCalculator, get_betting_signal_calculator


def setup_logging(verbose: bool = False):
    """Configure logging"""
    logger.remove()
    level = "DEBUG" if verbose else "INFO"
    logger.add(sys.stderr, level=level, format="{time:HH:mm:ss} | {level:<7} | {message}")


def run_full_season(
    season: int = 2026,
    limit: int = None,
    dry_run: bool = False,
    skip_fetch: bool = False,
    clear_checkpoint: bool = False,
    output_dir: str = None,
    delay: float = 0.3
):
    """
    Run full season analysis

    Args:
        season: Season year (2026 = 2025-26 season)
        limit: Limit number of games (for testing)
        dry_run: Only show what would be fetched, don't fetch
        skip_fetch: Skip fetching, use existing data
        clear_checkpoint: Clear existing checkpoint and start fresh
        output_dir: Output directory for results
        delay: Delay between API requests
    """
    # Setup output directory
    if output_dir:
        out_dir = Path(output_dir)
    else:
        out_dir = Path(__file__).parent.parent / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Initialize fetcher
    fetcher = ESPNPlayByPlayFetcher(checkpoint_dir=str(out_dir))

    if clear_checkpoint:
        fetcher.clear_checkpoint("season_fetch")
        logger.info("Cleared checkpoint")

    # ==========================================
    # STEP 1: Fetch Season Schedule
    # ==========================================
    logger.info(f"=" * 60)
    logger.info(f"STEP 1: Fetching {season} Season Schedule")
    logger.info(f"=" * 60)

    schedule = fetcher.fetch_season_schedule(
        season=season,
        d1_only=True,
        completed_only=True
    )

    logger.info(f"Found {len(schedule)} completed D1 games")

    # Get game IDs
    game_ids = schedule['game_id'].astype(str).unique().tolist()

    if limit:
        logger.info(f"Limiting to {limit} games (for testing)")
        game_ids = game_ids[:limit]

    if dry_run:
        logger.info(f"\n[DRY RUN] Would fetch PBP for {len(game_ids)} games")
        logger.info(f"Sample game IDs: {game_ids[:10]}")

        # Show team counts
        if 'home_display_name' in schedule.columns:
            teams = set(schedule['home_display_name'].tolist() + schedule['away_display_name'].tolist())
            logger.info(f"Unique teams: {len(teams)}")

        return

    # ==========================================
    # STEP 2: Fetch Play-by-Play Data
    # ==========================================
    logger.info(f"\n" + "=" * 60)
    logger.info(f"STEP 2: Fetching Play-by-Play Data")
    logger.info(f"=" * 60)

    if skip_fetch:
        # Load existing data
        existing_path = out_dir / "incremental_pbp.csv"
        if existing_path.exists():
            logger.info(f"Loading existing PBP data from {existing_path}")
            pbp_df = pd.read_csv(existing_path)
        else:
            # Try to find most recent season file
            season_files = list(out_dir.glob("season_pbp_*.csv"))
            if season_files:
                latest = sorted(season_files)[-1]
                logger.info(f"Loading existing PBP data from {latest}")
                pbp_df = pd.read_csv(latest)
            else:
                logger.error("No existing PBP data found. Run without --skip-fetch")
                return
    else:
        pbp_df = fetcher.fetch_games_pbp(
            game_ids,
            delay=delay,
            use_checkpoint=True,
            checkpoint_every=50,
            save_incremental=True,
            output_dir=str(out_dir)
        )

        if pbp_df.empty:
            logger.error("No PBP data fetched!")
            return

        # Save full PBP data
        pbp_path = out_dir / f"season_pbp_{timestamp}.csv"
        pbp_df.to_csv(pbp_path, index=False)
        logger.info(f"Saved PBP data to {pbp_path}")

    logger.info(f"PBP data: {len(pbp_df)} minute bins from {pbp_df['game_id'].nunique()} games")

    # ==========================================
    # STEP 3: Process with HMM + Kalman
    # ==========================================
    logger.info(f"\n" + "=" * 60)
    logger.info(f"STEP 3: Running HMM + Kalman Filter Model")
    logger.info(f"=" * 60)

    # Engineer features directly on the DataFrame
    processed_df = pbp_df.copy()

    # Points per minute bin
    processed_df["ppm"] = processed_df["points_home"] + processed_df["points_away"]

    # Possessions per minute bin
    processed_df["posm"] = processed_df["poss_home"] + processed_df["poss_away"]

    # Fouls per minute bin
    processed_df["foulm"] = processed_df["fouls_home"] + processed_df["fouls_away"]

    # Turnovers per minute bin
    processed_df["tovm"] = processed_df["to_home"] + processed_df["to_away"]

    # Calculate cumulative points for projections
    processed_df = processed_df.sort_values(["game_id", "minute_index"])
    processed_df["points_so_far"] = processed_df.groupby("game_id")["ppm"].cumsum()

    # Calculate minutes remaining (assuming 40-minute game)
    total_minutes = config.PROJECTION_CONFIG["total_minutes"]
    processed_df["minutes_remaining"] = total_minutes - processed_df["minute_index"]
    processed_df["minutes_elapsed"] = processed_df["minute_index"]

    # Late game flag
    late_threshold = config.KALMAN_CONFIG["late_game_threshold"]
    processed_df["is_late_game"] = processed_df["minutes_remaining"] < late_threshold

    # ==========================================
    # STEP 3a: Add Enhanced Features (if enabled)
    # ==========================================
    if getattr(config, 'USE_ENHANCED_FEATURES', False):
        logger.info("Adding enhanced features...")
        processed_df = _add_enhanced_features(processed_df)

    # Handle any NaN values
    processed_df = processed_df.fillna(0)

    logger.info(f"Processed {len(processed_df)} minute bins")

    # ==========================================
    # STEP 3b: Build Team Profiles (if enabled)
    # ==========================================
    profile_manager = None
    matchup_adjuster = None

    if getattr(config, 'USE_TEAM_KALMAN', False):
        logger.info("Building team profiles...")
        profile_manager = get_team_profile_manager()
        profile_manager.build_profiles_from_season(processed_df)

        # Save profiles
        profiles_path = out_dir / f"team_profiles_{timestamp}.csv"
        profile_manager.save_profiles(str(profiles_path))
        logger.info(f"Team profiles saved to {profiles_path}")

        # Log some example profiles
        profiles_df = profile_manager.get_all_profiles_df()
        if not profiles_df.empty:
            fast_teams = profiles_df[profiles_df['pace_category'] == 'Fast'].head(5)
            slow_teams = profiles_df[profiles_df['pace_category'] == 'Slow'].head(5)
            logger.info(f"Fast pace teams: {fast_teams['team_name'].tolist()}")
            logger.info(f"Slow pace teams: {slow_teams['team_name'].tolist()}")

        matchup_adjuster = get_matchup_adjuster(profile_manager)

    # Initialize and fit HMM
    logger.info("Fitting HMM for game regime detection...")
    hmm_model = HMMRegimeDetector(n_states=config.HMM_CONFIG["n_states"])

    feature_cols = ['ppm', 'posm', 'foulm', 'tovm']

    # Standardize features
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()

    # Fit scaler on all data
    all_features = processed_df[feature_cols].values
    scaler.fit(all_features)

    # Create sequences dict for HMM (game_id -> scaled features array)
    sequences = {}
    for game_id in processed_df['game_id'].unique():
        game_data = processed_df[processed_df['game_id'] == game_id].sort_values('minute_index')
        game_features = game_data[feature_cols].values
        sequences[str(game_id)] = scaler.transform(game_features)

    hmm_model.fit(sequences)
    logger.info(f"HMM fitted with {config.HMM_CONFIG['n_states']} states")

    # Profile states (populated during fit)
    state_profiles = hmm_model.state_profiles
    logger.info("State profiles:")
    for state_id, profile in state_profiles.items():
        ppm_mean = profile['means'].get('ppm', 0)
        logger.info(f"  State {state_id} ({profile['label']}): PPM_mean={ppm_mean:.2f}")

    # Save HMM model and scaler for monitor integration
    hmm_save_path = out_dir / f"hmm_model_{timestamp}.pkl"
    with open(hmm_save_path, 'wb') as f:
        pickle.dump({
            'hmm_model': hmm_model,
            'scaler': scaler,
            'state_profiles': state_profiles,
            'feature_cols': feature_cols,
        }, f)
    logger.info(f"Saved HMM model to {hmm_save_path}")

    # Process all games with Kalman filter
    logger.info("\nProcessing all games with Kalman filter...")

    # Initialize betting signal calculator if enabled
    signal_calculator = None
    all_signals = []
    if getattr(config, 'GENERATE_BETTING_SIGNALS', False):
        signal_calculator = get_betting_signal_calculator()

    all_results = []
    game_ids = processed_df['game_id'].unique()

    for game_id in game_ids:
        game_data = processed_df[processed_df['game_id'] == game_id].copy()

        # Get features for this game
        game_features = game_data[feature_cols].values
        game_features_scaled = scaler.transform(game_features)

        # Predict states
        states = hmm_model.predict_states(game_features_scaled)
        state_probs = hmm_model.predict_state_probabilities(game_features_scaled)

        game_data['hmm_state'] = states
        game_data['hmm_state_label'] = [state_profiles[s]['label'] for s in states]

        for i in range(min(4, state_probs.shape[1])):
            game_data[f'state_{i}_prob'] = state_probs[:, i]

        # Get team info for this game
        home_team = game_data.iloc[0].get('team_home', game_data.iloc[0].get('home_team', 'Home'))
        away_team = game_data.iloc[0].get('team_away', game_data.iloc[0].get('away_team', 'Away'))

        # Get team profiles and matchup adjustment
        matchup_info = None
        team_q_mult = 1.0
        team_r_mult = 1.0

        if profile_manager and matchup_adjuster:
            home_profile = profile_manager.get_team_baseline(home_team)
            away_profile = profile_manager.get_team_baseline(away_team)
            matchup = matchup_adjuster.calculate_matchup_adjustment(home_team, away_team)

            team_q_mult = matchup.q_multiplier
            team_r_mult = matchup.r_multiplier

            matchup_info = {
                "matchup_type": matchup.matchup_type,
                "home_pace": home_profile.pace_category,
                "away_pace": away_profile.pace_category,
                "pace_agreement": matchup.pace_agreement,
            }

            # Add matchup info to game data
            game_data['matchup_type'] = matchup.matchup_type
            game_data['home_pace'] = home_profile.pace_category
            game_data['away_pace'] = away_profile.pace_category
            game_data['pace_agreement'] = matchup.pace_agreement

        # Run Kalman filter (use team-adaptive if enabled)
        if getattr(config, 'USE_TEAM_KALMAN', False) and profile_manager:
            kalman = TeamAdaptiveKalmanFilter()
            kalman.set_team_adjustments(
                home_q_mult=home_profile.get_q_multiplier() if 'home_profile' in dir() else 1.0,
                home_r_mult=home_profile.get_r_multiplier() if 'home_profile' in dir() else 1.0,
                away_q_mult=away_profile.get_q_multiplier() if 'away_profile' in dir() else 1.0,
                away_r_mult=away_profile.get_r_multiplier() if 'away_profile' in dir() else 1.0,
            )
        else:
            kalman = AdaptiveKalmanFilter()

        filtered_ppm = []
        kalman_gains = []
        q_values = []
        r_values = []
        projected_totals = []
        kalman_covariances = []

        cumulative_points = 0
        base_Q = config.KALMAN_CONFIG["Q_default"]
        base_R = config.KALMAN_CONFIG["R_default"]

        for idx, row in game_data.iterrows():
            minute_idx = row['minute_index']
            raw_ppm = row['ppm']
            state = row['hmm_state']
            state_label = row['hmm_state_label']
            minutes_remaining = max(1, 40 - minute_idx)

            # Use team-adaptive filter step if available
            if isinstance(kalman, TeamAdaptiveKalmanFilter):
                est_ppm, P, K, adjustments = kalman.filter_step_team_adaptive(
                    z=raw_ppm,
                    minutes_remaining=minutes_remaining,
                    hmm_state=state
                )
                Q = adjustments.get('Q_adjusted', base_Q)
                R = adjustments.get('R_adjusted', base_R)
            else:
                # Regular adaptive filter with regime adjustments
                regime_adjustments = config.REGIME_KALMAN_ADJUSTMENTS.get(state, {})
                Q = base_Q * regime_adjustments.get('Q_mult', 1.0)
                R = base_R * regime_adjustments.get('R_mult', 1.0)

                kalman.Q = Q
                kalman.R = R
                est_ppm, P, K = kalman.filter_step(raw_ppm)

            filtered_ppm.append(est_ppm)
            kalman_gains.append(K)
            q_values.append(Q)
            r_values.append(R)
            kalman_covariances.append(P)

            # Calculate projected total
            cumulative_points += row['ppm']
            projected = cumulative_points + (est_ppm * minutes_remaining)
            projected_totals.append(projected)

        game_data['raw_ppm'] = game_data['ppm'].values
        game_data['filtered_ppm'] = filtered_ppm
        game_data['expected_ppm'] = filtered_ppm
        game_data['kalman_gain'] = kalman_gains
        game_data['kalman_Q'] = q_values
        game_data['kalman_R'] = r_values
        game_data['kalman_covariance'] = kalman_covariances
        game_data['projected_total'] = projected_totals

        # Generate betting signals if enabled
        if signal_calculator:
            # Use a pseudo O/U line (could be loaded from external source)
            final_total = game_data['points_so_far'].iloc[-1]
            pseudo_ou_line = final_total - 3  # For testing, line is slightly below actual

            for idx, row in game_data.iterrows():
                minute = int(row['minute_index'])
                if minute < config.BETTING_CONFIG.get('min_minutes_for_bet', 4):
                    continue

                signal = signal_calculator.generate_signal(
                    game_id=str(game_id),
                    home_team=home_team,
                    away_team=away_team,
                    minute=minute,
                    current_total=row['points_so_far'],
                    projected_total=row['projected_total'],
                    ou_line=pseudo_ou_line,
                    kalman_covariance=row['kalman_covariance'],
                    matchup_info=matchup_info,
                )

                if signal.is_actionable():
                    all_signals.append(signal.to_dict())

        all_results.append(game_data)

    results_df = pd.concat(all_results, ignore_index=True)
    logger.info(f"Processed {len(game_ids)} games")

    # Save betting signals if generated
    if all_signals:
        signals_df = pd.DataFrame(all_signals)
        signals_path = out_dir / f"betting_signals_{timestamp}.csv"
        signals_df.to_csv(signals_path, index=False)
        logger.info(f"Generated {len(signals_df)} betting signals -> {signals_path}")

    # ==========================================
    # STEP 4: Generate Team Breakdowns
    # ==========================================
    logger.info(f"\n" + "=" * 60)
    logger.info(f"STEP 4: Generating Team Breakdowns")
    logger.info(f"=" * 60)

    analyzer = TeamBreakdownAnalyzer(results_df)

    # Team pace analysis
    pace_df = analyzer.get_pace_analysis()
    pace_path = out_dir / f"season_team_pace_{timestamp}.csv"
    pace_df.to_csv(pace_path, index=False)
    logger.info(f"Team pace analysis: {len(pace_df)} teams -> {pace_path}")

    # Team regime profiles
    regime_df = analyzer.get_team_regime_profiles()
    regime_path = out_dir / f"season_team_regimes_{timestamp}.csv"
    regime_df.to_csv(regime_path, index=False)
    logger.info(f"Team regime profiles -> {regime_path}")

    # Team O/U tendencies
    ou_df = analyzer.get_over_under_tendencies()
    ou_path = out_dir / f"season_team_ou_{timestamp}.csv"
    ou_df.to_csv(ou_path, index=False)
    logger.info(f"Team O/U tendencies -> {ou_path}")

    # Save full results
    results_path = out_dir / f"season_game_summaries_{timestamp}.csv"
    results_df.to_csv(results_path, index=False)
    logger.info(f"Full results -> {results_path}")

    # ==========================================
    # STEP 5: Generate Visualizations
    # ==========================================
    logger.info(f"\n" + "=" * 60)
    logger.info(f"STEP 5: Generating Visualizations")
    logger.info(f"=" * 60)

    charts_dir = out_dir / "charts"
    charts_dir.mkdir(exist_ok=True)

    # Prepare signals dataframe if available
    signals_df = pd.DataFrame(all_signals) if all_signals else None

    # Prepare profiles dataframe if available
    profiles_df = None
    if profile_manager:
        profiles_df = profile_manager.get_all_profiles_df()

    visualizer = PJVisualizer(results_df, output_dir=str(charts_dir))
    visualizer.plot_all(signals_df=signals_df, profiles_df=profiles_df)
    logger.info(f"Charts saved to {charts_dir}")

    # ==========================================
    # Summary
    # ==========================================
    logger.info(f"\n" + "=" * 60)
    logger.info(f"SEASON ANALYSIS COMPLETE")
    logger.info(f"=" * 60)
    logger.info(f"Games analyzed: {results_df['game_id'].nunique()}")
    logger.info(f"Minute bins: {len(results_df)}")
    logger.info(f"Teams: {len(pace_df)}")

    # Feature flags status
    logger.info(f"\nFeature flags:")
    logger.info(f"  - USE_ENHANCED_FEATURES: {getattr(config, 'USE_ENHANCED_FEATURES', False)}")
    logger.info(f"  - USE_TEAM_KALMAN: {getattr(config, 'USE_TEAM_KALMAN', False)}")
    logger.info(f"  - GENERATE_BETTING_SIGNALS: {getattr(config, 'GENERATE_BETTING_SIGNALS', False)}")

    logger.info(f"\nOutput files:")
    logger.info(f"  - {results_path}")
    logger.info(f"  - {pace_path}")
    logger.info(f"  - {regime_path}")
    logger.info(f"  - {ou_path}")
    logger.info(f"  - {hmm_save_path}")
    if getattr(config, 'USE_TEAM_KALMAN', False):
        logger.info(f"  - {profiles_path}")
    if all_signals:
        logger.info(f"  - {signals_path} ({len(all_signals)} signals)")
    logger.info(f"  - {charts_dir}/")


def _add_enhanced_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add enhanced features: efficiency, momentum, and context

    Args:
        df: DataFrame with basic features

    Returns:
        DataFrame with enhanced features added
    """
    df = df.copy()

    # =================================================================
    # EFFICIENCY FEATURES
    # =================================================================

    # Points per possession (PPP) - efficiency metric
    df["ppp_total"] = df.apply(
        lambda row: row["ppm"] / row["posm"] if row["posm"] > 0 else 0.0,
        axis=1
    )

    # Cumulative PPP for the game
    df["poss_so_far"] = df.groupby("game_id")["posm"].cumsum()
    df["ppp_cumulative"] = df.apply(
        lambda row: row["points_so_far"] / row["poss_so_far"]
        if row["poss_so_far"] > 0 else 0.0,
        axis=1
    )

    # =================================================================
    # MOMENTUM FEATURES
    # =================================================================

    # 3-minute rolling PPM delta (momentum detection)
    df["ppm_rolling_3"] = df.groupby("game_id")["ppm"].transform(
        lambda x: x.rolling(window=3, min_periods=1).mean()
    )
    df["ppm_rolling_3_lag"] = df.groupby("game_id")["ppm_rolling_3"].shift(3)
    df["ppm_delta_3"] = df["ppm_rolling_3"] - df["ppm_rolling_3_lag"].fillna(
        df["ppm_rolling_3"]
    )

    # Scoring run detection (consecutive high/low scoring minutes)
    def calculate_scoring_runs(ppm_series):
        median_ppm = ppm_series.median()
        runs = []
        current_run = 0
        for ppm in ppm_series:
            if ppm > median_ppm + 0.5:
                current_run = max(1, current_run + 1)
            elif ppm < median_ppm - 0.5:
                current_run = min(-1, current_run - 1)
            else:
                if current_run > 0:
                    current_run -= 1
                elif current_run < 0:
                    current_run += 1
            runs.append(current_run)
        return pd.Series(runs, index=ppm_series.index)

    df["scoring_run"] = df.groupby("game_id")["ppm"].transform(calculate_scoring_runs)

    # =================================================================
    # CONTEXT FEATURES
    # =================================================================

    # Cumulative score by team
    df["score_home_cumulative"] = df.groupby("game_id")["points_home"].cumsum()
    df["score_away_cumulative"] = df.groupby("game_id")["points_away"].cumsum()

    # Score differential (positive = home leading)
    df["score_diff"] = df["score_home_cumulative"] - df["score_away_cumulative"]
    df["score_diff_abs"] = df["score_diff"].abs()

    # Blowout detection
    blowout_config = getattr(config, 'BLOWOUT_CONFIG', {})
    blowout_threshold = blowout_config.get('threshold', 15)
    blowout_min_minute = blowout_config.get('min_minute', 8)

    df["is_blowout"] = (
        (df["score_diff_abs"] > blowout_threshold) &
        (df["minute_index"] >= blowout_min_minute)
    ).astype(int)

    # Blowout factor (0-1 scale)
    df["blowout_factor"] = (df["score_diff_abs"] / 30.0).clip(0, 1)

    # Half indicator (1 = first half, 2 = second half)
    half_cutoff = config.PROJECTION_CONFIG["total_minutes"] // 2
    df["half_indicator"] = (df["minute_index"] >= half_cutoff).astype(int) + 1

    # Clean up intermediate columns
    df = df.drop(columns=["ppm_rolling_3_lag"], errors="ignore")

    logger.info(f"Added enhanced features: ppp_total, ppm_delta_3, scoring_run, "
               f"score_diff, is_blowout, blowout_factor, half_indicator")

    return df


@click.command()
@click.option("--season", "-s", default=2026, type=int, help="Season year (2026 = 2025-26)")
@click.option("--limit", "-l", default=None, type=int, help="Limit games (for testing)")
@click.option("--dry-run", is_flag=True, help="Show what would be fetched without fetching")
@click.option("--skip-fetch", is_flag=True, help="Skip PBP fetch, use existing data")
@click.option("--clear-checkpoint", is_flag=True, help="Clear checkpoint and start fresh")
@click.option("--output", "-o", default=None, help="Output directory")
@click.option("--delay", "-d", default=0.3, type=float, help="Delay between API requests")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
def main(season, limit, dry_run, skip_fetch, clear_checkpoint, output, delay, verbose):
    """
    Run full season HMM + Kalman analysis on NCAA basketball games.

    Examples:
        # Dry run to see how many games
        python run_full_season.py --dry-run

        # Test with 50 games
        python run_full_season.py --limit 50

        # Full season analysis
        python run_full_season.py

        # Resume from checkpoint
        python run_full_season.py

        # Start fresh
        python run_full_season.py --clear-checkpoint
    """
    setup_logging(verbose)

    try:
        run_full_season(
            season=season,
            limit=limit,
            dry_run=dry_run,
            skip_fetch=skip_fetch,
            clear_checkpoint=clear_checkpoint,
            output_dir=output,
            delay=delay
        )
    except KeyboardInterrupt:
        logger.warning("\nInterrupted by user. Progress has been saved to checkpoint.")
    except Exception as e:
        logger.error(f"Error: {e}")
        raise


if __name__ == "__main__":
    main()

#!/usr/bin/env python3 -u
"""
ULTIMATE PREGAME TOTALS MODEL
============================
Throws everything at predicting NCAA basketball game totals.

Run with: python -u models/ultimate_pregame_model.py
"""

import pandas as pd
import numpy as np
import pickle
import json
import warnings
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)

# Sklearn imports
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge, ElasticNet
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from scipy import stats

warnings.filterwarnings('ignore')

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "models" / "ultimate_model_outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 80, flush=True)
print("ULTIMATE PREGAME TOTALS MODEL", flush=True)
print("=" * 80, flush=True)
print(f"Base directory: {BASE_DIR}", flush=True)


# ============================================================================
# DATA LOADING
# ============================================================================

def load_historical_games() -> pd.DataFrame:
    """Load historical games with final scores"""
    path = DATA_DIR / "historical_games" / "games_2025_processed.csv"
    print(f"\n[1/4] Loading historical games...", flush=True)
    df = pd.read_csv(path)
    print(f"      Loaded {len(df)} games", flush=True)
    return df


def load_kenpom_data() -> pd.DataFrame:
    """Load KenPom team statistics"""
    path = DATA_DIR / "kenpom_historical" / "cleaned_kenpom_data_latest.csv"
    print(f"[2/4] Loading KenPom data...", flush=True)
    df = pd.read_csv(path)
    print(f"      Loaded {len(df)} team-seasons", flush=True)
    return df


def load_referee_data() -> pd.DataFrame:
    """Load referee tendencies"""
    path = DATA_DIR / "refmetrics_fouls_2024_25_auth_latest.csv"
    print(f"[3/4] Loading referee data...", flush=True)
    df = pd.read_csv(path)
    print(f"      Loaded {len(df)} referees", flush=True)
    return df


def load_pbp_team_stats() -> Dict[str, Dict]:
    """Pre-aggregate PBP stats by team for fast lookup"""
    path = BASE_DIR / "pj_hmm_kalman_model" / "outputs" / "season_game_summaries_20260130_064348.csv"
    if not path.exists():
        path = BASE_DIR / "pj_hmm_kalman_model" / "outputs" / "incremental_pbp.csv"

    print(f"[4/4] Loading and aggregating PBP data...", flush=True)

    try:
        df = pd.read_csv(path, low_memory=False)
        print(f"      Loaded {len(df)} minute entries", flush=True)

        # Pre-aggregate by team
        team_stats = {}

        # Home team stats
        for team in df['home_team'].unique():
            if pd.isna(team):
                continue
            team_data = df[df['home_team'] == team]
            team_key = str(team).lower().split()[0] if team else ""
            if team_key and len(team_key) > 2:
                if 'ppm' in team_data.columns:
                    team_stats[team_key] = {
                        'avg_ppm': team_data['ppm'].mean(),
                        'ppm_std': team_data['ppm'].std(),
                        'n_minutes': len(team_data),
                    }
                    if 'hmm_state_label' in team_data.columns:
                        states = team_data['hmm_state_label'].value_counts(normalize=True)
                        team_stats[team_key]['fast_pct'] = states.get('Fast', 0)
                        team_stats[team_key]['slow_pct'] = states.get('Slow', 0)

        print(f"      Aggregated stats for {len(team_stats)} teams", flush=True)
        return team_stats

    except Exception as e:
        print(f"      Warning: Could not load PBP: {e}", flush=True)
        return {}


# ============================================================================
# FEATURE ENGINEERING
# ============================================================================

def extract_kenpom_features(kenpom_df: pd.DataFrame, team_name: str, cache: Dict) -> Dict:
    """Extract KenPom features with caching"""
    team_key = str(team_name).lower().split()[0] if team_name else ""

    if team_key in cache:
        return cache[team_key]

    # Try exact match first
    matches = kenpom_df[kenpom_df['teamname'].str.lower().str.contains(team_key, na=False)]

    if len(matches) == 0:
        cache[team_key] = {}
        return {}

    row = matches.iloc[0]

    features = {
        'adjoe': row.get('adjoe', np.nan),
        'adjde': row.get('adjde', np.nan),
        'adjem': row.get('adjem', np.nan),
        'adjtempo': row.get('adjtempo', np.nan),
        'efg_pct': row.get('efg_pct', np.nan),
        'to_pct': row.get('to_pct', np.nan),
        'or_pct': row.get('or_pct', np.nan),
        'ft_rate': row.get('ft_rate', np.nan),
        'defg_pct': row.get('defg_pct', np.nan),
        'dto_pct': row.get('dto_pct', np.nan),
        'dor_pct': row.get('dor_pct', np.nan),
        'dft_rate': row.get('dft_rate', np.nan),
        'fg3pct': row.get('fg3pct', np.nan),
        'fg2pct': row.get('fg2pct', np.nan),
        'oppfg3pct': row.get('oppfg3pct', np.nan),
        'oppfg2pct': row.get('oppfg2pct', np.nan),
        'blockpct': row.get('blockpct', np.nan),
        'stlrate': row.get('stlrate', np.nan),
        'arate': row.get('arate', np.nan),
        'exp': row.get('exp', np.nan),
        'continuity': row.get('continuity', np.nan),
        'luck': row.get('luck', np.nan),
        'sos': row.get('sos', np.nan),
        'pythag': row.get('pythag', np.nan),
        'rankadjoe': row.get('rankadjoe', np.nan),
        'rankadjde': row.get('rankadjde', np.nan),
        'rankadjtempo': row.get('rankadjtempo', np.nan),
    }

    cache[team_key] = features
    return features


def create_game_features(
    game: pd.Series,
    kenpom_df: pd.DataFrame,
    pbp_stats: Dict,
    kenpom_cache: Dict
) -> Dict:
    """Create comprehensive feature set for a single game"""

    team1 = game['team_1']
    team2 = game['team_2']
    t1_key = str(team1).lower().split()[0] if team1 else ""
    t2_key = str(team2).lower().split()[0] if team2 else ""

    features = {
        'game_id': game.get('game_id', ''),
        'total_points': game['total_points'],
        'went_to_ot': 1 if game.get('went_to_ot', False) else 0,
    }

    # Get KenPom features
    t1_kenpom = extract_kenpom_features(kenpom_df, team1, kenpom_cache)
    t2_kenpom = extract_kenpom_features(kenpom_df, team2, kenpom_cache)

    # Add team features
    for key, val in t1_kenpom.items():
        features[f't1_{key}'] = val
    for key, val in t2_kenpom.items():
        features[f't2_{key}'] = val

    # Calculate matchup features
    if t1_kenpom and t2_kenpom:
        # Tempo
        features['avg_tempo'] = (t1_kenpom.get('adjtempo', 68) + t2_kenpom.get('adjtempo', 68)) / 2
        features['tempo_diff'] = abs(t1_kenpom.get('adjtempo', 68) - t2_kenpom.get('adjtempo', 68))

        # Efficiency matchup
        features['t1_expected_oe'] = (t1_kenpom.get('adjoe', 100) + t2_kenpom.get('adjde', 100)) / 2
        features['t2_expected_oe'] = (t2_kenpom.get('adjoe', 100) + t1_kenpom.get('adjde', 100)) / 2
        features['combined_oe'] = features['t1_expected_oe'] + features['t2_expected_oe']

        # Pomeroy prediction
        tempo = features['avg_tempo']
        t1_pts = tempo * features['t1_expected_oe'] / 100
        t2_pts = tempo * features['t2_expected_oe'] / 100
        features['pomeroy_predicted_total'] = t1_pts + t2_pts

        # Efficiency margins
        features['t1_em'] = t1_kenpom.get('adjem', 0)
        features['t2_em'] = t2_kenpom.get('adjem', 0)
        features['em_diff'] = abs(features['t1_em'] - features['t2_em'])

        # Shooting matchups
        features['t1_efg_vs_defg'] = t1_kenpom.get('efg_pct', 50) - t2_kenpom.get('defg_pct', 50)
        features['t2_efg_vs_defg'] = t2_kenpom.get('efg_pct', 50) - t1_kenpom.get('defg_pct', 50)

        # Turnover battle
        features['t1_to_net'] = t2_kenpom.get('dto_pct', 18) - t1_kenpom.get('to_pct', 18)
        features['t2_to_net'] = t1_kenpom.get('dto_pct', 18) - t2_kenpom.get('to_pct', 18)

        # Free throw rate sum
        features['ft_rate_sum'] = t1_kenpom.get('ft_rate', 30) + t2_kenpom.get('ft_rate', 30)

        # 3-point efficiency
        features['t1_3pt_eff'] = t1_kenpom.get('fg3pct', 33) - t2_kenpom.get('oppfg3pct', 33)
        features['t2_3pt_eff'] = t2_kenpom.get('fg3pct', 33) - t1_kenpom.get('oppfg3pct', 33)

        # Experience
        features['avg_exp'] = (t1_kenpom.get('exp', 2) + t2_kenpom.get('exp', 2)) / 2
        features['avg_continuity'] = (t1_kenpom.get('continuity', 50) + t2_kenpom.get('continuity', 50)) / 2

        # Rank differential
        features['rank_diff'] = abs(t1_kenpom.get('rankadjoe', 150) - t2_kenpom.get('rankadjoe', 150))

    # Add PBP-derived features
    if t1_key in pbp_stats:
        for key, val in pbp_stats[t1_key].items():
            features[f't1_pbp_{key}'] = val
    if t2_key in pbp_stats:
        for key, val in pbp_stats[t2_key].items():
            features[f't2_pbp_{key}'] = val

    return features


def build_training_dataset(
    games_df: pd.DataFrame,
    kenpom_df: pd.DataFrame,
    pbp_stats: Dict
) -> pd.DataFrame:
    """Build training dataset with progress tracking"""

    print("\n" + "=" * 80, flush=True)
    print("Building Training Dataset", flush=True)
    print("=" * 80, flush=True)

    valid_games = games_df[games_df['total_points'].notna()].copy()
    print(f"Processing {len(valid_games)} games...", flush=True)

    kenpom_cache = {}
    all_features = []

    for idx, (_, game) in enumerate(valid_games.iterrows()):
        if idx % 1000 == 0:
            print(f"  Progress: {idx}/{len(valid_games)} games...", flush=True)

        try:
            features = create_game_features(game, kenpom_df, pbp_stats, kenpom_cache)
            all_features.append(features)
        except Exception as e:
            continue

    df = pd.DataFrame(all_features)
    print(f"\nCreated dataset: {len(df)} games, {len(df.columns)} features", flush=True)

    return df


# ============================================================================
# MODELS
# ============================================================================

class QuantileRandomForest:
    """Random Forest with uncertainty estimation"""

    def __init__(self, n_estimators=200, max_depth=12):
        self.rf = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_leaf=5,
            n_jobs=-1,
            random_state=42
        )
        self.residual_std = 10.0

    def fit(self, X, y):
        self.rf.fit(X, y)
        preds = self.rf.predict(X)
        self.residual_std = np.std(y - preds)
        return self

    def predict(self, X):
        return self.rf.predict(X)

    def predict_interval(self, X, confidence=0.90):
        """Get prediction intervals from tree variance"""
        all_preds = np.array([tree.predict(X) for tree in self.rf.estimators_])
        mean_pred = np.mean(all_preds, axis=0)
        tree_std = np.std(all_preds, axis=0)
        combined_std = np.sqrt(tree_std**2 + self.residual_std**2)

        z = stats.norm.ppf((1 + confidence) / 2)
        return mean_pred - z * combined_std, mean_pred + z * combined_std


class UltimateEnsemble:
    """Ensemble combining multiple models"""

    def __init__(self):
        self.models = {}
        self.weights = {}
        self.scaler = RobustScaler()
        self.imputer = SimpleImputer(strategy='median')
        self.feature_cols = []
        self.is_fitted = False
        self.residual_std = 10.0
        self.pomeroy_bias = 0.0

    def fit(self, X: pd.DataFrame, y: pd.Series):
        print("\n" + "=" * 80, flush=True)
        print("Training Ultimate Ensemble", flush=True)
        print("=" * 80, flush=True)

        # Get numeric columns
        numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        exclude = ['total_points', 'game_id', 'went_to_ot']
        self.feature_cols = [c for c in numeric_cols if c not in exclude]

        X_numeric = X[self.feature_cols].values
        y_array = y.values

        # Preprocess
        X_imputed = self.imputer.fit_transform(X_numeric)
        X_scaled = self.scaler.fit_transform(X_imputed)

        print(f"\nFeatures: {len(self.feature_cols)}", flush=True)
        print(f"Samples: {len(y_array)}", flush=True)

        # 1. Pomeroy (analytical)
        print("\n[1/5] Training Pomeroy model...", flush=True)
        if 'pomeroy_predicted_total' in X.columns:
            pom_preds = X['pomeroy_predicted_total'].values
            valid = ~np.isnan(pom_preds)
            self.pomeroy_bias = np.nanmean(y_array[valid] - pom_preds[valid])
            print(f"      Pomeroy bias: {self.pomeroy_bias:+.2f}", flush=True)

        # 2. Gradient Boosting
        print("[2/5] Training Gradient Boosting...", flush=True)
        self.models['gb'] = GradientBoostingRegressor(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            min_samples_leaf=10,
            random_state=42
        )
        self.models['gb'].fit(X_scaled, y_array)

        # 3. Quantile Random Forest
        print("[3/5] Training Random Forest...", flush=True)
        self.models['rf'] = QuantileRandomForest(n_estimators=150, max_depth=10)
        self.models['rf'].fit(X_scaled, y_array)

        # 4. Ridge Regression
        print("[4/5] Training Ridge Regression...", flush=True)
        self.models['ridge'] = Ridge(alpha=10.0, solver='svd')
        self.models['ridge'].fit(X_scaled, y_array)

        # 5. Neural Network
        print("[5/5] Training Neural Network...", flush=True)
        self.models['nn'] = MLPRegressor(
            hidden_layer_sizes=(64, 32),
            activation='relu',
            learning_rate='adaptive',
            max_iter=300,
            early_stopping=True,
            random_state=42
        )
        self.models['nn'].fit(X_scaled, y_array)

        # Optimize weights
        print("\nOptimizing ensemble weights...", flush=True)
        self._optimize_weights(X, X_scaled, y_array)

        # Calculate residual std
        ensemble_preds = self._predict_internal(X, X_scaled)
        self.residual_std = np.std(y_array - ensemble_preds)

        self.is_fitted = True
        print("\nTraining complete!", flush=True)
        return self

    def _get_pomeroy_pred(self, X_df):
        """Get Pomeroy predictions"""
        if 'pomeroy_predicted_total' in X_df.columns:
            return X_df['pomeroy_predicted_total'].values + self.pomeroy_bias
        else:
            tempo = X_df.get('avg_tempo', pd.Series([68]*len(X_df))).values
            eff = X_df.get('combined_oe', pd.Series([200]*len(X_df))).values
            return tempo * eff / 100 + self.pomeroy_bias

    def _predict_internal(self, X_df, X_scaled):
        """Internal prediction"""
        preds = {}
        preds['pomeroy'] = self._get_pomeroy_pred(X_df)
        preds['gb'] = self.models['gb'].predict(X_scaled)
        preds['rf'] = self.models['rf'].predict(X_scaled)
        preds['ridge'] = self.models['ridge'].predict(X_scaled)
        preds['nn'] = self.models['nn'].predict(X_scaled)

        ensemble = np.zeros(len(X_scaled))
        for name, pred in preds.items():
            # Replace NaN with model's mean prediction
            pred_clean = np.nan_to_num(pred, nan=np.nanmean(pred))
            ensemble += self.weights.get(name, 0.0) * pred_clean
        return ensemble

    def _optimize_weights(self, X_df, X_scaled, y):
        """Optimize weights by inverse MAE"""
        preds = {}
        preds['pomeroy'] = self._get_pomeroy_pred(X_df)
        preds['gb'] = self.models['gb'].predict(X_scaled)
        preds['rf'] = self.models['rf'].predict(X_scaled)
        preds['ridge'] = self.models['ridge'].predict(X_scaled)
        preds['nn'] = self.models['nn'].predict(X_scaled)

        maes = {}
        for name, pred in preds.items():
            # Handle NaN in pomeroy
            valid = ~np.isnan(pred)
            maes[name] = mean_absolute_error(y[valid], pred[valid])
            print(f"  {name}: MAE = {maes[name]:.2f}", flush=True)

        total_inv = sum(1/mae for mae in maes.values())
        self.weights = {name: (1/mae)/total_inv for name, mae in maes.items()}

        print("\nOptimized weights:", flush=True)
        for name, w in sorted(self.weights.items(), key=lambda x: -x[1]):
            print(f"  {name}: {w:.3f}", flush=True)

    def predict(self, X):
        X_numeric = X[self.feature_cols].values
        X_imputed = self.imputer.transform(X_numeric)
        X_scaled = self.scaler.transform(X_imputed)
        return self._predict_internal(X, X_scaled)

    def predict_with_interval(self, X, confidence=0.90):
        """Predict with confidence interval"""
        X_numeric = X[self.feature_cols].values
        X_imputed = self.imputer.transform(X_numeric)
        X_scaled = self.scaler.transform(X_imputed)

        ensemble_pred = self._predict_internal(X, X_scaled)
        rf_lower, rf_upper = self.models['rf'].predict_interval(X_scaled, confidence)

        z = stats.norm.ppf((1 + confidence) / 2)
        rf_half = (rf_upper - rf_lower) / 2
        res_half = z * self.residual_std

        half_width = np.maximum(rf_half, res_half)
        return ensemble_pred, ensemble_pred - half_width, ensemble_pred + half_width


# ============================================================================
# EVALUATION
# ============================================================================

def evaluate_model(model, X, y, name="Model"):
    """Evaluate model performance"""
    print(f"\n{'=' * 80}", flush=True)
    print(f"Evaluating: {name}", flush=True)
    print("=" * 80, flush=True)

    preds = model.predict(X)

    # Handle NaN values
    preds = np.nan_to_num(preds, nan=np.nanmean(preds))

    errors = preds - y.values
    abs_errors = np.abs(errors)

    metrics = {
        'MAE': mean_absolute_error(y, preds),
        'RMSE': np.sqrt(mean_squared_error(y, preds)),
        'R2': r2_score(y, preds),
        'Mean_Error': np.mean(errors),
        'Within_5': np.mean(abs_errors <= 5) * 100,
        'Within_10': np.mean(abs_errors <= 10) * 100,
        'Within_15': np.mean(abs_errors <= 15) * 100,
        'Within_20': np.mean(abs_errors <= 20) * 100,
    }

    print(f"\nPoint Prediction Metrics:", flush=True)
    print(f"  MAE:          {metrics['MAE']:.2f} points", flush=True)
    print(f"  RMSE:         {metrics['RMSE']:.2f} points", flush=True)
    print(f"  R²:           {metrics['R2']:.3f}", flush=True)
    print(f"  Mean Error:   {metrics['Mean_Error']:+.2f}", flush=True)

    print(f"\nAccuracy by Threshold:", flush=True)
    print(f"  Within 5 pts:  {metrics['Within_5']:.1f}%", flush=True)
    print(f"  Within 10 pts: {metrics['Within_10']:.1f}%", flush=True)
    print(f"  Within 15 pts: {metrics['Within_15']:.1f}%", flush=True)
    print(f"  Within 20 pts: {metrics['Within_20']:.1f}%", flush=True)

    # Confidence interval
    if hasattr(model, 'predict_with_interval'):
        pred, lower, upper = model.predict_with_interval(X, 0.90)
        in_interval = (y.values >= lower) & (y.values <= upper)
        coverage = np.mean(in_interval) * 100
        avg_width = np.mean(upper - lower)

        print(f"\n90% Confidence Interval:", flush=True)
        print(f"  Coverage:     {coverage:.1f}% (target: 90%)", flush=True)
        print(f"  Avg Width:    {avg_width:.1f} points", flush=True)

        metrics['Coverage_90'] = coverage
        metrics['Interval_Width'] = avg_width

    return metrics


def cross_validate(X, y, n_splits=5):
    """Time-series cross-validation"""
    print(f"\n{'=' * 80}", flush=True)
    print(f"Time-Series Cross-Validation ({n_splits} folds)", flush=True)
    print("=" * 80, flush=True)

    tscv = TimeSeriesSplit(n_splits=n_splits)
    fold_metrics = []

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        print(f"\nFold {fold + 1}/{n_splits}: Train={len(train_idx)}, Val={len(val_idx)}", flush=True)

        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = UltimateEnsemble()
        model.fit(X_train, y_train)

        preds, lower, upper = model.predict_with_interval(X_val, 0.90)

        mae = mean_absolute_error(y_val, preds)
        coverage = np.mean((y_val.values >= lower) & (y_val.values <= upper)) * 100
        within_10 = np.mean(np.abs(preds - y_val.values) <= 10) * 100

        print(f"  MAE: {mae:.2f}, Coverage: {coverage:.1f}%, Within 10: {within_10:.1f}%", flush=True)
        fold_metrics.append({'fold': fold, 'mae': mae, 'coverage': coverage, 'within_10': within_10})

    avg_mae = np.mean([f['mae'] for f in fold_metrics])
    avg_coverage = np.mean([f['coverage'] for f in fold_metrics])
    avg_within_10 = np.mean([f['within_10'] for f in fold_metrics])

    print(f"\n{'=' * 40}", flush=True)
    print(f"CV Results:", flush=True)
    print(f"  Avg MAE:      {avg_mae:.2f}", flush=True)
    print(f"  Avg Coverage: {avg_coverage:.1f}%", flush=True)
    print(f"  Avg Within 10: {avg_within_10:.1f}%", flush=True)

    return fold_metrics, avg_mae, avg_coverage


# ============================================================================
# MAIN
# ============================================================================

def main():
    start_time = datetime.now()
    print(f"\nStarted at: {start_time}", flush=True)

    # Load data
    try:
        games_df = load_historical_games()
        kenpom_df = load_kenpom_data()
        ref_df = load_referee_data()
        pbp_stats = load_pbp_team_stats()
    except Exception as e:
        print(f"Error loading data: {e}", flush=True)
        return False

    # Build training dataset
    train_df = build_training_dataset(games_df, kenpom_df, pbp_stats)

    # Save features
    feature_path = OUTPUT_DIR / "training_features.csv"
    train_df.to_csv(feature_path, index=False)
    print(f"\nSaved features to: {feature_path}", flush=True)

    # Prepare X and y
    y = train_df['total_points']
    X = train_df.drop(columns=['total_points'], errors='ignore')

    valid_idx = y.notna()
    X = X[valid_idx]
    y = y[valid_idx]

    print(f"\nFinal dataset: {len(X)} games, {len(X.columns)} features", flush=True)

    # Train model
    model = UltimateEnsemble()
    model.fit(X, y)

    # Evaluate
    train_metrics = evaluate_model(model, X, y, "Ultimate Ensemble (Training)")

    # Cross-validation
    fold_metrics, cv_mae, cv_coverage = cross_validate(X, y, n_splits=5)

    # Get predictions
    preds, lower, upper = model.predict_with_interval(X, 0.90)

    # Save model
    model_path = OUTPUT_DIR / "ultimate_ensemble.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"\nSaved model to: {model_path}", flush=True)

    # Save predictions
    results_df = pd.DataFrame({
        'game_id': X.get('game_id', range(len(X))),
        'actual_total': y.values,
        'predicted_total': preds,
        'lower_90': lower,
        'upper_90': upper,
        'error': preds - y.values,
        'in_interval': (y.values >= lower) & (y.values <= upper),
    })
    results_path = OUTPUT_DIR / "predictions.csv"
    results_df.to_csv(results_path, index=False)
    print(f"Saved predictions to: {results_path}", flush=True)

    # Save report
    report = {
        'timestamp': datetime.now().isoformat(),
        'n_games': len(X),
        'n_features': len(model.feature_cols),
        'training_metrics': train_metrics,
        'cv_mae': cv_mae,
        'cv_coverage': cv_coverage,
        'fold_metrics': fold_metrics,
        'model_weights': model.weights,
    }

    report_path = OUTPUT_DIR / "training_report.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    # Final summary
    end_time = datetime.now()
    duration = end_time - start_time

    print("\n" + "=" * 80, flush=True)
    print("ULTIMATE MODEL TRAINING COMPLETE", flush=True)
    print("=" * 80, flush=True)
    print(f"\nDuration: {duration}", flush=True)
    print(f"\nKey Results:", flush=True)
    print(f"  Training MAE: {train_metrics['MAE']:.2f} points", flush=True)
    print(f"  CV MAE:       {cv_mae:.2f} points", flush=True)
    print(f"  90% Coverage: {cv_coverage:.1f}%", flush=True)
    print(f"  Within 10 pts: {train_metrics['Within_10']:.1f}%", flush=True)
    print(f"\nOutputs saved to: {OUTPUT_DIR}", flush=True)

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
"""
Model 3: ML Predictor (Random Forest / XGBoost)

Uses full machine learning with all available features.

Approach:
1. Extract comprehensive features from team stats
2. Train Random Forest or XGBoost regressor
3. Learn non-linear patterns and feature interactions
4. Ensemble of decision trees for robust predictions

This model can capture complex patterns that the formula-based
approaches miss.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Optional, Literal
import sys
from pathlib import Path


# ============================================================================
# ML PREDICTOR
# ============================================================================

class MLPredictor:
    """
    Full ML predictor using Random Forest or Gradient Boosting.

    Learns non-linear patterns and feature interactions from all available
    team statistics.
    """

    def __init__(
        self,
        model_type: Literal['random_forest', 'gradient_boosting'] = 'random_forest',
        n_estimators: int = 30,        # REDUCED from 100 to 30
        max_depth: Optional[int] = 3,  # REDUCED from 10 to 3 - CRITICAL for preventing overfitting
        min_samples_split: int = 15,   # INCREASED from 5 to 15
        min_samples_leaf: int = 10,    # NEW - prevents tiny leaf nodes
        random_state: int = 42
    ):
        """
        Args:
            model_type: Type of ML model ('random_forest' or 'gradient_boosting')
            n_estimators: Number of trees (reduced for small datasets)
            max_depth: Maximum depth of trees - KEEP LOW to prevent memorization
            min_samples_split: Minimum samples required to split a node
            min_samples_leaf: Minimum samples required at leaf node
            random_state: Random seed for reproducibility
        """
        self.model_type = model_type
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.random_state = random_state

        # Create model with anti-overfitting constraints
        if model_type == 'random_forest':
            self.model = RandomForestRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                min_samples_leaf=min_samples_leaf,  # NEW constraint
                max_features='sqrt',  # Reduce feature correlation
                random_state=random_state,
                n_jobs=-1  # Use all CPU cores
            )
            self.name = "Random Forest (Constrained)"
        elif model_type == 'gradient_boosting':
            self.model = GradientBoostingRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth if max_depth else 3,  # GB benefits from shallow trees
                min_samples_split=min_samples_split,
                min_samples_leaf=min_samples_leaf,
                random_state=random_state
            )
            self.name = "Gradient Boosting (Constrained)"
        else:
            raise ValueError(f"Unknown model_type: {model_type}")

        self.scaler = StandardScaler()
        self.feature_names = None

    def _extract_features(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Extract all available features for ML model.

        Uses more features than the calibrated model, including:
        - All team stats (offense, defense, tempo, shooting)
        - Derived features (differentials, combinations)
        - Four Factors
        - Advanced metrics
        """
        features = {}

        # Team 1 features
        for col in X.columns:
            if col.startswith('team_1_'):
                feature_name = col.replace('team_1_', 't1_')
                # Exclude outcome variables
                if feature_name not in ['t1_score', 't1_points', 't1_off_eff', 't1_def_eff']:
                    features[feature_name] = X[col]

        # Team 2 features
        for col in X.columns:
            if col.startswith('team_2_'):
                feature_name = col.replace('team_2_', 't2_')
                # Exclude outcome variables
                if feature_name not in ['t2_score', 't2_points', 't2_off_eff', 't2_def_eff']:
                    features[feature_name] = X[col]

        # Matchup features (differentials)
        matchup_pairs = [
            ('adjoe', 'Offensive efficiency'),
            ('adjde', 'Defensive efficiency'),
            ('adjtempo', 'Adjusted tempo'),
            ('tempo', 'Raw tempo'),
            ('efg_pct', 'Effective FG%'),
            ('to_pct', 'Turnover%'),
            ('or_pct', 'Offensive rebound%'),
            ('ft_rate', 'Free throw rate'),
            ('fg3pct', '3-point%'),
            ('fg2pct', '2-point%'),
            ('avghgt', 'Average height'),
            ('exp', 'Experience'),
            ('bench', 'Bench strength')
        ]

        for stat, desc in matchup_pairs:
            t1_col = f'team_1_{stat}'
            t2_col = f'team_2_{stat}'
            if t1_col in X.columns and t2_col in X.columns:
                # Differential
                features[f'{stat}_diff'] = X[t1_col] - X[t2_col]
                # Combined/Average
                features[f'{stat}_combined'] = (X[t1_col] + X[t2_col]) / 2

        # Pomeroy-style predictions as features
        if all(col in X.columns for col in ['team_1_adjtempo', 'team_1_adjoe', 'team_1_adjde',
                                              'team_2_adjtempo', 'team_2_adjoe', 'team_2_adjde']):
            # Predicted tempo
            features['predicted_tempo'] = (X['team_1_adjtempo'] + X['team_2_adjtempo']) / 2

            # Predicted offensive efficiencies (simplified, no home court)
            features['predicted_t1_oe'] = (X['team_1_adjoe'] + X['team_2_adjde']) / 2
            features['predicted_t2_oe'] = (X['team_2_adjoe'] + X['team_1_adjde']) / 2

            # Predicted points
            features['predicted_t1_pts'] = features['predicted_tempo'] * features['predicted_t1_oe'] / 100
            features['predicted_t2_pts'] = features['predicted_tempo'] * features['predicted_t2_oe'] / 100
            features['predicted_total'] = features['predicted_t1_pts'] + features['predicted_t2_pts']

        # Matchup style features
        if all(col in X.columns for col in ['team_1_adjtempo', 'team_2_adjtempo']):
            # Both teams fast/slow
            avg_tempo = (X['team_1_adjtempo'] + X['team_2_adjtempo']) / 2
            features['both_fast'] = (avg_tempo > 70).astype(int)
            features['both_slow'] = (avg_tempo < 66).astype(int)

        if all(col in X.columns for col in ['team_1_adjde', 'team_2_adjde']):
            # Both teams good/bad defense
            avg_de = (X['team_1_adjde'] + X['team_2_adjde']) / 2
            features['both_good_def'] = (avg_de < 100).astype(int)
            features['both_bad_def'] = (avg_de > 110).astype(int)

        if all(col in X.columns for col in ['team_1_adjoe', 'team_2_adjoe']):
            # Both teams good/bad offense
            avg_oe = (X['team_1_adjoe'] + X['team_2_adjoe']) / 2
            features['both_good_off'] = (avg_oe > 110).astype(int)
            features['both_bad_off'] = (avg_oe < 100).astype(int)

        # Create DataFrame and fill NaNs and Infs (only numeric columns)
        features_df = pd.DataFrame(features, index=X.index)
        numeric_cols = features_df.select_dtypes(include=[np.number]).columns

        # Replace inf with NaN first
        features_df[numeric_cols] = features_df[numeric_cols].replace([np.inf, -np.inf], np.nan)

        # Fill NaN with column mean (or 0 if all NaN)
        for col in numeric_cols:
            col_mean = features_df[col].mean()
            if np.isnan(col_mean) or np.isinf(col_mean):
                features_df[col] = features_df[col].fillna(0)
            else:
                features_df[col] = features_df[col].fillna(col_mean)

        return features_df

    def fit(self, X: pd.DataFrame, y: pd.Series):
        """
        Train the ML model.

        Args:
            X: Training features
            y: Training targets (actual total points)
        """
        # Extract features
        X_features = self._extract_features(X)

        # Store feature names
        self.feature_names = X_features.columns.tolist()

        # Scale features
        X_scaled = self.scaler.fit_transform(X_features)

        # Train model
        self.model.fit(X_scaled, y)

        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict total points.

        Args:
            X: Features

        Returns:
            Array of predicted total points
        """
        # Extract features
        X_features = self._extract_features(X)

        # Ensure same features as training
        if self.feature_names is not None:
            missing_features = set(self.feature_names) - set(X_features.columns)
            if missing_features:
                for feature in missing_features:
                    X_features[feature] = 0

            X_features = X_features[self.feature_names]

        # Scale features
        X_scaled = self.scaler.transform(X_features)

        # Predict
        predictions = self.model.predict(X_scaled)

        return predictions

    def get_feature_importance(self, top_n: int = 20) -> pd.DataFrame:
        """
        Get feature importance from tree-based model.

        Args:
            top_n: Number of top features to return

        Returns:
            DataFrame with feature names and importance scores
        """
        if self.feature_names is None:
            raise ValueError("Model must be trained first")

        importance = self.model.feature_importances_

        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False).head(top_n)

        return importance_df

    def get_params(self, deep=True):
        """Get parameters (sklearn compatibility)"""
        return {
            'model_type': self.model_type,
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'min_samples_split': self.min_samples_split,
            'min_samples_leaf': self.min_samples_leaf,
            'random_state': self.random_state
        }

    def set_params(self, **params):
        """Set parameters (sklearn compatibility)"""
        for key, value in params.items():
            setattr(self, key, value)
        return self


# ============================================================================
# TESTING
# ============================================================================

def test_ml_predictor():
    """Test ML predictor with sample data"""
    print("="*80)
    print("Testing ML Predictor (Random Forest)")
    print("="*80)

    # Create sample training data
    np.random.seed(42)
    n_samples = 200

    train_data = pd.DataFrame({
        'team_1_adjtempo': np.random.normal(68, 3, n_samples),
        'team_1_adjoe': np.random.normal(105, 8, n_samples),
        'team_1_adjde': np.random.normal(105, 8, n_samples),
        'team_1_efg_pct': np.random.normal(50, 3, n_samples),
        'team_1_to_pct': np.random.normal(18, 2, n_samples),
        'team_1_fg3pct': np.random.normal(33, 3, n_samples),
        'team_1_avghgt': np.random.normal(78, 1, n_samples),

        'team_2_adjtempo': np.random.normal(68, 3, n_samples),
        'team_2_adjoe': np.random.normal(105, 8, n_samples),
        'team_2_adjde': np.random.normal(105, 8, n_samples),
        'team_2_efg_pct': np.random.normal(50, 3, n_samples),
        'team_2_to_pct': np.random.normal(18, 2, n_samples),
        'team_2_fg3pct': np.random.normal(33, 3, n_samples),
        'team_2_avghgt': np.random.normal(78, 1, n_samples),
    })

    # Generate synthetic targets (tempo * efficiency-based)
    y_true = (
        (train_data['team_1_adjtempo'] + train_data['team_2_adjtempo']) / 2 *
        ((train_data['team_1_adjoe'] + train_data['team_2_adjoe']) / 2) / 100 * 2
    ) + np.random.normal(0, 5, n_samples)

    # Train model
    print("\nTraining Random Forest...")
    model = MLPredictor(model_type='random_forest', n_estimators=50, max_depth=10)
    model.fit(train_data, y_true)

    # Test predictions
    print("\nMaking predictions on training data...")
    predictions = model.predict(train_data)

    # Calculate error
    mae = np.mean(np.abs(predictions - y_true))
    rmse = np.sqrt(np.mean((predictions - y_true) ** 2))

    print(f"  Training MAE: {mae:.2f}")
    print(f"  Training RMSE: {rmse:.2f}")

    # Show top features
    print("\nTop 15 most important features:")
    importance = model.get_feature_importance(top_n=15)
    for idx, row in importance.iterrows():
        print(f"  {row['feature']:30s}: {row['importance']:.4f}")

    # Sample predictions
    print("\nSample predictions:")
    for i in range(3):
        print(f"  Game {i+1}: Actual={y_true.iloc[i]:.1f}, Predicted={predictions[i]:.1f}, Error={abs(y_true.iloc[i]-predictions[i]):.1f}")

    print("\n" + "="*80)
    print("Test complete!")
    print("="*80)


if __name__ == "__main__":
    test_ml_predictor()

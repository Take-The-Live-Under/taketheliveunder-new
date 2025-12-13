#!/usr/bin/env python3
"""
Model 2: Calibrated Regression Predictor

Builds on the Pure Pomeroy predictor by adding a learned correction factor.

Approach:
1. Start with Pomeroy prediction (tempo × efficiency)
2. Extract additional features (shooting %, turnover rate, etc.)
3. Train LinearRegression to learn corrections
4. Final prediction = Pomeroy baseline + learned adjustments

This bridges the gap between pure formula and full ML.
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Optional
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.pomeroy_predictor import PomeroyPredictor


# ============================================================================
# CALIBRATED REGRESSION PREDICTOR
# ============================================================================

class CalibratedPredictor:
    """
    Calibrated regression predictor.

    Uses Pomeroy prediction as baseline, then learns adjustments
    from additional features like shooting efficiency, turnovers, etc.
    """

    def __init__(
        self,
        use_ridge: bool = True,
        alpha: float = 10.0,  # INCREASED from 1.0 to 10.0 to prevent overfitting
        home_advantage: float = 1.4
    ):
        """
        Args:
            use_ridge: Use Ridge regression (L2 regularization)
            alpha: Regularization strength - HIGHER = less overfitting (default 10.0)
            home_advantage: Home court advantage for Pomeroy baseline
        """
        self.use_ridge = use_ridge
        self.alpha = alpha
        self.home_advantage = home_advantage

        # Components
        self.pomeroy = PomeroyPredictor(home_advantage=home_advantage)

        # Try Ridge with 'svd' solver for compatibility
        # If Ridge fails, falls back to LinearRegression in fit()
        try:
            self.regressor = Ridge(alpha=alpha, solver='svd')
        except:
            # Fallback for older sklearn versions
            self.regressor = LinearRegression()

        self.scaler = StandardScaler()

        self.feature_names = None
        self.name = "Calibrated Regression (Ridge)"

    def _extract_features(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Extract features for regression.

        Features include:
        - Pomeroy baseline prediction
        - Shooting efficiency (eFG%, 3P%, 2P%)
        - Four Factors (eFG%, TO%, OR%, FT Rate)
        - Team characteristics (height, experience)
        - Matchup features (tempo differential, efficiency differential)
        """
        features = {}

        # Get Pomeroy baseline prediction
        pomeroy_preds = self.pomeroy.predict_with_details(X)
        features['pomeroy_total'] = pomeroy_preds['total_points']
        features['pomeroy_possessions'] = pomeroy_preds['possessions']

        # Team 1 features
        for col in X.columns:
            if col.startswith('team_1_'):
                feature_name = col.replace('team_1_', 't1_')
                if feature_name not in ['t1_score', 't1_points']:  # Don't include outcome
                    features[feature_name] = X[col]

        # Team 2 features
        for col in X.columns:
            if col.startswith('team_2_'):
                feature_name = col.replace('team_2_', 't2_')
                if feature_name not in ['t2_score', 't2_points']:  # Don't include outcome
                    features[feature_name] = X[col]

        # Matchup features (differentials)
        if 'team_1_adjoe' in X.columns and 'team_2_adjoe' in X.columns:
            features['oe_differential'] = X['team_1_adjoe'] - X['team_2_adjoe']

        if 'team_1_adjde' in X.columns and 'team_2_adjde' in X.columns:
            features['de_differential'] = X['team_1_adjde'] - X['team_2_adjde']

        if 'team_1_adjtempo' in X.columns and 'team_2_adjtempo' in X.columns:
            features['tempo_differential'] = X['team_1_adjtempo'] - X['team_2_adjtempo']
        elif 'team_1_tempo' in X.columns and 'team_2_tempo' in X.columns:
            features['tempo_differential'] = X['team_1_tempo'] - X['team_2_tempo']

        # Combined tempo (predictor of total pace)
        if 'team_1_adjtempo' in X.columns and 'team_2_adjtempo' in X.columns:
            features['combined_tempo'] = (X['team_1_adjtempo'] + X['team_2_adjtempo']) / 2
        elif 'team_1_tempo' in X.columns and 'team_2_tempo' in X.columns:
            features['combined_tempo'] = (X['team_1_tempo'] + X['team_2_tempo']) / 2

        # Combined offensive potential
        if 'team_1_adjoe' in X.columns and 'team_2_adjoe' in X.columns:
            features['combined_oe'] = (X['team_1_adjoe'] + X['team_2_adjoe']) / 2

        # Combined defensive strength (lower is better defense)
        if 'team_1_adjde' in X.columns and 'team_2_adjde' in X.columns:
            features['combined_de'] = (X['team_1_adjde'] + X['team_2_adjde']) / 2

        # Shooting efficiency features
        if 'team_1_efg_pct' in X.columns and 'team_2_efg_pct' in X.columns:
            features['combined_efg'] = (X['team_1_efg_pct'] + X['team_2_efg_pct']) / 2
            features['efg_differential'] = X['team_1_efg_pct'] - X['team_2_efg_pct']

        # 3-point rate features
        if 'team_1_fg3pct' in X.columns and 'team_2_fg3pct' in X.columns:
            features['combined_3p'] = (X['team_1_fg3pct'] + X['team_2_fg3pct']) / 2

        # Turnover rate features
        if 'team_1_to_pct' in X.columns and 'team_2_to_pct' in X.columns:
            features['combined_to'] = (X['team_1_to_pct'] + X['team_2_to_pct']) / 2

        # Free throw rate features
        if 'team_1_ft_rate' in X.columns and 'team_2_ft_rate' in X.columns:
            features['combined_ftr'] = (X['team_1_ft_rate'] + X['team_2_ft_rate']) / 2

        features_df = pd.DataFrame(features, index=X.index)

        # Fill NaN and Inf values (only for numeric columns)
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
        Train the calibrated predictor.

        Args:
            X: Training features (must include KenPom ratings)
            y: Training targets (actual total points)
        """
        # Extract features
        X_features = self._extract_features(X)

        # Store feature names
        self.feature_names = X_features.columns.tolist()

        # Scale features
        X_scaled = self.scaler.fit_transform(X_features)

        # Train regressor
        self.regressor.fit(X_scaled, y)

        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict total points.

        Args:
            X: Features (must include KenPom ratings)

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
        predictions = self.regressor.predict(X_scaled)

        return predictions

    def predict_with_breakdown(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Predict with breakdown showing Pomeroy baseline vs learned adjustment.

        Returns DataFrame with:
            - pomeroy_prediction: Pure Pomeroy baseline
            - adjustment: Learned correction
            - final_prediction: Total prediction
        """
        # Get Pomeroy baseline
        pomeroy_preds = self.pomeroy.predict(X)

        # Get final predictions
        final_preds = self.predict(X)

        # Calculate adjustments
        adjustments = final_preds - pomeroy_preds

        return pd.DataFrame({
            'pomeroy_prediction': pomeroy_preds,
            'adjustment': adjustments,
            'final_prediction': final_preds
        })

    def get_feature_importance(self) -> pd.DataFrame:
        """
        Get feature importance (regression coefficients).

        Returns DataFrame with feature names and coefficients.
        """
        if self.feature_names is None:
            raise ValueError("Model must be trained first")

        coefficients = self.regressor.coef_

        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'coefficient': coefficients,
            'abs_coefficient': np.abs(coefficients)
        }).sort_values('abs_coefficient', ascending=False)

        return importance_df

    def get_params(self, deep=True):
        """Get parameters (sklearn compatibility)"""
        return {
            'use_ridge': self.use_ridge,
            'alpha': self.alpha,
            'home_advantage': self.home_advantage
        }

    def set_params(self, **params):
        """Set parameters (sklearn compatibility)"""
        for key, value in params.items():
            setattr(self, key, value)
        return self


# ============================================================================
# TESTING
# ============================================================================

def test_calibrated_predictor():
    """Test calibrated predictor with sample data"""
    print("="*80)
    print("Testing Calibrated Regression Predictor")
    print("="*80)

    # Create sample training data
    np.random.seed(42)
    n_samples = 100

    train_data = pd.DataFrame({
        'team_1_adjtempo': np.random.normal(68, 3, n_samples),
        'team_1_adjoe': np.random.normal(105, 8, n_samples),
        'team_1_adjde': np.random.normal(105, 8, n_samples),
        'team_1_efg_pct': np.random.normal(50, 3, n_samples),
        'team_1_to_pct': np.random.normal(18, 2, n_samples),

        'team_2_adjtempo': np.random.normal(68, 3, n_samples),
        'team_2_adjoe': np.random.normal(105, 8, n_samples),
        'team_2_adjde': np.random.normal(105, 8, n_samples),
        'team_2_efg_pct': np.random.normal(50, 3, n_samples),
        'team_2_to_pct': np.random.normal(18, 2, n_samples),
    })

    # Generate synthetic targets (with some noise)
    pomeroy = PomeroyPredictor()
    y_baseline = pomeroy.predict(train_data)
    y_true = y_baseline + np.random.normal(0, 5, n_samples)

    # Train model
    print("\nTraining calibrated predictor...")
    model = CalibratedPredictor(use_ridge=False)  # Use LinearRegression to avoid version issues
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
    print("\nTop 10 most important features:")
    importance = model.get_feature_importance().head(10)
    for idx, row in importance.iterrows():
        print(f"  {row['feature']:30s}: {row['coefficient']:+.4f}")

    # Test breakdown
    print("\nSample prediction breakdown:")
    breakdown = model.predict_with_breakdown(train_data.head(3))
    for idx, row in breakdown.iterrows():
        print(f"  Game {idx+1}:")
        print(f"    Pomeroy baseline: {row['pomeroy_prediction']:.1f}")
        print(f"    Learned adjustment: {row['adjustment']:+.1f}")
        print(f"    Final prediction: {row['final_prediction']:.1f}")

    print("\n" + "="*80)
    print("Test complete!")
    print("="*80)


if __name__ == "__main__":
    test_calibrated_predictor()

#!/usr/bin/env python3
"""
Ensemble Predictor

Combines predictions from all three models:
1. Pure Pomeroy (formula-based)
2. Calibrated Regression (formula + learned adjustments)
3. ML Predictor (full machine learning)

Uses weighted averaging with configurable weights.
Default weights: 0.3 Pomeroy, 0.4 Calibrated, 0.3 ML
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.pomeroy_predictor import PomeroyPredictor
from models.calibrated_predictor import CalibratedPredictor
from models.ml_predictor import MLPredictor


# ============================================================================
# ENSEMBLE PREDICTOR
# ============================================================================

class EnsemblePredictor:
    """
    Ensemble predictor combining all three models.

    Provides:
    - Weighted average prediction
    - Individual model predictions for transparency
    - Confidence scores based on model agreement
    """

    def __init__(
        self,
        pomeroy_weight: float = 0.3,
        calibrated_weight: float = 0.4,
        ml_weight: float = 0.3,
        home_advantage: float = 1.4,
        ml_model_type: str = 'random_forest'
    ):
        """
        Args:
            pomeroy_weight: Weight for Pure Pomeroy model
            calibrated_weight: Weight for Calibrated model
            ml_weight: Weight for ML model
            home_advantage: Home court advantage for Pomeroy models
            ml_model_type: Type of ML model ('random_forest' or 'gradient_boosting')
        """
        # Validate weights sum to 1
        total_weight = pomeroy_weight + calibrated_weight + ml_weight
        if not np.isclose(total_weight, 1.0):
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")

        self.pomeroy_weight = pomeroy_weight
        self.calibrated_weight = calibrated_weight
        self.ml_weight = ml_weight
        self.home_advantage = home_advantage
        self.ml_model_type = ml_model_type

        # Create individual models
        self.pomeroy = PomeroyPredictor(home_advantage=home_advantage)
        self.calibrated = CalibratedPredictor(
            use_ridge=False,  # Use LinearRegression to avoid version issues
            home_advantage=home_advantage
        )
        self.ml = MLPredictor(
            model_type=ml_model_type,
            n_estimators=100,
            max_depth=10
        )

        self.name = "Ensemble (Pomeroy + Calibrated + ML)"
        self.is_trained = False

    def fit(self, X: pd.DataFrame, y: pd.Series):
        """
        Train all models in the ensemble.

        Args:
            X: Training features
            y: Training targets (actual total points)
        """
        print(f"Training ensemble with {len(X)} games...")

        # Train Pomeroy (no training needed, but call for consistency)
        print("  1/3: Pure Pomeroy (formula-based, no training)")
        self.pomeroy.fit(X, y)

        # Train Calibrated
        print("  2/3: Calibrated Regression...")
        self.calibrated.fit(X, y)

        # Train ML
        print(f"  3/3: {self.ml.name}...")
        self.ml.fit(X, y)

        self.is_trained = True
        print("Ensemble training complete!")

        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Predict total points using weighted ensemble.

        Args:
            X: Features

        Returns:
            Array of predicted total points
        """
        if not self.is_trained:
            raise ValueError("Ensemble must be trained before predicting")

        # Get predictions from each model
        pomeroy_preds = self.pomeroy.predict(X)
        calibrated_preds = self.calibrated.predict(X)
        ml_preds = self.ml.predict(X)

        # Weighted average
        ensemble_preds = (
            self.pomeroy_weight * pomeroy_preds +
            self.calibrated_weight * calibrated_preds +
            self.ml_weight * ml_preds
        )

        return ensemble_preds

    def predict_with_breakdown(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Predict with detailed breakdown from each model.

        Returns DataFrame with:
            - pomeroy_prediction
            - calibrated_prediction
            - ml_prediction
            - ensemble_prediction
            - prediction_std (standard deviation across models)
            - confidence (based on model agreement)
        """
        if not self.is_trained:
            raise ValueError("Ensemble must be trained before predicting")

        # Get predictions from each model
        pomeroy_preds = self.pomeroy.predict(X)
        calibrated_preds = self.calibrated.predict(X)
        ml_preds = self.ml.predict(X)

        # Ensemble prediction
        ensemble_preds = (
            self.pomeroy_weight * pomeroy_preds +
            self.calibrated_weight * calibrated_preds +
            self.ml_weight * ml_preds
        )

        # Calculate agreement metrics
        all_preds = np.column_stack([pomeroy_preds, calibrated_preds, ml_preds])
        prediction_std = np.std(all_preds, axis=1)
        prediction_range = np.ptp(all_preds, axis=1)  # peak-to-peak (max - min)

        # Confidence score (inverse of disagreement)
        # Higher confidence when models agree (low std)
        # Scale: 0-100, where 100 = perfect agreement
        confidence = 100 * np.exp(-prediction_std / 10)  # Exponential decay

        return pd.DataFrame({
            'pomeroy_prediction': pomeroy_preds,
            'calibrated_prediction': calibrated_preds,
            'ml_prediction': ml_preds,
            'ensemble_prediction': ensemble_preds,
            'prediction_std': prediction_std,
            'prediction_range': prediction_range,
            'confidence': confidence
        })

    def evaluate(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Dict[str, float]]:
        """
        Evaluate all models individually and ensemble.

        Returns dict with metrics for each model.
        """
        if not self.is_trained:
            raise ValueError("Ensemble must be trained before evaluating")

        results = {}

        # Evaluate each model
        models = {
            'Pomeroy': self.pomeroy,
            'Calibrated': self.calibrated,
            'ML': self.ml,
            'Ensemble': self
        }

        for name, model in models.items():
            preds = model.predict(X)
            errors = preds - y
            abs_errors = np.abs(errors)

            results[name] = {
                'mae': np.mean(abs_errors),
                'rmse': np.sqrt(np.mean(errors ** 2)),
                'mean_error': np.mean(errors),
                'median_error': np.median(errors),
                'max_error': np.max(abs_errors),
                'std_error': np.std(errors),
                'within_5': np.mean(abs_errors <= 5) * 100,
                'within_10': np.mean(abs_errors <= 10) * 100,
            }

        return results

    def get_weights(self) -> Dict[str, float]:
        """Get current ensemble weights"""
        return {
            'pomeroy': self.pomeroy_weight,
            'calibrated': self.calibrated_weight,
            'ml': self.ml_weight
        }

    def set_weights(
        self,
        pomeroy_weight: float,
        calibrated_weight: float,
        ml_weight: float
    ):
        """
        Update ensemble weights.

        Args:
            pomeroy_weight: Weight for Pure Pomeroy model
            calibrated_weight: Weight for Calibrated model
            ml_weight: Weight for ML model

        Raises:
            ValueError if weights don't sum to 1.0
        """
        total_weight = pomeroy_weight + calibrated_weight + ml_weight
        if not np.isclose(total_weight, 1.0):
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")

        self.pomeroy_weight = pomeroy_weight
        self.calibrated_weight = calibrated_weight
        self.ml_weight = ml_weight

    def get_params(self, deep=True):
        """Get parameters (sklearn compatibility)"""
        return {
            'pomeroy_weight': self.pomeroy_weight,
            'calibrated_weight': self.calibrated_weight,
            'ml_weight': self.ml_weight,
            'home_advantage': self.home_advantage,
            'ml_model_type': self.ml_model_type
        }

    def set_params(self, **params):
        """Set parameters (sklearn compatibility)"""
        for key, value in params.items():
            setattr(self, key, value)
        return self


# ============================================================================
# TESTING
# ============================================================================

def test_ensemble():
    """Test ensemble predictor"""
    print("="*80)
    print("Testing Ensemble Predictor")
    print("="*80)

    # Create sample data
    np.random.seed(42)
    n_samples = 150

    train_data = pd.DataFrame({
        'team_1_adjtempo': np.random.normal(68, 3, n_samples),
        'team_1_adjoe': np.random.normal(105, 8, n_samples),
        'team_1_adjde': np.random.normal(105, 8, n_samples),
        'team_1_efg_pct': np.random.normal(50, 3, n_samples),
        'team_1_to_pct': np.random.normal(18, 2, n_samples),
        'team_1_fg3pct': np.random.normal(33, 3, n_samples),

        'team_2_adjtempo': np.random.normal(68, 3, n_samples),
        'team_2_adjoe': np.random.normal(105, 8, n_samples),
        'team_2_adjde': np.random.normal(105, 8, n_samples),
        'team_2_efg_pct': np.random.normal(50, 3, n_samples),
        'team_2_to_pct': np.random.normal(18, 2, n_samples),
        'team_2_fg3pct': np.random.normal(33, 3, n_samples),
    })

    # Generate targets
    tempo = (train_data['team_1_adjtempo'] + train_data['team_2_adjtempo']) / 2
    avg_oe = (train_data['team_1_adjoe'] + train_data['team_2_adjoe']) / 2
    y_true = tempo * avg_oe / 100 * 2 + np.random.normal(0, 5, n_samples)

    # Train ensemble
    print("\nTraining ensemble...")
    ensemble = EnsemblePredictor(
        pomeroy_weight=0.3,
        calibrated_weight=0.4,
        ml_weight=0.3
    )
    ensemble.fit(train_data, y_true)

    # Evaluate
    print("\nEvaluating models...")
    results = ensemble.evaluate(train_data, y_true)

    print("\nPerformance comparison:")
    print(f"{'Model':<15} {'MAE':>8} {'RMSE':>8} {'Within 5':>10} {'Within 10':>10}")
    print("-" * 60)
    for model_name, metrics in results.items():
        print(f"{model_name:<15} {metrics['mae']:>8.2f} {metrics['rmse']:>8.2f} "
              f"{metrics['within_5']:>9.1f}% {metrics['within_10']:>9.1f}%")

    # Show sample predictions with breakdown
    print("\nSample predictions with model breakdown:")
    breakdown = ensemble.predict_with_breakdown(train_data.head(5))
    for idx, row in breakdown.iterrows():
        print(f"\nGame {idx+1} (Actual: {y_true.iloc[idx]:.1f}):")
        print(f"  Pomeroy:    {row['pomeroy_prediction']:.1f}")
        print(f"  Calibrated: {row['calibrated_prediction']:.1f}")
        print(f"  ML:         {row['ml_prediction']:.1f}")
        print(f"  Ensemble:   {row['ensemble_prediction']:.1f}")
        print(f"  Confidence: {row['confidence']:.0f}/100")
        print(f"  Error:      {abs(row['ensemble_prediction'] - y_true.iloc[idx]):.1f}")

    print("\n" + "="*80)
    print("Test complete!")
    print("="*80)


if __name__ == "__main__":
    test_ensemble()

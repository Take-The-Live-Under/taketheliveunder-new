#!/usr/bin/env python3
"""
Model Training and Evaluation Script

Trains and evaluates the ensemble prediction system on real NCAA basketball data.

Usage:
    python train_models.py

Outputs:
    - Trained models saved to data/trained_models/
    - Evaluation report saved to data/model_reports/
"""

import pandas as pd
import numpy as np
import pickle
import json
from pathlib import Path
from datetime import datetime
from sklearn.model_selection import cross_val_score, KFold, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error
import sys

# Add models to path
sys.path.insert(0, str(Path(__file__).parent))

from models.pomeroy_predictor import PomeroyPredictor
from models.calibrated_predictor import CalibratedPredictor
from models.ml_predictor import MLPredictor
from models.ensemble_predictor import EnsemblePredictor


# ============================================================================
# CONFIGURATION
# ============================================================================

DATA_DIR = Path(__file__).parent / "data"
TRAINING_DATA = DATA_DIR / "training" / "games_2025.csv"
OUTPUT_DIR = DATA_DIR / "trained_models"
REPORT_DIR = DATA_DIR / "model_reports"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================================
# DATA LOADING
# ============================================================================

def load_training_data():
    """Load and prepare training data"""
    print(f"\nLoading training data from: {TRAINING_DATA}")

    if not TRAINING_DATA.exists():
        raise FileNotFoundError(f"Training data not found at {TRAINING_DATA}")

    df = pd.read_csv(TRAINING_DATA)
    print(f"  Loaded {len(df)} games")

    # Filter to games with KenPom ratings (needed for predictions)
    required_cols = ['team_1_adjoe', 'team_1_adjde', 'team_2_adjoe', 'team_2_adjde', 'total_points']
    valid_games = df[required_cols].notna().all(axis=1)
    df_filtered = df[valid_games].copy()

    print(f"  Games with complete data: {len(df_filtered)}")

    # Separate features and target
    X = df_filtered.copy()
    y = df_filtered['total_points'].copy()

    print(f"  Features: {len(X.columns)} columns")
    print(f"  Target range: {y.min():.0f} - {y.max():.0f} points")
    print(f"  Target mean: {y.mean():.1f} ± {y.std():.1f}")

    return X, y, df_filtered


# ============================================================================
# MODEL TRAINING & VALIDATION
# ============================================================================

def validate_model_with_tscv(model, X, y, n_splits=5):
    """
    Validate model using time-series cross-validation.

    This is CRITICAL for detecting overfitting - compares training error
    to validation error on data the model hasn't seen.

    Returns:
        dict with train_mae, val_mae, and overfitting_severity
    """
    tscv = TimeSeriesSplit(n_splits=min(n_splits, len(X) // 10))  # Ensure enough data per split

    train_maes = []
    val_maes = []

    for fold_idx, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        # Clone and train model on this fold
        if hasattr(model, 'fit'):
            model.fit(X_train, y_train)

            train_pred = model.predict(X_train)
            val_pred = model.predict(X_val)

            train_mae = mean_absolute_error(y_train, train_pred)
            val_mae = mean_absolute_error(y_val, val_pred)

            train_maes.append(train_mae)
            val_maes.append(val_mae)

            print(f"    Fold {fold_idx+1}: Train MAE={train_mae:.2f}, Val MAE={val_mae:.2f}, Gap={val_mae-train_mae:.2f}")

    avg_train_mae = np.mean(train_maes)
    avg_val_mae = np.mean(val_maes)
    gap = avg_val_mae - avg_train_mae

    # Determine overfitting severity
    if avg_train_mae < 1.0:
        severity = "CRITICAL - Model memorizing data!"
    elif gap > 5.0:
        severity = "SEVERE - Large train/val gap"
    elif gap > 3.0:
        severity = "WARNING - Moderate overfitting"
    elif gap > 1.5:
        severity = "MILD - Small overfitting"
    else:
        severity = "OK - Healthy generalization"

    return {
        'train_mae': avg_train_mae,
        'val_mae': avg_val_mae,
        'gap': gap,
        'severity': severity,
        'fold_results': list(zip(train_maes, val_maes))
    }


def train_and_evaluate_ensemble(X, y):
    """
    Train ensemble and evaluate all models with proper cross-validation.

    Returns:
        Tuple of (ensemble, metrics_dict, predictions_df, cv_results)
    """
    print("\n" + "="*80)
    print("Training Ensemble Predictor with Cross-Validation")
    print("="*80)

    # Determine dynamic weights based on training data size
    n_games = len(X)
    print(f"\nTraining dataset: {n_games} games")

    if n_games < 2000:
        print("⚠️  WARNING: Medium dataset - disabling overfitted Calibrated model")
        print("            Calibrated has 167-point validation gap (SEVERE overfitting)")
        print("            Using Pomeroy (formula-based) + ML blend until we have 2000+ games")
        pomeroy_w, calibrated_w, ml_w = 0.60, 0.00, 0.40
    elif n_games < 5000:
        print("Using moderate ensemble weights with reduced Calibrated")
        pomeroy_w, calibrated_w, ml_w = 0.50, 0.20, 0.30
    else:
        print("Using balanced ensemble weights")
        pomeroy_w, calibrated_w, ml_w = 0.30, 0.40, 0.30

    print(f"Weights: Pomeroy={pomeroy_w:.0%}, Calibrated={calibrated_w:.0%}, ML={ml_w:.0%}")

    # Create ensemble
    ensemble = EnsemblePredictor(
        pomeroy_weight=pomeroy_w,
        calibrated_weight=calibrated_w,
        ml_weight=ml_w,
        ml_model_type='random_forest'
    )

    # Train on all data
    print("\nTraining models on full dataset...")
    ensemble.fit(X, y)

    # Evaluate with cross-validation
    print("\n" + "="*80)
    print("Cross-Validation Results (Time-Series CV)")
    print("="*80)

    cv_results = {}

    # Validate each model
    print("\n1. Pure Pomeroy (Formula-based):")
    cv_results['Pomeroy'] = validate_model_with_tscv(ensemble.pomeroy, X, y, n_splits=3)

    print("\n2. Calibrated Regression:")
    cv_results['Calibrated'] = validate_model_with_tscv(ensemble.calibrated, X, y, n_splits=3)

    print("\n3. ML (Random Forest):")
    cv_results['ML'] = validate_model_with_tscv(ensemble.ml, X, y, n_splits=3)

    print("\n" + "="*80)
    print("Overfitting Check Summary")
    print("="*80)
    for model_name, cv_result in cv_results.items():
        print(f"{model_name:12} | Train: {cv_result['train_mae']:5.2f} | Val: {cv_result['val_mae']:5.2f} | "
              f"Gap: {cv_result['gap']:+5.2f} | {cv_result['severity']}")

    # Evaluate all models (training set performance)
    print("\n" + "="*80)
    print("Training Set Evaluation (for reference)")
    print("="*80)

    metrics = ensemble.evaluate(X, y)

    print(f"\n{'Model':<15} {'MAE':>8} {'RMSE':>8} {'Mean Err':>10} {'Within 5':>10} {'Within 10':>10}")
    print("-" * 80)
    for model_name, model_metrics in metrics.items():
        print(f"{model_name:<15} "
              f"{model_metrics['mae']:>8.2f} "
              f"{model_metrics['rmse']:>8.2f} "
              f"{model_metrics['mean_error']:>+9.2f} "
              f"{model_metrics['within_5']:>9.1f}% "
              f"{model_metrics['within_10']:>9.1f}%")

    # Get detailed predictions
    predictions_df = ensemble.predict_with_breakdown(X)
    predictions_df['actual_total'] = y.values
    predictions_df['ensemble_error'] = predictions_df['ensemble_prediction'] - predictions_df['actual_total']

    return ensemble, metrics, predictions_df, cv_results


# ============================================================================
# MODEL SAVING
# ============================================================================

def save_models(ensemble):
    """Save trained models to disk"""
    print("\n" + "="*80)
    print("Saving Models")
    print("="*80)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")

    # Save ensemble (includes all three models)
    ensemble_path = OUTPUT_DIR / f"ensemble_{timestamp}.pkl"
    with open(ensemble_path, 'wb') as f:
        pickle.dump(ensemble, f)
    print(f"  Saved ensemble: {ensemble_path}")

    # Save latest version
    latest_path = OUTPUT_DIR / "ensemble_latest.pkl"
    with open(latest_path, 'wb') as f:
        pickle.dump(ensemble, f)
    print(f"  Saved latest: {latest_path}")

    return {
        'timestamped': ensemble_path,
        'latest': latest_path
    }


# ============================================================================
# REPORT GENERATION
# ============================================================================

def generate_report(metrics, predictions_df, model_paths, cv_results=None):
    """Generate evaluation report with cross-validation results"""
    print("\n" + "="*80)
    print("Generating Report")
    print("="*80)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")

    # Create report dict
    report = {
        'timestamp': datetime.now().isoformat(),
        'training_date': datetime.now().strftime("%Y-%m-%d"),
        'n_games': len(predictions_df),
        'metrics': metrics,
        'cv_results': cv_results if cv_results else {},
        'model_files': {k: str(v) for k, v in model_paths.items()},
        'summary': {
            'ensemble_mae': metrics['Ensemble']['mae'],
            'ensemble_rmse': metrics['Ensemble']['rmse'],
            'best_model': min(metrics.items(), key=lambda x: x[1]['mae'])[0],
            'worst_model': max(metrics.items(), key=lambda x: x[1]['mae'])[0]
        }
    }

    # Save JSON report
    report_json = REPORT_DIR / f"training_report_{timestamp}.json"
    with open(report_json, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"  Saved JSON report: {report_json}")

    # Save predictions CSV
    predictions_csv = REPORT_DIR / f"predictions_{timestamp}.csv"
    predictions_df.to_csv(predictions_csv, index=False)
    print(f"  Saved predictions: {predictions_csv}")

    # Save latest versions
    latest_report = REPORT_DIR / "training_report_latest.json"
    with open(latest_report, 'w') as f:
        json.dump(report, f, indent=2)

    latest_predictions = REPORT_DIR / "predictions_latest.csv"
    predictions_df.to_csv(latest_predictions, index=False)

    # Generate text summary
    summary_txt = REPORT_DIR / f"summary_{timestamp}.txt"
    with open(summary_txt, 'w') as f:
        f.write("="*80 + "\n")
        f.write("NCAA Basketball Total Points Predictor - Training Report\n")
        f.write("="*80 + "\n\n")

        f.write(f"Training Date: {report['training_date']}\n")
        f.write(f"Games Used: {report['n_games']}\n\n")

        f.write("="*80 + "\n")
        f.write("Model Performance\n")
        f.write("="*80 + "\n\n")

        f.write(f"{'Model':<15} {'MAE':>8} {'RMSE':>8} {'Mean Err':>10} {'Within 5':>10} {'Within 10':>10}\n")
        f.write("-" * 80 + "\n")
        for model_name, model_metrics in metrics.items():
            f.write(f"{model_name:<15} "
                   f"{model_metrics['mae']:>8.2f} "
                   f"{model_metrics['rmse']:>8.2f} "
                   f"{model_metrics['mean_error']:>+9.2f} "
                   f"{model_metrics['within_5']:>9.1f}% "
                   f"{model_metrics['within_10']:>9.1f}%\n")

        f.write("\n" + "="*80 + "\n")
        f.write("Summary\n")
        f.write("="*80 + "\n\n")
        f.write(f"Ensemble MAE: {report['summary']['ensemble_mae']:.2f} points\n")
        f.write(f"Ensemble RMSE: {report['summary']['ensemble_rmse']:.2f} points\n")
        f.write(f"Best Individual Model: {report['summary']['best_model']}\n")
        f.write(f"Worst Individual Model: {report['summary']['worst_model']}\n\n")

        # Cross-validation results
        if cv_results:
            f.write("="*80 + "\n")
            f.write("Cross-Validation Results (Overfitting Check)\n")
            f.write("="*80 + "\n\n")
            f.write(f"{'Model':<15} {'Train MAE':>10} {'Val MAE':>10} {'Gap':>8} {'Status':<30}\n")
            f.write("-" * 80 + "\n")
            for model_name, cv_result in cv_results.items():
                f.write(f"{model_name:<15} "
                       f"{cv_result['train_mae']:>10.2f} "
                       f"{cv_result['val_mae']:>10.2f} "
                       f"{cv_result['gap']:>+8.2f} "
                       f"{cv_result['severity']:<30}\n")
            f.write("\n")

        # Prediction examples
        f.write("="*80 + "\n")
        f.write("Sample Predictions\n")
        f.write("="*80 + "\n\n")
        for idx in range(min(5, len(predictions_df))):
            row = predictions_df.iloc[idx]
            f.write(f"Game {idx+1}:\n")
            f.write(f"  Actual:      {row['actual_total']:.1f}\n")
            f.write(f"  Pomeroy:     {row['pomeroy_prediction']:.1f}\n")
            f.write(f"  Calibrated:  {row['calibrated_prediction']:.1f}\n")
            f.write(f"  ML:          {row['ml_prediction']:.1f}\n")
            f.write(f"  Ensemble:    {row['ensemble_prediction']:.1f}\n")
            f.write(f"  Error:       {row['ensemble_error']:+.1f}\n")
            f.write(f"  Confidence:  {row['confidence']:.0f}/100\n\n")

    print(f"  Saved summary: {summary_txt}")

    return report


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main training pipeline"""
    print("="*80)
    print("NCAA Basketball Total Points Predictor - Model Training")
    print("="*80)

    # Load data
    X, y, df = load_training_data()

    # Train and evaluate
    ensemble, metrics, predictions_df, cv_results = train_and_evaluate_ensemble(X, y)

    # Save models
    model_paths = save_models(ensemble)

    # Generate report
    report = generate_report(metrics, predictions_df, model_paths, cv_results)

    print("\n" + "="*80)
    print("Training Complete!")
    print("="*80)
    print(f"\nEnsemble MAE: {metrics['Ensemble']['mae']:.2f} points")
    print(f"Ensemble RMSE: {metrics['Ensemble']['rmse']:.2f} points")
    print(f"Within 5 points: {metrics['Ensemble']['within_5']:.1f}%")
    print(f"Within 10 points: {metrics['Ensemble']['within_10']:.1f}%")

    print(f"\nModels saved to: {OUTPUT_DIR}")
    print(f"Reports saved to: {REPORT_DIR}")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

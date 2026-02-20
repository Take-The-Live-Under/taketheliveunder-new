# Overfitting Fix Report - NCAA Basketball Model
**Date**: November 17, 2025
**Training Dataset**: 44 games (2026 season)

## PROBLEM IDENTIFIED

The original model had **CRITICAL overfitting** - the Calibrated model showed:
- Training MAE: 0.00 (perfect fit - IMPOSSIBLE and suspicious)
- No validation/test data evaluation
- Ensemble making nonsensical predictions (totals of 16.6, 51.8, etc.)

This indicated the model was **memorizing** the training data rather than learning generalizable patterns.

---

## FIXES IMPLEMENTED

### 1. Time-Series Cross-Validation (train_models.py)

**Before**: Evaluated only on training data (no validation)

**After**: Implemented proper TimeSeriesSplit cross-validation
- Splits data chronologically into training and validation folds
- Measures TRUE performance on unseen data
- Detects overfitting by comparing train vs validation MAE
- Severity levels: OK → MILD → WARNING → SEVERE → CRITICAL

```python
def validate_model_with_tscv(model, X, y, n_splits=5):
    tscv = TimeSeriesSplit(n_splits=min(n_splits, len(X) // 10))

    for fold_idx, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model.fit(X_train, y_train)
        train_mae = mean_absolute_error(y_train, model.predict(X_train))
        val_mae = mean_absolute_error(y_val, model.predict(X_val))

    return avg_train_mae, avg_val_mae, gap
```

### 2. Calibrated Model Regularization (calibrated_predictor.py)

**Before**: LinearRegression (no regularization) OR Ridge with alpha=1.0

**After**: Ridge regression with alpha=10.0 (10x stronger regularization)
- L2 penalty prevents coefficients from becoming too large
- Forces model to use simpler patterns
- Fallback solver for compatibility

```python
self.regressor = Ridge(alpha=10.0, solver='svd')
```

### 3. ML Model Complexity Reduction (ml_predictor.py)

**Before**:
- n_estimators: 100 trees
- max_depth: 10 (deep trees can memorize)
- min_samples_split: 5 (allows tiny splits)

**After**:
- n_estimators: 30 trees (↓70%)
- max_depth: 3 (↓70% - CRITICAL change)
- min_samples_split: 15 (↑200%)
- min_samples_leaf: 10 (NEW - prevents tiny leaf nodes)
- max_features: 'sqrt' (reduces feature correlation)

```python
self.model = RandomForestRegressor(
    n_estimators=30,
    max_depth=3,
    min_samples_split=15,
    min_samples_leaf=10,
    max_features='sqrt'
)
```

### 4. Dynamic Ensemble Weights (train_models.py)

**Before**: Fixed weights (30% Pomeroy, 40% Calibrated, 30% ML)

**After**: Adaptive weights based on training data size

| Training Games | Pomeroy | Calibrated | ML | Rationale |
|---------------|---------|------------|-----|-----------|
| < 100 games   | 70%     | 15%        | 15% | Trust formula over fitted models |
| 100-500 games | 50%     | 30%        | 20% | Balanced approach |
| 500+ games    | 30%     | 40%        | 30% | Full ensemble power |

**Current (44 games)**: 70% Pomeroy, 15% Calibrated, 15% ML

### 5. NaN/Inf Handling

Added robust handling for edge cases:
```python
# Replace inf with NaN first
features_df = features_df.replace([np.inf, -np.inf], np.nan)

# Fill NaN with column mean (or 0 if all NaN)
for col in numeric_cols:
    col_mean = features_df[col].mean()
    if np.isnan(col_mean) or np.isinf(col_mean):
        features_df[col] = features_df[col].fillna(0)
    else:
        features_df[col] = features_df[col].fillna(col_mean)
```

---

## RESULTS - CROSS-VALIDATION PERFORMANCE

### Pomeroy (Formula-Based)
- **Train MAE**: 12.43 points
- **Validation MAE**: 12.75 points
- **Gap**: +0.32 points
- **Status**: ✅ **OK - Healthy generalization**
- **Analysis**: Nearly identical train/val performance shows excellent generalization. No overfitting detected.

### Calibrated Regression (Ridge, alpha=10.0)
- **Train MAE**: 4.46 points
- **Validation MAE**: 40.01 points
- **Gap**: +35.54 points
- **Status**: ⚠️ **SEVERE - Large train/val gap**
- **Analysis**: STILL severely overfitted despite regularization. Training performance suspiciously good (4.46), validation catastrophically bad (40 points!). This model is MEMORIZING the training data.
- **Recommendation**: Increase alpha to 50+ OR disable entirely for datasets < 100 games.

### ML (Random Forest - Constrained)
- **Train MAE**: 11.52 points
- **Validation MAE**: 13.33 points
- **Gap**: +1.81 points
- **Status**: ✅ **MILD - Small overfitting**
- **Analysis**: Excellent! The constrained Random Forest is generalizing well. Small gap is acceptable and expected.

### Ensemble (70% Pomeroy, 15% Calibrated, 15% ML)
- **Training MAE**: 11.53 points
- **Training RMSE**: 15.97 points
- **Within 5 points**: 38.6%
- **Within 10 points**: 56.8%

---

## COMPARISON TO ORIGINAL MODEL

| Metric | Original (Overfitted) | After Fixes | Change |
|--------|----------------------|-------------|--------|
| Calibrated Train MAE | 0.00 ⚠️ | 4.46 | ✅ More realistic |
| Calibrated Val MAE | Unknown | 40.01 | ⚠️ Still overfitted |
| ML Train MAE | 5.62 | 11.52 | ✅ Less memorization |
| ML Val MAE | Unknown | 13.33 | ✅ Good generalization |
| Ensemble Weight (Pomeroy) | 30% | 70% | ✅ Trust formula more |
| Cross-Validation | None ❌ | TimeSeriesSplit ✅ | Major improvement |

---

## KEY FINDINGS

### ✅ What's Working

1. **Pomeroy Formula** - Rock solid baseline with zero overfitting
2. **ML Model (Constrained)** - Generalizing well after complexity reduction
3. **Dynamic Weights** - Correctly prioritizing Pomeroy for small datasets
4. **Cross-Validation** - Now detecting overfitting that was previously hidden

### ⚠️ What Still Needs Work

1. **Calibrated Model** - Still severely overfitted even with Ridge regularization
   - Train MAE of 4.46 is suspiciously low (should be closer to Pomeroy's 12.43)
   - Validation MAE of 40 is catastrophic
   - Need to increase alpha to 50+ or disable entirely

2. **Training Data Size** - 44 games is too small for reliable ML
   - Target: 100+ games minimum
   - Ideal: 500+ games for full ensemble
   - Current limitation: Only early-season 2026 games available

---

## RECOMMENDATIONS

### Immediate (Do Now)

1. **Disable Calibrated Model** for datasets < 100 games
   - Set weight to 0% in dynamic weights
   - Use 85% Pomeroy + 15% ML instead

2. **Test Predictions** with updated model
   - Run `python predict_totals.py`
   - Verify predictions are in 130-160 range (reasonable)
   - Check that no predictions are < 100 or > 200

### Short-Term (Next 1-2 Weeks)

1. **Fetch Historical 2025 Season Data**
   - Complete 2024-25 season has 3000+ games
   - Use KenPom API to fetch all games with ratings
   - Expand training set from 44 → 1000+ games

2. **Implement Temporal Weighting**
   - Weight recent games (2026) higher than older games (2025)
   - Exponential decay: `weight = exp(-days_ago / 180)`

3. **Add Missing Features**
   - Rest days differential
   - Recent performance (last 5 games avg)
   - Pace matchup indicators
   - Both teams fast/slow flags

### Medium-Term (Next Month)

1. **Hyperparameter Tuning** once we have 500+ games
   - Grid search for optimal alpha in Calibrated model
   - Tune Random Forest depth (try 4, 5, 6)
   - Optimize ensemble weights on validation set

2. **Feature Engineering**
   - Player injury data (if available)
   - Home/Away splits
   - Conference strength
   - Tournament games vs regular season

### Long-Term (Season Goals)

1. **Model Ensemble Expansion**
   - Add XGBoost as 4th model
   - Implement stacking (meta-model)
   - Add deep learning model once 500+ games

2. **Live Model Updates**
   - Retrain weekly as more games complete
   - Track model drift
   - Auto-adjust weights based on recent performance

---

## SUCCESS METRICS

### Model is Healthy When:

✅ Train MAE within 2 points of Validation MAE
✅ No model shows Train MAE < 5.0 points (too good = memorization)
✅ Predictions fall in 120-170 range for 90%+ of games
✅ Cross-validation gap < 3.0 points

### Model Needs Attention When:

⚠️ Train/Val gap > 3.0 points
⚠️ Train MAE < 3.0 points (suspiciously good)
⚠️ Predictions outside 100-200 range
⚠️ Validation MAE > 15 points

---

## FILES MODIFIED

1. `train_models.py` - Added TimeSeriesSplit cross-validation
2. `models/calibrated_predictor.py` - Ridge with alpha=10.0, NaN/Inf handling
3. `models/ml_predictor.py` - Reduced complexity, added constraints
4. `models/ensemble_predictor.py` - Used by train_models.py with dynamic weights

## FILES GENERATED

1. `data/trained_models/ensemble_latest.pkl` - New trained ensemble
2. `data/model_reports/summary_2025-11-17_005828.txt` - Full training report
3. `data/model_reports/training_report_2025-11-17_005828.json` - JSON metrics

---

## NEXT STEPS

1. ✅ Overfitting fixes implemented and validated
2. 📋 **TODO**: Fetch complete 2025 season data (3000+ games)
3. 📋 **TODO**: Disable Calibrated model for small datasets
4. 📋 **TODO**: Test predictions with new model
5. 📋 **TODO**: Add temporal weighting for historical data
6. 📋 **TODO**: Implement additional features (rest, recent performance)

---

## CONCLUSION

The overfitting crisis has been **partially resolved**:

- **Pomeroy model**: ✅ Working perfectly (MAE 12.43, no overfitting)
- **ML model**: ✅ Fixed and generalizing well (MAE 13.33, mild overfitting)
- **Calibrated model**: ⚠️ Still severely overfitted (needs higher alpha or disabling)
- **Ensemble**: ✅ Using smart dynamic weights (70% Pomeroy for small dataset)

The system now has **proper validation** to detect overfitting and **adaptive weights** to trust formula-based methods when data is limited.

**Most Important Next Step**: Fetch complete 2025 season data to expand training set from 44 → 1000+ games. This will dramatically improve ML and Calibrated model reliability.

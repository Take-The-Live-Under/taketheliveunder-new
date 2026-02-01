#!/usr/bin/env python3
"""
Test script for the improved HMM/Kalman model.
Runs the enhanced model and generates comparison visualizations.
"""

import sys
sys.stdout.reconfigure(line_buffering=True)

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "src"))

print("=" * 70, flush=True)
print("IMPROVED HMM/KALMAN MODEL TEST", flush=True)
print("=" * 70, flush=True)

# Import after path setup
import config
from src.pj_engine import PJEngine, get_pj_engine
from src.data_loader import DataLoader

# Find the best data file to use
DATA_DIR = Path(__file__).parent / "outputs"
data_files = list(DATA_DIR.glob("season_pbp_*.csv"))
if data_files:
    # Use most recent season data
    data_file = sorted(data_files)[-1]
else:
    data_file = DATA_DIR / "model_input.csv"

print(f"\nUsing data file: {data_file}", flush=True)

# Load data to check size
df_check = pd.read_csv(data_file)
n_games = df_check['game_id'].nunique()
print(f"Games in dataset: {n_games}", flush=True)
print(f"Total rows: {len(df_check)}", flush=True)

# Check if we have the required columns
required = ['game_id', 'minute_index', 'points_home', 'points_away',
            'poss_home', 'poss_away', 'fouls_home', 'fouls_away',
            'to_home', 'to_away']
missing = [c for c in required if c not in df_check.columns]
if missing:
    print(f"WARNING: Missing columns: {missing}", flush=True)
    print(f"Available columns: {list(df_check.columns)}", flush=True)
else:
    print("All required columns present", flush=True)

# Print improvement summary
print("\n" + "=" * 70, flush=True)
print("IMPROVEMENTS IMPLEMENTED:", flush=True)
print("=" * 70, flush=True)
print("1. Adaptive Regime Weight: 0.2 (early) -> 0.65 (late game)", flush=True)
print("2. Continuous Late-Game Q/R Curve (exponential, not binary)", flush=True)
print("3. Online Q/R Adaptation (innovation-based learning)", flush=True)
print("4. Garbage Time Detection (blowout handling)", flush=True)
print("5. Enhanced HMM Features (PPP, momentum if available)", flush=True)
print("=" * 70, flush=True)

# Run the improved model
print("\n[1/4] Initializing PJ Engine...", flush=True)
engine = get_pj_engine(n_states=4)

print("[2/4] Loading and processing data...", flush=True)
try:
    engine.load_data(str(data_file))
except Exception as e:
    print(f"Error loading data: {e}", flush=True)
    # Try with sample data
    sample_file = Path(__file__).parent / "data" / "pbp_minute_bins_sample.csv"
    if sample_file.exists():
        print(f"Trying sample file: {sample_file}", flush=True)
        engine.load_data(str(sample_file))
    else:
        raise

print("[3/4] Fitting HMM...", flush=True)
engine.fit_hmm()

# Print state profiles
print("\nHMM State Profiles:", flush=True)
profiles = engine.get_state_profiles_summary()
print(profiles.to_string(), flush=True)

print("\n[4/4] Generating projections...", flush=True)
projections = engine.generate_projections()

print(f"\nGenerated {len(projections)} projection rows for {projections['game_id'].nunique()} games", flush=True)

# Save projections
output_dir = Path(__file__).parent / "outputs"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
projections.to_csv(output_dir / f"improved_projections_{timestamp}.csv", index=False)
print(f"Projections saved to: improved_projections_{timestamp}.csv", flush=True)

# Calculate accuracy metrics
print("\n" + "=" * 70, flush=True)
print("CALCULATING ACCURACY METRICS BY MINUTE", flush=True)
print("=" * 70, flush=True)

# Get actual game totals
game_totals = projections.groupby('game_id').agg({
    'points_so_far': 'max'  # Final total
}).reset_index()
game_totals.columns = ['game_id', 'actual_total']

# Merge with projections
proj_with_actual = projections.merge(game_totals, on='game_id')
proj_with_actual['projection_error'] = proj_with_actual['projected_total'] - proj_with_actual['actual_total']
proj_with_actual['abs_error'] = proj_with_actual['projection_error'].abs()

# Calculate metrics by minute
minute_metrics = proj_with_actual.groupby('minute_index').agg({
    'abs_error': ['mean', 'std', 'median'],
    'projection_error': 'mean',
    'game_id': 'count'
}).reset_index()
minute_metrics.columns = ['minute', 'mae', 'std', 'median_error', 'mean_error', 'n_games']

# Calculate within-X accuracy
for threshold in [5, 10, 15]:
    proj_with_actual[f'within_{threshold}'] = (proj_with_actual['abs_error'] <= threshold).astype(int)

within_metrics = proj_with_actual.groupby('minute_index').agg({
    'within_5': 'mean',
    'within_10': 'mean',
    'within_15': 'mean'
}).reset_index()
within_metrics.columns = ['minute', 'within_5_pct', 'within_10_pct', 'within_15_pct']

minute_metrics = minute_metrics.merge(within_metrics, on='minute')

print("\nMetrics by Minute (last 10 minutes):", flush=True)
print(minute_metrics[minute_metrics['minute'] >= 30].to_string(index=False), flush=True)

# Key performance summary
print("\n" + "=" * 70, flush=True)
print("KEY PERFORMANCE SUMMARY:", flush=True)
print("=" * 70, flush=True)

for target_min in [25, 30, 35, 38]:
    if target_min in minute_metrics['minute'].values:
        row = minute_metrics[minute_metrics['minute'] == target_min].iloc[0]
        print(f"Minute {target_min}: MAE={row['mae']:.2f}, Within 10={row['within_10_pct']*100:.1f}%, Within 5={row['within_5_pct']*100:.1f}%", flush=True)

# Check adaptive features
print("\n" + "=" * 70, flush=True)
print("ADAPTIVE FEATURES ANALYSIS:", flush=True)
print("=" * 70, flush=True)

if 'regime_weight' in projections.columns:
    rw_by_min = projections.groupby('minute_index')['regime_weight'].mean()
    print(f"Regime weight range: {rw_by_min.min():.3f} -> {rw_by_min.max():.3f}", flush=True)
    print(f"  Minute 5:  {rw_by_min.get(5, 0):.3f}", flush=True)
    print(f"  Minute 20: {rw_by_min.get(20, 0):.3f}", flush=True)
    print(f"  Minute 35: {rw_by_min.get(35, 0):.3f}", flush=True)

if 'total_Q_mult' in projections.columns:
    q_by_min = projections.groupby('minute_index')['total_Q_mult'].mean()
    print(f"\nKalman Q multiplier range: {q_by_min.min():.3f} -> {q_by_min.max():.3f}", flush=True)
    print(f"  Minute 5:  {q_by_min.get(5, 1):.3f}", flush=True)
    print(f"  Minute 35: {q_by_min.get(35, 1):.3f}", flush=True)
    print(f"  Minute 39: {q_by_min.get(39, 1):.3f}", flush=True)

if 'blowout_factor' in projections.columns:
    blowouts = projections[projections['blowout_factor'] > 0.4]
    print(f"\nGarbage time minutes detected: {len(blowouts)} ({len(blowouts)/len(projections)*100:.1f}%)", flush=True)

if 'innovation_variance' in projections.columns:
    iv_by_min = projections.groupby('minute_index')['innovation_variance'].mean()
    print(f"\nInnovation variance range: {iv_by_min.min():.3f} -> {iv_by_min.max():.3f}", flush=True)

# Create visualizations
print("\n" + "=" * 70, flush=True)
print("GENERATING VISUALIZATIONS...", flush=True)
print("=" * 70, flush=True)

# Set up plotting style
try:
    plt.style.use('seaborn-darkgrid')
except:
    try:
        plt.style.use('ggplot')
    except:
        pass

# Filter to regulation time only (0-40 minutes) for cleaner plots
minute_metrics_reg = minute_metrics[minute_metrics['minute'] <= 40].copy()
proj_reg = projections[projections['minute_index'] <= 40].copy()

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Plot 1: MAE by Minute
ax1 = axes[0, 0]
minutes = minute_metrics_reg['minute'].values
mae = minute_metrics_reg['mae'].values
ax1.plot(minutes, mae, 'b-', linewidth=2, label='MAE')
ax1.fill_between(minutes, mae - minute_metrics_reg['std'].values, mae + minute_metrics_reg['std'].values, alpha=0.3)
ax1.axhline(y=10, color='r', linestyle='--', alpha=0.5, label='10-point threshold')
ax1.set_xlabel('Minute')
ax1.set_ylabel('Mean Absolute Error (points)')
ax1.set_title('Projection MAE by Game Minute')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Plot 2: Within-X Accuracy
ax2 = axes[0, 1]
ax2.plot(minutes, minute_metrics_reg['within_5_pct'].values * 100, 'g-', linewidth=2, label='Within 5 pts')
ax2.plot(minutes, minute_metrics_reg['within_10_pct'].values * 100, 'b-', linewidth=2, label='Within 10 pts')
ax2.plot(minutes, minute_metrics_reg['within_15_pct'].values * 100, 'orange', linewidth=2, label='Within 15 pts')
ax2.axhline(y=90, color='r', linestyle='--', alpha=0.5, label='90% target')
ax2.set_xlabel('Minute')
ax2.set_ylabel('Accuracy (%)')
ax2.set_title('Projection Accuracy by Game Minute')
ax2.legend()
ax2.set_ylim(0, 100)
ax2.grid(True, alpha=0.3)

# Plot 3: Adaptive Regime Weight
ax3 = axes[1, 0]
if 'regime_weight' in proj_reg.columns:
    rw_by_min = proj_reg.groupby('minute_index')['regime_weight'].mean()
    ax3.plot(rw_by_min.index.values, rw_by_min.values, 'purple', linewidth=2, label='Adaptive weight')
    ax3.axhline(y=0.6, color='gray', linestyle='--', alpha=0.5, label='Old static weight (0.6)')
    ax3.set_xlabel('Minute')
    ax3.set_ylabel('Regime Weight')
    ax3.set_title('Adaptive Regime Weight by Minute\n(Trust HMM more as game progresses)')
    ax3.legend()
else:
    ax3.text(0.5, 0.5, 'Regime weight data not available', ha='center', va='center', transform=ax3.transAxes)
ax3.grid(True, alpha=0.3)

# Plot 4: Kalman Q Multiplier (shows continuous late-game curve)
ax4 = axes[1, 1]
if 'total_Q_mult' in proj_reg.columns:
    q_by_min = proj_reg.groupby('minute_index')['total_Q_mult'].mean()
    ax4.plot(q_by_min.index.values, q_by_min.values, 'red', linewidth=2, label='Continuous Q mult')
    # Show what old binary would look like
    old_q = [1.0 if m > 34 else 2.0 for m in q_by_min.index.values]
    ax4.plot(q_by_min.index.values, old_q, 'gray', linewidth=1, linestyle='--', alpha=0.5, label='Old binary threshold')
    ax4.set_xlabel('Minute')
    ax4.set_ylabel('Q Multiplier')
    ax4.set_title('Kalman Q Multiplier (Continuous Late-Game Curve)\n(More responsive as time decreases)')
    ax4.legend()
else:
    ax4.text(0.5, 0.5, 'Kalman Q data not available', ha='center', va='center', transform=ax4.transAxes)
ax4.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(output_dir / f"improved_model_analysis_{timestamp}.png", dpi=150, bbox_inches='tight')
print(f"Visualization saved to: improved_model_analysis_{timestamp}.png", flush=True)

# Create second visualization: HMM states and blowout handling
fig2, axes2 = plt.subplots(2, 2, figsize=(14, 10))

# Plot 1: HMM State Distribution
ax1 = axes2[0, 0]
state_counts = proj_reg['hmm_state_label'].value_counts()
colors = {'Slow': 'blue', 'Normal': 'green', 'Fast': 'red', 'Foul/Endgame': 'orange'}
bars = ax1.bar(state_counts.index, state_counts.values, color=[colors.get(s, 'gray') for s in state_counts.index])
ax1.set_xlabel('HMM State')
ax1.set_ylabel('Count')
ax1.set_title('HMM State Distribution')
for bar, count in zip(bars, state_counts.values):
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 50, f'{count}', ha='center', va='bottom')

# Plot 2: State by Minute
ax2 = axes2[0, 1]
state_by_min = proj_reg.groupby(['minute_index', 'hmm_state_label']).size().unstack(fill_value=0)
state_pct = state_by_min.div(state_by_min.sum(axis=1), axis=0) * 100
for state in state_pct.columns:
    ax2.plot(state_pct.index.values, state_pct[state].values, label=state, linewidth=2, color=colors.get(state, 'gray'))
ax2.set_xlabel('Minute')
ax2.set_ylabel('% of Games')
ax2.set_title('HMM State Distribution by Minute')
ax2.legend()
ax2.grid(True, alpha=0.3)

# Plot 3: Blowout Factor Distribution
ax3 = axes2[1, 0]
if 'blowout_factor' in proj_reg.columns:
    blowout_by_min = proj_reg.groupby('minute_index')['blowout_factor'].agg(['mean', 'max'])
    ax3.plot(blowout_by_min.index.values, blowout_by_min['mean'].values, 'b-', linewidth=2, label='Mean blowout factor')
    ax3.fill_between(blowout_by_min.index.values, 0, blowout_by_min['max'].values, alpha=0.2, label='Max')
    ax3.axhline(y=0.4, color='r', linestyle='--', alpha=0.5, label='Garbage time threshold')
    ax3.set_xlabel('Minute')
    ax3.set_ylabel('Blowout Factor')
    ax3.set_title('Blowout Factor by Minute')
    ax3.legend()
else:
    ax3.text(0.5, 0.5, 'Blowout factor data not available', ha='center', va='center', transform=ax3.transAxes)
ax3.grid(True, alpha=0.3)

# Plot 4: Innovation Variance
ax4 = axes2[1, 1]
if 'innovation_variance' in proj_reg.columns:
    iv_by_min = proj_reg.groupby('minute_index')['innovation_variance'].agg(['mean', 'std'])
    ax4.plot(iv_by_min.index.values, iv_by_min['mean'].values, 'purple', linewidth=2)
    ax4.fill_between(iv_by_min.index.values,
                     (iv_by_min['mean'] - iv_by_min['std']).values.clip(0),
                     (iv_by_min['mean'] + iv_by_min['std']).values,
                     alpha=0.3)
    ax4.set_xlabel('Minute')
    ax4.set_ylabel('Innovation Variance')
    ax4.set_title('Online Adaptation: Innovation Variance by Minute')
else:
    ax4.text(0.5, 0.5, 'Innovation variance not available', ha='center', va='center', transform=ax4.transAxes)
ax4.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(output_dir / f"improved_model_states_{timestamp}.png", dpi=150, bbox_inches='tight')
print(f"State analysis saved to: improved_model_states_{timestamp}.png", flush=True)

# Final summary
print("\n" + "=" * 70, flush=True)
print("TEST COMPLETE!", flush=True)
print("=" * 70, flush=True)

if len(minute_metrics) > 0:
    late_metrics = minute_metrics[minute_metrics['minute'] >= 35]
    if len(late_metrics) > 0:
        avg_late_mae = late_metrics['mae'].mean()
        avg_late_within10 = late_metrics['within_10_pct'].mean() * 100
        print(f"\nLATE GAME PERFORMANCE (min 35+):", flush=True)
        print(f"  Average MAE: {avg_late_mae:.2f} points", flush=True)
        print(f"  Average Within-10 Accuracy: {avg_late_within10:.1f}%", flush=True)

print(f"\nOutput files saved to: {output_dir}", flush=True)
plt.show()

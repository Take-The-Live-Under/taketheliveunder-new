#!/usr/bin/env python3
"""
Test script for the V2 HMM/Kalman model.
Target: Within 6 points accuracy at minute 35+
"""

import sys
sys.stdout.reconfigure(line_buffering=True)

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "src"))

print("=" * 70, flush=True)
print("V2 HMM/KALMAN MODEL TEST - TARGET: WITHIN 6 POINTS", flush=True)
print("=" * 70, flush=True)

import config
from src.pj_engine_v2 import PJEngineV2, get_pj_engine_v2

# Find data file
DATA_DIR = Path(__file__).parent / "outputs"
data_files = list(DATA_DIR.glob("season_pbp_*.csv"))
if data_files:
    data_file = sorted(data_files)[-1]
else:
    data_file = DATA_DIR / "model_input.csv"

print(f"\nUsing data file: {data_file}", flush=True)

df_check = pd.read_csv(data_file)
n_games = df_check['game_id'].nunique()
print(f"Games in dataset: {n_games}", flush=True)

print("\n" + "=" * 70, flush=True)
print("V2 IMPROVEMENTS:", flush=True)
print("=" * 70, flush=True)
print("1. Confidence-weighted predictions (HMM probabilities)", flush=True)
print("2. Score-differential aware projections", flush=True)
print("3. Minute-specific bias corrections (learned)", flush=True)
print("4. Ensemble with 4 projection methods", flush=True)
print("5. Special last-5-minute handling", flush=True)
print("=" * 70, flush=True)

# Run V2 model
print("\n[1/5] Initializing V2 Engine...", flush=True)
engine = get_pj_engine_v2(n_states=4)

print("[2/5] Loading and processing data...", flush=True)
engine.load_data(str(data_file))

print("[3/5] Fitting HMM...", flush=True)
engine.fit_hmm()

print("\nHMM State Profiles:", flush=True)
profiles = engine.get_state_profiles_summary()
print(profiles.to_string(), flush=True)

print("\n[4/5] Learning minute biases...", flush=True)
biases = engine.learn_minute_biases(validation_split=0.3)
print(f"Sample biases - Min 30: {biases.get(30, 0):.2f}, Min 35: {biases.get(35, 0):.2f}, Min 38: {biases.get(38, 0):.2f}", flush=True)

print("\n[5/5] Generating V2 projections...", flush=True)
projections = engine.generate_projections()

print(f"\nGenerated {len(projections)} projections for {projections['game_id'].nunique()} games", flush=True)

# Save projections
output_dir = Path(__file__).parent / "outputs"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
projections.to_csv(output_dir / f"v2_projections_{timestamp}.csv", index=False)

# Calculate accuracy
print("\n" + "=" * 70, flush=True)
print("CALCULATING V2 ACCURACY METRICS", flush=True)
print("=" * 70, flush=True)

# Get actual totals
game_totals = projections.groupby('game_id')['points_so_far'].max().reset_index()
game_totals.columns = ['game_id', 'actual_total']

proj_with_actual = projections.merge(game_totals, on='game_id')
proj_with_actual['projection_error'] = proj_with_actual['projected_total'] - proj_with_actual['actual_total']
proj_with_actual['abs_error'] = proj_with_actual['projection_error'].abs()

# Filter to regulation time
proj_reg = proj_with_actual[proj_with_actual['minute_index'] <= 40]

# Calculate metrics by minute
for threshold in [5, 6, 8, 10]:
    proj_reg[f'within_{threshold}'] = (proj_reg['abs_error'] <= threshold).astype(int)

minute_metrics = proj_reg.groupby('minute_index').agg({
    'abs_error': ['mean', 'std', 'median'],
    'within_5': 'mean',
    'within_6': 'mean',
    'within_8': 'mean',
    'within_10': 'mean',
    'game_id': 'count'
}).reset_index()
minute_metrics.columns = ['minute', 'mae', 'std', 'median', 'within_5', 'within_6', 'within_8', 'within_10', 'n_games']

print("\nMetrics by Minute (minutes 28-40):", flush=True)
print(minute_metrics[minute_metrics['minute'] >= 28][['minute', 'mae', 'median', 'within_5', 'within_6', 'within_8', 'within_10']].to_string(index=False, float_format=lambda x: f'{x:.3f}'), flush=True)

# Key summary
print("\n" + "=" * 70, flush=True)
print("KEY PERFORMANCE (TARGET: WITHIN 6 POINTS)", flush=True)
print("=" * 70, flush=True)

for target_min in [30, 33, 35, 37, 38, 39]:
    if target_min in minute_metrics['minute'].values:
        row = minute_metrics[minute_metrics['minute'] == target_min].iloc[0]
        w6_pct = row['within_6'] * 100
        status = "TARGET MET" if w6_pct >= 85 else "IMPROVING" if w6_pct >= 70 else "NEEDS WORK"
        print(f"Minute {target_min}: MAE={row['mae']:.2f}, Within 6={w6_pct:.1f}%, Within 10={row['within_10']*100:.1f}% [{status}]", flush=True)

# Analyze by game type
print("\n" + "=" * 70, flush=True)
print("ACCURACY BY GAME TYPE (Minute 35+)", flush=True)
print("=" * 70, flush=True)

late_game = proj_reg[proj_reg['minute_index'] >= 35]

# Close games (score diff < 10)
close_games = late_game[late_game['score_diff_abs'] < 10]
blowouts = late_game[late_game['is_blowout'] == 1]

if len(close_games) > 0:
    close_mae = close_games['abs_error'].mean()
    close_w6 = (close_games['abs_error'] <= 6).mean() * 100
    print(f"Close games (diff < 10): MAE={close_mae:.2f}, Within 6={close_w6:.1f}% (n={len(close_games)})", flush=True)

if len(blowouts) > 0:
    blowout_mae = blowouts['abs_error'].mean()
    blowout_w6 = (blowouts['abs_error'] <= 6).mean() * 100
    print(f"Blowouts:               MAE={blowout_mae:.2f}, Within 6={blowout_w6:.1f}% (n={len(blowouts)})", flush=True)

# HMM confidence analysis
print("\n" + "=" * 70, flush=True)
print("ACCURACY BY HMM CONFIDENCE (Minute 35+)", flush=True)
print("=" * 70, flush=True)

if 'hmm_confidence' in late_game.columns:
    high_conf = late_game[late_game['hmm_confidence'] >= 0.7]
    low_conf = late_game[late_game['hmm_confidence'] < 0.7]

    if len(high_conf) > 0:
        hc_mae = high_conf['abs_error'].mean()
        hc_w6 = (high_conf['abs_error'] <= 6).mean() * 100
        print(f"High confidence (>=70%): MAE={hc_mae:.2f}, Within 6={hc_w6:.1f}% (n={len(high_conf)})", flush=True)

    if len(low_conf) > 0:
        lc_mae = low_conf['abs_error'].mean()
        lc_w6 = (low_conf['abs_error'] <= 6).mean() * 100
        print(f"Low confidence (<70%):   MAE={lc_mae:.2f}, Within 6={lc_w6:.1f}% (n={len(low_conf)})", flush=True)

# Generate visualizations
print("\n" + "=" * 70, flush=True)
print("GENERATING V2 VISUALIZATIONS...", flush=True)
print("=" * 70, flush=True)

try:
    plt.style.use('seaborn-darkgrid')
except:
    try:
        plt.style.use('ggplot')
    except:
        pass

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

minute_metrics_reg = minute_metrics[minute_metrics['minute'] <= 40]

# Plot 1: MAE comparison
ax1 = axes[0, 0]
minutes = minute_metrics_reg['minute'].values
mae = minute_metrics_reg['mae'].values
ax1.plot(minutes, mae, 'b-', linewidth=2, label='V2 MAE')
ax1.axhline(y=6, color='g', linestyle='--', alpha=0.7, label='6-point target')
ax1.axhline(y=10, color='r', linestyle='--', alpha=0.5, label='10-point threshold')
ax1.fill_between(minutes, 0, 6, alpha=0.1, color='green')
ax1.set_xlabel('Minute')
ax1.set_ylabel('Mean Absolute Error (points)')
ax1.set_title('V2 Model: Projection MAE by Minute')
ax1.legend()
ax1.grid(True, alpha=0.3)
ax1.set_xlim(0, 40)
ax1.set_ylim(0, max(mae) * 1.1)

# Plot 2: Within-6 accuracy
ax2 = axes[0, 1]
ax2.plot(minutes, minute_metrics_reg['within_5'].values * 100, 'g-', linewidth=2, label='Within 5 pts')
ax2.plot(minutes, minute_metrics_reg['within_6'].values * 100, 'purple', linewidth=3, label='Within 6 pts (TARGET)')
ax2.plot(minutes, minute_metrics_reg['within_8'].values * 100, 'orange', linewidth=2, label='Within 8 pts')
ax2.plot(minutes, minute_metrics_reg['within_10'].values * 100, 'b-', linewidth=2, label='Within 10 pts')
ax2.axhline(y=85, color='r', linestyle='--', alpha=0.5, label='85% target')
ax2.set_xlabel('Minute')
ax2.set_ylabel('Accuracy (%)')
ax2.set_title('V2 Model: Projection Accuracy by Minute')
ax2.legend(loc='lower right')
ax2.set_ylim(0, 100)
ax2.set_xlim(0, 40)
ax2.grid(True, alpha=0.3)

# Plot 3: Error distribution at minute 35
ax3 = axes[1, 0]
min35_data = proj_reg[proj_reg['minute_index'] == 35]['abs_error']
if len(min35_data) > 0:
    ax3.hist(min35_data.values, bins=30, edgecolor='black', alpha=0.7)
    ax3.axvline(x=6, color='g', linestyle='--', linewidth=2, label='6-point threshold')
    ax3.axvline(x=min35_data.mean(), color='r', linestyle='-', linewidth=2, label=f'Mean: {min35_data.mean():.1f}')
    within_6_pct = (min35_data <= 6).mean() * 100
    ax3.set_title(f'Error Distribution at Minute 35\n({within_6_pct:.1f}% within 6 pts)')
    ax3.set_xlabel('Absolute Error (points)')
    ax3.set_ylabel('Count')
    ax3.legend()
ax3.grid(True, alpha=0.3)

# Plot 4: Error distribution at minute 38
ax4 = axes[1, 1]
min38_data = proj_reg[proj_reg['minute_index'] == 38]['abs_error']
if len(min38_data) > 0:
    ax4.hist(min38_data.values, bins=30, edgecolor='black', alpha=0.7, color='green')
    ax4.axvline(x=6, color='purple', linestyle='--', linewidth=2, label='6-point threshold')
    ax4.axvline(x=min38_data.mean(), color='r', linestyle='-', linewidth=2, label=f'Mean: {min38_data.mean():.1f}')
    within_6_pct = (min38_data <= 6).mean() * 100
    ax4.set_title(f'Error Distribution at Minute 38\n({within_6_pct:.1f}% within 6 pts)')
    ax4.set_xlabel('Absolute Error (points)')
    ax4.set_ylabel('Count')
    ax4.legend()
ax4.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(output_dir / f"v2_model_analysis_{timestamp}.png", dpi=150, bbox_inches='tight')
print(f"Visualization saved to: v2_model_analysis_{timestamp}.png", flush=True)

# Final summary
print("\n" + "=" * 70, flush=True)
print("V2 TEST COMPLETE - SUMMARY", flush=True)
print("=" * 70, flush=True)

late_metrics = minute_metrics[minute_metrics['minute'] >= 35]
if len(late_metrics) > 0:
    avg_late_mae = late_metrics['mae'].mean()
    avg_late_w6 = late_metrics['within_6'].mean() * 100
    avg_late_w10 = late_metrics['within_10'].mean() * 100

    print(f"\nLATE GAME PERFORMANCE (Minute 35+):", flush=True)
    print(f"  Average MAE: {avg_late_mae:.2f} points", flush=True)
    print(f"  Average Within-6 Accuracy: {avg_late_w6:.1f}%", flush=True)
    print(f"  Average Within-10 Accuracy: {avg_late_w10:.1f}%", flush=True)

    if avg_late_w6 >= 85:
        print(f"\n  STATUS: TARGET MET!", flush=True)
    elif avg_late_w6 >= 70:
        print(f"\n  STATUS: CLOSE TO TARGET - {85 - avg_late_w6:.1f}% improvement needed", flush=True)
    else:
        print(f"\n  STATUS: NEEDS MORE IMPROVEMENT", flush=True)

print(f"\nOutput saved to: {output_dir}", flush=True)
plt.show()

#!/usr/bin/env python3
"""
Full Model Analysis & Visualization
Combines Ultimate Pregame Model + HMM/Kalman In-Game Model
Saves all visualizations to files
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Paths
BASE_DIR = Path(__file__).parent.parent
OUTPUT_DIR = BASE_DIR / "models" / "analysis_outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 70)
print("FULL MODEL ANALYSIS & VISUALIZATION")
print("=" * 70)
print(f"Output directory: {OUTPUT_DIR}")

# =============================================================================
# LOAD DATA
# =============================================================================
print("\n[1/5] Loading data...")

# Ultimate Pregame Model predictions
pregame_preds = pd.read_csv(BASE_DIR / "models" / "ultimate_model_outputs" / "predictions.csv")
print(f"  Pregame predictions: {len(pregame_preds):,} games")

# HMM/Kalman projections
hmm_proj = pd.read_csv(BASE_DIR / "pj_hmm_kalman_model" / "outputs" / "season_game_summaries_20260130_064348.csv")
print(f"  HMM projections: {len(hmm_proj):,} minute entries")

# Get final totals from HMM data
hmm_finals = hmm_proj.groupby('game_id').agg({
    'score_home_cumulative': 'max',
    'score_away_cumulative': 'max',
    'home_team': 'first',
    'away_team': 'first',
}).reset_index()
hmm_finals['actual_total'] = hmm_finals['score_home_cumulative'] + hmm_finals['score_away_cumulative']
print(f"  HMM games: {len(hmm_finals):,}")

# =============================================================================
# PREGAME MODEL ANALYSIS
# =============================================================================
print("\n[2/5] Analyzing Pregame Model...")

pregame_errors = pregame_preds['predicted_total'] - pregame_preds['actual_total']
pregame_abs_errors = np.abs(pregame_errors)

pregame_stats = {
    'MAE': pregame_abs_errors.mean(),
    'RMSE': np.sqrt((pregame_errors**2).mean()),
    'Within_5': (pregame_abs_errors <= 5).mean() * 100,
    'Within_10': (pregame_abs_errors <= 10).mean() * 100,
    'Within_15': (pregame_abs_errors <= 15).mean() * 100,
    'Coverage_90': pregame_preds['in_interval'].mean() * 100,
}

print(f"  MAE: {pregame_stats['MAE']:.2f} pts")
print(f"  Within 10 pts: {pregame_stats['Within_10']:.1f}%")
print(f"  90% CI Coverage: {pregame_stats['Coverage_90']:.1f}%")

# =============================================================================
# HMM/KALMAN MODEL ANALYSIS
# =============================================================================
print("\n[3/5] Analyzing HMM/Kalman Model...")

league_avg = hmm_finals['actual_total'].mean()
print(f"  League average total: {league_avg:.1f}")

hmm_by_minute = []
for minute in range(5, 40):
    minute_proj = hmm_proj[hmm_proj['minute_index'] == minute][['game_id', 'projected_total']].copy()
    minute_proj = minute_proj.merge(hmm_finals[['game_id', 'actual_total']], on='game_id')

    if len(minute_proj) > 0:
        error = minute_proj['projected_total'] - minute_proj['actual_total']
        mae = np.abs(error).mean()

        # O/U accuracy vs league average
        pred_over = minute_proj['projected_total'] > league_avg
        actual_over = minute_proj['actual_total'] > league_avg
        accuracy = (pred_over == actual_over).mean() * 100

        hmm_by_minute.append({
            'minute': minute,
            'minutes_remaining': 40 - minute,
            'mae': mae,
            'accuracy': accuracy,
            'n_games': len(minute_proj)
        })

hmm_df = pd.DataFrame(hmm_by_minute)
print(f"  Minutes analyzed: {len(hmm_df)}")

# =============================================================================
# CREATE VISUALIZATIONS
# =============================================================================
print("\n[4/5] Creating visualizations...")

# Set style
try:
    plt.style.use('seaborn-darkgrid')
except:
    plt.style.use('ggplot')
fig_count = 0

# -----------------------------------------------------------------------------
# Figure 1: Pregame Model - Error Distribution
# -----------------------------------------------------------------------------
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('Ultimate Pregame Model - Performance Analysis', fontsize=16, fontweight='bold')

# 1a: Error histogram
ax = axes[0, 0]
ax.hist(pregame_errors, bins=50, color='steelblue', edgecolor='white', alpha=0.7)
ax.axvline(0, color='red', linestyle='--', linewidth=2, label='Perfect')
ax.axvline(pregame_errors.mean(), color='orange', linestyle='-', linewidth=2, label=f'Mean: {pregame_errors.mean():+.1f}')
ax.set_xlabel('Prediction Error (pts)', fontsize=11)
ax.set_ylabel('Frequency', fontsize=11)
ax.set_title('Error Distribution', fontsize=12, fontweight='bold')
ax.legend()

# 1b: Predicted vs Actual
ax = axes[0, 1]
ax.scatter(pregame_preds['actual_total'], pregame_preds['predicted_total'], alpha=0.3, s=10)
ax.plot([100, 220], [100, 220], 'r--', linewidth=2, label='Perfect')
ax.set_xlabel('Actual Total', fontsize=11)
ax.set_ylabel('Predicted Total', fontsize=11)
ax.set_title('Predicted vs Actual', fontsize=12, fontweight='bold')
ax.legend()

# 1c: Accuracy by threshold
ax = axes[1, 0]
thresholds = [5, 8, 10, 12, 15, 20, 25]
accuracies = [(pregame_abs_errors <= t).mean() * 100 for t in thresholds]
bars = ax.bar(thresholds, accuracies, color='teal', edgecolor='white')
ax.set_xlabel('Error Threshold (pts)', fontsize=11)
ax.set_ylabel('% of Games Within Threshold', fontsize=11)
ax.set_title('Accuracy by Error Threshold', fontsize=12, fontweight='bold')
for bar, acc in zip(bars, accuracies):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1, f'{acc:.0f}%',
            ha='center', fontsize=9)

# 1d: 90% Confidence Interval
ax = axes[1, 1]
sample = pregame_preds.head(50)
x = np.arange(len(sample))
ax.fill_between(x, sample['lower_90'].values, sample['upper_90'].values, alpha=0.3, color='blue', label='90% CI')
ax.plot(x, sample['predicted_total'].values, 'b-', linewidth=1.5, label='Prediction')
ax.scatter(x, sample['actual_total'].values, color='red', s=20, zorder=5, label='Actual')
ax.set_xlabel('Game Index', fontsize=11)
ax.set_ylabel('Total Points', fontsize=11)
ax.set_title('90% Confidence Intervals (Sample)', fontsize=12, fontweight='bold')
ax.legend()

plt.tight_layout()
plt.savefig(OUTPUT_DIR / 'pregame_model_analysis.png', dpi=150, bbox_inches='tight')
plt.close()
fig_count += 1
print(f"  Saved: pregame_model_analysis.png")

# -----------------------------------------------------------------------------
# Figure 2: HMM/Kalman Model - In-Game Performance
# -----------------------------------------------------------------------------
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('HMM/Kalman In-Game Model - Performance by Game Minute', fontsize=16, fontweight='bold')

# 2a: MAE by minute
ax = axes[0, 0]
ax.plot(hmm_df['minute'].values, hmm_df['mae'].values, 'b-', linewidth=2, marker='o', markersize=4)
ax.fill_between(hmm_df['minute'].values, 0, hmm_df['mae'].values, alpha=0.2)
ax.set_xlabel('Game Minute', fontsize=11)
ax.set_ylabel('Mean Absolute Error (pts)', fontsize=11)
ax.set_title('Projection Error Over Game', fontsize=12, fontweight='bold')
ax.axhline(10, color='green', linestyle='--', alpha=0.7, label='10 pt threshold')
ax.legend()

# 2b: O/U Accuracy by minute
ax = axes[0, 1]
ax.plot(hmm_df['minute'].values, hmm_df['accuracy'].values, 'g-', linewidth=2, marker='o', markersize=4)
ax.fill_between(hmm_df['minute'].values, 50, hmm_df['accuracy'].values, alpha=0.2, color='green')
ax.set_xlabel('Game Minute', fontsize=11)
ax.set_ylabel('O/U Accuracy (%)', fontsize=11)
ax.set_title('Over/Under Prediction Accuracy', fontsize=12, fontweight='bold')
ax.axhline(52.4, color='red', linestyle='--', alpha=0.7, label='Break-even (52.4%)')
ax.axhline(55, color='orange', linestyle='--', alpha=0.7, label='Target (55%)')
ax.set_ylim(50, 100)
ax.legend()

# 2c: Estimated ROI by minute
ax = axes[1, 0]
hmm_df['roi'] = (hmm_df['accuracy']/100 * 1.91 - 1) * 100  # ROI at -110 odds
ax.bar(hmm_df['minute'].values, hmm_df['roi'].values, color=np.where(hmm_df['roi'].values > 0, 'green', 'red'), alpha=0.7)
ax.axhline(0, color='black', linewidth=1)
ax.set_xlabel('Game Minute', fontsize=11)
ax.set_ylabel('Estimated ROI (%)', fontsize=11)
ax.set_title('Estimated ROI by Entry Point', fontsize=12, fontweight='bold')

# 2d: Betting window recommendation
ax = axes[1, 1]
good_minutes = hmm_df[hmm_df['accuracy'] >= 75]['minute'].tolist()
colors = ['green' if m in good_minutes else 'lightgray' for m in hmm_df['minute'].values]
bars = ax.bar(hmm_df['minute'].values, hmm_df['accuracy'].values, color=colors, edgecolor='white')
ax.axhline(75, color='orange', linestyle='--', linewidth=2, label='75% threshold')
ax.set_xlabel('Game Minute', fontsize=11)
ax.set_ylabel('Accuracy (%)', fontsize=11)
ax.set_title('Recommended Betting Windows (Green = 75%+ Accuracy)', fontsize=12, fontweight='bold')
ax.legend()

plt.tight_layout()
plt.savefig(OUTPUT_DIR / 'hmm_kalman_analysis.png', dpi=150, bbox_inches='tight')
plt.close()
fig_count += 1
print(f"  Saved: hmm_kalman_analysis.png")

# -----------------------------------------------------------------------------
# Figure 3: Combined Model Strategy
# -----------------------------------------------------------------------------
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('Combined Model Strategy - Pregame + In-Game', fontsize=16, fontweight='bold')

# 3a: Model comparison
ax = axes[0, 0]
models = ['Pregame\n(before game)', 'HMM Min 20\n(20 min left)', 'HMM Min 30\n(10 min left)', 'HMM Min 35\n(5 min left)']
maes = [pregame_stats['MAE'],
        hmm_df[hmm_df['minute']==20]['mae'].values[0],
        hmm_df[hmm_df['minute']==30]['mae'].values[0],
        hmm_df[hmm_df['minute']==35]['mae'].values[0]]
bars = ax.bar(models, maes, color=['steelblue', 'teal', 'seagreen', 'green'])
ax.set_ylabel('Mean Absolute Error (pts)', fontsize=11)
ax.set_title('Prediction Accuracy: Pregame vs In-Game', fontsize=12, fontweight='bold')
for bar, mae in zip(bars, maes):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5, f'{mae:.1f}',
            ha='center', fontsize=11, fontweight='bold')

# 3b: Confidence evolution
ax = axes[0, 1]
minutes = np.array(hmm_df['minute'].values)
accuracy = np.array(hmm_df['accuracy'].values)
ax.fill_between(minutes, 50, accuracy, alpha=0.3, color='blue')
ax.plot(minutes, accuracy, 'b-', linewidth=2)
ax.axhline(pregame_stats['Within_10']/2 + 50, color='red', linestyle='--', linewidth=2,
           label=f'Pregame baseline ({pregame_stats["Within_10"]/2 + 50:.0f}%)')
ax.set_xlabel('Game Minute', fontsize=11)
ax.set_ylabel('O/U Accuracy (%)', fontsize=11)
ax.set_title('Confidence Growth During Game', fontsize=12, fontweight='bold')
ax.legend()

# 3c: Betting strategy timeline
ax = axes[1, 0]
ax.axhspan(0, 10, alpha=0.2, color='blue', label='Pregame Window')
ax.axhspan(20, 30, alpha=0.2, color='orange', label='Early In-Game (Risky)')
ax.axhspan(30, 40, alpha=0.3, color='green', label='Late In-Game (Optimal)')
ax.set_xlim(0, 1)
ax.set_ylim(0, 40)
ax.set_ylabel('Game Minute', fontsize=11)
ax.set_title('Recommended Betting Windows', fontsize=12, fontweight='bold')
ax.legend(loc='center right')
ax.set_xticks([])

# Strategy text annotations
ax.text(0.5, 5, 'Use Pregame Model\n90% CI to find value', ha='center', va='center', fontsize=10, fontweight='bold')
ax.text(0.5, 25, 'Monitor HMM projections\nWait for convergence', ha='center', va='center', fontsize=10)
ax.text(0.5, 35, 'High confidence bets\n80%+ accuracy zone', ha='center', va='center', fontsize=10, fontweight='bold', color='darkgreen')

# 3d: Summary stats table
ax = axes[1, 1]
ax.axis('off')
summary_text = f"""
╔══════════════════════════════════════════════════════════════╗
║                    MODEL PERFORMANCE SUMMARY                  ║
╠══════════════════════════════════════════════════════════════╣
║  PREGAME MODEL (Ultimate Ensemble)                           ║
║  ├─ MAE: {pregame_stats['MAE']:.1f} points                                       ║
║  ├─ Within 10 pts: {pregame_stats['Within_10']:.1f}%                               ║
║  └─ 90% CI Coverage: {pregame_stats['Coverage_90']:.1f}%                            ║
║                                                              ║
║  IN-GAME MODEL (HMM + Kalman)                                ║
║  ├─ Minute 25: MAE={hmm_df[hmm_df['minute']==25]['mae'].values[0]:.1f}, Accuracy={hmm_df[hmm_df['minute']==25]['accuracy'].values[0]:.1f}%       ║
║  ├─ Minute 30: MAE={hmm_df[hmm_df['minute']==30]['mae'].values[0]:.1f}, Accuracy={hmm_df[hmm_df['minute']==30]['accuracy'].values[0]:.1f}%       ║
║  └─ Minute 35: MAE={hmm_df[hmm_df['minute']==35]['mae'].values[0]:.1f}, Accuracy={hmm_df[hmm_df['minute']==35]['accuracy'].values[0]:.1f}%        ║
║                                                              ║
║  RECOMMENDED STRATEGY                                        ║
║  ├─ Pregame: Bet when Vegas line outside 90% CI              ║
║  └─ In-Game: Bet at minute 30+ when edge > 5%                ║
╚══════════════════════════════════════════════════════════════╝
"""
ax.text(0.5, 0.5, summary_text, transform=ax.transAxes, fontsize=10,
        verticalalignment='center', horizontalalignment='center',
        fontfamily='monospace', bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.8))

plt.tight_layout()
plt.savefig(OUTPUT_DIR / 'combined_strategy.png', dpi=150, bbox_inches='tight')
plt.close()
fig_count += 1
print(f"  Saved: combined_strategy.png")

# -----------------------------------------------------------------------------
# Figure 4: Detailed HMM State Analysis
# -----------------------------------------------------------------------------
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('HMM Regime Detection Analysis', fontsize=16, fontweight='bold')

# Get state distribution
if 'hmm_state_label' in hmm_proj.columns:
    state_counts = hmm_proj['hmm_state_label'].value_counts()

    # 4a: State distribution pie chart
    ax = axes[0, 0]
    colors = {'Slow': 'blue', 'Normal': 'gray', 'Fast': 'red', 'Foul/Endgame': 'orange'}
    ax.pie(state_counts.values, labels=state_counts.index, autopct='%1.1f%%',
           colors=[colors.get(s, 'gray') for s in state_counts.index])
    ax.set_title('Game State Distribution', fontsize=12, fontweight='bold')

    # 4b: PPM by state
    ax = axes[0, 1]
    ppm_by_state = hmm_proj.groupby('hmm_state_label')['ppm'].mean().sort_values()
    bars = ax.barh(ppm_by_state.index, ppm_by_state.values,
                   color=[colors.get(s, 'gray') for s in ppm_by_state.index])
    ax.set_xlabel('Average Points Per Minute', fontsize=11)
    ax.set_title('Scoring Rate by Game State', fontsize=12, fontweight='bold')

    # 4c: State transitions over game
    ax = axes[1, 0]
    state_by_min = hmm_proj.groupby(['minute_index', 'hmm_state_label']).size().unstack(fill_value=0)
    state_by_min_pct = state_by_min.div(state_by_min.sum(axis=1), axis=0) * 100
    state_by_min_pct.plot(kind='area', stacked=True, ax=ax, alpha=0.7,
                          color=[colors.get(c, 'gray') for c in state_by_min_pct.columns])
    ax.set_xlabel('Game Minute', fontsize=11)
    ax.set_ylabel('% of Games', fontsize=11)
    ax.set_title('State Distribution Over Game', fontsize=12, fontweight='bold')
    ax.legend(title='State', loc='upper right')
else:
    for ax in axes.flat[:3]:
        ax.text(0.5, 0.5, 'HMM State data not available', ha='center', va='center')
        ax.axis('off')

# 4d: Kalman filter performance
ax = axes[1, 1]
if 'kalman_covariance' in hmm_proj.columns:
    cov_by_min = hmm_proj.groupby('minute_index')['kalman_covariance'].mean()
    ax.plot(np.array(cov_by_min.index), np.array(cov_by_min.values), 'purple', linewidth=2)
    ax.fill_between(np.array(cov_by_min.index), 0, np.array(cov_by_min.values), alpha=0.2, color='purple')
    ax.set_xlabel('Game Minute', fontsize=11)
    ax.set_ylabel('Kalman Covariance (Uncertainty)', fontsize=11)
    ax.set_title('Prediction Uncertainty Over Game', fontsize=12, fontweight='bold')
else:
    ax.text(0.5, 0.5, 'Kalman data not available', ha='center', va='center')
    ax.axis('off')

plt.tight_layout()
plt.savefig(OUTPUT_DIR / 'hmm_state_analysis.png', dpi=150, bbox_inches='tight')
plt.close()
fig_count += 1
print(f"  Saved: hmm_state_analysis.png")

# =============================================================================
# PRINT FINAL RESULTS
# =============================================================================
print("\n[5/5] Final Results")
print("=" * 70)

print("\n┌─────────────────────────────────────────────────────────────────────┐")
print("│                    PREGAME MODEL RESULTS                            │")
print("├─────────────────────────────────────────────────────────────────────┤")
print(f"│  Games Analyzed:     {len(pregame_preds):,}                                        │")
print(f"│  Mean Absolute Error: {pregame_stats['MAE']:.2f} points                              │")
print(f"│  RMSE:                {pregame_stats['RMSE']:.2f} points                              │")
print(f"│  Within 5 points:     {pregame_stats['Within_5']:.1f}%                                   │")
print(f"│  Within 10 points:    {pregame_stats['Within_10']:.1f}%                                   │")
print(f"│  Within 15 points:    {pregame_stats['Within_15']:.1f}%                                   │")
print(f"│  90% CI Coverage:     {pregame_stats['Coverage_90']:.1f}%                                   │")
print("└─────────────────────────────────────────────────────────────────────┘")

print("\n┌─────────────────────────────────────────────────────────────────────┐")
print("│                    IN-GAME MODEL RESULTS                            │")
print("├─────────────────────────────────────────────────────────────────────┤")
print(f"│  Games Analyzed:     {len(hmm_finals):,}                                        │")
print("│                                                                     │")
print("│  Performance by Game Minute:                                        │")
print("│  ┌────────────┬───────────┬──────────────┬─────────────┐            │")
print("│  │   Minute   │    MAE    │   Accuracy   │  Est. ROI   │            │")
print("│  ├────────────┼───────────┼──────────────┼─────────────┤            │")
for _, row in hmm_df[hmm_df['minute'].isin([10, 20, 25, 30, 35, 38])].iterrows():
    roi = (row['accuracy']/100 * 1.91 - 1) * 100
    print(f"│  │     {row['minute']:2.0f}     │   {row['mae']:5.1f}   │    {row['accuracy']:5.1f}%    │   {roi:+5.1f}%    │            │")
print("│  └────────────┴───────────┴──────────────┴─────────────┘            │")
print("└─────────────────────────────────────────────────────────────────────┘")

print("\n┌─────────────────────────────────────────────────────────────────────┐")
print("│                    RECOMMENDED STRATEGY                             │")
print("├─────────────────────────────────────────────────────────────────────┤")
print("│  PREGAME:                                                           │")
print("│    • Use Ultimate Model to get expected total ± confidence interval │")
print("│    • If Vegas line outside 90% CI → strong signal                   │")
print("│                                                                     │")
print("│  IN-GAME (Live Betting):                                            │")
print("│    • Monitor HMM/Kalman projections starting at minute 20           │")
print("│    • Best window: Minutes 30-38 (80%+ accuracy)                     │")
print("│    • Bet when projection differs from line by >5%                   │")
print("│                                                                     │")
print("│  COMBINED:                                                          │")
print("│    • Pregame sets baseline expectation                              │")
print("│    • In-game model adjusts for actual game flow                     │")
print("│    • Highest confidence when both models agree                      │")
print("└─────────────────────────────────────────────────────────────────────┘")

print(f"\n✓ Saved {fig_count} visualizations to: {OUTPUT_DIR}")
print("=" * 70)

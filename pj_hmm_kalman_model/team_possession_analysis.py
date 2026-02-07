#!/usr/bin/env python3
"""
Deep Dive: Team Possession Analysis
Analyze possession patterns by team to improve predictions
"""

import sys
sys.stdout.reconfigure(line_buffering=True)

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime

print("=" * 70, flush=True)
print("DEEP DIVE: TEAM POSSESSION ANALYSIS", flush=True)
print("=" * 70, flush=True)

# Load data
DATA_DIR = Path(__file__).parent / "outputs"
data_files = list(DATA_DIR.glob("season_pbp_*.csv"))
if data_files:
    data_file = sorted(data_files)[-1]
else:
    data_file = DATA_DIR / "model_input.csv"

print(f"\nLoading: {data_file}", flush=True)
df = pd.read_csv(data_file)

# Check for team columns
print(f"\nColumns: {list(df.columns)}", flush=True)

# Calculate per-minute metrics
df = df.sort_values(['game_id', 'minute_index'])
df['ppm'] = df['points_home'] + df['points_away']
df['posm'] = df['poss_home'] + df['poss_away']

# Cumulative metrics
df['points_home_cum'] = df.groupby('game_id')['points_home'].cumsum()
df['points_away_cum'] = df.groupby('game_id')['points_away'].cumsum()
df['poss_home_cum'] = df.groupby('game_id')['poss_home'].cumsum()
df['poss_away_cum'] = df.groupby('game_id')['poss_away'].cumsum()
df['points_so_far'] = df['points_home_cum'] + df['points_away_cum']
df['poss_so_far'] = df['poss_home_cum'] + df['poss_away_cum']

# Points per possession (efficiency)
df['ppp_home'] = df['points_home'] / df['poss_home'].clip(lower=0.1)
df['ppp_away'] = df['points_away'] / df['poss_away'].clip(lower=0.1)
df['ppp_total'] = df['ppm'] / df['posm'].clip(lower=0.1)

# Calculate minutes remaining
df['minutes_remaining'] = 40 - df['minute_index']

# Get game totals
game_totals = df.groupby('game_id').agg({
    'points_so_far': 'max',
    'poss_so_far': 'max'
}).reset_index()
game_totals.columns = ['game_id', 'final_total', 'final_poss']
df = df.merge(game_totals, on='game_id')

n_games = df['game_id'].nunique()
print(f"Games analyzed: {n_games}", flush=True)

# =====================================================================
# POSSESSION-BASED ANALYSIS
# =====================================================================

print("\n" + "=" * 70, flush=True)
print("POSSESSION PATTERNS BY GAME MINUTE", flush=True)
print("=" * 70, flush=True)

poss_by_min = df.groupby('minute_index')['posm'].agg(['mean', 'std', 'median'])
print(poss_by_min[poss_by_min.index <= 40].to_string(), flush=True)

print("\n" + "=" * 70, flush=True)
print("POSSESSION TOTALS BY GAME TYPE", flush=True)
print("=" * 70, flush=True)

# Categorize games by pace (total possessions)
game_pace = df.groupby('game_id')['posm'].sum().reset_index()
game_pace.columns = ['game_id', 'total_poss']
game_pace['pace_category'] = pd.cut(
    game_pace['total_poss'],
    bins=[0, 60, 70, 80, 200],
    labels=['Very Slow (<60)', 'Slow (60-70)', 'Normal (70-80)', 'Fast (80+)']
)

pace_dist = game_pace['pace_category'].value_counts().sort_index()
for cat, cnt in pace_dist.items():
    print(f"  {cat}: {cnt} games ({cnt/len(game_pace)*100:.1f}%)", flush=True)

# Merge pace category
df = df.merge(game_pace[['game_id', 'total_poss', 'pace_category']], on='game_id')

print("\n" + "=" * 70, flush=True)
print("HOME VS AWAY POSSESSION ANALYSIS", flush=True)
print("=" * 70, flush=True)

home_poss = df.groupby('minute_index')['poss_home'].mean()
away_poss = df.groupby('minute_index')['poss_away'].mean()
print("\nHome Poss Mean: {:.2f}".format(df['poss_home'].mean()), flush=True)
print("Away Poss Mean: {:.2f}".format(df['poss_away'].mean()), flush=True)
print(f"Home Advantage in Possessions: {(df['poss_home'].mean() - df['poss_away'].mean()):.3f}", flush=True)

print("\n" + "=" * 70, flush=True)
print("EFFICIENCY (PPP) ANALYSIS", flush=True)
print("=" * 70, flush=True)

ppp_by_min = df.groupby('minute_index')['ppp_total'].agg(['mean', 'std', 'median'])
print(ppp_by_min[ppp_by_min.index <= 40].to_string(float_format=lambda x: f'{x:.3f}'), flush=True)

print("\n" + "=" * 70, flush=True)
print("PACE-ADJUSTED SCORING", flush=True)
print("=" * 70, flush=True)

# How does final total correlate with pace?
final_stats = df.groupby('game_id').agg({
    'final_total': 'first',
    'total_poss': 'first',
    'pace_category': 'first'
}).reset_index()

# Points per pace category
print("\nFinal Total by Pace Category:", flush=True)
pts_by_pace = final_stats.groupby('pace_category')['final_total'].agg(['mean', 'std', 'count'])
print(pts_by_pace.to_string(), flush=True)

# Correlation between possessions and total
corr = final_stats['total_poss'].corr(final_stats['final_total'])
print(f"\nCorrelation (Possessions vs Total): {corr:.3f}", flush=True)

print("\n" + "=" * 70, flush=True)
print("POSSESSION-BASED PROJECTION ACCURACY", flush=True)
print("=" * 70, flush=True)

# Create pace-adjusted projection at each minute
df['historical_ppm'] = df['points_so_far'] / df['minute_index'].clip(lower=1)
df['historical_pace'] = df['poss_so_far'] / df['minute_index'].clip(lower=1)

# Projection 1: Simple PPM extrapolation
df['proj_simple'] = df['points_so_far'] + df['historical_ppm'] * df['minutes_remaining']

# Projection 2: PPP * expected remaining possessions
# Expected possessions = historical_pace * minutes_remaining
df['expected_remaining_poss'] = df['historical_pace'] * df['minutes_remaining']
df['proj_poss_based'] = df['points_so_far'] + (df['ppp_total'] * df['expected_remaining_poss'])

# Projection 3: Hybrid (average of both)
df['proj_hybrid'] = (df['proj_simple'] + df['proj_poss_based']) / 2

# Calculate errors
df['error_simple'] = df['proj_simple'] - df['final_total']
df['error_poss'] = df['proj_poss_based'] - df['final_total']
df['error_hybrid'] = df['proj_hybrid'] - df['final_total']

# Filter to regulation time
df_reg = df[df['minute_index'] <= 40]

# Compare MAE at key minutes
print("\nProjection MAE Comparison:", flush=True)
print(f"{'Minute':<8} {'Simple PPM':<12} {'Poss-Based':<12} {'Hybrid':<12}", flush=True)
print("-" * 50, flush=True)

for m in [20, 25, 30, 33, 35, 37, 38, 39]:
    min_data = df_reg[df_reg['minute_index'] == m]
    if len(min_data) > 0:
        mae_simple = min_data['error_simple'].abs().mean()
        mae_poss = min_data['error_poss'].abs().mean()
        mae_hybrid = min_data['error_hybrid'].abs().mean()
        best = "S" if mae_simple == min(mae_simple, mae_poss, mae_hybrid) else ("P" if mae_poss == min(mae_simple, mae_poss, mae_hybrid) else "H")
        print(f"{m:<8} {mae_simple:<12.2f} {mae_poss:<12.2f} {mae_hybrid:<12.2f} [{best}]", flush=True)

print("\n" + "=" * 70, flush=True)
print("WITHIN-6 ACCURACY BY PROJECTION METHOD", flush=True)
print("=" * 70, flush=True)

for m in [35, 37, 38, 39]:
    min_data = df_reg[df_reg['minute_index'] == m]
    if len(min_data) > 0:
        w6_simple = (min_data['error_simple'].abs() <= 6).mean() * 100
        w6_poss = (min_data['error_poss'].abs() <= 6).mean() * 100
        w6_hybrid = (min_data['error_hybrid'].abs() <= 6).mean() * 100
        print(f"Minute {m}: Simple={w6_simple:.1f}%, Poss-Based={w6_poss:.1f}%, Hybrid={w6_hybrid:.1f}%", flush=True)

# =====================================================================
# VISUALIZATIONS
# =====================================================================

print("\n" + "=" * 70, flush=True)
print("GENERATING VISUALIZATIONS...", flush=True)
print("=" * 70, flush=True)

try:
    plt.style.use('seaborn-darkgrid')
except:
    try:
        plt.style.use('ggplot')
    except:
        pass

fig, axes = plt.subplots(3, 3, figsize=(16, 14))
fig.suptitle('Team Possession Analysis: Deep Dive', fontsize=14, fontweight='bold')

# Plot 1: Possessions by Minute
ax1 = axes[0, 0]
poss_means = df_reg.groupby('minute_index')['posm'].mean()
poss_stds = df_reg.groupby('minute_index')['posm'].std()
ax1.errorbar(poss_means.index.values, poss_means.values, yerr=poss_stds.values,
             fmt='o-', capsize=3, linewidth=2, color='steelblue')
ax1.axhline(y=df_reg['posm'].mean(), color='red', linestyle='--', label=f'Avg: {df_reg["posm"].mean():.2f}')
ax1.set_xlabel('Game Minute')
ax1.set_ylabel('Possessions Per Minute')
ax1.set_title('Possessions by Game Minute')
ax1.legend()
ax1.set_xlim(0, 40)

# Plot 2: Home vs Away Possessions
ax2 = axes[0, 1]
home_poss_by_min = df_reg.groupby('minute_index')['poss_home'].mean()
away_poss_by_min = df_reg.groupby('minute_index')['poss_away'].mean()
ax2.plot(home_poss_by_min.index.values, home_poss_by_min.values, 'b-o', label='Home', linewidth=2)
ax2.plot(away_poss_by_min.index.values, away_poss_by_min.values, 'r-s', label='Away', linewidth=2)
ax2.set_xlabel('Game Minute')
ax2.set_ylabel('Possessions')
ax2.set_title('Home vs Away Possessions by Minute')
ax2.legend()
ax2.set_xlim(0, 40)

# Plot 3: Pace Category Distribution
ax3 = axes[0, 2]
pace_dist_plot = game_pace['pace_category'].value_counts().sort_index()
colors = ['blue', 'cyan', 'green', 'red']
ax3.bar(range(len(pace_dist_plot)), pace_dist_plot.values, color=colors)
ax3.set_xticks(range(len(pace_dist_plot)))
ax3.set_xticklabels(pace_dist_plot.index, rotation=15, fontsize=9)
ax3.set_ylabel('Number of Games')
ax3.set_title('Game Pace Distribution')

# Plot 4: Points Per Possession by Minute
ax4 = axes[1, 0]
ppp_means = df_reg.groupby('minute_index')['ppp_total'].mean()
ax4.plot(ppp_means.index.values, ppp_means.values, 'go-', linewidth=2)
ax4.set_xlabel('Game Minute')
ax4.set_ylabel('Points Per Possession')
ax4.set_title('Efficiency (PPP) by Minute')
ax4.axhline(y=df_reg['ppp_total'].mean(), color='red', linestyle='--', label=f'Avg: {df_reg["ppp_total"].mean():.2f}')
ax4.legend()
ax4.set_xlim(0, 40)

# Plot 5: Total Points vs Total Possessions Scatter
ax5 = axes[1, 1]
scatter = ax5.scatter(final_stats['total_poss'].values, final_stats['final_total'].values,
                      alpha=0.3, c=final_stats['final_total'].values, cmap='viridis', s=20)
# Trend line
z = np.polyfit(final_stats['total_poss'].values, final_stats['final_total'].values, 1)
p = np.poly1d(z)
x_line = np.linspace(final_stats['total_poss'].min(), final_stats['total_poss'].max(), 100)
ax5.plot(x_line, p(x_line), "r-", linewidth=2, label=f'Trend (r={corr:.2f})')
ax5.set_xlabel('Total Possessions')
ax5.set_ylabel('Final Game Total')
ax5.set_title(f'Possessions vs Total Points (r={corr:.2f})')
ax5.legend()

# Plot 6: MAE Comparison by Method
ax6 = axes[1, 2]
minutes = [20, 25, 30, 33, 35, 37, 38, 39]
mae_simple_list = []
mae_poss_list = []
mae_hybrid_list = []

for m in minutes:
    min_data = df_reg[df_reg['minute_index'] == m]
    if len(min_data) > 0:
        mae_simple_list.append(min_data['error_simple'].abs().mean())
        mae_poss_list.append(min_data['error_poss'].abs().mean())
        mae_hybrid_list.append(min_data['error_hybrid'].abs().mean())

x = np.arange(len(minutes))
width = 0.25
ax6.bar(x - width, mae_simple_list, width, label='Simple PPM', color='blue', alpha=0.8)
ax6.bar(x, mae_poss_list, width, label='Poss-Based', color='green', alpha=0.8)
ax6.bar(x + width, mae_hybrid_list, width, label='Hybrid', color='orange', alpha=0.8)
ax6.set_xlabel('Game Minute')
ax6.set_ylabel('MAE (points)')
ax6.set_title('Projection MAE by Method')
ax6.set_xticks(x)
ax6.set_xticklabels(minutes)
ax6.legend(fontsize=9)
ax6.axhline(y=6, color='red', linestyle='--', alpha=0.5, label='6-pt target')

# Plot 7: PPP by Pace Category
ax7 = axes[2, 0]
ppp_by_pace = df_reg.groupby('pace_category')['ppp_total'].mean().sort_index()
ax7.bar(range(len(ppp_by_pace)), ppp_by_pace.values, color=colors)
ax7.set_xticks(range(len(ppp_by_pace)))
ax7.set_xticklabels(ppp_by_pace.index, rotation=15, fontsize=9)
ax7.set_ylabel('Points Per Possession')
ax7.set_title('Efficiency by Pace Category')

# Plot 8: Within-6 Accuracy by Method
ax8 = axes[2, 1]
w6_minutes = [35, 37, 38, 39]
w6_simple = []
w6_poss = []
w6_hybrid = []

for m in w6_minutes:
    min_data = df_reg[df_reg['minute_index'] == m]
    if len(min_data) > 0:
        w6_simple.append((min_data['error_simple'].abs() <= 6).mean() * 100)
        w6_poss.append((min_data['error_poss'].abs() <= 6).mean() * 100)
        w6_hybrid.append((min_data['error_hybrid'].abs() <= 6).mean() * 100)

x = np.arange(len(w6_minutes))
width = 0.25
ax8.bar(x - width, w6_simple, width, label='Simple PPM', color='blue', alpha=0.8)
ax8.bar(x, w6_poss, width, label='Poss-Based', color='green', alpha=0.8)
ax8.bar(x + width, w6_hybrid, width, label='Hybrid', color='orange', alpha=0.8)
ax8.set_xlabel('Game Minute')
ax8.set_ylabel('Within 6 Points (%)')
ax8.set_title('Within-6 Accuracy by Method')
ax8.set_xticks(x)
ax8.set_xticklabels(w6_minutes)
ax8.axhline(y=85, color='red', linestyle='--', alpha=0.5)
ax8.legend(fontsize=9)
ax8.set_ylim(0, 100)

# Plot 9: Final Total Distribution by Pace
ax9 = axes[2, 2]
for i, pace in enumerate(pts_by_pace.index):
    pace_games = final_stats[final_stats['pace_category'] == pace]['final_total']
    if len(pace_games) > 0:
        ax9.hist(pace_games.values, bins=20, alpha=0.5, label=pace, color=colors[i])
ax9.set_xlabel('Final Game Total')
ax9.set_ylabel('Count')
ax9.set_title('Final Total by Pace Category')
ax9.legend(fontsize=8)

plt.tight_layout(rect=[0, 0, 1, 0.96])

# Save
output_dir = Path(__file__).parent / "outputs"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
plt.savefig(output_dir / f"team_possession_analysis_{timestamp}.png", dpi=150, bbox_inches='tight')
print(f"\nVisualization saved to: team_possession_analysis_{timestamp}.png", flush=True)

# Key insights
print("\n" + "=" * 70, flush=True)
print("KEY INSIGHTS: TEAM POSSESSION PATTERNS", flush=True)
print("=" * 70, flush=True)

print(f"1. Possession-Total Correlation: {corr:.3f}", flush=True)
print(f"   - Higher pace games = higher totals (predictable)", flush=True)

print(f"\n2. Average PPP: {df_reg['ppp_total'].mean():.3f}", flush=True)
print(f"   - This is relatively consistent across game types", flush=True)

best_method_35 = 'Hybrid' if w6_hybrid[0] >= max(w6_simple[0], w6_poss[0]) else ('Poss' if w6_poss[0] >= w6_simple[0] else 'Simple')
print(f"\n3. Best Method at Minute 35: {best_method_35} ({max(w6_simple[0], w6_poss[0], w6_hybrid[0]):.1f}% within 6)", flush=True)

print(f"\n4. Home Possession Advantage: +{df_reg['poss_home'].mean() - df_reg['poss_away'].mean():.3f}/min", flush=True)

print("\n" + "=" * 70, flush=True)
print("RECOMMENDATION: INCORPORATE PACE INTO MODEL", flush=True)
print("=" * 70, flush=True)
print("1. Use expected remaining possessions instead of just minutes", flush=True)
print("2. Weight PPP (efficiency) more heavily for slow-pace games", flush=True)
print("3. Blend possession-based and PPM-based projections dynamically", flush=True)
print("=" * 70, flush=True)

plt.show()

#!/usr/bin/env python3
"""
Deep Dive Analysis: Last 5 Minutes of NCAA Basketball Games
Visualizations and patterns in late-game play-by-play data
"""

import sys
sys.stdout.reconfigure(line_buffering=True)

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from datetime import datetime

print("=" * 70, flush=True)
print("DEEP DIVE: LAST 5 MINUTES PBP ANALYSIS", flush=True)
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

# Calculate cumulative stats
df = df.sort_values(['game_id', 'minute_index'])
df['ppm'] = df['points_home'] + df['points_away']
df['posm'] = df['poss_home'] + df['poss_away']
df['foulm'] = df['fouls_home'] + df['fouls_away']
df['tovm'] = df['to_home'] + df['to_away']
df['points_so_far'] = df.groupby('game_id')['ppm'].cumsum()
df['poss_so_far'] = df.groupby('game_id')['posm'].cumsum()
df['fouls_so_far'] = df.groupby('game_id')['foulm'].cumsum()

# Calculate score differential
df['score_home_cumulative'] = df.groupby('game_id')['points_home'].cumsum()
df['score_away_cumulative'] = df.groupby('game_id')['points_away'].cumsum()
df['score_diff'] = df['score_home_cumulative'] - df['score_away_cumulative']
df['score_diff_abs'] = df['score_diff'].abs()
df['minutes_remaining'] = 40 - df['minute_index']

# Get actual game totals
game_totals = df.groupby('game_id').agg({
    'points_so_far': 'max',
    'poss_so_far': 'max',
    'fouls_so_far': 'max',
    'score_diff_abs': 'max'
}).reset_index()
game_totals.columns = ['game_id', 'final_total', 'final_poss', 'final_fouls', 'max_diff']

df = df.merge(game_totals, on='game_id')

# Last 5 minutes data (minutes 36-40)
last5 = df[df['minute_index'] >= 35].copy()
n_games = last5['game_id'].nunique()

print(f"Games analyzed: {n_games}", flush=True)
print(f"Last 5 minutes rows: {len(last5)}", flush=True)

# Calculate game types at minute 35
game_types = df[df['minute_index'] == 35][['game_id', 'score_diff_abs']].copy()
game_types['game_type'] = pd.cut(
    game_types['score_diff_abs'],
    bins=[-1, 5, 10, 15, 100],
    labels=['Nail-biter (0-5)', 'Close (6-10)', 'Comfortable (11-15)', 'Blowout (15+)']
)
last5 = last5.merge(game_types[['game_id', 'game_type']], on='game_id', how='left')

print("\n" + "=" * 70, flush=True)
print("GAME TYPE DISTRIBUTION (at Minute 35)", flush=True)
print("=" * 70, flush=True)
type_counts = game_types['game_type'].value_counts()
for gt, cnt in type_counts.items():
    print(f"  {gt}: {cnt} games ({cnt/len(game_types)*100:.1f}%)", flush=True)

# PPM analysis by minute in last 5
print("\n" + "=" * 70, flush=True)
print("POINTS PER MINUTE BY GAME MINUTE (Last 5 Minutes)", flush=True)
print("=" * 70, flush=True)

ppm_by_min = last5.groupby('minute_index')['ppm'].agg(['mean', 'std', 'median', 'min', 'max'])
print(ppm_by_min.to_string(), flush=True)

# PPM by game type
print("\n" + "=" * 70, flush=True)
print("PPM BY GAME TYPE (Last 5 Minutes)", flush=True)
print("=" * 70, flush=True)

ppm_by_type = last5.groupby(['game_type', 'minute_index'])['ppm'].mean().unstack(fill_value=0)
print(ppm_by_type.to_string(float_format=lambda x: f'{x:.2f}'), flush=True)

# Fouls analysis
print("\n" + "=" * 70, flush=True)
print("FOULS PER MINUTE (Last 5 Minutes)", flush=True)
print("=" * 70, flush=True)

fouls_by_min = last5.groupby('minute_index')['foulm'].agg(['mean', 'std', 'median'])
print(fouls_by_min.to_string(), flush=True)

# Points scored in last 5 minutes
print("\n" + "=" * 70, flush=True)
print("POINTS SCORED IN LAST 5 MINUTES", flush=True)
print("=" * 70, flush=True)

points_last5 = last5.groupby('game_id')['ppm'].sum()
print(f"Mean: {points_last5.mean():.1f} points", flush=True)
print(f"Std:  {points_last5.std():.1f} points", flush=True)
print(f"Min:  {points_last5.min():.0f} points", flush=True)
print(f"Max:  {points_last5.max():.0f} points", flush=True)
print(f"Median: {points_last5.median():.0f} points", flush=True)

# Points by game type
print("\n" + "=" * 70, flush=True)
print("POINTS IN LAST 5 MIN BY GAME TYPE", flush=True)
print("=" * 70, flush=True)

points_by_type = last5.groupby(['game_id', 'game_type'])['ppm'].sum().reset_index()
for gt in type_counts.index:
    gt_points = points_by_type[points_by_type['game_type'] == gt]['ppm']
    if len(gt_points) > 0:
        print(f"{gt}: Mean={gt_points.mean():.1f}, Std={gt_points.std():.1f}", flush=True)

# Generate visualizations
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
fig.suptitle('Deep Dive: Last 5 Minutes of NCAA Basketball Games', fontsize=14, fontweight='bold')

# Plot 1: PPM Distribution by Minute
ax1 = axes[0, 0]
minutes = list(range(35, 41))
means = [last5[last5['minute_index'] == m]['ppm'].mean() for m in minutes]
stds = [last5[last5['minute_index'] == m]['ppm'].std() for m in minutes]
ax1.bar(minutes, means, yerr=stds, capsize=5, color='steelblue', edgecolor='black', alpha=0.8)
ax1.set_xlabel('Game Minute')
ax1.set_ylabel('Points Per Minute')
ax1.set_title('PPM by Minute (Last 5 Min)')
ax1.axhline(y=df['ppm'].mean(), color='red', linestyle='--', label=f'Game Avg: {df["ppm"].mean():.2f}')
ax1.legend()

# Plot 2: PPM by Game Type
ax2 = axes[0, 1]
game_types_list = ['Nail-biter (0-5)', 'Close (6-10)', 'Comfortable (11-15)', 'Blowout (15+)']
colors = ['red', 'orange', 'green', 'blue']
for i, gt in enumerate(game_types_list):
    gt_data = last5[last5['game_type'] == gt]
    if len(gt_data) > 0:
        ppm_means = gt_data.groupby('minute_index')['ppm'].mean()
        ax2.plot(ppm_means.index.values, ppm_means.values, marker='o', label=gt, color=colors[i], linewidth=2)
ax2.set_xlabel('Game Minute')
ax2.set_ylabel('Points Per Minute')
ax2.set_title('PPM by Game Type')
ax2.legend(fontsize=8)
ax2.set_xticks(range(35, 41))

# Plot 3: Fouls by Minute
ax3 = axes[0, 2]
foul_means = [last5[last5['minute_index'] == m]['foulm'].mean() for m in minutes]
foul_stds = [last5[last5['minute_index'] == m]['foulm'].std() for m in minutes]
ax3.bar(minutes, foul_means, yerr=foul_stds, capsize=5, color='coral', edgecolor='black', alpha=0.8)
ax3.set_xlabel('Game Minute')
ax3.set_ylabel('Fouls Per Minute')
ax3.set_title('Fouls by Minute (Last 5 Min)')
ax3.axhline(y=df['foulm'].mean(), color='red', linestyle='--', label=f'Game Avg: {df["foulm"].mean():.2f}')
ax3.legend()

# Plot 4: Points Scored in Last 5 Minutes Distribution
ax4 = axes[1, 0]
ax4.hist(points_last5.values, bins=30, edgecolor='black', alpha=0.7, color='purple')
ax4.axvline(x=points_last5.mean(), color='red', linestyle='-', linewidth=2, label=f'Mean: {points_last5.mean():.1f}')
ax4.axvline(x=points_last5.median(), color='green', linestyle='--', linewidth=2, label=f'Median: {points_last5.median():.0f}')
ax4.set_xlabel('Points in Last 5 Minutes')
ax4.set_ylabel('Number of Games')
ax4.set_title('Distribution: Points Scored in Last 5 Min')
ax4.legend()

# Plot 5: PPM Heatmap by Minute and Game Type
ax5 = axes[1, 1]
ppm_matrix = last5.groupby(['game_type', 'minute_index'])['ppm'].mean().unstack(fill_value=0)
im = ax5.imshow(ppm_matrix.values, cmap='YlOrRd', aspect='auto')
ax5.set_xticks(range(len(ppm_matrix.columns)))
ax5.set_xticklabels([f'{m}' for m in ppm_matrix.columns])
ax5.set_yticks(range(len(ppm_matrix.index)))
ax5.set_yticklabels(ppm_matrix.index, fontsize=8)
ax5.set_xlabel('Game Minute')
ax5.set_ylabel('Game Type')
ax5.set_title('PPM Heatmap: Game Type vs Minute')
plt.colorbar(im, ax=ax5, label='PPM')

# Plot 6: Possessions by Minute
ax6 = axes[1, 2]
poss_means = [last5[last5['minute_index'] == m]['posm'].mean() for m in minutes]
poss_stds = [last5[last5['minute_index'] == m]['posm'].std() for m in minutes]
ax6.bar(minutes, poss_means, yerr=poss_stds, capsize=5, color='teal', edgecolor='black', alpha=0.8)
ax6.set_xlabel('Game Minute')
ax6.set_ylabel('Possessions Per Minute')
ax6.set_title('Possessions by Minute (Last 5 Min)')
ax6.axhline(y=df['posm'].mean(), color='red', linestyle='--', label=f'Game Avg: {df["posm"].mean():.2f}')
ax6.legend()

# Plot 7: Score Differential Evolution
ax7 = axes[2, 0]
diff_by_min = last5.groupby('minute_index')['score_diff_abs'].agg(['mean', 'median', 'std'])
ax7.plot(diff_by_min.index.values, diff_by_min['mean'].values, 'b-o', linewidth=2, label='Mean')
ax7.plot(diff_by_min.index.values, diff_by_min['median'].values, 'g--s', linewidth=2, label='Median')
ax7.fill_between(diff_by_min.index.values,
                  (diff_by_min['mean'] - diff_by_min['std']).values,
                  (diff_by_min['mean'] + diff_by_min['std']).values,
                  alpha=0.2)
ax7.set_xlabel('Game Minute')
ax7.set_ylabel('Score Differential (Absolute)')
ax7.set_title('Score Differential in Last 5 Min')
ax7.legend()
ax7.set_xticks(range(35, 41))

# Plot 8: Points vs Score Differential Scatter
ax8 = axes[2, 1]
min38_data = last5[last5['minute_index'] == 38]
if len(min38_data) > 0:
    scatter = ax8.scatter(min38_data['score_diff_abs'].values, min38_data['ppm'].values,
                          alpha=0.3, c=min38_data['ppm'].values, cmap='viridis', s=20)
    ax8.set_xlabel('Score Differential (Absolute)')
    ax8.set_ylabel('PPM in Minute 38')
    ax8.set_title('Minute 38: PPM vs Score Differential')
    plt.colorbar(scatter, ax=ax8, label='PPM')

    # Add trend line
    z = np.polyfit(min38_data['score_diff_abs'].values, min38_data['ppm'].values, 1)
    p = np.poly1d(z)
    x_line = np.linspace(0, min38_data['score_diff_abs'].max(), 100)
    ax8.plot(x_line, p(x_line), "r--", alpha=0.8, label=f'Trend')
    ax8.legend()

# Plot 9: Game Type Distribution Pie
ax9 = axes[2, 2]
type_counts_plot = game_types['game_type'].value_counts()
wedges, texts, autotexts = ax9.pie(type_counts_plot.values, labels=type_counts_plot.index,
                                     autopct='%1.1f%%', colors=['red', 'orange', 'green', 'blue'],
                                     explode=[0.05, 0.02, 0, 0], startangle=90)
ax9.set_title('Game Type Distribution\n(at Minute 35)')
for autotext in autotexts:
    autotext.set_fontsize(9)

plt.tight_layout(rect=[0, 0, 1, 0.96])

# Save
output_dir = Path(__file__).parent / "outputs"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
plt.savefig(output_dir / f"last_5_min_analysis_{timestamp}.png", dpi=150, bbox_inches='tight')
print(f"\nVisualization saved to: last_5_min_analysis_{timestamp}.png", flush=True)

# Second figure: More detailed analysis
fig2, axes2 = plt.subplots(2, 2, figsize=(14, 10))
fig2.suptitle('Last 5 Minutes: Detailed Patterns', fontsize=14, fontweight='bold')

# Plot 1: Turnovers by minute
ax1 = axes2[0, 0]
to_means = [last5[last5['minute_index'] == m]['tovm'].mean() for m in minutes]
to_stds = [last5[last5['minute_index'] == m]['tovm'].std() for m in minutes]
ax1.bar(minutes, to_means, yerr=to_stds, capsize=5, color='darkred', edgecolor='black', alpha=0.8)
ax1.set_xlabel('Game Minute')
ax1.set_ylabel('Turnovers Per Minute')
ax1.set_title('Turnovers by Minute (Last 5 Min)')
ax1.axhline(y=df['tovm'].mean(), color='blue', linestyle='--', label=f'Game Avg: {df["tovm"].mean():.2f}')
ax1.legend()

# Plot 2: Points per Possession (efficiency)
ax2 = axes2[0, 1]
last5['ppp'] = last5['ppm'] / last5['posm'].clip(lower=0.1)
ppp_by_min = last5.groupby('minute_index')['ppp'].agg(['mean', 'std'])
ax2.errorbar(ppp_by_min.index.values, ppp_by_min['mean'].values,
             yerr=ppp_by_min['std'].values, fmt='o-', capsize=5, linewidth=2, color='darkgreen')
ax2.set_xlabel('Game Minute')
ax2.set_ylabel('Points Per Possession')
ax2.set_title('Efficiency (PPP) by Minute')
ax2.axhline(y=(df['ppm'] / df['posm'].clip(lower=0.1)).mean(), color='red', linestyle='--', label='Game Avg')
ax2.legend()
ax2.set_xticks(range(35, 41))

# Plot 3: Variance in PPM by game type
ax3 = axes2[1, 0]
ppm_std_by_type = last5.groupby('game_type')['ppm'].std()
ax3.barh(range(len(ppm_std_by_type)), ppm_std_by_type.values, color=['red', 'orange', 'green', 'blue'])
ax3.set_yticks(range(len(ppm_std_by_type)))
ax3.set_yticklabels(ppm_std_by_type.index, fontsize=9)
ax3.set_xlabel('PPM Standard Deviation')
ax3.set_title('PPM Variance by Game Type')

# Plot 4: Close game analysis - PPM in final minute
ax4 = axes2[1, 1]
close_games_last = last5[(last5['game_type'].isin(['Nail-biter (0-5)', 'Close (6-10)'])) &
                          (last5['minute_index'] >= 38)]
if len(close_games_last) > 0:
    ppm_close = close_games_last.groupby('minute_index')['ppm'].agg(['mean', 'std'])
    ax4.bar(ppm_close.index.values, ppm_close['mean'].values, yerr=ppm_close['std'].values,
            capsize=5, color='crimson', edgecolor='black', alpha=0.8)
    ax4.set_xlabel('Game Minute')
    ax4.set_ylabel('Points Per Minute')
    ax4.set_title('Close Games Only: PPM in Final Minutes')
    ax4.set_xticks([38, 39, 40])

    # Add annotations
    for i, (idx, row) in enumerate(ppm_close.iterrows()):
        ax4.annotate(f'{row["mean"]:.2f}', (idx, row["mean"] + row["std"] + 0.1),
                    ha='center', fontsize=10)

plt.tight_layout(rect=[0, 0, 1, 0.96])
plt.savefig(output_dir / f"last_5_min_detailed_{timestamp}.png", dpi=150, bbox_inches='tight')
print(f"Detailed analysis saved to: last_5_min_detailed_{timestamp}.png", flush=True)

# Key insights
print("\n" + "=" * 70, flush=True)
print("KEY INSIGHTS FROM LAST 5 MINUTES", flush=True)
print("=" * 70, flush=True)

# Compare close vs blowout PPM in last minute
if 'game_type' in last5.columns:
    last_min = last5[last5['minute_index'] == 39]
    close_ppm = last_min[last_min['game_type'].isin(['Nail-biter (0-5)', 'Close (6-10)'])]['ppm'].mean()
    blowout_ppm = last_min[last_min['game_type'] == 'Blowout (15+)']['ppm'].mean()
    print(f"1. Close games in minute 39: {close_ppm:.2f} PPM vs Blowouts: {blowout_ppm:.2f} PPM", flush=True)

# Foul rate increase
early_fouls = df[df['minute_index'] < 30]['foulm'].mean()
late_fouls = last5['foulm'].mean()
print(f"2. Foul rate: Early game {early_fouls:.2f} -> Last 5 min {late_fouls:.2f} (+{(late_fouls-early_fouls)/early_fouls*100:.0f}%)", flush=True)

# Points variance
early_ppm_std = df[df['minute_index'] < 30]['ppm'].std()
late_ppm_std = last5['ppm'].std()
print(f"3. PPM variance: Early game {early_ppm_std:.2f} -> Last 5 min {late_ppm_std:.2f}", flush=True)

# Close game scoring
if len(close_games_last) > 0:
    close_final = close_games_last[close_games_last['minute_index'] == 39]['ppm'].mean()
    print(f"4. Close games minute 39 avg: {close_final:.2f} PPM (intentional fouling)", flush=True)

print("\n" + "=" * 70, flush=True)
print("ANALYSIS COMPLETE!", flush=True)
print("=" * 70, flush=True)

plt.show()

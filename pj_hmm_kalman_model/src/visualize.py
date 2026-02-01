#!/usr/bin/env python3
"""
Visualization Module for HMM + Kalman PJ Model
Generates charts and graphs for analysis
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime
from typing import Optional, List
import warnings
warnings.filterwarnings('ignore')

# Set style
try:
    plt.style.use('seaborn-darkgrid')
except:
    try:
        plt.style.use('seaborn-v0_8-darkgrid')
    except:
        plt.style.use('ggplot')
sns.set_palette("husl")


class PJVisualizer:
    """Creates visualizations for PJ model outputs"""

    def __init__(
        self,
        projections_df: pd.DataFrame,
        pbp_df: pd.DataFrame = None,
        team_stats_df: pd.DataFrame = None,
        output_dir: str = "outputs/charts"
    ):
        self.projections = projections_df.copy()
        self.pbp = pbp_df.copy() if pbp_df is not None else None
        self.team_stats = team_stats_df.copy() if team_stats_df is not None else None
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Merge team names if needed
        if self.pbp is not None and "home_team" not in self.projections.columns:
            team_map = self.pbp.groupby("game_id").first()[["home_team", "away_team"]].reset_index()
            self.projections = self.projections.merge(team_map, on="game_id", how="left")

    def plot_state_distribution(self, save: bool = True) -> plt.Figure:
        """Plot HMM state distribution across all games"""
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        # State counts
        state_counts = self.projections['hmm_state_label'].value_counts()
        colors = {'Slow': '#3498db', 'Normal': '#2ecc71', 'Fast': '#e74c3c', 'Foul/Endgame': '#9b59b6'}
        bar_colors = [colors.get(s, '#95a5a6') for s in state_counts.index]

        axes[0].bar(state_counts.index, state_counts.values, color=bar_colors, edgecolor='white', linewidth=2)
        axes[0].set_title('HMM State Distribution (All Minutes)', fontsize=14, fontweight='bold')
        axes[0].set_xlabel('Game Regime', fontsize=12)
        axes[0].set_ylabel('Number of Minutes', fontsize=12)

        for i, (label, count) in enumerate(state_counts.items()):
            pct = count / len(self.projections) * 100
            axes[0].annotate(f'{pct:.1f}%', (i, count + 5), ha='center', fontsize=11, fontweight='bold')

        # State by game minute
        minute_state = self.projections.groupby(['minute_index', 'hmm_state_label']).size().unstack(fill_value=0)
        minute_state_pct = minute_state.div(minute_state.sum(axis=1), axis=0) * 100

        for col in minute_state_pct.columns:
            axes[1].plot(minute_state_pct.index.values, minute_state_pct[col].values,
                        label=col, linewidth=2.5, color=colors.get(col, '#95a5a6'))

        axes[1].set_title('Regime Distribution by Game Minute', fontsize=14, fontweight='bold')
        axes[1].set_xlabel('Minute of Game', fontsize=12)
        axes[1].set_ylabel('% of Games in Regime', fontsize=12)
        axes[1].legend(loc='upper right', fontsize=10)
        axes[1].set_xlim(0, 40)

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"state_distribution_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_team_ppm_comparison(self, top_n: int = 20, save: bool = True) -> plt.Figure:
        """Plot PPM comparison across teams"""
        if self.team_stats is None:
            # Calculate from projections
            team_ppm = self.projections.groupby('home_team').agg({
                'expected_ppm': 'mean',
                'game_id': 'nunique'
            }).rename(columns={'game_id': 'games', 'expected_ppm': 'avg_ppm'})

            away_ppm = self.projections.groupby('away_team').agg({
                'expected_ppm': 'mean',
                'game_id': 'nunique'
            }).rename(columns={'game_id': 'games', 'expected_ppm': 'avg_ppm'})

            # Combine
            all_teams = pd.concat([
                team_ppm.reset_index().rename(columns={'home_team': 'team'}),
                away_ppm.reset_index().rename(columns={'away_team': 'team'})
            ]).groupby('team').mean().reset_index()
        else:
            all_teams = self.team_stats[['team', 'avg_ppm', 'total_games']].copy()
            all_teams = all_teams.rename(columns={'total_games': 'games'})

        # Sort and take top N
        all_teams = all_teams.sort_values('avg_ppm', ascending=True).tail(top_n)

        fig, ax = plt.subplots(figsize=(12, max(8, top_n * 0.4)))

        # Color by PPM (green = high, red = low)
        colors = plt.cm.RdYlGn(np.linspace(0.2, 0.8, len(all_teams)))

        bars = ax.barh(all_teams['team'].values, all_teams['avg_ppm'].values, color=colors, edgecolor='white', linewidth=1)

        # Add value labels
        for bar, ppm in zip(bars, all_teams['avg_ppm'].values):
            ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height()/2,
                   f'{ppm:.2f}', va='center', fontsize=10, fontweight='bold')

        ax.set_title(f'Points Per Minute by Team (Top {top_n})', fontsize=16, fontweight='bold')
        ax.set_xlabel('Average PPM', fontsize=12)
        ax.axvline(x=all_teams['avg_ppm'].values.mean(), color='black', linestyle='--', linewidth=2, label=f"Avg: {all_teams['avg_ppm'].values.mean():.2f}")
        ax.legend(loc='lower right', fontsize=10)

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"team_ppm_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_projection_evolution(self, game_ids: List[str] = None, max_games: int = 6, save: bool = True) -> plt.Figure:
        """Plot how projections evolve during games"""
        if game_ids is None:
            game_ids = self.projections['game_id'].unique()[:max_games]

        n_games = min(len(game_ids), max_games)
        cols = 2
        rows = (n_games + 1) // 2

        fig, axes = plt.subplots(rows, cols, figsize=(14, 4 * rows))
        axes = axes.flatten() if n_games > 1 else [axes]

        state_colors = {'Slow': '#3498db', 'Normal': '#2ecc71', 'Fast': '#e74c3c', 'Foul/Endgame': '#9b59b6'}

        for idx, game_id in enumerate(game_ids[:max_games]):
            ax = axes[idx]
            game_data = self.projections[self.projections['game_id'] == game_id].sort_values('minute_index')

            # Plot projected total
            ax.plot(game_data['minute_index'].values, game_data['projected_total'].values,
                   'b-', linewidth=2, label='Projected Total')

            # Color background by regime
            for i in range(len(game_data) - 1):
                row = game_data.iloc[i]
                next_row = game_data.iloc[i + 1]
                color = state_colors.get(row['hmm_state_label'], '#cccccc')
                ax.axvspan(row['minute_index'], next_row['minute_index'],
                          alpha=0.3, color=color)

            # Final score line
            final_points = game_data.iloc[-1]['points_so_far']
            ax.axhline(y=final_points, color='red', linestyle='--', linewidth=2, label=f'Final: {final_points:.0f}')

            # Get team names
            if 'home_team' in game_data.columns:
                home = game_data.iloc[0]['home_team']
                away = game_data.iloc[0]['away_team']
                title = f"{home[:15]} vs {away[:15]}"
            else:
                title = f"Game {game_id}"

            ax.set_title(title, fontsize=11, fontweight='bold')
            ax.set_xlabel('Minute')
            ax.set_ylabel('Projected Total')
            ax.legend(loc='upper right', fontsize=8)
            ax.set_xlim(0, 40)

        # Hide empty subplots
        for idx in range(n_games, len(axes)):
            axes[idx].set_visible(False)

        # Add legend for regimes
        from matplotlib.patches import Patch
        legend_elements = [Patch(facecolor=c, alpha=0.5, label=l) for l, c in state_colors.items()]
        fig.legend(handles=legend_elements, loc='lower center', ncol=4, fontsize=10, title='Game Regime')

        plt.tight_layout()
        plt.subplots_adjust(bottom=0.12)

        if save:
            filepath = self.output_dir / f"projection_evolution_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_kalman_filter_analysis(self, game_id: str = None, save: bool = True) -> plt.Figure:
        """Plot Kalman filter behavior for a single game"""
        if game_id is None:
            game_id = self.projections['game_id'].iloc[0]

        game_data = self.projections[self.projections['game_id'] == game_id].sort_values('minute_index')

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # Get team names for title
        if 'home_team' in game_data.columns:
            home = game_data.iloc[0]['home_team']
            away = game_data.iloc[0]['away_team']
            title = f"Kalman Filter Analysis: {home} vs {away}"
        else:
            title = f"Kalman Filter Analysis: Game {game_id}"

        fig.suptitle(title, fontsize=14, fontweight='bold')

        # Convert to numpy arrays for compatibility
        x = game_data['minute_index'].values
        raw_ppm = game_data['raw_ppm'].values
        filtered_ppm = game_data['filtered_ppm'].values
        kalman_gain = game_data['kalman_gain'].values
        kalman_Q = game_data['kalman_Q'].values
        kalman_R = game_data['kalman_R'].values

        # 1. Raw vs Filtered PPM
        axes[0, 0].plot(x, raw_ppm, 'o-', alpha=0.5, label='Raw PPM', markersize=4)
        axes[0, 0].plot(x, filtered_ppm, '-', linewidth=2, label='Kalman Filtered PPM')
        axes[0, 0].set_title('Raw vs Filtered PPM', fontweight='bold')
        axes[0, 0].set_xlabel('Minute')
        axes[0, 0].set_ylabel('Points Per Minute')
        axes[0, 0].legend()

        # 2. Kalman Gain over time
        axes[0, 1].plot(x, kalman_gain, 'g-', linewidth=2)
        axes[0, 1].fill_between(x, 0, kalman_gain, alpha=0.3)
        axes[0, 1].set_title('Kalman Gain (Filter Responsiveness)', fontweight='bold')
        axes[0, 1].set_xlabel('Minute')
        axes[0, 1].set_ylabel('Kalman Gain')
        axes[0, 1].axvline(x=34, color='red', linestyle='--', alpha=0.5, label='Late Game (6 min left)')
        axes[0, 1].legend()

        # 3. Q and R parameters
        axes[1, 0].plot(x, kalman_Q, 'b-', linewidth=2, label='Q (Process Noise)')
        axes[1, 0].plot(x, kalman_R, 'r-', linewidth=2, label='R (Measurement Noise)')
        axes[1, 0].set_title('Adaptive Q/R Parameters', fontweight='bold')
        axes[1, 0].set_xlabel('Minute')
        axes[1, 0].set_ylabel('Noise Covariance')
        axes[1, 0].legend()
        axes[1, 0].axvline(x=34, color='gray', linestyle='--', alpha=0.5)

        # 4. State probabilities
        state_cols = [c for c in game_data.columns if c.startswith('state_') and c.endswith('_prob')]
        if state_cols:
            for col in state_cols:
                state_num = col.split('_')[1]
                axes[1, 1].plot(x, game_data[col].values, linewidth=2, label=f'State {state_num}')
            axes[1, 1].set_title('HMM State Probabilities', fontweight='bold')
            axes[1, 1].set_xlabel('Minute')
            axes[1, 1].set_ylabel('Probability')
            axes[1, 1].legend()
            axes[1, 1].set_ylim(0, 1)

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"kalman_analysis_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_team_regime_heatmap(self, save: bool = True) -> plt.Figure:
        """Heatmap of regime distribution by team"""
        if 'home_team' not in self.projections.columns:
            print("No team data available for heatmap")
            return None

        # Combine home and away appearances
        home_regimes = self.projections[['home_team', 'hmm_state_label']].copy()
        home_regimes.columns = ['team', 'regime']

        away_regimes = self.projections[['away_team', 'hmm_state_label']].copy()
        away_regimes.columns = ['team', 'regime']

        all_regimes = pd.concat([home_regimes, away_regimes])

        # Create pivot table
        regime_matrix = pd.crosstab(all_regimes['team'], all_regimes['regime'], normalize='index') * 100

        # Sort by dominant regime
        regime_matrix['sort_key'] = regime_matrix.get('Fast', 0) - regime_matrix.get('Slow', 0)
        regime_matrix = regime_matrix.sort_values('sort_key', ascending=False).drop('sort_key', axis=1)

        # Limit to top 25 teams
        regime_matrix = regime_matrix.head(25)

        fig, ax = plt.subplots(figsize=(10, max(8, len(regime_matrix) * 0.35)))

        sns.heatmap(regime_matrix, annot=True, fmt='.0f', cmap='RdYlGn',
                   ax=ax, cbar_kws={'label': '% of Minutes'}, linewidths=0.5)

        ax.set_title('Team Regime Distribution (%)', fontsize=14, fontweight='bold')
        ax.set_xlabel('Game Regime', fontsize=12)
        ax.set_ylabel('Team', fontsize=12)

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"team_regime_heatmap_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_over_under_analysis(self, save: bool = True) -> plt.Figure:
        """Analyze projection accuracy for over/under betting"""
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        # 1. Projection error distribution
        final_projs = self.projections.groupby('game_id').last()
        projected = final_projs['projected_total'].values
        actual = final_projs['points_so_far'].values
        proj_error = projected - actual

        axes[0].hist(proj_error, bins=20, edgecolor='white', alpha=0.7, color='steelblue')
        axes[0].axvline(x=0, color='red', linestyle='--', linewidth=2, label='Perfect Prediction')
        axes[0].axvline(x=proj_error.mean(), color='green', linestyle='-', linewidth=2,
                       label=f'Mean Error: {proj_error.mean():.1f}')
        axes[0].set_title('Final Projection Error Distribution', fontsize=14, fontweight='bold')
        axes[0].set_xlabel('Projection Error (Projected - Actual)')
        axes[0].set_ylabel('Number of Games')
        axes[0].legend()

        # 2. Projection vs Actual scatter
        axes[1].scatter(actual, projected, alpha=0.6, s=80, c='steelblue', edgecolors='white')

        # Perfect prediction line
        min_val = min(actual.min(), projected.min())
        max_val = max(actual.max(), projected.max())
        axes[1].plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect Prediction')

        axes[1].set_title('Projected vs Actual Total', fontsize=14, fontweight='bold')
        axes[1].set_xlabel('Actual Final Total')
        axes[1].set_ylabel('Final Projected Total')
        axes[1].legend()

        # Add correlation
        corr = np.corrcoef(projected, actual)[0, 1]
        axes[1].annotate(f'Correlation: {corr:.3f}', xy=(0.05, 0.95), xycoords='axes fraction',
                        fontsize=12, fontweight='bold', bbox=dict(boxstyle='round', facecolor='wheat'))

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"over_under_analysis_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    # =========================================================================
    # NEW VISUALIZATIONS FOR ENHANCED MODEL
    # =========================================================================

    def plot_team_profiles(self, profiles_df: pd.DataFrame = None, save: bool = True) -> plt.Figure:
        """
        Visualize team profile characteristics (pace, variance categories)

        Args:
            profiles_df: DataFrame with team profiles (if not provided, tries to extract from data)
        """
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Team Profile Analysis', fontsize=16, fontweight='bold')

        # Try to get pace info from projections if profiles not provided
        if profiles_df is None and 'home_pace' in self.projections.columns:
            # Extract unique team-pace combos
            home_pace = self.projections.groupby('home_team')['home_pace'].first().reset_index()
            home_pace.columns = ['team', 'pace_category']
            away_pace = self.projections.groupby('away_team')['away_pace'].first().reset_index()
            away_pace.columns = ['team', 'pace_category']
            profiles_df = pd.concat([home_pace, away_pace]).drop_duplicates('team')

        # 1. Pace Category Distribution
        if profiles_df is not None and 'pace_category' in profiles_df.columns:
            pace_counts = profiles_df['pace_category'].value_counts()
            colors_pace = {'Slow': '#3498db', 'Normal': '#2ecc71', 'Fast': '#e74c3c'}
            bar_colors = [colors_pace.get(p, '#95a5a6') for p in pace_counts.index]

            axes[0, 0].pie(pace_counts.values, labels=pace_counts.index, autopct='%1.1f%%',
                          colors=bar_colors, explode=[0.02] * len(pace_counts),
                          shadow=True, startangle=90)
            axes[0, 0].set_title('Team Pace Distribution', fontweight='bold')
        else:
            axes[0, 0].text(0.5, 0.5, 'No pace data available', ha='center', va='center')
            axes[0, 0].set_title('Team Pace Distribution', fontweight='bold')

        # 2. Variance Category Distribution (if available)
        if profiles_df is not None and 'variance_category' in profiles_df.columns:
            var_counts = profiles_df['variance_category'].value_counts()
            colors_var = {'Low': '#27ae60', 'Normal': '#f39c12', 'High': '#e74c3c'}
            bar_colors_var = [colors_var.get(v, '#95a5a6') for v in var_counts.index]

            axes[0, 1].bar(var_counts.index, var_counts.values, color=bar_colors_var,
                          edgecolor='white', linewidth=2)
            axes[0, 1].set_title('Team Variance Distribution', fontweight='bold')
            axes[0, 1].set_xlabel('Variance Category')
            axes[0, 1].set_ylabel('Number of Teams')

            for i, (cat, count) in enumerate(var_counts.items()):
                axes[0, 1].annotate(f'{count}', (i, count + 1), ha='center', fontweight='bold')
        else:
            axes[0, 1].text(0.5, 0.5, 'No variance data available', ha='center', va='center')
            axes[0, 1].set_title('Team Variance Distribution', fontweight='bold')

        # 3. PPM by Pace Category
        if profiles_df is not None and 'avg_ppm' in profiles_df.columns:
            pace_order = ['Slow', 'Normal', 'Fast']
            ppm_by_pace = profiles_df.groupby('pace_category')['avg_ppm'].agg(['mean', 'std'])
            ppm_by_pace = ppm_by_pace.reindex([p for p in pace_order if p in ppm_by_pace.index])

            colors_pace = {'Slow': '#3498db', 'Normal': '#2ecc71', 'Fast': '#e74c3c'}
            bar_colors = [colors_pace.get(p, '#95a5a6') for p in ppm_by_pace.index]

            bars = axes[1, 0].bar(ppm_by_pace.index, ppm_by_pace['mean'], color=bar_colors,
                                 yerr=ppm_by_pace['std'], capsize=5, edgecolor='white', linewidth=2)
            axes[1, 0].set_title('Average PPM by Pace Category', fontweight='bold')
            axes[1, 0].set_xlabel('Pace Category')
            axes[1, 0].set_ylabel('Average PPM')

            for bar, mean in zip(bars, ppm_by_pace['mean']):
                axes[1, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                               f'{mean:.2f}', ha='center', fontweight='bold')
        else:
            # Use projection data
            if 'home_pace' in self.projections.columns:
                ppm_by_pace = self.projections.groupby('home_pace')['expected_ppm'].mean()
                pace_order = ['Slow', 'Normal', 'Fast']
                ppm_by_pace = ppm_by_pace.reindex([p for p in pace_order if p in ppm_by_pace.index])
                colors_pace = {'Slow': '#3498db', 'Normal': '#2ecc71', 'Fast': '#e74c3c'}
                bar_colors = [colors_pace.get(p, '#95a5a6') for p in ppm_by_pace.index]
                axes[1, 0].bar(ppm_by_pace.index, ppm_by_pace.values, color=bar_colors,
                              edgecolor='white', linewidth=2)
            axes[1, 0].set_title('Average PPM by Pace Category', fontweight='bold')
            axes[1, 0].set_xlabel('Pace Category')
            axes[1, 0].set_ylabel('Average PPM')

        # 4. Home vs Away PPM Split
        if profiles_df is not None and 'home_ppm' in profiles_df.columns and 'away_ppm' in profiles_df.columns:
            x = np.arange(3)
            width = 0.35

            for pace_cat in ['Slow', 'Normal', 'Fast']:
                pace_data = profiles_df[profiles_df['pace_category'] == pace_cat]
                if len(pace_data) > 0:
                    pass  # We'll do a scatter instead

            # Scatter plot of home vs away PPM
            axes[1, 1].scatter(profiles_df['home_ppm'], profiles_df['away_ppm'],
                              alpha=0.6, s=60, c='steelblue', edgecolors='white')

            # Add diagonal line
            min_val = min(profiles_df['home_ppm'].min(), profiles_df['away_ppm'].min())
            max_val = max(profiles_df['home_ppm'].max(), profiles_df['away_ppm'].max())
            axes[1, 1].plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2,
                           label='Equal Performance')

            axes[1, 1].set_title('Home vs Away PPM by Team', fontweight='bold')
            axes[1, 1].set_xlabel('Home PPM')
            axes[1, 1].set_ylabel('Away PPM')
            axes[1, 1].legend()

            # Add annotation for home advantage
            home_adv = (profiles_df['home_ppm'] - profiles_df['away_ppm']).mean()
            axes[1, 1].annotate(f'Avg Home Advantage: {home_adv:+.2f} PPM',
                               xy=(0.05, 0.95), xycoords='axes fraction',
                               fontsize=10, fontweight='bold',
                               bbox=dict(boxstyle='round', facecolor='wheat'))
        else:
            axes[1, 1].text(0.5, 0.5, 'No home/away split data', ha='center', va='center')
            axes[1, 1].set_title('Home vs Away PPM', fontweight='bold')

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"team_profiles_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_matchup_analysis(self, save: bool = True) -> plt.Figure:
        """Visualize matchup type analysis and adjustments"""
        if 'matchup_type' not in self.projections.columns:
            print("No matchup data available - run with USE_TEAM_KALMAN=True")
            return None

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Matchup Analysis', fontsize=16, fontweight='bold')

        # 1. Matchup Type Distribution
        matchup_counts = self.projections.groupby('game_id')['matchup_type'].first().value_counts()
        colors_matchup = {
            'Both Slow': '#3498db',
            'Both Fast': '#e74c3c',
            'Both Normal': '#2ecc71',
            'Pace Mismatch': '#9b59b6',
            'Mixed (Slow)': '#1abc9c',
            'Mixed (Fast)': '#e67e22',
            'Normal': '#95a5a6',
        }
        bar_colors = [colors_matchup.get(m, '#bdc3c7') for m in matchup_counts.index]

        axes[0, 0].barh(matchup_counts.index, matchup_counts.values, color=bar_colors,
                       edgecolor='white', linewidth=2)
        axes[0, 0].set_title('Matchup Type Distribution', fontweight='bold')
        axes[0, 0].set_xlabel('Number of Games')

        for i, (mtype, count) in enumerate(matchup_counts.items()):
            pct = count / matchup_counts.sum() * 100
            axes[0, 0].text(count + 1, i, f'{pct:.1f}%', va='center', fontweight='bold')

        # 2. Average PPM by Matchup Type
        matchup_ppm = self.projections.groupby('matchup_type')['ppm'].mean().sort_values()
        bar_colors = [colors_matchup.get(m, '#bdc3c7') for m in matchup_ppm.index]

        bars = axes[0, 1].barh(matchup_ppm.index, matchup_ppm.values, color=bar_colors,
                              edgecolor='white', linewidth=2)
        axes[0, 1].set_title('Average PPM by Matchup Type', fontweight='bold')
        axes[0, 1].set_xlabel('Points Per Minute')
        axes[0, 1].axvline(x=matchup_ppm.mean(), color='black', linestyle='--',
                          linewidth=2, label=f'Overall Avg: {matchup_ppm.mean():.2f}')
        axes[0, 1].legend()

        for bar, ppm in zip(bars, matchup_ppm.values):
            axes[0, 1].text(ppm + 0.02, bar.get_y() + bar.get_height()/2,
                           f'{ppm:.2f}', va='center', fontweight='bold')

        # 3. Projection Error by Matchup Type
        final_projs = self.projections.groupby('game_id').last()
        final_projs['proj_error'] = final_projs['projected_total'] - final_projs['points_so_far']

        if 'matchup_type' in final_projs.columns:
            error_by_matchup = final_projs.groupby('matchup_type')['proj_error'].agg(['mean', 'std'])
            error_by_matchup = error_by_matchup.sort_values('mean')

            bar_colors = [colors_matchup.get(m, '#bdc3c7') for m in error_by_matchup.index]
            bars = axes[1, 0].barh(error_by_matchup.index, error_by_matchup['mean'],
                                  xerr=error_by_matchup['std'], capsize=5,
                                  color=bar_colors, edgecolor='white', linewidth=2)
            axes[1, 0].axvline(x=0, color='red', linestyle='--', linewidth=2)
            axes[1, 0].set_title('Projection Error by Matchup Type', fontweight='bold')
            axes[1, 0].set_xlabel('Projection Error (Projected - Actual)')
        else:
            axes[1, 0].text(0.5, 0.5, 'No matchup error data', ha='center', va='center')

        # 4. Pace Agreement vs Projection Accuracy
        if 'pace_agreement' in self.projections.columns:
            final_projs = self.projections.groupby('game_id').agg({
                'pace_agreement': 'first',
                'projected_total': 'last',
                'points_so_far': 'last'
            })
            final_projs['abs_error'] = abs(final_projs['projected_total'] - final_projs['points_so_far'])

            axes[1, 1].scatter(final_projs['pace_agreement'], final_projs['abs_error'],
                              alpha=0.5, s=60, c='steelblue', edgecolors='white')

            # Add trend line
            z = np.polyfit(final_projs['pace_agreement'], final_projs['abs_error'], 1)
            p = np.poly1d(z)
            x_line = np.linspace(final_projs['pace_agreement'].min(),
                                final_projs['pace_agreement'].max(), 100)
            axes[1, 1].plot(x_line, p(x_line), 'r-', linewidth=2, label='Trend')

            axes[1, 1].set_title('Pace Agreement vs Projection Error', fontweight='bold')
            axes[1, 1].set_xlabel('Pace Agreement (0-1)')
            axes[1, 1].set_ylabel('Absolute Projection Error')
            axes[1, 1].legend()
        else:
            axes[1, 1].text(0.5, 0.5, 'No pace agreement data', ha='center', va='center')

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"matchup_analysis_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_momentum_analysis(self, save: bool = True) -> plt.Figure:
        """Visualize momentum features (PPM delta, scoring runs)"""
        has_momentum = 'ppm_delta_3' in self.projections.columns
        has_runs = 'scoring_run' in self.projections.columns

        if not has_momentum and not has_runs:
            print("No momentum data available - run with USE_ENHANCED_FEATURES=True")
            return None

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Momentum Analysis', fontsize=16, fontweight='bold')

        # 1. PPM Delta Distribution
        if has_momentum:
            delta_data = self.projections['ppm_delta_3'].dropna()
            axes[0, 0].hist(delta_data, bins=40, edgecolor='white', alpha=0.7, color='steelblue')
            axes[0, 0].axvline(x=0, color='red', linestyle='--', linewidth=2, label='No Change')
            axes[0, 0].axvline(x=delta_data.mean(), color='green', linestyle='-', linewidth=2,
                              label=f'Mean: {delta_data.mean():.2f}')
            axes[0, 0].set_title('3-Minute PPM Delta Distribution', fontweight='bold')
            axes[0, 0].set_xlabel('PPM Change (3-min rolling)')
            axes[0, 0].set_ylabel('Frequency')
            axes[0, 0].legend()
        else:
            axes[0, 0].text(0.5, 0.5, 'No PPM delta data', ha='center', va='center')

        # 2. PPM Delta by Game Minute
        if has_momentum:
            delta_by_minute = self.projections.groupby('minute_index')['ppm_delta_3'].agg(['mean', 'std'])
            x_vals = delta_by_minute.index.values
            mean_vals = delta_by_minute['mean'].values
            std_vals = delta_by_minute['std'].values
            axes[0, 1].fill_between(x_vals, mean_vals - std_vals, mean_vals + std_vals,
                                   alpha=0.3, color='steelblue')
            axes[0, 1].plot(x_vals, mean_vals, linewidth=2, color='steelblue')
            axes[0, 1].axhline(y=0, color='red', linestyle='--', linewidth=1)
            axes[0, 1].set_title('Momentum Shift by Game Minute', fontweight='bold')
            axes[0, 1].set_xlabel('Minute of Game')
            axes[0, 1].set_ylabel('Average PPM Delta')
            axes[0, 1].set_xlim(0, 40)
        else:
            axes[0, 1].text(0.5, 0.5, 'No PPM delta data', ha='center', va='center')

        # 3. Scoring Run Distribution
        if has_runs:
            run_data = self.projections['scoring_run'].dropna()
            run_counts = run_data.value_counts().sort_index()

            colors = ['#e74c3c' if x < 0 else '#2ecc71' if x > 0 else '#95a5a6'
                     for x in run_counts.index]
            axes[1, 0].bar(run_counts.index, run_counts.values, color=colors,
                          edgecolor='white', linewidth=1)
            axes[1, 0].set_title('Scoring Run Distribution', fontweight='bold')
            axes[1, 0].set_xlabel('Scoring Run (+ = hot, - = cold)')
            axes[1, 0].set_ylabel('Frequency')
            axes[1, 0].axvline(x=0, color='black', linestyle='-', linewidth=2)
        else:
            axes[1, 0].text(0.5, 0.5, 'No scoring run data', ha='center', va='center')

        # 4. Scoring Run Impact on Projection
        if has_runs:
            # Group scoring runs into categories
            def categorize_run(x):
                if x <= -2:
                    return 'Cold (<-2)'
                elif x < 0:
                    return 'Cooling (-1)'
                elif x == 0:
                    return 'Neutral (0)'
                elif x <= 2:
                    return 'Heating (+1-2)'
                else:
                    return 'Hot (>+2)'

            self.projections['run_category'] = self.projections['scoring_run'].apply(categorize_run)

            run_impact = self.projections.groupby('run_category')['ppm'].mean()
            order = ['Cold (<-2)', 'Cooling (-1)', 'Neutral (0)', 'Heating (+1-2)', 'Hot (>+2)']
            run_impact = run_impact.reindex([o for o in order if o in run_impact.index])

            colors = ['#e74c3c', '#e67e22', '#95a5a6', '#f1c40f', '#2ecc71']
            bars = axes[1, 1].bar(run_impact.index, run_impact.values,
                                 color=colors[:len(run_impact)],
                                 edgecolor='white', linewidth=2)
            axes[1, 1].set_title('Average PPM During Scoring Runs', fontweight='bold')
            axes[1, 1].set_xlabel('Scoring Run Category')
            axes[1, 1].set_ylabel('Average PPM')
            axes[1, 1].tick_params(axis='x', rotation=30)

            for bar, ppm in zip(bars, run_impact.values):
                axes[1, 1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                               f'{ppm:.2f}', ha='center', fontweight='bold')

            # Cleanup temp column
            self.projections.drop('run_category', axis=1, inplace=True, errors='ignore')
        else:
            axes[1, 1].text(0.5, 0.5, 'No scoring run data', ha='center', va='center')

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"momentum_analysis_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_blowout_analysis(self, save: bool = True) -> plt.Figure:
        """Visualize blowout detection and its impact"""
        has_blowout = 'is_blowout' in self.projections.columns
        has_score_diff = 'score_diff' in self.projections.columns

        if not has_blowout and not has_score_diff:
            print("No blowout data available - run with USE_ENHANCED_FEATURES=True")
            return None

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Blowout & Context Analysis', fontsize=16, fontweight='bold')

        # 1. Score Differential Distribution by Minute
        if has_score_diff:
            # Sample every 5 minutes
            minutes = [5, 10, 15, 20, 25, 30, 35, 40]
            score_diffs = []
            for m in minutes:
                m_data = self.projections[self.projections['minute_index'] == m]['score_diff']
                if len(m_data) > 0:
                    score_diffs.append(m_data.values)

            if score_diffs:
                bp = axes[0, 0].boxplot(score_diffs, positions=minutes[:len(score_diffs)],
                                       widths=3, patch_artist=True)
                for patch in bp['boxes']:
                    patch.set_facecolor('steelblue')
                    patch.set_alpha(0.7)

                axes[0, 0].axhline(y=0, color='red', linestyle='--', linewidth=1)
                axes[0, 0].axhline(y=15, color='orange', linestyle='--', linewidth=1,
                                  label='Blowout threshold (+15)')
                axes[0, 0].axhline(y=-15, color='orange', linestyle='--', linewidth=1)
                axes[0, 0].set_title('Score Differential by Game Minute', fontweight='bold')
                axes[0, 0].set_xlabel('Minute of Game')
                axes[0, 0].set_ylabel('Score Differential (Home - Away)')
                axes[0, 0].legend()
        else:
            axes[0, 0].text(0.5, 0.5, 'No score diff data', ha='center', va='center')

        # 2. Blowout Occurrence by Minute
        if has_blowout:
            blowout_by_min = self.projections.groupby('minute_index')['is_blowout'].mean() * 100
            x_vals = blowout_by_min.index.values
            y_vals = blowout_by_min.values
            axes[0, 1].fill_between(x_vals, 0, y_vals, alpha=0.5, color='#e74c3c')
            axes[0, 1].plot(x_vals, y_vals, linewidth=2, color='#c0392b')
            axes[0, 1].set_title('% of Games in Blowout by Minute', fontweight='bold')
            axes[0, 1].set_xlabel('Minute of Game')
            axes[0, 1].set_ylabel('% of Games')
            axes[0, 1].set_xlim(0, 40)
            axes[0, 1].set_ylim(0, None)
        else:
            axes[0, 1].text(0.5, 0.5, 'No blowout data', ha='center', va='center')

        # 3. PPM in Blowout vs Non-Blowout
        if has_blowout:
            ppm_blowout = self.projections[self.projections['is_blowout'] == 1]['ppm']
            ppm_normal = self.projections[self.projections['is_blowout'] == 0]['ppm']

            data_to_plot = [ppm_normal.values, ppm_blowout.values]
            bp = axes[1, 0].boxplot(data_to_plot, labels=['Normal', 'Blowout'],
                                   patch_artist=True)
            bp['boxes'][0].set_facecolor('#2ecc71')
            bp['boxes'][1].set_facecolor('#e74c3c')

            axes[1, 0].set_title('PPM: Normal vs Blowout Games', fontweight='bold')
            axes[1, 0].set_ylabel('Points Per Minute')

            # Add means
            axes[1, 0].scatter([1, 2], [ppm_normal.mean(), ppm_blowout.mean()],
                              color='black', s=100, zorder=5, marker='D', label='Mean')
            axes[1, 0].legend()

            # Annotation
            diff = ppm_blowout.mean() - ppm_normal.mean()
            axes[1, 0].annotate(f'Blowout PPM {diff:+.2f}',
                               xy=(0.5, 0.95), xycoords='axes fraction',
                               fontsize=11, fontweight='bold',
                               bbox=dict(boxstyle='round', facecolor='wheat'))
        else:
            axes[1, 0].text(0.5, 0.5, 'No blowout data', ha='center', va='center')

        # 4. Half-by-Half Analysis
        if 'half_indicator' in self.projections.columns:
            half_stats = self.projections.groupby('half_indicator').agg({
                'ppm': ['mean', 'std'],
                'game_id': 'count'
            })
            half_stats.columns = ['ppm_mean', 'ppm_std', 'count']

            x = ['1st Half', '2nd Half']
            bars = axes[1, 1].bar(x, half_stats['ppm_mean'].values,
                                 yerr=half_stats['ppm_std'].values,
                                 capsize=5, color=['#3498db', '#9b59b6'],
                                 edgecolor='white', linewidth=2)
            axes[1, 1].set_title('Average PPM by Half', fontweight='bold')
            axes[1, 1].set_ylabel('Points Per Minute')

            for bar, mean in zip(bars, half_stats['ppm_mean'].values):
                axes[1, 1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                               f'{mean:.2f}', ha='center', fontweight='bold')
        else:
            axes[1, 1].text(0.5, 0.5, 'No half indicator data', ha='center', va='center')

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"blowout_analysis_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_team_kalman_adjustments(self, save: bool = True) -> plt.Figure:
        """Visualize team-specific Kalman filter adjustments"""
        has_kalman_cov = 'kalman_covariance' in self.projections.columns

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Team-Adaptive Kalman Filter Analysis', fontsize=16, fontweight='bold')

        # 1. Q/R Distribution by Pace Category
        if 'home_pace' in self.projections.columns:
            q_by_pace = self.projections.groupby('home_pace')['kalman_Q'].mean()
            r_by_pace = self.projections.groupby('home_pace')['kalman_R'].mean()

            pace_order = ['Slow', 'Normal', 'Fast']
            q_by_pace = q_by_pace.reindex([p for p in pace_order if p in q_by_pace.index])
            r_by_pace = r_by_pace.reindex([p for p in pace_order if p in r_by_pace.index])

            x = np.arange(len(q_by_pace))
            width = 0.35

            bars1 = axes[0, 0].bar(x - width/2, q_by_pace.values, width, label='Q (Process)',
                                  color='#3498db', edgecolor='white')
            bars2 = axes[0, 0].bar(x + width/2, r_by_pace.values, width, label='R (Measurement)',
                                  color='#e74c3c', edgecolor='white')

            axes[0, 0].set_xticks(x)
            axes[0, 0].set_xticklabels(q_by_pace.index)
            axes[0, 0].set_title('Average Q/R by Team Pace', fontweight='bold')
            axes[0, 0].set_ylabel('Noise Covariance')
            axes[0, 0].legend()
        else:
            axes[0, 0].text(0.5, 0.5, 'No pace data for Q/R analysis', ha='center', va='center')

        # 2. Kalman Covariance Evolution by Pace
        if has_kalman_cov and 'home_pace' in self.projections.columns:
            for pace in ['Slow', 'Normal', 'Fast']:
                pace_data = self.projections[self.projections['home_pace'] == pace]
                if len(pace_data) > 0:
                    cov_by_min = pace_data.groupby('minute_index')['kalman_covariance'].mean()
                    color = {'Slow': '#3498db', 'Normal': '#2ecc71', 'Fast': '#e74c3c'}.get(pace, '#95a5a6')
                    axes[0, 1].plot(cov_by_min.index.values, cov_by_min.values,
                                   linewidth=2, label=pace, color=color)

            axes[0, 1].set_title('Kalman Covariance by Pace Category', fontweight='bold')
            axes[0, 1].set_xlabel('Minute of Game')
            axes[0, 1].set_ylabel('Kalman Covariance (Uncertainty)')
            axes[0, 1].legend()
            axes[0, 1].set_xlim(0, 40)
        else:
            axes[0, 1].text(0.5, 0.5, 'No covariance data', ha='center', va='center')

        # 3. Filter Responsiveness (Kalman Gain) by Matchup Type
        if 'matchup_type' in self.projections.columns:
            gain_by_matchup = self.projections.groupby('matchup_type')['kalman_gain'].mean().sort_values()
            colors = plt.cm.viridis(np.linspace(0.2, 0.8, len(gain_by_matchup)))

            bars = axes[1, 0].barh(gain_by_matchup.index, gain_by_matchup.values,
                                  color=colors, edgecolor='white', linewidth=2)
            axes[1, 0].set_title('Average Kalman Gain by Matchup Type', fontweight='bold')
            axes[1, 0].set_xlabel('Kalman Gain (Filter Responsiveness)')

            for bar, gain in zip(bars, gain_by_matchup.values):
                axes[1, 0].text(gain + 0.005, bar.get_y() + bar.get_height()/2,
                               f'{gain:.3f}', va='center', fontweight='bold')
        else:
            axes[1, 0].text(0.5, 0.5, 'No matchup data for gain analysis', ha='center', va='center')

        # 4. Projection Accuracy by Kalman Covariance
        if has_kalman_cov:
            final_projs = self.projections.groupby('game_id').agg({
                'kalman_covariance': 'last',
                'projected_total': 'last',
                'points_so_far': 'last'
            })
            final_projs['abs_error'] = abs(final_projs['projected_total'] - final_projs['points_so_far'])

            # Bin covariance
            final_projs['cov_bin'] = pd.qcut(final_projs['kalman_covariance'], 5,
                                            labels=['Very Low', 'Low', 'Medium', 'High', 'Very High'],
                                            duplicates='drop')

            error_by_cov = final_projs.groupby('cov_bin')['abs_error'].mean()

            colors = plt.cm.RdYlGn_r(np.linspace(0.2, 0.8, len(error_by_cov)))
            bars = axes[1, 1].bar(error_by_cov.index, error_by_cov.values,
                                 color=colors, edgecolor='white', linewidth=2)
            axes[1, 1].set_title('Projection Error by Final Covariance', fontweight='bold')
            axes[1, 1].set_xlabel('Covariance Level')
            axes[1, 1].set_ylabel('Average Absolute Error')
            axes[1, 1].tick_params(axis='x', rotation=30)
        else:
            axes[1, 1].text(0.5, 0.5, 'No covariance data', ha='center', va='center')

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"team_kalman_adjustments_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_betting_signals(self, signals_df: pd.DataFrame, save: bool = True) -> plt.Figure:
        """Visualize betting signal analysis"""
        if signals_df is None or len(signals_df) == 0:
            print("No betting signals data provided")
            return None

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Betting Signal Analysis', fontsize=16, fontweight='bold')

        # 1. Confidence Distribution
        if 'confidence' in signals_df.columns:
            axes[0, 0].hist(signals_df['confidence'], bins=20, edgecolor='white',
                           alpha=0.7, color='steelblue')
            axes[0, 0].axvline(x=50, color='orange', linestyle='--', linewidth=2, label='Min (50)')
            axes[0, 0].axvline(x=70, color='green', linestyle='--', linewidth=2, label='Strong (70)')
            axes[0, 0].axvline(x=signals_df['confidence'].mean(), color='red', linestyle='-',
                              linewidth=2, label=f"Mean: {signals_df['confidence'].mean():.0f}")
            axes[0, 0].set_title('Signal Confidence Distribution', fontweight='bold')
            axes[0, 0].set_xlabel('Confidence Score')
            axes[0, 0].set_ylabel('Number of Signals')
            axes[0, 0].legend()

        # 2. Edge Distribution by Direction
        if 'edge_pct' in signals_df.columns and 'direction' in signals_df.columns:
            for direction in ['OVER', 'UNDER']:
                dir_data = signals_df[signals_df['direction'] == direction]['edge_pct']
                if len(dir_data) > 0:
                    color = '#2ecc71' if direction == 'OVER' else '#e74c3c'
                    axes[0, 1].hist(dir_data, bins=15, alpha=0.6, label=direction,
                                   color=color, edgecolor='white')

            axes[0, 1].set_title('Edge Distribution by Direction', fontweight='bold')
            axes[0, 1].set_xlabel('Edge %')
            axes[0, 1].set_ylabel('Number of Signals')
            axes[0, 1].legend()

        # 3. Unit Size Distribution
        if 'unit_size' in signals_df.columns:
            unit_counts = signals_df['unit_size'].value_counts().sort_index()
            colors = ['#f1c40f', '#e67e22', '#e74c3c', '#c0392b']

            bars = axes[1, 0].bar(unit_counts.index.astype(str), unit_counts.values,
                                 color=colors[:len(unit_counts)], edgecolor='white', linewidth=2)
            axes[1, 0].set_title('Unit Size Distribution', fontweight='bold')
            axes[1, 0].set_xlabel('Units')
            axes[1, 0].set_ylabel('Number of Signals')

            for bar, count in zip(bars, unit_counts.values):
                pct = count / len(signals_df) * 100
                axes[1, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                               f'{pct:.0f}%', ha='center', fontweight='bold')

        # 4. Signals by Game Minute
        if 'minute' in signals_df.columns:
            signals_by_min = signals_df.groupby('minute').size()
            x_vals = signals_by_min.index.values
            y_vals = signals_by_min.values
            axes[1, 1].fill_between(x_vals, 0, y_vals, alpha=0.5, color='steelblue')
            axes[1, 1].plot(x_vals, y_vals, linewidth=2, color='#2c3e50')
            axes[1, 1].set_title('Betting Signals by Game Minute', fontweight='bold')
            axes[1, 1].set_xlabel('Minute of Game')
            axes[1, 1].set_ylabel('Number of Signals')
            axes[1, 1].set_xlim(0, 40)

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"betting_signals_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_efficiency_analysis(self, save: bool = True) -> plt.Figure:
        """Visualize efficiency metrics (PPP)"""
        has_ppp = 'ppp_total' in self.projections.columns

        if not has_ppp:
            print("No efficiency data available - run with USE_ENHANCED_FEATURES=True")
            return None

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Efficiency Analysis', fontsize=16, fontweight='bold')

        # 1. PPP Distribution
        ppp_data = self.projections['ppp_total'].dropna()
        ppp_data = ppp_data[ppp_data > 0]  # Filter zeros

        axes[0, 0].hist(ppp_data, bins=30, edgecolor='white', alpha=0.7, color='steelblue')
        axes[0, 0].axvline(x=1.0, color='red', linestyle='--', linewidth=2, label='1.0 PPP (Baseline)')
        axes[0, 0].axvline(x=ppp_data.mean(), color='green', linestyle='-', linewidth=2,
                          label=f'Mean: {ppp_data.mean():.2f}')
        axes[0, 0].set_title('Points Per Possession Distribution', fontweight='bold')
        axes[0, 0].set_xlabel('PPP')
        axes[0, 0].set_ylabel('Frequency')
        axes[0, 0].legend()

        # 2. PPP by Game Minute
        ppp_by_min = self.projections.groupby('minute_index')['ppp_total'].agg(['mean', 'std'])
        x_vals = ppp_by_min.index.values
        mean_vals = ppp_by_min['mean'].values
        std_vals = ppp_by_min['std'].values
        axes[0, 1].fill_between(x_vals, mean_vals - std_vals, mean_vals + std_vals,
                               alpha=0.3, color='steelblue')
        axes[0, 1].plot(x_vals, mean_vals, linewidth=2, color='steelblue')
        axes[0, 1].axhline(y=1.0, color='red', linestyle='--', linewidth=1)
        axes[0, 1].set_title('Efficiency by Game Minute', fontweight='bold')
        axes[0, 1].set_xlabel('Minute of Game')
        axes[0, 1].set_ylabel('Points Per Possession')
        axes[0, 1].set_xlim(0, 40)

        # 3. PPP by HMM State
        if 'hmm_state_label' in self.projections.columns:
            ppp_by_state = self.projections.groupby('hmm_state_label')['ppp_total'].mean()
            state_colors = {'Slow': '#3498db', 'Normal': '#2ecc71', 'Fast': '#e74c3c',
                           'Foul/Endgame': '#9b59b6'}
            bar_colors = [state_colors.get(s, '#95a5a6') for s in ppp_by_state.index]

            bars = axes[1, 0].bar(ppp_by_state.index, ppp_by_state.values,
                                 color=bar_colors, edgecolor='white', linewidth=2)
            axes[1, 0].axhline(y=1.0, color='red', linestyle='--', linewidth=1)
            axes[1, 0].set_title('Efficiency by Game Regime', fontweight='bold')
            axes[1, 0].set_xlabel('HMM State')
            axes[1, 0].set_ylabel('Average PPP')

            for bar, ppp in zip(bars, ppp_by_state.values):
                axes[1, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
                               f'{ppp:.2f}', ha='center', fontweight='bold')
        else:
            axes[1, 0].text(0.5, 0.5, 'No HMM state data', ha='center', va='center')

        # 4. PPP vs PPM Scatter (Efficiency vs Volume)
        sample = self.projections.sample(min(5000, len(self.projections)))
        axes[1, 1].scatter(sample['ppm'], sample['ppp_total'], alpha=0.3, s=30,
                          c='steelblue', edgecolors='none')
        axes[1, 1].axhline(y=1.0, color='red', linestyle='--', linewidth=1, label='1.0 PPP')
        axes[1, 1].set_title('Efficiency vs Scoring Volume', fontweight='bold')
        axes[1, 1].set_xlabel('Points Per Minute')
        axes[1, 1].set_ylabel('Points Per Possession')
        axes[1, 1].legend()

        plt.tight_layout()

        if save:
            filepath = self.output_dir / f"efficiency_analysis_{self.timestamp}.png"
            plt.savefig(filepath, dpi=150, bbox_inches='tight', facecolor='white')
            print(f"Saved: {filepath}")

        return fig

    def plot_all(self, show: bool = False, signals_df: pd.DataFrame = None,
                 profiles_df: pd.DataFrame = None) -> List[plt.Figure]:
        """Generate all visualizations"""
        print("Generating visualizations...")
        print("=" * 50)

        figs = []

        print("\n1. State Distribution...")
        figs.append(self.plot_state_distribution())

        print("\n2. Team PPM Comparison...")
        figs.append(self.plot_team_ppm_comparison())

        print("\n3. Projection Evolution...")
        figs.append(self.plot_projection_evolution())

        print("\n4. Kalman Filter Analysis...")
        figs.append(self.plot_kalman_filter_analysis())

        print("\n5. Team Regime Heatmap...")
        fig = self.plot_team_regime_heatmap()
        if fig:
            figs.append(fig)

        print("\n6. Over/Under Analysis...")
        figs.append(self.plot_over_under_analysis())

        # Enhanced visualizations
        print("\n7. Team Profiles...")
        fig = self.plot_team_profiles(profiles_df)
        if fig:
            figs.append(fig)

        print("\n8. Matchup Analysis...")
        fig = self.plot_matchup_analysis()
        if fig:
            figs.append(fig)

        print("\n9. Momentum Analysis...")
        fig = self.plot_momentum_analysis()
        if fig:
            figs.append(fig)

        print("\n10. Blowout Analysis...")
        fig = self.plot_blowout_analysis()
        if fig:
            figs.append(fig)

        print("\n11. Team Kalman Adjustments...")
        fig = self.plot_team_kalman_adjustments()
        if fig:
            figs.append(fig)

        print("\n12. Efficiency Analysis...")
        fig = self.plot_efficiency_analysis()
        if fig:
            figs.append(fig)

        if signals_df is not None and len(signals_df) > 0:
            print("\n13. Betting Signals...")
            fig = self.plot_betting_signals(signals_df)
            if fig:
                figs.append(fig)

        print("\n" + "=" * 50)
        print(f"All charts saved to: {self.output_dir}")

        if show:
            plt.show()

        return figs


def generate_visualizations(
    projections_csv: str,
    pbp_csv: str = None,
    team_stats_csv: str = None,
    signals_csv: str = None,
    profiles_csv: str = None,
    output_dir: str = "outputs/charts"
):
    """
    Generate all visualizations from CSV files

    Args:
        projections_csv: Path to pj_results CSV
        pbp_csv: Path to minute bins CSV (with team names)
        team_stats_csv: Path to team stats CSV
        signals_csv: Path to betting signals CSV
        profiles_csv: Path to team profiles CSV
        output_dir: Where to save charts
    """
    print(f"Loading projections from {projections_csv}")
    projections = pd.read_csv(projections_csv)

    pbp = pd.read_csv(pbp_csv) if pbp_csv else None
    team_stats = pd.read_csv(team_stats_csv) if team_stats_csv else None
    signals = pd.read_csv(signals_csv) if signals_csv else None
    profiles = pd.read_csv(profiles_csv) if profiles_csv else None

    viz = PJVisualizer(projections, pbp, team_stats, output_dir)
    viz.plot_all(signals_df=signals, profiles_df=profiles)


if __name__ == "__main__":
    import click

    @click.command()
    @click.option("--projections", "-p", required=True, help="Path to pj_results CSV")
    @click.option("--pbp", "-b", default=None, help="Path to minute bins CSV")
    @click.option("--team-stats", "-t", default=None, help="Path to team stats CSV")
    @click.option("--signals", "-s", default=None, help="Path to betting signals CSV")
    @click.option("--profiles", "-r", default=None, help="Path to team profiles CSV")
    @click.option("--output", "-o", default="outputs/charts", help="Output directory")
    @click.option("--show", is_flag=True, help="Show plots interactively")
    def main(projections, pbp, team_stats, signals, profiles, output, show):
        """Generate visualizations for PJ model results

        Examples:
            # Basic visualization
            python visualize.py -p outputs/season_game_summaries.csv

            # With betting signals and team profiles
            python visualize.py -p outputs/projections.csv -s outputs/betting_signals.csv -r outputs/team_profiles.csv

            # Show plots interactively
            python visualize.py -p outputs/projections.csv --show
        """
        proj_df = pd.read_csv(projections)
        pbp_df = pd.read_csv(pbp) if pbp else None
        team_df = pd.read_csv(team_stats) if team_stats else None
        signals_df = pd.read_csv(signals) if signals else None
        profiles_df = pd.read_csv(profiles) if profiles else None

        viz = PJVisualizer(proj_df, pbp_df, team_df, output)
        viz.plot_all(show=show, signals_df=signals_df, profiles_df=profiles_df)

    main()

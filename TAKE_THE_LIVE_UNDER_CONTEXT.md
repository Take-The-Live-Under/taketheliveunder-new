# Take The Live Under - Project Context Document

## Executive Summary

**Take The Live Under** is an intelligent live betting system for NCAA basketball that identifies profitable under opportunities in real-time. The system combines advanced statistical modeling (Hidden Markov Models + Kalman Filtering) with live odds data to generate high-confidence betting signals.

**Core Thesis**: Live betting markets are inefficient, especially for totals. Games that start slow often see inflated live over/under lines as books overcorrect. Our model detects when a game's pace regime makes the under profitable.

---

## Product Overview

### What It Does
1. **Monitors live NCAA basketball games** (polls every 30 seconds)
2. **Calculates required PPM** (Points Per Minute) to hit the current over/under line
3. **Detects game pace regimes** using machine learning (HMM)
4. **Projects final totals** with adaptive Kalman filtering
5. **Generates betting signals** with confidence scores and unit sizing
6. **Tracks performance** with detailed logging and analytics

### The Edge
- Books set live lines based on current score + time remaining (linear extrapolation)
- Our model understands **game regimes** (slow pace, fast pace, garbage time)
- When a game is in a "slow regime" but the line hasn't adjusted, we have edge
- Team-specific adjustments: Virginia plays slow, Gonzaga plays fast - we know this

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     TAKE THE LIVE UNDER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Odds API    │───▶│   Monitor    │───▶│  Dashboard   │      │
│  │  (Live Data) │    │   (Python)   │    │  (Next.js)   │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              PJ MODEL (HMM + Kalman)                 │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │  • Team Profiles (716 teams, pace/variance)          │      │
│  │  • HMM Regime Detection (4 states)                   │      │
│  │  • Adaptive Kalman Filter (team-specific Q/R)        │      │
│  │  • Betting Signal Calculator (edge/confidence)       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input**: Live game scores, time remaining, current O/U line
2. **Processing**:
   - Calculate current PPM
   - Detect regime via HMM
   - Filter noise via Kalman
   - Apply team adjustments
   - Project final total
3. **Output**: Betting signal with direction, edge %, confidence, units

---

## The PJ Model (Core Intelligence)

### Hidden Markov Model (HMM)

**Purpose**: Detect what "regime" a game is currently in

**4 Hidden States**:
| State | Description | Characteristics |
|-------|-------------|-----------------|
| Slow | Low-scoring, methodical play | PPM < 3.0, fewer possessions |
| Normal | Average pace | PPM 3.0-4.0 |
| Fast | High-scoring, up-tempo | PPM > 4.0, many possessions |
| Foul/Endgame | Late-game fouling, garbage time | High variance, erratic |

**Training**: 4,026 games, 162,109 minute-by-minute observations

**Features Used**:
- PPM (Points Per Minute)
- POSM (Possessions Per Minute)
- FOULM (Fouls Per Minute)
- TOVM (Turnovers Per Minute)

### Kalman Filter

**Purpose**: Smooth noisy minute-by-minute data and project future PPM

**Key Innovation - Team-Adaptive Q/R**:
- **Q (Process Noise)**: Higher for volatile teams → more responsive filter
- **R (Measurement Noise)**: Lower for consistent teams → trust measurements more

**Adjustments Applied**:
1. Late-game adjustment (last 6 minutes: Q×2, R×0.5)
2. Regime adjustment (Fast regime: Q×1.5, R×0.7)
3. Team adjustment (based on season variance)

### Enhanced Features

| Feature | Description | Purpose |
|---------|-------------|---------|
| `ppp_total` | Points per possession | Efficiency metric |
| `ppm_delta_3` | 3-min rolling PPM change | Momentum detection |
| `scoring_run` | Consecutive hot/cold minutes | Streak detection |
| `score_diff` | Current margin | Blowout context |
| `is_blowout` | Margin > 15 after minute 8 | Garbage time flag |
| `half_indicator` | 1st vs 2nd half | Half-specific patterns |

### Team Profiles (716 Teams)

Each team has a profile containing:
- `avg_ppm` - Season average PPM
- `pace_category` - Fast / Normal / Slow
- `ppm_variance` - For Kalman Q tuning
- `home_ppm` / `away_ppm` - Venue splits
- `q_multiplier` / `r_multiplier` - Kalman adjustments

### Matchup Model

Adjusts projections based on matchup type:
- **Both Slow**: Reduce projected total by ~6 points
- **Both Fast**: Increase projected total by ~6 points
- **Pace Mismatch**: Higher uncertainty, wider confidence interval
- **Home Court**: +0.1 PPM boost for home team

---

## Betting Signal Generation

### Signal Components

```python
BettingSignal:
  - direction: "OVER" | "UNDER" | "NO_PLAY"
  - edge_pct: float  # (projected - line) / line * 100
  - confidence: int  # 0-100 score
  - unit_size: float  # 0.5, 1, 2, or 3 units
  - reasoning: list[str]  # Human-readable explanations
```

### Confidence Scoring

Weighted combination of:
- **Edge Weight (40%)**: Larger edge = higher confidence
- **Time Weight (20%)**: Later in game = more certainty
- **Covariance Weight (20%)**: Lower Kalman uncertainty = more confident
- **Matchup Weight (20%)**: Favorable matchup = bonus confidence

### Unit Sizing

| Confidence | Units | Interpretation |
|------------|-------|----------------|
| 80+ | 3 | Strong play |
| 70-79 | 2 | Good play |
| 60-69 | 1 | Standard play |
| 50-59 | 0.5 | Small play |
| <50 | 0 | No play |

### Minimum Thresholds
- Minimum edge: 2%
- Minimum minutes elapsed: 4
- Assumed odds: -110

---

## Current Performance Metrics

### Dataset (2025-26 Season)
- **Games Analyzed**: 4,026
- **Minute Bins**: 162,109
- **Teams Profiled**: 716
- **Betting Signals Generated**: 128,081

### Team Distribution
- **Fast Pace Teams**: New Mexico State, Sam Houston, FIU, Liberty, WKU
- **Slow Pace Teams**: Louisiana Tech, Louisiana, Maine, William Carey

---

## User Interface

### Dashboard Features
- Live game cards with real-time updates
- Color-coded confidence indicators
- Historical performance tracking
- Admin panel for weight adjustments

### Alert System (Planned)
- Discord/Telegram notifications for high-confidence signals
- Customizable thresholds per user
- Real-time push notifications

---

## Marketing Angles

### Target Audience
1. **Sports Bettors**: Serious bettors looking for an edge in live markets
2. **Data Enthusiasts**: People who appreciate the math/ML behind the system
3. **DFS Players**: Crossover audience interested in basketball analytics

### Key Differentiators
1. **Not just another tout**: Open about methodology, shows the math
2. **Real-time adaptation**: Adjusts as game flows, not static predictions
3. **Team-aware**: Knows Virginia plays different than Gonzaga
4. **Transparent tracking**: All signals logged, performance verifiable

### Messaging Themes
- "The books use simple math. We use machine learning."
- "Every game has a personality. Our model listens."
- "Live unders are mispriced. Here's the proof."
- "716 team profiles. 4 hidden states. 1 edge."

### Content Ideas
1. **Educational**: "How HMMs detect game pace shifts"
2. **Case Studies**: "How we caught the Duke-UNC under"
3. **Transparency**: Weekly performance reports
4. **Behind the Scenes**: Model training, backtesting results

---

## Agent Design Considerations

### For Building Betting Agents

**Input Requirements**:
```python
{
  "game_id": str,
  "home_team": str,
  "away_team": str,
  "current_minute": int,
  "home_score": int,
  "away_score": int,
  "ou_line": float,
  "home_possessions": int,  # optional
  "away_possessions": int,  # optional
}
```

**Output Format**:
```python
{
  "signal": "UNDER" | "OVER" | "NO_PLAY",
  "projected_total": float,
  "edge_pct": float,
  "confidence": int,
  "units": float,
  "reasoning": [str],
  "regime": "Slow" | "Normal" | "Fast" | "Foul/Endgame",
  "matchup_type": str,
}
```

### Integration Points

1. **PJModelIntegration Class**: Main entry point
   - `initialize_game()` - Set up tracking for new game
   - `update_game()` - Process new minute data
   - `get_live_projection()` - Get current signal

2. **Pre-trained Assets**:
   - `team_profiles_*.csv` - Team baselines
   - `hmm_model_*.pkl` - Trained HMM + scaler

3. **Configuration**:
   - Feature flags: `USE_ENHANCED_FEATURES`, `USE_TEAM_KALMAN`, `GENERATE_BETTING_SIGNALS`
   - Betting config: `min_edge_pct`, `confidence_tiers`, `min_minutes_for_bet`

### For Marketing/Content Agents

**Key Stats to Reference**:
- 4,026 games analyzed
- 716 team profiles
- 4 HMM states
- 128K+ betting signals generated
- Team-specific Kalman adjustments

**Tone Guidelines**:
- Confident but not arrogant
- Data-driven, show the work
- Accessible to non-technical audience
- Emphasize edge, not guarantees

**Avoid**:
- Promising specific win rates
- "Get rich quick" language
- Disparaging other services
- Oversimplifying the complexity

---

## File Structure Reference

```
pj_hmm_kalman_model/
├── config.py                 # All configuration
├── src/
│   ├── data_loader.py        # Feature engineering
│   ├── hmm_model.py          # HMM regime detection
│   ├── kalman_filter.py      # Adaptive Kalman + team-specific
│   ├── team_profiles.py      # Team baseline management
│   ├── matchup_model.py      # Matchup adjustments
│   ├── betting_signals.py    # Signal generation
│   ├── backtester.py         # Historical validation
│   ├── monitor_integration.py # Live integration
│   ├── run_full_season.py    # Main pipeline
│   └── visualize.py          # 13 visualization types
└── outputs/
    ├── team_profiles_*.csv
    ├── betting_signals_*.csv
    ├── hmm_model_*.pkl
    └── charts/YYYYMMDD/       # Dated visualization folders
```

---

## Quick Reference Commands

```bash
# Run full analysis
python src/run_full_season.py --skip-fetch

# Generate visualizations only
python src/visualize.py -p outputs/season_game_summaries_*.csv

# Run backtester
python src/backtester.py -p outputs/season_game_summaries_*.csv

# Test team profiles
python -c "from src.team_profiles import get_team_profile_manager; pm = get_team_profile_manager(); pm.load_profiles('outputs/team_profiles_*.csv'); print(pm.get_team_baseline('Duke').to_dict())"
```

---

## Glossary

| Term | Definition |
|------|------------|
| PPM | Points Per Minute - total points scored in a minute bin |
| HMM | Hidden Markov Model - detects unobservable game "states" |
| Kalman Filter | Algorithm that smooths noisy data and projects future values |
| Q | Process noise - how much the true state can change between steps |
| R | Measurement noise - how much we trust each observation |
| Regime | Current game state (Slow/Normal/Fast/Foul-Endgame) |
| Edge | Difference between our projection and the betting line |
| Covariance | Uncertainty in the Kalman filter's estimate |

---

*Last Updated: January 30, 2026*
*Model Version: PJ HMM+Kalman v2.0 (Enhanced)*

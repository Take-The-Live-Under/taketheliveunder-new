# HMM + Kalman Filter PJ Model

NCAA Men's Basketball Projected Total (PJ) prediction model combining Hidden Markov Models and Kalman Filters on play-by-play minute bin data.

## Overview

This model uses two complementary statistical techniques:

1. **Hidden Markov Model (GaussianHMM)**: Detects latent game "regimes" (fast pace, slow pace, foul-heavy, etc.) from minute-by-minute statistics
2. **Adaptive Kalman Filters**: Smooths noisy per-minute metrics with context-aware noise parameters that adjust based on:
   - HMM-detected regime (fast regime = higher process noise)
   - Game phase (late-game = more responsive filtering)

## Installation

```bash
cd pj_hmm_kalman_model
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Usage

### Basic Usage

```bash
python src/run_pj.py --input data/pbp_minute_bins.csv --k_states 4
```

### Full Options

```bash
python src/run_pj.py \
    --input data/pbp_minute_bins.csv \
    --k_states 4 \
    --outdir outputs \
    --verbose
```

### CLI Arguments

| Argument | Short | Default | Description |
|----------|-------|---------|-------------|
| `--input` | `-i` | (required) | Path to input CSV file |
| `--k_states` | `-k` | 4 | Number of HMM hidden states |
| `--outdir` | `-o` | `outputs/` | Output directory |
| `--verbose` | `-v` | False | Enable debug logging |
| `--dry-run` | | False | Validate data without processing |

## Input Data Format

The input CSV (`data/pbp_minute_bins.csv`) must have these columns:

| Column | Type | Description |
|--------|------|-------------|
| `game_id` | string | Unique game identifier |
| `minute_index` | int | Minute of the game (0-39 for regulation) |
| `points_home` | int | Points scored by home team this minute |
| `points_away` | int | Points scored by away team this minute |
| `poss_home` | int | Possessions by home team this minute |
| `poss_away` | int | Possessions by away team this minute |
| `fouls_home` | int | Fouls by home team this minute |
| `fouls_away` | int | Fouls by away team this minute |
| `to_home` | int | Turnovers by home team this minute |
| `to_away` | int | Turnovers by away team this minute |

### Example Input

```csv
game_id,minute_index,points_home,points_away,poss_home,poss_away,fouls_home,fouls_away,to_home,to_away
401706001,0,2,0,2,2,0,1,0,0
401706001,1,3,2,2,2,1,0,1,0
401706001,2,0,3,2,3,0,1,0,1
...
```

## Output Files

The model generates three output files in the `outputs/` directory:

### 1. `pj_results_<timestamp>.csv`

Per-minute projections with columns:
- `game_id`: Game identifier
- `minute_index`: Current minute
- `minutes_remaining`: Minutes left
- `points_so_far`: Cumulative points
- `raw_ppm`: Raw points per minute this bin
- `filtered_ppm`: Kalman-filtered PPM
- `expected_ppm`: Blended expected PPM
- `projected_total`: Projected final total
- `hmm_state`: Detected regime (0-3)
- `hmm_state_label`: Human-readable regime label
- `state_N_prob`: Probability of being in state N
- `kalman_gain`: Current Kalman gain
- `kalman_Q`, `kalman_R`: Adaptive filter parameters

### 2. `state_profiles_<timestamp>.csv`

HMM state characteristics:
- `state_id`: State index
- `label`: Regime label (Slow, Normal, Fast, Foul/Endgame)
- `regime_rank`: Rank by pace (0=slowest)
- `mean_ppm`: Mean standardized PPM for this state
- `mean_posm`: Mean standardized possessions
- `var_ppm`, `var_posm`: Variances

### 3. `summary_report_<timestamp>.txt`

Human-readable summary including:
- Data statistics
- Projection statistics
- State distribution
- Kalman filter summary

## Configuration

All tunable parameters are in `config.py`:

### HMM Settings

```python
HMM_CONFIG = {
    "n_states": 4,              # Number of hidden states
    "covariance_type": "diag",  # HMM covariance type
    "n_iter": 100,              # EM iterations
    "features": ["ppm", "posm", "foulm", "tovm"],
}
```

### Kalman Filter Settings

```python
KALMAN_CONFIG = {
    "Q_default": 0.1,           # Process noise (responsiveness)
    "R_default": 1.0,           # Measurement noise (smoothness)
    "late_game_threshold": 6,   # Minutes for late-game adjustment
    "late_game_Q_multiplier": 2.0,
    "late_game_R_multiplier": 0.5,
}
```

### Regime-Based Adjustments

```python
REGIME_KALMAN_ADJUSTMENTS = {
    0: {"Q_mult": 0.5, "R_mult": 1.5, "name": "Slow"},
    1: {"Q_mult": 1.0, "R_mult": 1.0, "name": "Normal"},
    2: {"Q_mult": 1.5, "R_mult": 0.7, "name": "Fast"},
    3: {"Q_mult": 2.0, "R_mult": 0.5, "name": "Foul/Endgame"},
}
```

## How It Works

### 1. Data Loading & Feature Engineering

```
Raw CSV → Derived Features (ppm, posm, foulm, tovm) → Z-score Standardization
```

### 2. HMM Regime Detection

The GaussianHMM learns:
- **Transition matrix**: Probability of switching between regimes
- **Emission distributions**: What metrics look like in each regime

Example regimes:
- **State 0 (Slow)**: Low ppm, low possessions, fewer fouls
- **State 1 (Normal)**: Baseline pace
- **State 2 (Fast)**: High ppm, high possessions
- **State 3 (Foul/Endgame)**: High fouls, variable pace

### 3. Adaptive Kalman Filtering

For each minute, the Kalman filter:
1. Predicts next state based on previous
2. Updates with new measurement
3. Adjusts Q/R based on:
   - Current HMM regime (fast → higher Q)
   - Game phase (late game → higher Q, lower R)

### 4. Projection Generation

```
projected_total = points_so_far + expected_ppm × minutes_remaining
```

Where `expected_ppm` blends:
- Historical game average
- Regime-expected ppm
- Kalman-filtered ppm

## Project Structure

```
pj_hmm_kalman_model/
├── config.py              # All configuration
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── data/
│   └── pbp_minute_bins.csv   # Input data (you provide)
├── outputs/
│   ├── pj_results_*.csv      # Per-minute projections
│   ├── state_profiles_*.csv  # HMM state profiles
│   └── summary_report_*.txt  # Summary report
└── src/
    ├── __init__.py
    ├── run_pj.py          # CLI entry point
    ├── data_loader.py     # Data ingestion & features
    ├── hmm_model.py       # GaussianHMM wrapper
    ├── kalman_filter.py   # Adaptive Kalman filters
    ├── pj_engine.py       # Main orchestration
    └── output_handler.py  # CSV output generation
```

## Example Workflow

```python
from src.pj_engine import get_pj_engine
from src.output_handler import get_output_handler

# Initialize engine
engine = get_pj_engine(n_states=4)

# Load data
engine.load_data("data/pbp_minute_bins.csv")

# Fit HMM
engine.fit_hmm()

# Generate projections
projections = engine.generate_projections()

# Save outputs
handler = get_output_handler("outputs")
handler.save_all(projections, engine.get_state_profiles_summary())
```

## Tuning Tips

### More/Fewer States
- **3 states**: Simpler model (Slow, Normal, Fast)
- **4 states**: Default, captures foul-heavy periods
- **5+ states**: May overfit, use with caution

### Kalman Q/R
- **Higher Q**: More responsive to changes, noisier output
- **Higher R**: Smoother output, slower to react
- **Late game**: Increase Q to capture intentional fouling chaos

### Regime Weight
- **0.0**: Fully historical (ignore HMM)
- **0.5**: Balanced
- **1.0**: Fully regime-based (trust HMM completely)

## Dependencies

- `numpy>=1.24.0`
- `pandas>=2.0.0`
- `scipy>=1.10.0`
- `hmmlearn>=0.3.0`
- `click>=8.1.0`
- `loguru>=0.7.0`

## License

Part of the basketball-betting project.

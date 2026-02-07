"""
Configuration for HMM + Kalman Filter PJ Model
All tunable parameters in one place
"""

from pathlib import Path

# =============================================================================
# FEATURE FLAGS
# =============================================================================
USE_ENHANCED_FEATURES = True  # Enable efficiency, momentum, context features
USE_TEAM_KALMAN = True        # Enable team-specific Kalman adjustments
GENERATE_BETTING_SIGNALS = True  # Generate betting signals with edge/confidence

# =============================================================================
# PATHS
# =============================================================================
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "outputs"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# =============================================================================
# HMM CONFIGURATION
# =============================================================================
HMM_CONFIG = {
    # Number of hidden states (default: 4)
    # States typically represent: Fast Pace, Normal Pace, Slow Pace, Foul/Endgame
    "n_states": 4,

    # Covariance type for GaussianHMM
    # Options: "full", "diag", "spherical", "tied"
    "covariance_type": "diag",

    # Number of iterations for EM algorithm
    "n_iter": 100,

    # Random seed for reproducibility
    "random_state": 42,

    # Minimum variance to prevent singularity
    "min_covar": 1e-3,

    # Features to use for HMM (enhanced: includes PPP and momentum)
    "features": ["ppm", "posm", "foulm", "tovm", "ppp_total", "ppm_delta_3"],

    # Fallback to core features if enhanced not available
    "core_features": ["ppm", "posm", "foulm", "tovm"],
}

# =============================================================================
# KALMAN FILTER CONFIGURATION
# =============================================================================
KALMAN_CONFIG = {
    # Process noise covariance (Q) - higher = more responsive to changes
    "Q_default": 0.1,

    # Measurement noise covariance (R) - higher = smoother but slower
    "R_default": 1.0,

    # Initial state estimate
    "x0": 0.0,

    # Initial error covariance
    "P0": 1.0,

    # CONTINUOUS LATE-GAME CURVE (replaces binary threshold)
    # Q_mult = 1 + (max_mult - 1) * exp(-decay * minutes_remaining)
    "use_continuous_late_game": True,  # Enable smooth curve
    "late_game_Q_max_mult": 3.0,  # Maximum Q multiplier at game end
    "late_game_R_min_mult": 0.3,  # Minimum R multiplier at game end
    "late_game_decay": 0.25,  # Decay rate for exponential curve

    # Legacy binary threshold (used if use_continuous_late_game=False)
    "late_game_threshold": 6,  # minutes
    "late_game_Q_multiplier": 2.0,  # Increase Q in late game
    "late_game_R_multiplier": 0.5,  # Decrease R in late game

    # ONLINE Q/R ADAPTATION (innovation-based)
    "use_online_adaptation": True,  # Enable innovation tracking
    "innovation_window": 5,  # Minutes of innovation history to track
    "innovation_q_scale": 0.5,  # How much innovation affects Q
    "innovation_r_scale": 0.3,  # How much innovation affects R
    "max_online_q_mult": 2.0,  # Cap on online Q adjustment
    "max_online_r_mult": 2.0,  # Cap on online R adjustment
}

# =============================================================================
# REGIME-BASED KALMAN ADJUSTMENTS
# =============================================================================
# Q/R multipliers based on HMM state
# Higher state index = faster pace regime (more volatile)
REGIME_KALMAN_ADJUSTMENTS = {
    # State 0: Slow pace regime - very stable
    0: {"Q_mult": 0.5, "R_mult": 1.5, "name": "Slow"},

    # State 1: Normal pace regime - baseline
    1: {"Q_mult": 1.0, "R_mult": 1.0, "name": "Normal"},

    # State 2: Fast pace regime - more volatile
    2: {"Q_mult": 1.5, "R_mult": 0.7, "name": "Fast"},

    # State 3: Foul/Endgame regime - high volatility
    3: {"Q_mult": 2.0, "R_mult": 0.5, "name": "Foul/Endgame"},
}

# =============================================================================
# FEATURE ENGINEERING
# =============================================================================
FEATURE_CONFIG = {
    # Whether to standardize features (z-score normalization)
    "standardize": True,

    # Derived features
    "derived": {
        "ppm": ["points_home", "points_away"],  # points per minute
        "posm": ["poss_home", "poss_away"],     # possessions per minute
        "foulm": ["fouls_home", "fouls_away"],  # fouls per minute
        "tovm": ["to_home", "to_away"],         # turnovers per minute
    },

    # Column names expected in input CSV
    "required_columns": [
        "game_id",
        "minute_index",
        "points_home",
        "points_away",
        "poss_home",
        "poss_away",
        "fouls_home",
        "fouls_away",
        "to_home",
        "to_away",
    ],
}

# =============================================================================
# PROJECTION CONFIGURATION
# =============================================================================
PROJECTION_CONFIG = {
    # Total minutes in a regulation game
    "total_minutes": 40,

    # Minimum minutes elapsed before making projections
    "min_minutes_for_projection": 4,

    # ADAPTIVE REGIME WEIGHT: increases with game time
    # Formula: regime_weight = min + (max - min) * (minute / total_minutes)
    # Early game: trust history more. Late game: trust HMM regime more.
    "regime_weight_min": 0.2,  # Early game weight
    "regime_weight_max": 0.65,  # Late game weight
    "regime_weight": 0.6,  # Legacy fallback (static)
    "use_adaptive_regime_weight": True,  # Enable adaptive regime weight

    # Confidence interval for projections (z-score)
    "confidence_z": 1.96,  # 95% CI
}

# =============================================================================
# OUTPUT CONFIGURATION
# =============================================================================
OUTPUT_CONFIG = {
    # Decimal places for output values
    "decimal_places": 2,

    # Include raw features in output
    "include_raw_features": False,

    # Include Kalman filter internals
    "include_kalman_state": True,

    # Include HMM state probabilities
    "include_state_probs": True,
}

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
LOG_CONFIG = {
    "level": "INFO",
    "format": "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    "rotation": "10 MB",
    "retention": "7 days",
}

# =============================================================================
# ENHANCED FEATURES CONFIGURATION
# =============================================================================
ENHANCED_FEATURES = {
    # Core features (original)
    "core": ["ppm", "posm", "foulm", "tovm"],

    # Efficiency features
    "efficiency": ["ppp_total"],  # Points per possession

    # Momentum features
    "momentum": ["ppm_delta_3", "scoring_run"],  # Rolling PPM change, streak detection

    # Context features
    "context": ["score_diff", "is_blowout", "blowout_factor", "half_indicator"],
}

# Blowout detection thresholds
BLOWOUT_CONFIG = {
    "threshold": 15,  # Score differential to consider blowout
    "garbage_time_threshold": 20,  # More extreme garbage time
    "min_minute": 8,  # Don't flag blowout before this minute

    # GARBAGE TIME KALMAN ADJUSTMENTS
    # Applied when blowout_factor > activation_threshold
    "use_garbage_time_adjustments": True,
    "activation_threshold": 0.4,  # blowout_factor threshold to activate
    "garbage_Q_mult": 2.5,  # Very responsive during garbage time
    "garbage_R_mult": 0.3,  # Trust measurements less (more noise)
}

# =============================================================================
# TEAM PROFILE CONFIGURATION
# =============================================================================
TEAM_PROFILE_CONFIG = {
    # Pace categories
    "pace_thresholds": {
        "slow": 65.0,   # Below this = slow pace
        "fast": 72.0,   # Above this = fast pace
    },

    # Variance categories (for Kalman Q tuning)
    "variance_thresholds": {
        "low": 1.5,     # Consistent team
        "high": 3.0,    # High-variance team
    },

    # Home court advantage (PPM boost)
    "home_court_ppm_boost": 0.1,

    # League average fallback values
    "league_avg_ppm": 3.5,
    "league_avg_ppp": 1.0,
    "league_avg_variance": 2.0,
}

# =============================================================================
# BETTING CONFIGURATION
# =============================================================================
BETTING_CONFIG = {
    # Minimum edge (%) to consider a bet
    "min_edge_pct": 2.0,

    # Confidence tiers -> unit sizes
    "confidence_tiers": {
        80: 3,    # 80+ confidence = 3 units
        70: 2,    # 70-79 confidence = 2 units
        60: 1,    # 60-69 confidence = 1 unit
        50: 0.5,  # 50-59 confidence = 0.5 units
    },

    # Minimum minutes elapsed before generating signals
    "min_minutes_for_bet": 4,

    # Assumed odds for ROI calculations
    "assumed_odds": -110,

    # Confidence scoring weights
    "confidence_weights": {
        "edge_weight": 0.4,         # Weight for edge percentage
        "time_weight": 0.2,         # Weight for time remaining
        "covariance_weight": 0.2,   # Weight for Kalman uncertainty
        "matchup_weight": 0.2,      # Weight for matchup factors
    },

    # Edge to confidence scaling
    "edge_confidence_scale": {
        2.0: 50,   # 2% edge = 50 base confidence
        4.0: 65,   # 4% edge = 65 base confidence
        6.0: 75,   # 6% edge = 75 base confidence
        8.0: 85,   # 8%+ edge = 85 base confidence
    },
}

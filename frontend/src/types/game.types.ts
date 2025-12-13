/**
 * Enhanced Game Data Types with Momentum and Confidence
 */

export interface EnhancedGame {
  // Base game info (from API)
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  total_points: number;
  period: string;
  minutes_remaining: number;
  seconds_remaining: number;

  // Lines and pace
  ou_line: number;
  espn_closing_total?: number;
  required_ppm: number;
  current_ppm: number;
  ppm_difference: number;
  projected_final_score: number;
  total_time_remaining: number;

  // Bet info
  bet_type: 'OVER' | 'UNDER' | 'over' | 'under';
  trigger_flag: boolean;
  confidence_score: number;
  unit_size: number;

  // Team stats (optional)
  home_pace?: number;
  home_def_eff?: number;
  away_pace?: number;
  away_def_eff?: number;

  // Referee info
  referees?: string[];
  referee_crew_stats?: RefereeCrewStats;

  // Timestamp
  timestamp: string;

  // === Enhanced Calculated Fields ===

  // Confidence (calculated on client)
  enhancedConfidence?: {
    confidencePct: number;      // 0-100
    side: 'OVER' | 'UNDER';
    tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAX';
    color: string;
  };

  // Momentum (calculated on client)
  momentum?: {
    emaShort: number;
    emaLong: number;
    arrow: 'up' | 'down' | 'flat';
    delta: number;
    description: string;        // e.g., "+0.18 PPM last 2m"
  };

  // Commentary (generated on client)
  commentary?: string;

  // Trigger status
  isTriggered?: boolean;

  // Alert preferences (user-specific)
  alertEnabled?: boolean;
}

export interface GameHistory {
  timestamp: number;            // Unix timestamp or game clock
  totalScore: number;
  ouLine: number;
  currentPPM: number;
  projectedFinal?: number;
}

export interface ShootingSplits {
  fg2Pct: number;
  fg3Pct: number;
  ftPct: number;
  turnoversPerMin: number;
  last5m?: {
    fg3Pct?: number;
    pacePPM?: number;
  };
}

// User preferences
export interface UserPreferences {
  viewMode: 'simple' | 'advanced';
  theme: 'light' | 'dark';
  triggerThresholds: {
    minRequiredPPM: number;
    maxTimeRemainingSec: number;
  };
  alertsEnabled: {
    [gameId: string]: boolean;
  };
}

// Referee stats
export interface RefereeStats {
  name: string;
  total_fouls_per_game: number;
  home_fouls_per_game: number;
  away_fouls_per_game: number;
  foul_differential: number;
  total_games: number;
  home_bias: number;
  consistency_score: number;
  ref_style: 'Tight' | 'Average' | 'Loose';
  rank_most_fouls?: number;
  profile_url: string;
}

export interface RefereeCrewStats {
  found_refs: number;
  total_refs: number;
  referees?: RefereeStats[];
  avg_fouls_per_game: number | null;
  avg_home_fouls?: number;
  avg_away_fouls?: number;
  avg_home_bias: number | null;
  crew_style: 'Tight' | 'Average' | 'Loose' | 'Unknown';
  total_games_officiated?: number;
}

// Telemetry events
export type TelemetryEvent =
  | { type: 'trigger_hit'; gameId: string; confidence: number }
  | { type: 'alert_toggle'; gameId: string; enabled: boolean }
  | { type: 'view_breakdown'; gameId: string }
  | { type: 'view_mode_change'; mode: 'simple' | 'advanced' }
  | { type: 'theme_change'; theme: 'light' | 'dark' };

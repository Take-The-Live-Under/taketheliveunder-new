export interface TeamStats {
  name: string;
  espn_id?: string;
  games_played: number | null;
  pace: number | null;              // Possessions per game
  off_efficiency: number | null;    // Points per 100 possessions
  def_efficiency: number | null;    // Points allowed per 100 possessions
  efficiency_margin: number | null; // Off Eff - Def Eff
  fg_pct: number | null;            // Field goal %
  three_p_rate: number | null;      // 3PA / FGA
  three_p_pct: number | null;       // 3-point %
  two_p_pct: number | null;         // 2-point FG%
  ft_rate: number | null;           // FTA per game
  ft_pct: number | null;            // Free throw %
  oreb_pct: number | null;          // OREB / Total Rebounds * 100
  dreb_pct: number | null;          // DREB / Total Rebounds * 100
  to_rate: number | null;           // Turnovers per game
  efg_pct: number | null;           // Effective FG%
  ts_pct: number | null;            // True Shooting %
  assists_per_game: number | null;
  steals_per_game: number | null;
  blocks_per_game: number | null;
  fouls_per_game: number | null;
  ast_to_ratio: number | null;      // Assist-to-Turnover Ratio
  espn_rank: number | null;
  avg_ppg: number | null;           // Points per game
  avg_ppm: number | null;           // Points per minute
}

export interface RefereeInfo {
  name: string;
  total_fouls_per_game: number;
  home_fouls_per_game: number;
  away_fouls_per_game: number;
  foul_differential: number;
  total_games: number;
  home_bias: number;
  consistency_score: number;
  ref_style: string;
}

export interface CrewStats {
  referees: string[];
  foundRefs: number;
  avgFoulsPerGame: number | null;
  avgHomeBias: number | null;
  crewStyle: string;
  refDetails: RefereeInfo[];
}

export interface Matchup {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: 'pre' | 'in' | 'post';
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
  homeScore: number;
  awayScore: number;
  ouLine: number | null;
  crewStats?: CrewStats;
}

export interface ComparisonMetric {
  key: keyof TeamStats;
  label: string;
  description: string;
  format: 'decimal' | 'percent' | 'rank' | 'number' | 'ratio';
  decimals?: number;
  higherIsBetter: boolean;
}

// Organized metrics for comparison display
export const COMPARISON_METRICS: ComparisonMetric[] = [
  // Tempo & Scoring
  { key: 'pace', label: 'Pace', description: 'Possessions per game', format: 'decimal', decimals: 1, higherIsBetter: true },
  { key: 'avg_ppg', label: 'PPG', description: 'Points per game', format: 'decimal', decimals: 1, higherIsBetter: true },
  { key: 'avg_ppm', label: 'PPM', description: 'Points per minute', format: 'decimal', decimals: 2, higherIsBetter: true },

  // Efficiency
  { key: 'off_efficiency', label: 'Off Eff', description: 'Pts per 100 possessions', format: 'decimal', decimals: 1, higherIsBetter: true },
  { key: 'def_efficiency', label: 'Def Eff', description: 'Pts allowed per 100 poss', format: 'decimal', decimals: 1, higherIsBetter: false },
  { key: 'efficiency_margin', label: 'Margin', description: 'Off Eff - Def Eff', format: 'decimal', decimals: 1, higherIsBetter: true },

  // Shooting
  { key: 'efg_pct', label: 'eFG%', description: 'Effective FG%', format: 'percent', higherIsBetter: true },
  { key: 'ts_pct', label: 'TS%', description: 'True Shooting %', format: 'percent', higherIsBetter: true },
  { key: 'fg_pct', label: 'FG%', description: 'Field goal %', format: 'percent', higherIsBetter: true },
  { key: 'three_p_pct', label: '3P%', description: '3-point %', format: 'percent', higherIsBetter: true },
  { key: 'three_p_rate', label: '3P Rate', description: '3PA / FGA', format: 'ratio', decimals: 2, higherIsBetter: true },
  { key: 'two_p_pct', label: '2P%', description: '2-point FG%', format: 'percent', higherIsBetter: true },
  { key: 'ft_pct', label: 'FT%', description: 'Free throw %', format: 'percent', higherIsBetter: true },

  // Rebounding
  { key: 'oreb_pct', label: 'OREB%', description: 'OREB / Total Reb', format: 'percent', higherIsBetter: true },
  { key: 'dreb_pct', label: 'DREB%', description: 'DREB / Total Reb', format: 'percent', higherIsBetter: true },

  // Ball Control
  { key: 'to_rate', label: 'TO/G', description: 'Turnovers per game', format: 'decimal', decimals: 1, higherIsBetter: false },
  { key: 'ast_to_ratio', label: 'AST/TO', description: 'Assist to TO ratio', format: 'ratio', decimals: 2, higherIsBetter: true },
  { key: 'assists_per_game', label: 'AST/G', description: 'Assists per game', format: 'decimal', decimals: 1, higherIsBetter: true },

  // Defense & Other
  { key: 'steals_per_game', label: 'STL/G', description: 'Steals per game', format: 'decimal', decimals: 1, higherIsBetter: true },
  { key: 'blocks_per_game', label: 'BLK/G', description: 'Blocks per game', format: 'decimal', decimals: 1, higherIsBetter: true },

  // Ranking
  { key: 'espn_rank', label: 'Rank', description: 'ESPN efficiency rank', format: 'rank', higherIsBetter: false },
];

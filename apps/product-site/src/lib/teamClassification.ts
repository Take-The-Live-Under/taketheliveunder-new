// Team Classification System
// Classifies teams based on their statistical profile

export interface TeamStats {
  team_id: string;
  team_name: string;
  games_played: number;
  record: string;
  pace: number;
  off_efficiency: number;
  def_efficiency: number;
  fg_pct: number;
  three_p_rate: number;
  three_p_pct: number;
  ft_pct: number;
  oreb_pct: number;
  dreb_pct: number;
  to_rate: number;
  efg_pct: number;
  ts_pct: number;
  avg_ppm: number;
  avg_ppg: number;
  assists_per_game: number;
  steals_per_game: number;
  blocks_per_game: number;
  fouls_per_game: number;
  ast_to_ratio: number;
  espn_rank: number;
}

export interface Classification {
  id: string;
  label: string;
  description: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
}

export interface TeamAnalysis {
  team: TeamStats;
  percentiles: Record<string, number>;
  classifications: Classification[];
  insights: string[];
  leagueAverages: Record<string, number>;
}

// Classification definitions
export const CLASSIFICATIONS: Record<string, Classification> = {
  HIGH_SCORER: {
    id: 'HIGH_SCORER',
    label: 'HIGH_SCORER',
    description: 'Top 25% in points per game',
    color: 'green',
  },
  LOW_SCORER: {
    id: 'LOW_SCORER',
    label: 'LOW_SCORER',
    description: 'Bottom 25% in points per game',
    color: 'red',
  },
  FAST_PACE: {
    id: 'FAST_PACE',
    label: 'FAST_PACE',
    description: 'Top 25% in possessions per game',
    color: 'blue',
  },
  SLOW_PACE: {
    id: 'SLOW_PACE',
    label: 'SLOW_PACE',
    description: 'Bottom 25% in possessions per game',
    color: 'yellow',
  },
  ELITE_OFFENSE: {
    id: 'ELITE_OFFENSE',
    label: 'ELITE_OFF',
    description: 'Top 15% offensive efficiency',
    color: 'green',
  },
  POOR_OFFENSE: {
    id: 'POOR_OFFENSE',
    label: 'WEAK_OFF',
    description: 'Bottom 15% offensive efficiency',
    color: 'red',
  },
  THREE_HEAVY: {
    id: 'THREE_HEAVY',
    label: '3PT_HEAVY',
    description: 'Top 20% in 3-point attempt rate',
    color: 'purple',
  },
  INSIDE_FOCUSED: {
    id: 'INSIDE_FOCUSED',
    label: 'INSIDE_GAME',
    description: 'Bottom 20% in 3-point attempt rate',
    color: 'blue',
  },
  SHARP_SHOOTER: {
    id: 'SHARP_SHOOTER',
    label: 'SHARP_SHOOTER',
    description: 'Top 20% in 3-point percentage',
    color: 'green',
  },
  BALL_MOVEMENT: {
    id: 'BALL_MOVEMENT',
    label: 'BALL_MOVEMENT',
    description: 'Top 20% assist-to-turnover ratio',
    color: 'blue',
  },
  TURNOVER_PRONE: {
    id: 'TURNOVER_PRONE',
    label: 'TO_PRONE',
    description: 'High turnover rate (bottom 25%)',
    color: 'red',
  },
  LOW_TURNOVERS: {
    id: 'LOW_TURNOVERS',
    label: 'LOW_TO',
    description: 'Excellent ball security (top 25%)',
    color: 'green',
  },
  REBOUNDING: {
    id: 'REBOUNDING',
    label: 'REBOUNDING',
    description: 'Top 20% in offensive rebounding',
    color: 'blue',
  },
  FOUL_PRONE: {
    id: 'FOUL_PRONE',
    label: 'FOUL_PRONE',
    description: 'Top 25% in fouls per game',
    color: 'yellow',
  },
  DISCIPLINED: {
    id: 'DISCIPLINED',
    label: 'DISCIPLINED',
    description: 'Bottom 25% in fouls per game',
    color: 'green',
  },
  FT_STRONG: {
    id: 'FT_STRONG',
    label: 'FT_STRONG',
    description: 'Top 20% free throw percentage',
    color: 'green',
  },
};

// Calculate percentile rank (0-100)
export function calculatePercentile(value: number, allValues: number[], higherIsBetter = true): number {
  if (allValues.length === 0) return 50;

  const validValues = allValues.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (validValues.length === 0) return 50;

  const sorted = [...validValues].sort((a, b) => a - b);
  const rank = sorted.filter(v => v < value).length;
  const percentile = (rank / sorted.length) * 100;

  return higherIsBetter ? percentile : 100 - percentile;
}

// Calculate league averages
export function calculateLeagueAverages(teams: TeamStats[]): Record<string, number> {
  const validTeams = teams.filter(t => t.games_played > 0);
  if (validTeams.length === 0) return {};

  const sum = (key: keyof TeamStats) =>
    validTeams.reduce((acc, t) => acc + (Number(t[key]) || 0), 0) / validTeams.length;

  return {
    avg_ppg: Math.round(sum('avg_ppg') * 10) / 10,
    pace: Math.round(sum('pace') * 10) / 10,
    off_efficiency: Math.round(sum('off_efficiency') * 10) / 10,
    fg_pct: Math.round(sum('fg_pct') * 10) / 10,
    three_p_rate: Math.round(sum('three_p_rate') * 10) / 10,
    three_p_pct: Math.round(sum('three_p_pct') * 10) / 10,
    ft_pct: Math.round(sum('ft_pct') * 10) / 10,
    oreb_pct: Math.round(sum('oreb_pct') * 10) / 10,
    to_rate: Math.round(sum('to_rate') * 10) / 10,
    ast_to_ratio: Math.round(sum('ast_to_ratio') * 100) / 100,
    fouls_per_game: Math.round(sum('fouls_per_game') * 10) / 10,
  };
}

// Classify a team based on their stats and league context
export function classifyTeam(team: TeamStats, allTeams: TeamStats[]): Classification[] {
  const classifications: Classification[] = [];

  const validTeams = allTeams.filter(t => t.games_played > 0);
  if (validTeams.length === 0) return classifications;

  // Helper to get all values for a stat
  const getValues = (key: keyof TeamStats) => validTeams.map(t => Number(t[key]) || 0);

  // Calculate percentiles for key metrics
  const pctPPG = calculatePercentile(team.avg_ppg, getValues('avg_ppg'), true);
  const pctPace = calculatePercentile(team.pace, getValues('pace'), true);
  const pctOffEff = calculatePercentile(team.off_efficiency, getValues('off_efficiency'), true);
  const pct3PRate = calculatePercentile(team.three_p_rate, getValues('three_p_rate'), true);
  const pct3PPct = calculatePercentile(team.three_p_pct, getValues('three_p_pct'), true);
  const pctAstTO = calculatePercentile(team.ast_to_ratio, getValues('ast_to_ratio'), true);
  const pctTO = calculatePercentile(team.to_rate, getValues('to_rate'), false); // lower is better
  const pctOReb = calculatePercentile(team.oreb_pct, getValues('oreb_pct'), true);
  const pctFouls = calculatePercentile(team.fouls_per_game, getValues('fouls_per_game'), false); // lower is better
  const pctFT = calculatePercentile(team.ft_pct, getValues('ft_pct'), true);

  // Apply classification rules
  if (pctPPG >= 75) classifications.push(CLASSIFICATIONS.HIGH_SCORER);
  if (pctPPG <= 25) classifications.push(CLASSIFICATIONS.LOW_SCORER);

  if (pctPace >= 75) classifications.push(CLASSIFICATIONS.FAST_PACE);
  if (pctPace <= 25) classifications.push(CLASSIFICATIONS.SLOW_PACE);

  if (pctOffEff >= 85) classifications.push(CLASSIFICATIONS.ELITE_OFFENSE);
  if (pctOffEff <= 15) classifications.push(CLASSIFICATIONS.POOR_OFFENSE);

  if (pct3PRate >= 80) classifications.push(CLASSIFICATIONS.THREE_HEAVY);
  if (pct3PRate <= 20) classifications.push(CLASSIFICATIONS.INSIDE_FOCUSED);

  if (pct3PPct >= 80) classifications.push(CLASSIFICATIONS.SHARP_SHOOTER);

  if (pctAstTO >= 80) classifications.push(CLASSIFICATIONS.BALL_MOVEMENT);

  if (pctTO <= 25) classifications.push(CLASSIFICATIONS.TURNOVER_PRONE);
  if (pctTO >= 75) classifications.push(CLASSIFICATIONS.LOW_TURNOVERS);

  if (pctOReb >= 80) classifications.push(CLASSIFICATIONS.REBOUNDING);

  if (pctFouls <= 25) classifications.push(CLASSIFICATIONS.FOUL_PRONE);
  if (pctFouls >= 75) classifications.push(CLASSIFICATIONS.DISCIPLINED);

  if (pctFT >= 80) classifications.push(CLASSIFICATIONS.FT_STRONG);

  return classifications;
}

// Generate insights based on team stats and percentiles
export function generateInsights(team: TeamStats, percentiles: Record<string, number>, leagueAvg: Record<string, number>): string[] {
  const insights: string[] = [];

  // Scoring insight
  if (percentiles.avg_ppg >= 80) {
    insights.push(`Elite scoring team averaging ${team.avg_ppg} PPG (top ${Math.round(100 - percentiles.avg_ppg)}%)`);
  } else if (percentiles.avg_ppg <= 20) {
    insights.push(`Low-scoring team at ${team.avg_ppg} PPG - may favor unders`);
  }

  // Pace insight
  if (percentiles.pace >= 80) {
    insights.push(`Fast-paced team (${team.pace} poss/game) - expect high-scoring affairs`);
  } else if (percentiles.pace <= 20) {
    insights.push(`Slow, methodical pace (${team.pace} poss/game) - games often go under`);
  }

  // Shooting insight
  if (percentiles.three_p_pct >= 75 && percentiles.three_p_rate >= 60) {
    insights.push(`Dangerous 3-point team: ${team.three_p_pct}% on ${team.three_p_rate}% of shots`);
  } else if (percentiles.three_p_rate <= 25) {
    insights.push(`Inside-focused offense - relies on paint scoring`);
  }

  // Ball control insight
  if (percentiles.ast_to_ratio >= 75) {
    insights.push(`Excellent ball security with ${team.ast_to_ratio} AST/TO ratio`);
  } else if (percentiles.to_rate >= 75) {
    insights.push(`Low turnover team (${team.to_rate}/game) - protects the ball well`);
  } else if (percentiles.to_rate <= 25) {
    insights.push(`Turnover-prone (${team.to_rate}/game) - struggles in pressure situations`);
  }

  // Fouls insight
  if (percentiles.fouls_per_game >= 75) {
    insights.push(`Disciplined team (${team.fouls_per_game} fouls/game) - rarely sends opponents to the line`);
  } else if (percentiles.fouls_per_game <= 25) {
    insights.push(`Foul-prone team (${team.fouls_per_game}/game) - watch for late-game FT situations`);
  }

  // Rebounding insight
  if (percentiles.oreb_pct >= 75) {
    insights.push(`Strong offensive rebounding (${team.oreb_pct}%) - creates second chances`);
  }

  // Free throws insight
  if (percentiles.ft_pct >= 80) {
    insights.push(`Excellent FT shooting (${team.ft_pct}%) - closes out games well`);
  } else if (percentiles.ft_pct <= 20) {
    insights.push(`Poor FT shooting (${team.ft_pct}%) - vulnerable in close games`);
  }

  return insights.slice(0, 5); // Max 5 insights
}

// Main analysis function
export function analyzeTeam(team: TeamStats, allTeams: TeamStats[]): TeamAnalysis {
  const validTeams = allTeams.filter(t => t.games_played > 0);

  // Calculate all percentiles
  const getValues = (key: keyof TeamStats) => validTeams.map(t => Number(t[key]) || 0);

  const percentiles: Record<string, number> = {
    avg_ppg: Math.round(calculatePercentile(team.avg_ppg, getValues('avg_ppg'), true)),
    pace: Math.round(calculatePercentile(team.pace, getValues('pace'), true)),
    off_efficiency: Math.round(calculatePercentile(team.off_efficiency, getValues('off_efficiency'), true)),
    fg_pct: Math.round(calculatePercentile(team.fg_pct, getValues('fg_pct'), true)),
    three_p_rate: Math.round(calculatePercentile(team.three_p_rate, getValues('three_p_rate'), true)),
    three_p_pct: Math.round(calculatePercentile(team.three_p_pct, getValues('three_p_pct'), true)),
    ft_pct: Math.round(calculatePercentile(team.ft_pct, getValues('ft_pct'), true)),
    oreb_pct: Math.round(calculatePercentile(team.oreb_pct, getValues('oreb_pct'), true)),
    dreb_pct: Math.round(calculatePercentile(team.dreb_pct, getValues('dreb_pct'), true)),
    to_rate: Math.round(calculatePercentile(team.to_rate, getValues('to_rate'), false)),
    ast_to_ratio: Math.round(calculatePercentile(team.ast_to_ratio, getValues('ast_to_ratio'), true)),
    fouls_per_game: Math.round(calculatePercentile(team.fouls_per_game, getValues('fouls_per_game'), false)),
  };

  const leagueAverages = calculateLeagueAverages(validTeams);
  const classifications = classifyTeam(team, validTeams);
  const insights = generateInsights(team, percentiles, leagueAverages);

  return {
    team,
    percentiles,
    classifications,
    insights,
    leagueAverages,
  };
}

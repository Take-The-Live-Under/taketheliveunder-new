// ─────────────────────────────────────────────────────────────────────────────
// BRACKET LAB — Projection Engine
// Modular functions — swap real model in later by replacing these functions.
// ─────────────────────────────────────────────────────────────────────────────

import { BracketTeam, BracketMatchup } from './mockData';

export interface PredictorWeights {
  tempo: number;          // 0–100
  offEff: number;         // 0–100
  defEff: number;         // 0–100
  threePtRate: number;    // 0–100
  rebounding: number;     // 0–100
  turnovers: number;      // 0–100
  recentForm: number;     // 0–100
  variance: number;       // 0–100 (volatility/chaos factor)
}

export const DEFAULT_WEIGHTS: PredictorWeights = {
  tempo: 70,
  offEff: 85,
  defEff: 80,
  threePtRate: 50,
  rebounding: 55,
  turnovers: 60,
  recentForm: 65,
  variance: 30,
};

export interface ProjectionResult {
  expectedPace: number;
  estimatedPossessions: number;
  projectedTotal: number;
  teamAProjected: number;
  teamBProjected: number;
  overLean: number;         // -100 (strong under) to +100 (strong over)
  confidenceScore: number;  // 0–100
  edgeSummary: string;
  gameArchetype: GameArchetype;
  paceLean: 'FAST' | 'MODERATE' | 'SLOW';
  teamAWinProb: number;     // 0–100
}

export type GameArchetype =
  | 'TRACK_MEET'
  | 'DEFENSIVE_CAGE_MATCH'
  | 'SHOTMAKING_WAR'
  | 'CHAOS_GAME'
  | 'REBOUND_BATTLE'
  | 'HALF_COURT_CHESS'
  | 'SLOW_BURN'
  | 'VOLATILE_PACE';

export const ARCHETYPE_LABELS: Record<GameArchetype, { label: string; color: string; description: string }> = {
  TRACK_MEET:           { label: 'Track Meet',         color: '#ff6b00', description: 'Both teams push the pace — expect high possessions and big totals.' },
  DEFENSIVE_CAGE_MATCH: { label: 'Defensive War',      color: '#00ffff', description: 'Elite defenses dominate. Expect grind, fouls, and a low final score.' },
  SHOTMAKING_WAR:       { label: 'Shotmaking War',     color: '#eab308', description: 'Both offenses are elite. Winner likely whoever gets hot from 3.' },
  CHAOS_GAME:           { label: 'Chaos Game',         color: '#ff00ff', description: 'Mismatched styles create unpredictable pace and volatile scoring.' },
  REBOUND_BATTLE:       { label: 'Rebound Battle',     color: '#22c55e', description: 'Second chance points will decide this. Glass work is everything.' },
  HALF_COURT_CHESS:     { label: 'Half-Court Chess',   color: '#a3a3a3', description: 'Methodical execution. Expect structure, sets, and clock work.' },
  SLOW_BURN:            { label: 'Slow Burn',          color: '#b026ff', description: 'Plodding pace with potential late surge. Watch the final 4 minutes.' },
  VOLATILE_PACE:        { label: 'Volatile Pace',      color: '#f97316', description: 'Pace could swing either way — live total movement expected.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Core projection functions
// ─────────────────────────────────────────────────────────────────────────────

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function weightedBlend(a: number, b: number, wA: number, wB: number): number {
  const total = wA + wB;
  if (total === 0) return (a + b) / 2;
  return (a * wA + b * wB) / total;
}

export function computeExpectedPace(teamA: BracketTeam, teamB: BracketTeam, weights: PredictorWeights): number {
  const tempoW = weights.tempo / 100;
  const formW = weights.recentForm / 100;
  const recentA = teamA.metrics.recentTempo;
  const recentB = teamB.metrics.recentTempo;
  const adjustedA = teamA.metrics.adjustedTempo * (1 - formW) + recentA * formW;
  const adjustedB = teamB.metrics.adjustedTempo * (1 - formW) + recentB * formW;
  const blended = (adjustedA + adjustedB) / 2;
  // Apply variance nudge
  const varianceFactor = (weights.variance / 100) * 2 - 1; // -1 to +1
  return Math.round((blended + varianceFactor) * 10) / 10;
}

export function computePossessions(pace: number): number {
  // NCAA game = 40 minutes, pace = possessions per 40
  return Math.round(pace * 10) / 10;
}

export function computeTeamScore(
  team: BracketTeam,
  opponent: BracketTeam,
  possessions: number,
  weights: PredictorWeights,
): number {
  const offW = weights.offEff / 100;
  const defW = weights.defEff / 100;
  const rebW = weights.rebounding / 100;
  const toW = weights.turnovers / 100;
  const threeW = weights.threePtRate / 100;

  // Blended pts per possession: team offense vs opponent defense
  const offPPP = team.metrics.ptsPerPoss;
  const defPPP = opponent.metrics.oppPtsPerPoss;
  const blendedPPP = weightedBlend(offPPP, defPPP, offW, defW);

  // Adjust for rebound advantage
  const rebAdv = (team.metrics.offRebPct - opponent.metrics.defRebPct) / 100;
  const rebAdjust = rebAdv * rebW * 0.5;

  // Adjust for turnover pressure
  const toAdv = (opponent.metrics.oppToRate - team.metrics.toRate) / 100;
  const toAdjust = toAdv * toW * 0.3;

  // 3PT rate impact on efficiency
  const threeImpact = (team.metrics.threePtRate - 35) / 100 * threeW * 0.4;

  const adjustedPPP = blendedPPP + rebAdjust + toAdjust + threeImpact;
  return Math.round(adjustedPPP * possessions * 10) / 10;
}

export function computeConfidence(
  teamA: BracketTeam,
  teamB: BracketTeam,
  weights: PredictorWeights,
): number {
  // Confidence = agreement between multiple signals
  const factors = [
    normalize(Math.abs(teamA.metrics.offEff - teamB.metrics.defEff), 0, 20),
    normalize(Math.abs(teamB.metrics.offEff - teamA.metrics.defEff), 0, 20),
    normalize(Math.abs(teamA.metrics.adjustedTempo - teamB.metrics.adjustedTempo), 0, 15),
    normalize(teamA.metrics.last5.filter(r => r === 'W').length / 5, 0, 1),
    normalize(teamB.metrics.last5.filter(r => r === 'W').length / 5, 0, 1),
  ];
  const avg = factors.reduce((a, b) => a + b, 0) / factors.length;
  const varianceDamp = 1 - (weights.variance / 100) * 0.4;
  return Math.round(avg * varianceDamp * 100);
}

export function determineArchetype(
  teamA: BracketTeam,
  teamB: BracketTeam,
  pace: number,
  weights: PredictorWeights,
): GameArchetype {
  const avgDefEff = (teamA.metrics.defEff + teamB.metrics.defEff) / 2;
  const avgOffEff = (teamA.metrics.offEff + teamB.metrics.offEff) / 2;
  const paceGap = Math.abs(teamA.metrics.adjustedTempo - teamB.metrics.adjustedTempo);
  const variance = weights.variance;

  if (pace > 73) return 'TRACK_MEET';
  if (pace < 65 && avgDefEff < 95) return 'DEFENSIVE_CAGE_MATCH';
  if (pace < 65) return 'HALF_COURT_CHESS';
  if (avgOffEff > 118) return 'SHOTMAKING_WAR';
  if (paceGap > 8) return variance > 60 ? 'CHAOS_GAME' : 'VOLATILE_PACE';
  const avgReb = (teamA.metrics.offRebPct + teamB.metrics.offRebPct) / 2;
  if (avgReb > 32) return 'REBOUND_BATTLE';
  if (pace < 68) return 'SLOW_BURN';
  return 'VOLATILE_PACE';
}

export function computeOverLean(projected: number, line: number | undefined): number {
  if (!line) return 0;
  const diff = projected - line;
  // Scale: ±10 pts = ±100 lean
  return Math.max(-100, Math.min(100, Math.round(diff * 10)));
}

export function runProjection(
  matchup: BracketMatchup,
  weights: PredictorWeights,
): ProjectionResult {
  const { teamA, teamB, projectedLine } = matchup;

  const expectedPace = computeExpectedPace(teamA, teamB, weights);
  const estimatedPossessions = computePossessions(expectedPace);
  const teamAProjected = computeTeamScore(teamA, teamB, estimatedPossessions, weights);
  const teamBProjected = computeTeamScore(teamB, teamA, estimatedPossessions, weights);
  const projectedTotal = Math.round((teamAProjected + teamBProjected) * 10) / 10;
  const confidenceScore = computeConfidence(teamA, teamB, weights);
  const archetype = determineArchetype(teamA, teamB, expectedPace, weights);
  const overLean = computeOverLean(projectedTotal, projectedLine);

  const scoreDiff = teamAProjected - teamBProjected;
  const teamAWinProb = Math.round(50 + scoreDiff * 2.5);

  const paceLean: ProjectionResult['paceLean'] =
    expectedPace > 72 ? 'FAST' : expectedPace < 67 ? 'SLOW' : 'MODERATE';

  const edgePhrases = {
    TRACK_MEET:           'Pace war — track the live total closely',
    DEFENSIVE_CAGE_MATCH: 'Strong defensive edge — under is in play',
    SHOTMAKING_WAR:       'Offense wins tonight — monitor 3PT efficiency',
    CHAOS_GAME:           'Volatile — fades work both directions',
    REBOUND_BATTLE:       'Glass control decides the margin',
    HALF_COURT_CHESS:     'Execution game — late PPM spike possible',
    SLOW_BURN:            'Under-pace early, watch for 4Q surge',
    VOLATILE_PACE:        'Live line movement likely — stay engaged',
  };

  return {
    expectedPace,
    estimatedPossessions,
    projectedTotal,
    teamAProjected,
    teamBProjected,
    overLean,
    confidenceScore,
    edgeSummary: edgePhrases[archetype],
    gameArchetype: archetype,
    paceLean,
    teamAWinProb: Math.max(5, Math.min(95, teamAWinProb)),
  };
}

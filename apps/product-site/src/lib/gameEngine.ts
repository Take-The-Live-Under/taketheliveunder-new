/**
 * Game Engine for Basketball Prediction Grid
 * Handles simulation, scoring, multipliers, and payouts
 */

// Game constants
export const GAME_DURATION = 300; // 5 minutes in seconds
export const SCORE_UPDATE_INTERVAL = 3000; // 3 seconds
export const STARTING_SCORE = 88;
export const STARTING_FUEL = 2500;
export const PICK_COST = 100;
export const BONUS_MIN_INTERVAL = 20000; // 20 seconds
export const BONUS_MAX_INTERVAL = 40000; // 40 seconds
export const BONUS_DURATION = 10000; // 10 seconds

// Types
export interface Tile {
  score: number;
  baseMultiplier: number;
  liveBoost: number;
  isSelected: boolean;
  pickTime?: number;
  bonusAtPick?: number;
}

export interface Pick {
  score: number;
  baseMultiplier: number;
  bonusAtPick: number;
  totalMultiplier: number;
  result?: 'HIT' | 'NEAR_2' | 'NEAR_4' | 'MISS';
  payout?: number;
}

export interface GameState {
  clock: number; // seconds remaining
  currentScore: number;
  fuel: number;
  streak: number;
  picks: Pick[];
  bonusActive: boolean;
  bonusMultiplier: number;
  bonusTimeRemaining: number;
  gameOver: boolean;
  finalScore: number | null;
  totalPayout: number;
}

export interface BonusEvent {
  multiplier: number;
  duration: number;
}

// Score update weights (0-4 points per update)
const SCORE_WEIGHTS = [
  { points: 0, weight: 10 },
  { points: 1, weight: 25 },
  { points: 2, weight: 35 },
  { points: 3, weight: 20 },
  { points: 4, weight: 10 },
];

/**
 * Generate a weighted random score increment (0-4 points)
 */
export function getScoreIncrement(): number {
  const totalWeight = SCORE_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { points, weight } of SCORE_WEIGHTS) {
    random -= weight;
    if (random <= 0) return points;
  }
  return 2; // fallback
}

/**
 * Calculate expected final score based on remaining time
 */
export function calculateExpectedFinalScore(
  currentScore: number,
  secondsRemaining: number
): number {
  const updatesRemaining = Math.floor(secondsRemaining / 3);
  const avgPointsPerUpdate = 1.85; // weighted average
  return Math.round(currentScore + updatesRemaining * avgPointsPerUpdate);
}

/**
 * Calculate base multiplier for a tile based on distance from expected score
 * Lower multipliers for more balanced gameplay
 */
export function calculateBaseMultiplier(
  tileScore: number,
  expectedFinalScore: number
): number {
  const distance = Math.abs(tileScore - expectedFinalScore);

  // Closer to expected = lower multiplier
  // Further = higher multiplier (but capped lower)
  if (distance <= 2) return 1.1 + Math.random() * 0.1;
  if (distance <= 4) return 1.2 + Math.random() * 0.1;
  if (distance <= 6) return 1.3 + Math.random() * 0.1;
  if (distance <= 8) return 1.4 + Math.random() * 0.1;
  if (distance <= 10) return 1.5 + Math.random() * 0.1;
  if (distance <= 15) return 1.6 + Math.random() * 0.2;
  return 1.8 + Math.random() * 0.2; // 1.8x - 2.0x for far tiles
}

/**
 * Generate grid tiles with multipliers
 */
export function generateGridTiles(
  currentScore: number,
  secondsRemaining: number
): Map<number, Tile> {
  const expectedFinal = calculateExpectedFinalScore(currentScore, secondsRemaining);
  const tiles = new Map<number, Tile>();

  // Generate tiles from current-5 to current+25
  const minScore = currentScore - 5;
  const maxScore = currentScore + 25;

  for (let score = minScore; score <= maxScore; score++) {
    tiles.set(score, {
      score,
      baseMultiplier: Number(calculateBaseMultiplier(score, expectedFinal).toFixed(1)),
      liveBoost: 0,
      isSelected: false,
    });
  }

  return tiles;
}

/**
 * Generate a random bonus event
 */
export function generateBonusEvent(): BonusEvent {
  // +0.2x to +1.0x boost
  const multiplier = Number((0.2 + Math.random() * 0.8).toFixed(1));
  return {
    multiplier,
    duration: BONUS_DURATION,
  };
}

/**
 * Get next bonus trigger time (random 20-40 seconds from now)
 */
export function getNextBonusTriggerTime(): number {
  return BONUS_MIN_INTERVAL + Math.random() * (BONUS_MAX_INTERVAL - BONUS_MIN_INTERVAL);
}

/**
 * Calculate payout for a single pick
 */
export function calculatePickPayout(
  pick: Pick,
  finalScore: number
): { result: 'HIT' | 'NEAR_2' | 'NEAR_4' | 'MISS'; payout: number } {
  const distance = Math.abs(pick.score - finalScore);
  const basePayout = PICK_COST * pick.totalMultiplier;

  if (distance === 0) {
    return { result: 'HIT', payout: Math.round(basePayout) };
  } else if (distance <= 2) {
    return { result: 'NEAR_2', payout: Math.round(basePayout * 0.5) };
  } else if (distance <= 4) {
    return { result: 'NEAR_4', payout: Math.round(basePayout * 0.2) };
  }
  return { result: 'MISS', payout: 0 };
}

/**
 * Settle all picks at game end
 */
export function settleGame(
  picks: Pick[],
  finalScore: number
): { settledPicks: Pick[]; totalPayout: number; hasHit: boolean } {
  let totalPayout = 0;
  let hasHit = false;

  const settledPicks = picks.map(pick => {
    const { result, payout } = calculatePickPayout(pick, finalScore);
    totalPayout += payout;
    if (result === 'HIT') hasHit = true;

    return {
      ...pick,
      result,
      payout,
    };
  });

  return { settledPicks, totalPayout, hasHit };
}

/**
 * Format time as M:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get live boost for tiles based on game state
 * Tiles closer to current score get small dynamic boosts
 */
export function calculateLiveBoost(
  tileScore: number,
  currentScore: number,
  timeRemaining: number
): number {
  const distance = Math.abs(tileScore - currentScore);
  const timeFactor = 1 - (timeRemaining / GAME_DURATION);

  // As time decreases and tile is closer to current score, boost increases
  if (distance <= 3 && timeFactor > 0.5) {
    return Number((0.1 + Math.random() * 0.3).toFixed(1));
  }
  if (distance <= 5 && timeFactor > 0.7) {
    return Number((0.1 + Math.random() * 0.2).toFixed(1));
  }
  return 0;
}

/**
 * Initialize a fresh game state
 */
export function initializeGameState(): GameState {
  return {
    clock: GAME_DURATION,
    currentScore: STARTING_SCORE,
    fuel: STARTING_FUEL,
    streak: 0,
    picks: [],
    bonusActive: false,
    bonusMultiplier: 0,
    bonusTimeRemaining: 0,
    gameOver: false,
    finalScore: null,
    totalPayout: 0,
  };
}

// Simulated NCAA game data for realism
export const SIMULATED_GAMES = [
  { home: 'Duke Blue Devils', away: 'North Carolina Tar Heels', homeScore: 42, awayScore: 46 },
  { home: 'Kentucky Wildcats', away: 'Louisville Cardinals', homeScore: 38, awayScore: 44 },
  { home: 'Kansas Jayhawks', away: 'Missouri Tigers', homeScore: 45, awayScore: 43 },
  { home: 'Michigan State Spartans', away: 'Michigan Wolverines', homeScore: 41, awayScore: 39 },
  { home: 'UCLA Bruins', away: 'USC Trojans', homeScore: 44, awayScore: 48 },
];

export function getRandomGame() {
  return SIMULATED_GAMES[Math.floor(Math.random() * SIMULATED_GAMES.length)];
}

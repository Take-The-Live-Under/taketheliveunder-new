/**
 * PPM Calculations for NCAA Basketball
 *
 * MATH DEFINITIONS (do not deviate):
 * - total_points = away_score + home_score
 * - regulation_minutes = 40.0
 * - minutes_remaining_regulation from ESPN live clock
 * - minutes_elapsed = regulation_minutes - minutes_remaining_regulation
 *
 * Current PPM = total_points / minutes_elapsed
 * Points Needed = max(live_ou_line - total_points, 0)
 * Required PPM = Points Needed / minutes_remaining_regulation
 */

const REGULATION_MINUTES = 40.0;
const HALF_MINUTES = 20.0;

/**
 * Calculate minutes remaining in regulation from ESPN period and clock
 * @param period - Current period (1 = 1st half, 2 = 2nd half, 3+ = OT)
 * @param clockMinutes - Minutes on the clock
 * @param clockSeconds - Seconds on the clock
 * @returns Minutes remaining in regulation (0 if in OT)
 */
export function calculateMinutesRemainingRegulation(
  period: number,
  clockMinutes: number,
  clockSeconds: number
): number {
  const clockTime = clockMinutes + clockSeconds / 60;

  if (period >= 3) {
    // Overtime - 0 regulation minutes remaining
    return 0;
  } else if (period === 2) {
    // 2nd half - only this half remains
    return clockTime;
  } else if (period === 1) {
    // 1st half - this half + 2nd half
    return HALF_MINUTES + clockTime;
  }
  return REGULATION_MINUTES;
}

/**
 * Calculate current Points Per Minute
 * @param totalPoints - Current total points (away + home)
 * @param minutesRemainingReg - Minutes remaining in regulation
 * @returns Current PPM or null if minutes_elapsed <= 0
 */
export function calculateCurrentPPM(
  totalPoints: number,
  minutesRemainingReg: number
): number | null {
  const minutesElapsed = REGULATION_MINUTES - minutesRemainingReg;

  if (minutesElapsed <= 0) {
    return null;
  }

  return totalPoints / minutesElapsed;
}

/**
 * Calculate required Points Per Minute to hit the O/U line
 * @param totalPoints - Current total points
 * @param ouLine - Live over/under line
 * @param minutesRemainingReg - Minutes remaining in regulation
 * @returns Required PPM or null if invalid
 */
export function calculateRequiredPPM(
  totalPoints: number,
  ouLine: number | null,
  minutesRemainingReg: number
): number | null {
  if (ouLine === null) {
    return null;
  }

  if (minutesRemainingReg <= 0) {
    return null;
  }

  const pointsNeeded = Math.max(ouLine - totalPoints, 0);
  return pointsNeeded / minutesRemainingReg;
}

/**
 * Check if game is overtime
 * @param period - Current period from ESPN
 * @returns true if period >= 3 (OT)
 */
export function isOvertime(period: number): boolean {
  return period >= 3;
}

// =============================================================================
// TRIGGER TYPE DEFINITIONS
// =============================================================================
export type TriggerType = 'over' | 'under' | 'tripleDipper' | null;

/**
 * OVER TRIGGER (88.9% win rate)
 * Conditions:
 * - Game is live (in progress)
 * - Game minute between 20-30 (10-20 minutes remaining)
 * - Current PPM > Required PPM + 0.3 (game running HOT)
 * - Exclude overtime games
 */
export function isOverTriggered(
  status: string,
  minutesRemainingReg: number,
  currentPPM: number | null,
  requiredPPM: number | null,
  isOT: boolean
): boolean {
  if (status !== 'in') return false;
  if (isOT) return false;
  if (currentPPM === null || requiredPPM === null) return false;

  const gameMinute = REGULATION_MINUTES - minutesRemainingReg;

  // Game minute 20-30
  if (gameMinute < 20 || gameMinute > 30) return false;

  // Current PPM exceeds required PPM by at least 0.3
  const ppmGap = currentPPM - requiredPPM;
  if (ppmGap < 0.3) return false;

  return true;
}

/**
 * TRIPLE DIPPER (Strict UNDER - 76.3% win rate)
 * Conditions:
 * - Game is live (in progress)
 * - Game minute between 15-32 (8-25 minutes remaining)
 * - Required PPM >= 4.5 (high pace needed to hit line)
 * - Current PPM <= Required PPM - 1.0 (game running COLD by at least 1 PPM)
 * - Exclude overtime games
 */
export function isTripleDipper(
  status: string,
  minutesRemainingReg: number,
  currentPPM: number | null,
  requiredPPM: number | null,
  isOT: boolean
): boolean {
  if (status !== 'in') return false;
  if (isOT) return false;
  if (currentPPM === null || requiredPPM === null) return false;

  const gameMinute = REGULATION_MINUTES - minutesRemainingReg;

  // Game minute 15-32
  if (gameMinute < 15 || gameMinute > 32) return false;

  // Required PPM must be high (4.5+)
  if (requiredPPM < 4.5) return false;

  // Current PPM is at least 1.0 below required
  const ppmGap = currentPPM - requiredPPM;
  if (ppmGap > -1.0) return false;

  return true;
}

/**
 * Standard UNDER TRIGGER (69.7% win rate - Golden Zone)
 * Original trigger logic
 * Conditions:
 * - Game is live (in progress)
 * - At least 4 minutes elapsed
 * - 5+ minutes remaining
 * - Required PPM >= 4.5
 * - PPM diff between 1.0 and 1.5
 * - Exclude overtime games
 */
export function isUnderTriggered(
  status: string,
  minutesRemainingReg: number,
  currentPPM: number | null,
  requiredPPM: number | null,
  isOT: boolean
): boolean {
  if (status !== 'in') return false;
  if (isOT) return false;
  if (currentPPM === null || requiredPPM === null) return false;

  const minutesElapsed = REGULATION_MINUTES - minutesRemainingReg;
  if (minutesElapsed < 4.0) return false;
  if (minutesRemainingReg <= 5.0) return false;
  if (requiredPPM < 4.5) return false;

  const ppmDiff = requiredPPM - currentPPM;
  if (ppmDiff < 1.0 || ppmDiff > 1.5) return false;

  return true;
}

/**
 * Determine which trigger type applies (if any)
 * Priority: Triple Dipper > OVER > UNDER
 * Returns the trigger type or null if no trigger
 */
export function getTriggerType(
  status: string,
  minutesRemainingReg: number,
  currentPPM: number | null,
  requiredPPM: number | null,
  isOT: boolean
): TriggerType {
  // Check Triple Dipper first (strict UNDER - highest confidence for UNDER)
  if (isTripleDipper(status, minutesRemainingReg, currentPPM, requiredPPM, isOT)) {
    return 'tripleDipper';
  }

  // Check OVER trigger (highest win rate)
  if (isOverTriggered(status, minutesRemainingReg, currentPPM, requiredPPM, isOT)) {
    return 'over';
  }

  // Check standard UNDER trigger
  if (isUnderTriggered(status, minutesRemainingReg, currentPPM, requiredPPM, isOT)) {
    return 'under';
  }

  return null;
}

/**
 * Legacy function - kept for backward compatibility
 * Returns true if UNDER or TRIPLE DIPPER triggers fire
 */
export function isTriggered(
  status: string,
  minutesRemainingReg: number,
  requiredPPM: number | null,
  isOT: boolean,
  currentPPM: number | null = null
): boolean {
  const triggerType = getTriggerType(status, minutesRemainingReg, currentPPM, requiredPPM, isOT);
  return triggerType === 'under' || triggerType === 'tripleDipper';
}

/**
 * Parse ESPN clock string to minutes and seconds
 * @param clockStr - Clock string like "12:34" or "0.9"
 * @returns [minutes, seconds]
 */
export function parseClock(clockStr: string): [number, number] {
  if (!clockStr) return [0, 0];

  if (clockStr.includes(':')) {
    const parts = clockStr.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return [minutes, seconds];
  } else {
    // Decimal format like "0.9"
    const seconds = Math.floor(parseFloat(clockStr) || 0);
    return [0, seconds];
  }
}

// =============================================================================
// FOUL GAME DETECTION & ADJUSTMENT
// Based on analysis of 3,649 games: foul game adds avg 5.8 extra points
// =============================================================================

const FOUL_GAME_TIME_THRESHOLD = 120; // 2 minutes remaining in seconds
const FOUL_GAME_POTENTIAL_THRESHOLD = 300; // 5 minutes - show potential adjustment
const FOUL_GAME_MIN_DEFICIT = 1;
const FOUL_GAME_MAX_DEFICIT = 10;

/**
 * Foul game adjustment lookup by point differential
 * Based on analysis of 1,237 games with foul game situations
 * Deficit 1: +4.2, 2: +5.0, 3: +5.5, 4: +5.6, 5: +5.5, 6: +5.9, 7: +7.3, 8: +7.2, 9: +6.7, 10: +5.7
 */
const FOUL_GAME_ADJUSTMENTS: Record<number, number> = {
  1: 4.2,
  2: 5.0,
  3: 5.5,
  4: 5.6,
  5: 5.5,
  6: 5.9,
  7: 7.3,
  8: 7.2,
  9: 6.7,
  10: 5.7,
};

/**
 * Check if game is in "foul game" territory
 * Foul game = last 2 minutes of regulation, with 1-10 point differential
 * @param period - Current period (1 = 1st half, 2 = 2nd half, 3+ = OT)
 * @param clockMinutes - Minutes on the clock
 * @param clockSeconds - Seconds on the clock
 * @param pointDiff - Absolute point differential (|homeScore - awayScore|)
 * @returns true if in foul game territory
 */
export function isInFoulGame(
  period: number,
  clockMinutes: number,
  clockSeconds: number,
  pointDiff: number
): boolean {
  // Must be in 2nd half (not 1st half or OT)
  if (period !== 2) return false;

  // Calculate seconds remaining
  const secondsRemaining = clockMinutes * 60 + clockSeconds;

  // Must be in last 2 minutes
  if (secondsRemaining > FOUL_GAME_TIME_THRESHOLD) return false;

  // Point differential must be between 1-10
  if (pointDiff < FOUL_GAME_MIN_DEFICIT || pointDiff > FOUL_GAME_MAX_DEFICIT) return false;

  return true;
}

/**
 * Get expected extra points from foul game based on point differential
 * @param pointDiff - Absolute point differential (1-10)
 * @returns Expected extra points, or null if not in foul game range
 */
export function getFoulGameAdjustment(pointDiff: number): number | null {
  if (pointDiff < FOUL_GAME_MIN_DEFICIT || pointDiff > FOUL_GAME_MAX_DEFICIT) {
    return null;
  }
  return FOUL_GAME_ADJUSTMENTS[pointDiff] || null;
}

/**
 * Check if game could potentially enter foul game territory
 * Shows earlier (5 min out) so users can anticipate the adjustment
 * @param period - Current period
 * @param clockMinutes - Minutes on the clock
 * @param clockSeconds - Seconds on the clock
 * @param pointDiff - Absolute point differential
 * @returns true if game could enter foul territory soon
 */
export function couldEnterFoulGame(
  period: number,
  clockMinutes: number,
  clockSeconds: number,
  pointDiff: number
): boolean {
  // Must be in 2nd half
  if (period !== 2) return false;

  const secondsRemaining = clockMinutes * 60 + clockSeconds;

  // Show potential from 5 minutes out
  if (secondsRemaining > FOUL_GAME_POTENTIAL_THRESHOLD) return false;

  // Point differential could reasonably lead to foul game (0-12 range)
  // 0 = tied game that could become close
  // Up to 12 = could tighten to 10 or less
  if (pointDiff > 12) return false;

  return true;
}

/**
 * Get the likely foul game adjustment based on current deficit
 * For potential scenarios, estimates based on current or expected deficit
 * @param pointDiff - Current point differential
 * @returns Expected extra points
 */
export function getExpectedFoulGameAdjustment(pointDiff: number): number {
  // If already in foul game range, use exact adjustment
  if (pointDiff >= FOUL_GAME_MIN_DEFICIT && pointDiff <= FOUL_GAME_MAX_DEFICIT) {
    return FOUL_GAME_ADJUSTMENTS[pointDiff] || 5.8;
  }

  // If tied or very close, assume avg 4-5 point game develops
  if (pointDiff === 0) {
    return 5.5; // Average for 3-5 point games
  }

  // If > 10 but <= 12, could tighten - use conservative estimate
  if (pointDiff > 10 && pointDiff <= 12) {
    return 5.0;
  }

  // Default average
  return 5.8;
}

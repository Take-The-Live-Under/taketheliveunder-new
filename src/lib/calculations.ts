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

const MIN_MINUTES_ELAPSED = 4.0;  // Game must have been going for at least 4 minutes
const MIN_MINUTES_REMAINING = 5.0; // GOLDEN ZONE: Must have 5+ minutes left
const UNDER_PPM_THRESHOLD = 4.5;   // Required PPM must be >= this for under trigger
const UNDER_PPM_BUFFER_MIN = 1.0;  // GOLDEN ZONE: PPM difference must be >= 1.0
const UNDER_PPM_BUFFER_MAX = 1.5;  // GOLDEN ZONE: PPM difference must be <= 1.5

/**
 * Check if game meets basic trigger conditions (shared between under/over)
 */
function meetsBasicTriggerConditions(
  status: string,
  minutesRemainingReg: number,
  isOT: boolean
): boolean {
  if (status !== 'in') return false;
  if (isOT) return false;

  // Must have at least 4 minutes elapsed (40 - 4 = 36 max remaining)
  const minutesElapsed = REGULATION_MINUTES - minutesRemainingReg;
  if (minutesElapsed < MIN_MINUTES_ELAPSED) return false;

  // Must have more than 2 minutes remaining
  if (minutesRemainingReg <= MIN_MINUTES_REMAINING) return false;

  return true;
}

/**
 * Determine if game meets GOLDEN ZONE UNDER trigger conditions
 * GOLDEN ZONE TRIGGER LOGIC (69.7% win rate, 33.1% ROI):
 * - Game is live (in progress)
 * - At least 4 minutes elapsed
 * - 5+ minutes remaining (not late game)
 * - Required PPM >= 4.5
 * - PPM Difference (required - current) between 1.0 and 1.5 (sweet spot)
 * - Exclude overtime games
 */
export function isTriggered(
  status: string,
  minutesRemainingReg: number,
  requiredPPM: number | null,
  isOT: boolean,
  currentPPM: number | null = null
): boolean {
  if (!meetsBasicTriggerConditions(status, minutesRemainingReg, isOT)) return false;

  if (requiredPPM === null || requiredPPM < UNDER_PPM_THRESHOLD) return false;

  // GOLDEN ZONE: Must have currentPPM and PPM diff must be in sweet spot (1.0-1.5)
  if (currentPPM === null) return false;

  const ppmDiff = requiredPPM - currentPPM;
  if (ppmDiff < UNDER_PPM_BUFFER_MIN || ppmDiff > UNDER_PPM_BUFFER_MAX) return false;

  return true;
}

/**
 * Determine if game meets OVER trigger conditions
 * DISABLED: Golden Zone model focuses on Under triggers only
 * Over triggers showed 56.5% win rate but Golden Zone Under has 69.7%
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isOverTriggered(
  status: string,
  minutesRemainingReg: number,
  requiredPPM: number | null,
  currentPPM: number | null,
  isOT: boolean
): boolean {
  // DISABLED - Golden Zone model is Under-only
  // Keep params for API compatibility
  void status; void minutesRemainingReg; void requiredPPM; void currentPPM; void isOT;
  return false;
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

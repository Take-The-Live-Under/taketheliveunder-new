/**
 * Core Analytics Calculations
 * Pure functions for confidence, momentum, and trigger logic
 */

import { BETTING_CONFIG } from '@/config/betting.config';

// === Utility Functions ===

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Sigmoid (logistic) function: 1 / (1 + e^(-x))
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// === Confidence Calculation ===

export interface ConfidenceInput {
  currentPPM: number;
  requiredPPM: number;
  timeRemainingSec: number;
  projectedFinal: number;
  ouLine: number;
  isTriggered?: boolean;
}

export interface ConfidenceResult {
  confidence: number;          // 0-1 (convert to 0-100 for display)
  side: 'OVER' | 'UNDER';
  confidencePct: number;       // 0-100 for convenience
}

/**
 * Calculate confidence score using logistic function with time adjustment
 *
 * Algorithm:
 * 1. Base confidence from PPM difference via sigmoid
 * 2. Adjust based on time remaining (penalize high time, bonus low time)
 * 3. Determine OVER/UNDER side from projected vs line
 * 4. Clamp to configured min/max (wider range if triggered)
 */
export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const { currentPPM, requiredPPM, timeRemainingSec, projectedFinal, ouLine, isTriggered } = input;
  const config = BETTING_CONFIG.confidence;

  // 1. Base confidence from PPM difference
  const ppmDiff = currentPPM - requiredPPM;
  const baseConfidence = sigmoid(config.logisticA * ppmDiff);

  // 2. Time adjustment (penalize high time, bonus low time)
  const timeAdj = mapRange(
    timeRemainingSec,
    config.timeAdjustment.highTime,
    config.timeAdjustment.lowTime,
    config.timeAdjustment.penaltyHigh,
    config.timeAdjustment.bonusLow
  );
  const clampedTimeAdj = clamp(
    timeAdj,
    config.timeAdjustment.minAdj,
    config.timeAdjustment.maxAdj
  );

  // 3. Combined confidence
  let confidence = baseConfidence + clampedTimeAdj;

  // 4. Determine side (OVER if projected > line, otherwise UNDER)
  const side: 'OVER' | 'UNDER' = projectedFinal > ouLine ? 'OVER' : 'UNDER';

  // 5. Flip confidence if betting UNDER (lower PPM diff means higher confidence for UNDER)
  if (side === 'UNDER') {
    confidence = 1 - confidence;
  }

  // 6. Clamp to min/max (wider range if triggered)
  const minConf = isTriggered ? config.minConfTriggered : config.minConf;
  const maxConf = isTriggered ? config.maxConfTriggered : config.maxConf;
  confidence = clamp(confidence, minConf, maxConf);

  return {
    confidence,
    side,
    confidencePct: Math.round(confidence * 100),
  };
}

// === Momentum Calculation (EMA) ===

export interface MomentumInput {
  recentPaceData: { timestampSec: number; ppm: number }[];
  currentTimeSec: number;
}

export interface MomentumResult {
  emaShort: number;           // 2-minute EMA
  emaLong: number;            // 6-minute EMA
  arrow: 'up' | 'down' | 'flat';
  delta: number;              // emaShort - emaLong
}

/**
 * Calculate exponential moving averages for short and long windows
 * Returns momentum arrow based on difference threshold
 */
export function calculateMomentum(input: MomentumInput): MomentumResult {
  const { recentPaceData, currentTimeSec } = input;
  const config = BETTING_CONFIG.momentum;

  // Filter data within windows
  const shortWindow = recentPaceData.filter(
    d => currentTimeSec - d.timestampSec <= config.emaShortWindowSec
  );
  const longWindow = recentPaceData.filter(
    d => currentTimeSec - d.timestampSec <= config.emaLongWindowSec
  );

  // Calculate simple averages (for simplicity, could use true EMA)
  const emaShort = shortWindow.length > 0
    ? shortWindow.reduce((sum, d) => sum + d.ppm, 0) / shortWindow.length
    : 0;

  const emaLong = longWindow.length > 0
    ? longWindow.reduce((sum, d) => sum + d.ppm, 0) / longWindow.length
    : 0;

  const delta = emaShort - emaLong;

  // Determine arrow direction
  let arrow: 'up' | 'down' | 'flat' = 'flat';
  if (Math.abs(delta) >= config.arrowThreshold) {
    arrow = delta > 0 ? 'up' : 'down';
  }

  return {
    emaShort,
    emaLong,
    arrow,
    delta,
  };
}

// === Trigger Rule ===

export interface TriggerInput {
  requiredPPM: number;
  timeRemainingSec: number;
}

/**
 * Check if game meets trigger conditions:
 * - Required PPM > threshold
 * - Time remaining < threshold
 */
export function checkTrigger(input: TriggerInput): boolean {
  const { requiredPPM, timeRemainingSec } = input;
  const config = BETTING_CONFIG.trigger;

  return (
    requiredPPM > config.minRequiredPPM &&
    timeRemainingSec < config.maxTimeRemainingSec
  );
}

// === Commentary Generation ===

export interface CommentaryInput {
  currentPPM: number;
  previousPPM?: number;       // PPM from N minutes ago
  ouLine: number;
  previousOULine?: number;    // Line from N minutes ago
  fg3Pct?: number;
  previousFg3Pct?: number;
  currentTotal: number;
  projectedFinal: number;
  ouLineDiff: number;         // projectedFinal - ouLine
}

/**
 * Generate deterministic "AI Commentary" explaining what's happening
 * Uses template-based approach with thresholds
 */
export function generateCommentary(input: CommentaryInput): string {
  const {
    currentPPM,
    previousPPM,
    ouLine,
    previousOULine,
    fg3Pct,
    previousFg3Pct,
    currentTotal,
    projectedFinal,
    ouLineDiff,
  } = input;

  const config = BETTING_CONFIG.commentary;
  const sentences: string[] = [];

  // 1. Pace change
  if (previousPPM !== undefined) {
    const paceChange = ((currentPPM - previousPPM) / previousPPM);
    if (Math.abs(paceChange) >= config.paceChangeThreshold) {
      const direction = paceChange > 0 ? 'accelerated' : 'slowed';
      const pct = Math.abs(paceChange * 100).toFixed(0);
      sentences.push(
        `Pace ${direction} ${pct}% over last ${config.lookbackMinutes} min`
      );
    }
  }

  // 2. Line movement
  if (previousOULine !== undefined) {
    const lineDelta = Math.abs(ouLine - previousOULine);
    if (lineDelta >= config.lineChangeThreshold) {
      const direction = ouLine > previousOULine ? 'rose' : 'fell';
      sentences.push(
        `O/U line ${direction} ${lineDelta.toFixed(1)} in ${config.lookbackMinutes} min`
      );
    }
  }

  // 3. Shooting efficiency
  if (fg3Pct !== undefined && previousFg3Pct !== undefined) {
    const shootingDelta = fg3Pct - previousFg3Pct;
    if (Math.abs(shootingDelta) >= config.shootingChangeThreshold) {
      const direction = shootingDelta > 0 ? 'heating' : 'cooling';
      sentences.push(
        `3PT% ${direction} ${Math.abs(shootingDelta).toFixed(0)}% vs game avg`
      );
    }
  }

  // 4. Tracking statement (always include)
  const trackingDirection = ouLineDiff > 0 ? 'over' : 'under';
  const trackingPoints = Math.abs(ouLineDiff).toFixed(1);
  sentences.push(
    `Tracking ${trackingPoints} points ${trackingDirection} pace`
  );

  // Join sentences with semicolons and truncate if needed
  let commentary = sentences.join('; ');
  if (commentary.length > config.maxLength) {
    commentary = commentary.substring(0, config.maxLength - 3) + '...';
  }

  return commentary;
}

// === Confidence Tier ===

export function getConfidenceTier(confidencePct: number): {
  label: string;
  color: string;
} {
  const tiers = BETTING_CONFIG.ui.confidenceTiers;

  for (const [key, tier] of Object.entries(tiers)) {
    if (confidencePct >= tier.min && confidencePct <= tier.max) {
      return { label: tier.label, color: tier.color };
    }
  }

  return { label: 'UNKNOWN', color: 'gray' };
}

// === Time Formatting ===

/**
 * Convert seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert seconds to minutes with decimal (e.g., "7.3 min")
 */
export function formatMinutes(seconds: number): string {
  return (seconds / 60).toFixed(1);
}

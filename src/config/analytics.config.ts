/**
 * Analytics Dashboard Configuration
 * All tunables for confidence calculation, momentum, triggers, and UI thresholds
 */

export const ANALYTICS_CONFIG = {
  // === Trigger Rules ===
  trigger: {
    minRequiredPPM: 4.5,        // Minimum Required PPM to trigger alert
    maxTimeRemainingSec: 29 * 60, // Maximum time remaining (29 minutes)
  },

  // === Confidence Calculation ===
  confidence: {
    logisticA: 2.1,              // Steepness of logistic curve
    minConf: 0.10,               // Minimum confidence (10%)
    maxConf: 0.90,               // Maximum confidence (90%)
    minConfTriggered: 0.05,      // Min when triggered (5%)
    maxConfTriggered: 0.95,      // Max when triggered (95%)

    // Time adjustment factors (College BBall = 40 min total)
    timeAdjustment: {
      highTime: 2400,            // 40 minutes in seconds (full game)
      lowTime: 0,                // 0 minutes (game end)
      penaltyHigh: -0.10,        // Penalty for high time remaining
      bonusLow: +0.10,           // Bonus for low time remaining
      minAdj: -0.15,             // Min adjustment
      maxAdj: +0.15,             // Max adjustment
    },
  },

  // === Momentum Indicators ===
  momentum: {
    emaShortWindowSec: 120,      // 2 minute window for short EMA
    emaLongWindowSec: 360,       // 6 minute window for long EMA
    arrowThreshold: 0.12,        // PPM difference threshold for arrow direction
    significantChange: 0.18,     // Significant momentum change
  },

  // === Commentary Generation ===
  commentary: {
    paceChangeThreshold: 0.08,   // 8% pace change is notable
    lineChangeThreshold: 1.5,    // 1.5 point line movement is notable
    shootingChangeThreshold: 5,  // 5% shooting change is notable
    lookbackMinutes: 5,          // Look back 5 minutes for deltas
    maxLength: 180,              // Max characters for commentary
  },

  // === Performance ===
  performance: {
    streamBatchDelayMs: 500,     // Batch stream updates every 500ms
    virtualizeThreshold: 30,     // Virtualize list if > 30 games
    targetFrameMs: 16,           // Target 60fps (16ms per frame)
  },

  // === UI Thresholds ===
  ui: {
    confidenceTiers: {
      low: { min: 0, max: 50, label: 'LOW', color: 'red' },
      medium: { min: 50, max: 70, label: 'MEDIUM', color: 'yellow' },
      high: { min: 70, max: 85, label: 'HIGH', color: 'green' },
      max: { min: 85, max: 100, label: 'MAX', color: 'emerald' },
    },

    // Color semantics
    colors: {
      over: {
        primary: '#10b981',      // Green
        light: '#d1fae5',
        dark: '#065f46',
      },
      under: {
        primary: '#3b82f6',      // Blue
        light: '#dbeafe',
        dark: '#1e40af',
      },
      lineMovement: {
        primary: '#a855f7',      // Purple
        light: '#f3e8ff',
        dark: '#6b21a8',
      },
    },
  },
} as const;

// Type exports for TypeScript
export type AnalyticsConfig = typeof ANALYTICS_CONFIG;
export type ConfidenceTier = keyof typeof ANALYTICS_CONFIG.ui.confidenceTiers;

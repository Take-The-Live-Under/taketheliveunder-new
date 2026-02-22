/**
 * Betting Mathematics Library
 * Calculations for EV, parlays, implied probability, and more
 */

// Convert American odds to decimal odds
export function americanToDecimal(american: number): number {
  if (american > 0) {
    return (american / 100) + 1;
  } else {
    return (100 / Math.abs(american)) + 1;
  }
}

// Convert decimal odds to American odds
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  } else {
    return Math.round(-100 / (decimal - 1));
  }
}

// Convert American odds to implied probability (as decimal 0-1)
export function americanToImpliedProbability(american: number): number {
  if (american < 0) {
    return Math.abs(american) / (Math.abs(american) + 100);
  } else {
    return 100 / (american + 100);
  }
}

// Convert probability to fair American odds (no vig)
export function probabilityToFairOdds(probability: number): number {
  if (probability >= 0.5) {
    return Math.round(-100 * probability / (1 - probability));
  } else {
    return Math.round(100 * (1 - probability) / probability);
  }
}

// Calculate the vig/juice from a two-way market
export function calculateVig(odds1: number, odds2: number): number {
  const prob1 = americanToImpliedProbability(odds1);
  const prob2 = americanToImpliedProbability(odds2);
  const totalImplied = prob1 + prob2;
  return (totalImplied - 1) * 100; // Return as percentage
}

// Remove vig to get "no-vig" fair probability
export function removeVig(odds1: number, odds2: number): { fair1: number; fair2: number } {
  const prob1 = americanToImpliedProbability(odds1);
  const prob2 = americanToImpliedProbability(odds2);
  const totalImplied = prob1 + prob2;

  return {
    fair1: prob1 / totalImplied,
    fair2: prob2 / totalImplied,
  };
}

// Calculate payout for a given wager at American odds
export function calculatePayout(american: number, wager: number): number {
  const decimal = americanToDecimal(american);
  return wager * (decimal - 1);
}

// Calculate total return (wager + profit) for American odds
export function calculateTotalReturn(american: number, wager: number): number {
  const decimal = americanToDecimal(american);
  return wager * decimal;
}

// Calculate Expected Value
export function calculateEV(
  american: number,
  wager: number,
  trueProbability: number // Your estimated true probability (0-1)
): number {
  const profit = calculatePayout(american, wager);
  const ev = (trueProbability * profit) - ((1 - trueProbability) * wager);
  return ev;
}

// Calculate EV as a percentage of wager
export function calculateEVPercent(
  american: number,
  trueProbability: number
): number {
  const impliedProb = americanToImpliedProbability(american);
  const decimal = americanToDecimal(american);
  const ev = (trueProbability * (decimal - 1)) - ((1 - trueProbability) * 1);
  return ev * 100; // Return as percentage
}

// Calculate edge (difference between true prob and implied prob)
export function calculateEdge(american: number, trueProbability: number): number {
  const impliedProb = americanToImpliedProbability(american);
  return (trueProbability - impliedProb) * 100; // Return as percentage
}

// Parlay calculations
export interface ParlayLeg {
  american: number;
  description?: string;
  trueProbability?: number; // Optional: your estimated true probability
}

export interface ParlayResult {
  combinedDecimalOdds: number;
  combinedAmericanOdds: number;
  impliedProbability: number;
  trueProbability: number | null; // null if any leg missing true prob
  payout: number; // For $1 wager
  totalReturn: number; // For $1 wager
  ev: number | null; // null if can't calculate
  evPercent: number | null;
  vigPercent: number;
  legs: number;
}

export function calculateParlay(legs: ParlayLeg[], wager: number = 1): ParlayResult {
  if (legs.length === 0) {
    return {
      combinedDecimalOdds: 1,
      combinedAmericanOdds: 0,
      impliedProbability: 1,
      trueProbability: 1,
      payout: 0,
      totalReturn: wager,
      ev: 0,
      evPercent: 0,
      vigPercent: 0,
      legs: 0,
    };
  }

  // Multiply decimal odds
  let combinedDecimal = 1;
  let impliedProb = 1;
  let trueProb: number | null = 1;
  let totalVig = 0;

  for (const leg of legs) {
    const decimal = americanToDecimal(leg.american);
    combinedDecimal *= decimal;

    const legImplied = americanToImpliedProbability(leg.american);
    impliedProb *= legImplied;

    if (leg.trueProbability !== undefined && trueProb !== null) {
      trueProb *= leg.trueProbability;
    } else {
      trueProb = null;
    }

    // Estimate vig per leg (assuming -110/-110 standard)
    // Real vig calculation would need both sides of each bet
    const estimatedVig = legImplied - 0.5; // Rough estimate
    totalVig += Math.max(0, estimatedVig * 100);
  }

  const combinedAmerican = decimalToAmerican(combinedDecimal);
  const payout = wager * (combinedDecimal - 1);
  const totalReturn = wager * combinedDecimal;

  let ev: number | null = null;
  let evPercent: number | null = null;

  if (trueProb !== null) {
    ev = (trueProb * payout) - ((1 - trueProb) * wager);
    evPercent = ((trueProb * (combinedDecimal - 1)) - ((1 - trueProb) * 1)) * 100;
  }

  // Calculate compounded vig
  // Fair parlay would pay at true probability odds
  // Difference shows how much vig is taken
  const fairDecimal = 1 / impliedProb;
  const vigPercent = ((fairDecimal - combinedDecimal) / fairDecimal) * 100;

  return {
    combinedDecimalOdds: combinedDecimal,
    combinedAmericanOdds: combinedAmerican,
    impliedProbability: impliedProb,
    trueProbability: trueProb,
    payout,
    totalReturn,
    ev,
    evPercent,
    vigPercent: Math.max(0, vigPercent),
    legs: legs.length,
  };
}

// Calculate correlation adjustment for same-game parlays
// Positive correlation means events tend to happen together
export function correlationAdjustment(
  baseProb: number,
  correlation: number // -1 to 1, where 0 is independent
): number {
  // This is a simplified model
  // Positive correlation increases combined probability
  // Negative correlation decreases it
  const adjustment = 1 + (correlation * 0.2); // Max 20% adjustment
  return Math.min(1, Math.max(0, baseProb * adjustment));
}

// Kelly Criterion for optimal bet sizing
export function kellyBetSize(
  bankroll: number,
  american: number,
  trueProbability: number,
  fraction: number = 0.25 // Use fractional Kelly (1 = full Kelly, 0.25 = quarter Kelly)
): number {
  const decimal = americanToDecimal(american);
  const b = decimal - 1; // Net odds (profit per $1)
  const p = trueProbability;
  const q = 1 - p;

  // Kelly formula: f* = (bp - q) / b
  const kelly = (b * p - q) / b;

  // Don't bet if negative Kelly (negative edge)
  if (kelly <= 0) return 0;

  // Apply fractional Kelly and bankroll
  const betSize = bankroll * kelly * fraction;

  // Never bet more than a reasonable max (e.g., 10% of bankroll)
  const maxBet = bankroll * 0.1;
  return Math.min(betSize, maxBet);
}

// Hedge calculator - find optimal hedge bet
export function calculateHedge(
  originalWager: number,
  originalOdds: number,
  hedgeOdds: number,
  targetProfit?: number // If specified, calculate hedge for guaranteed profit
): { hedgeWager: number; guaranteedProfit: number; worstCase: number } {
  const originalPayout = calculateTotalReturn(originalOdds, originalWager);
  const hedgeDecimal = americanToDecimal(hedgeOdds);

  if (targetProfit !== undefined) {
    // Calculate hedge to guarantee specific profit
    // If original wins: originalPayout - hedgeWager = targetProfit
    // If hedge wins: hedgeWager * hedgeDecimal - originalWager = targetProfit
    const hedgeWager = (originalPayout - targetProfit) / hedgeDecimal;
    const hedgeReturn = hedgeWager * hedgeDecimal;

    return {
      hedgeWager: Math.max(0, hedgeWager),
      guaranteedProfit: targetProfit,
      worstCase: targetProfit,
    };
  } else {
    // Calculate hedge for equal profit either way
    // originalPayout - hedgeWager = hedgeWager * hedgeDecimal - originalWager
    // originalPayout + originalWager = hedgeWager * (1 + hedgeDecimal)
    const hedgeWager = (originalPayout + originalWager) / (1 + hedgeDecimal);
    const profitIfOriginalWins = originalPayout - hedgeWager;
    const profitIfHedgeWins = hedgeWager * hedgeDecimal - originalWager;

    return {
      hedgeWager,
      guaranteedProfit: Math.min(profitIfOriginalWins, profitIfHedgeWins),
      worstCase: Math.min(profitIfOriginalWins, profitIfHedgeWins),
    };
  }
}

// Format odds for display
export function formatOdds(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

// Format probability as percentage
export function formatProbability(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}

// Format EV with color indicator
export function formatEV(ev: number): { text: string; color: 'green' | 'red' | 'neutral' } {
  const text = ev >= 0 ? `+$${ev.toFixed(2)}` : `-$${Math.abs(ev).toFixed(2)}`;
  const color = ev > 0.01 ? 'green' : ev < -0.01 ? 'red' : 'neutral';
  return { text, color };
}

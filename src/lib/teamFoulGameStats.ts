/**
 * Team Foul Game Tendencies
 * Based on analysis of 3,649 games (1,237 with foul game situations)
 *
 * High impact teams: When involved in close games, create more extra points
 * Early foulers: Start fouling aggressively at ~2:00 mark
 * Late foulers: Wait until under 1:30 to start fouling
 */

export interface TeamFoulGameStats {
  team: string;
  timesFouling: number;       // Games where team was trailing and fouled
  timesLeading: number;       // Games where team was leading and got fouled
  avgStartClock: number;      // Avg seconds remaining when they start fouling
  avgDeficit: number;         // Avg point deficit when they foul
  avgExtraPts: number;        // Avg extra points added when involved
  tendency: 'early' | 'late' | 'normal' | 'high_impact';
}

// Teams with high foul game impact (add 8+ extra pts when involved)
export const HIGH_IMPACT_TEAMS: Record<string, number> = {
  "Southern Miss Golden Eagles": 14.2,
  "Montana Grizzlies": 10.7,
  "Niagara Purple Eagles": 10.1,
  "Howard Bison": 9.9,
  "Detroit Mercy Titans": 9.5,
  "Old Dominion Monarchs": 9.4,
  "UNC Asheville Bulldogs": 9.3,
  "Florida Gulf Coast Eagles": 9.2,
  "Richmond Spiders": 9.2,
  "Radford Highlanders": 9.0,
  "App State Mountaineers": 10.4,
  "Drake Bulldogs": 9.5,
  "Fordham Rams": 9.4,
  "Bellarmine Knights": 9.0,
  "Hofstra Pride": 8.1,
  "George Mason Patriots": 8.1,
  "Jacksonville State Gamecocks": 8.2,
  "Louisiana Ragin' Cajuns": 7.8,
  "Wofford Terriers": 7.9,
  "Stony Brook Seawolves": 7.8,
  "Montana State Bobcats": 7.7,
  "Charlotte 49ers": 7.6,
  "Mount St. Mary's Mountaineers": 7.2,
};

// Teams that start fouling early (avg start > 110 seconds remaining)
export const EARLY_FOULERS: Record<string, number> = {
  "Elon Phoenix": 118,
  "Coastal Carolina Chanticleers": 116,
  "James Madison Dukes": 116,
  "Southern Miss Golden Eagles": 116,
  "Bucknell Bison": 116,
  "Fairleigh Dickinson Knights": 115,
  "Austin Peay Governors": 115,
  "Wichita State Shockers": 115,
  "Cal Poly Mustangs": 115,
  "Boston University Terriers": 114,
  "Montana Grizzlies": 114,
  "Southern Indiana Screaming Eagles": 114,
  "VCU Rams": 113,
  "Niagara Purple Eagles": 113,
  "East Carolina Pirates": 113,
  "Western Illinois Leathernecks": 112,
  "Louisiana Ragin' Cajuns": 112,
  "Massachusetts Minutemen": 112,
  "Northeastern Huskies": 111,
  "Charlotte 49ers": 111,
  "Vermont Catamounts": 111,
  "Idaho Vandals": 111,
  "Florida Gulf Coast Eagles": 110,
  "Jacksonville State Gamecocks": 110,
  "Hofstra Pride": 110,
  "Southern Illinois Salukis": 110,
};

// Teams that wait to foul (avg start < 100 seconds remaining)
export const LATE_FOULERS: Record<string, number> = {
  "Cal State Bakersfield Roadrunners": 82,
  "Fresno State Bulldogs": 87,
  "Eastern Washington Eagles": 89,
  "Army Black Knights": 93,
  "Fairfield Stags": 94,
  "Radford Highlanders": 94,
  "Wright State Raiders": 95,
  "Old Dominion Monarchs": 96,
  "Northwestern Wildcats": 97,
  "East Texas A&M Lions": 97,
  "San Diego Toreros": 97,
  "Rhode Island Rams": 98,
  "UNC Asheville Bulldogs": 98,
};

// Teams that foul even at high deficits (avg deficit > 7 points)
export const HIGH_DEFICIT_FOULERS: Record<string, number> = {
  "Bellarmine Knights": 8.2,
  "Charlotte 49ers": 7.7,
  "Radford Highlanders": 7.6,
  "San Diego Toreros": 7.6,
  "Army Black Knights": 7.5,
  "Le Moyne Dolphins": 7.5,
  "IU Indianapolis Jaguars": 7.4,
  "Morehead State Eagles": 7.4,
  "Rhode Island Rams": 7.3,
  "Eastern Washington Eagles": 7.2,
  "Drake Bulldogs": 7.2,
  "James Madison Dukes": 7.2,
  "Fordham Rams": 7.2,
  "Cal State Bakersfield Roadrunners": 7.2,
  "App State Mountaineers": 7.0,
};

/**
 * Get foul game tendency for a team
 */
export function getTeamFoulGameTendency(teamName: string): {
  isHighImpact: boolean;
  isEarlyFouler: boolean;
  isLateFouler: boolean;
  isHighDeficitFouler: boolean;
  extraPtsImpact: number | null;
  avgStartClock: number | null;
} {
  // Normalize team name for matching (handle slight variations)
  const normalizedName = teamName.toLowerCase().trim();

  const findMatch = (dict: Record<string, number>): [string, number] | null => {
    for (const [key, value] of Object.entries(dict)) {
      if (key.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(key.toLowerCase().split(' ')[0])) {
        return [key, value];
      }
    }
    return null;
  };

  const highImpactMatch = findMatch(HIGH_IMPACT_TEAMS);
  const earlyFoulerMatch = findMatch(EARLY_FOULERS);
  const lateFoulerMatch = findMatch(LATE_FOULERS);
  const highDeficitMatch = findMatch(HIGH_DEFICIT_FOULERS);

  return {
    isHighImpact: highImpactMatch !== null,
    isEarlyFouler: earlyFoulerMatch !== null,
    isLateFouler: lateFoulerMatch !== null,
    isHighDeficitFouler: highDeficitMatch !== null,
    extraPtsImpact: highImpactMatch ? highImpactMatch[1] : null,
    avgStartClock: earlyFoulerMatch ? earlyFoulerMatch[1] : (lateFoulerMatch ? lateFoulerMatch[1] : null),
  };
}

/**
 * Check if either team has notable foul game tendencies
 */
export function checkMatchupFoulGameTendencies(homeTeam: string, awayTeam: string): {
  hasHighImpactTeam: boolean;
  hasEarlyFouler: boolean;
  highImpactTeams: string[];
  earlyFoulers: string[];
  totalExtraImpact: number;
  warningMessage: string | null;
} {
  const homeTendency = getTeamFoulGameTendency(homeTeam);
  const awayTendency = getTeamFoulGameTendency(awayTeam);

  const highImpactTeams: string[] = [];
  const earlyFoulers: string[] = [];
  let totalExtraImpact = 0;

  if (homeTendency.isHighImpact) {
    highImpactTeams.push(homeTeam);
    totalExtraImpact += (homeTendency.extraPtsImpact || 0) - 5.8; // Subtract baseline
  }
  if (awayTendency.isHighImpact) {
    highImpactTeams.push(awayTeam);
    totalExtraImpact += (awayTendency.extraPtsImpact || 0) - 5.8;
  }
  if (homeTendency.isEarlyFouler) earlyFoulers.push(homeTeam);
  if (awayTendency.isEarlyFouler) earlyFoulers.push(awayTeam);

  let warningMessage: string | null = null;
  if (highImpactTeams.length > 0) {
    const teamNames = highImpactTeams.length === 1
      ? highImpactTeams[0].split(' ')[0]
      : 'Both teams';
    warningMessage = `${teamNames} = high foul game impact (+${totalExtraImpact.toFixed(1)} extra pts)`;
  } else if (earlyFoulers.length > 0) {
    const teamName = earlyFoulers[0].split(' ')[0];
    warningMessage = `${teamName} tends to foul early`;
  }

  return {
    hasHighImpactTeam: highImpactTeams.length > 0,
    hasEarlyFouler: earlyFoulers.length > 0,
    highImpactTeams,
    earlyFoulers,
    totalExtraImpact: Math.max(0, totalExtraImpact),
    warningMessage,
  };
}

/**
 * Team Directional Filters
 * Based on season analysis of 4,082 triggers
 *
 * These filters help users know which direction to bet for each team
 * and which teams to avoid entirely.
 */

export type TeamDirection = 'over_only' | 'under_only' | 'avoid';

export interface TeamFilter {
  direction: TeamDirection;
  overWinRate: number;
  underWinRate: number;
  warning?: string;
}

// Teams that are ONLY good for OVER bets (terrible for under)
const OVER_ONLY_TEAMS: Record<string, { overWR: number; underWR: number }> = {
  'Creighton Bluejays': { overWR: 100, underWR: 0 },
  'Drake Bulldogs': { overWR: 97, underWR: 0 },
  'Hofstra Pride': { overWR: 100, underWR: 0 },
  'Youngstown State Penguins': { overWR: 100, underWR: 0 },
  'Bucknell Bison': { overWR: 100, underWR: 0 },
  'Wichita State Shockers': { overWR: 100, underWR: 0 },
  'Pittsburgh Panthers': { overWR: 100, underWR: 0 },
  'Lehigh Mountain Hawks': { overWR: 100, underWR: 0 },
  'Providence Friars': { overWR: 100, underWR: 0 },
  'Notre Dame Fighting Irish': { overWR: 100, underWR: 40 },
  'Wisconsin Badgers': { overWR: 100, underWR: 67 },
  'Colgate Raiders': { overWR: 100, underWR: 6 },
  'Ole Miss Rebels': { overWR: 100, underWR: 15 },
  'Southern Miss Golden Eagles': { overWR: 100, underWR: 0 },
  'Colorado State Rams': { overWR: 94, underWR: 0 },
  'Fresno State Bulldogs': { overWR: 100, underWR: 12 },
  'Bradley Braves': { overWR: 53, underWR: 0 },
};

// Teams that are ONLY good for UNDER bets (terrible for over)
const UNDER_ONLY_TEAMS: Record<string, { overWR: number; underWR: number }> = {
  'Texas Longhorns': { overWR: 0, underWR: 93 },
  'Kansas State Wildcats': { overWR: 0, underWR: 88 },
  'Oklahoma State Cowboys': { overWR: 0, underWR: 74 },
  'Oakland Golden Grizzlies': { overWR: 0, underWR: 96 },
  'Florida International Panthers': { overWR: 0, underWR: 88 },
  'UNC Asheville Bulldogs': { overWR: 0, underWR: 89 },
  'Illinois Fighting Illini': { overWR: 0, underWR: 73 },
  'Northwestern Wildcats': { overWR: 0, underWR: 83 },
  'SMU Mustangs': { overWR: 8, underWR: 100 },
  'Detroit Mercy Titans': { overWR: 0, underWR: 100 },
  'Jacksonville State Gamecocks': { overWR: 0, underWR: 100 },
  'Eastern Illinois Panthers': { overWR: 9, underWR: 100 },
};

// Teams to AVOID completely (bad both ways)
const BLACKLIST_TEAMS: Record<string, { overWR: number; underWR: number; reason: string }> = {
  'Arizona Wildcats': { overWR: 0, underWR: 0, reason: '0% win rate both directions' },
  'Minnesota Golden Gophers': { overWR: 0, underWR: 14, reason: 'Terrible both directions' },
  'Michigan State Spartans': { overWR: 0, underWR: 29, reason: 'Rivalry games go over' },
  'Virginia Cavaliers': { overWR: 0, underWR: 50, reason: 'Over is poison (0%)' },
  'Iona Gaels': { overWR: 0, underWR: 29, reason: 'Terrible both directions' },
  'Saint Peter\'s Peacocks': { overWR: 0, underWR: 33, reason: 'Terrible both directions' },
  'Colorado Buffaloes': { overWR: 0, underWR: 40, reason: 'Over is poison (0%)' },
  'Wofford Terriers': { overWR: 0, underWR: 4, reason: '96% loss rate' },
  'Evansville Purple Aces': { overWR: 0, underWR: 6, reason: '94% loss rate' },
  'Bethune-Cookman Wildcats': { overWR: 0, underWR: 7, reason: '93% loss rate' },
  'The Citadel Bulldogs': { overWR: 0, underWR: 10, reason: '90% loss rate' },
  'Coastal Carolina Chanticleers': { overWR: 67, underWR: 0, reason: 'Under is poison (0%)' },
  'Georgia State Panthers': { overWR: 0, underWR: 10, reason: '90% loss rate' },
  'Kansas Jayhawks': { overWR: 0, underWR: 13, reason: '87% loss rate - Big 12 trap' },
  'Butler Bulldogs': { overWR: 0, underWR: 17, reason: '83% loss rate' },
  'Utah Utes': { overWR: 0, underWR: 18, reason: '82% loss rate' },
  'East Carolina Pirates': { overWR: 0, underWR: 15, reason: '85% loss rate' },
  'Washington Huskies': { overWR: 0, underWR: 14, reason: '86% loss rate' },
  'Northern Arizona Lumberjacks': { overWR: 38, underWR: 0, reason: 'Under is poison (0%)' },
};

// Teams with strong over preference (better over win rate)
const OVER_PREFERRED_TEAMS: Record<string, { overWR: number; underWR: number }> = {
  'Florida Gators': { overWR: 100, underWR: 82 },
  'Georgia Tech Yellow Jackets': { overWR: 100, underWR: 88 },
  'Belmont Bruins': { overWR: 100, underWR: 92 },
  'Milwaukee Panthers': { overWR: 100, underWR: 89 },
  'Clemson Tigers': { overWR: 100, underWR: 75 },
  'Akron Zips': { overWR: 100, underWR: 88 },
  'Memphis Tigers': { overWR: 100, underWR: 100 },  // Good both but slightly favor over
  'Boise State Broncos': { overWR: 100, underWR: 100 },
};

// Teams with strong under preference (better under win rate)
const UNDER_PREFERRED_TEAMS: Record<string, { overWR: number; underWR: number }> = {
  'Florida State Seminoles': { overWR: 91, underWR: 100 },
  'Vanderbilt Commodores': { overWR: 71, underWR: 100 },
  'UCLA Bruins': { overWR: 72, underWR: 100 },
  'Loyola Chicago Ramblers': { overWR: 100, underWR: 100 },  // Good both but slightly favor under
  'Sam Houston Bearkats': { overWR: 100, underWR: 100 },
};

/**
 * Get filter recommendation for a team
 */
export function getTeamFilter(teamName: string): TeamFilter | null {
  // Check blacklist first
  if (BLACKLIST_TEAMS[teamName]) {
    const t = BLACKLIST_TEAMS[teamName];
    return {
      direction: 'avoid',
      overWinRate: t.overWR,
      underWinRate: t.underWR,
      warning: `🚫 AVOID: ${t.reason}`,
    };
  }

  // Check over-only teams
  if (OVER_ONLY_TEAMS[teamName]) {
    const t = OVER_ONLY_TEAMS[teamName];
    return {
      direction: 'over_only',
      overWinRate: t.overWR,
      underWinRate: t.underWR,
      warning: `🔥 OVER ONLY (${t.overWR}% over, ${t.underWR}% under)`,
    };
  }

  // Check under-only teams
  if (UNDER_ONLY_TEAMS[teamName]) {
    const t = UNDER_ONLY_TEAMS[teamName];
    return {
      direction: 'under_only',
      overWinRate: t.overWR,
      underWinRate: t.underWR,
      warning: `❄️ UNDER ONLY (${t.underWR}% under, ${t.overWR}% over)`,
    };
  }

  // Check over-preferred teams
  if (OVER_PREFERRED_TEAMS[teamName]) {
    const t = OVER_PREFERRED_TEAMS[teamName];
    return {
      direction: 'over_only',
      overWinRate: t.overWR,
      underWinRate: t.underWR,
      warning: `🔥 OVER (${t.overWR}%)`,
    };
  }

  // Check under-preferred teams
  if (UNDER_PREFERRED_TEAMS[teamName]) {
    const t = UNDER_PREFERRED_TEAMS[teamName];
    return {
      direction: 'under_only',
      overWinRate: t.overWR,
      underWinRate: t.underWR,
      warning: `❄️ UNDER (${t.underWR}%)`,
    };
  }

  return null;
}

/**
 * Check if a trigger should be filtered out based on team and direction
 * Returns true if the trigger should be SKIPPED
 */
export function shouldFilterTrigger(
  homeTeam: string,
  awayTeam: string,
  triggerType: 'over' | 'under' | 'tripleDipper'
): { shouldFilter: boolean; reason: string | null } {
  const homeFilter = getTeamFilter(homeTeam);
  const awayFilter = getTeamFilter(awayTeam);

  // Check blacklist teams
  if (homeFilter?.direction === 'avoid') {
    return { shouldFilter: true, reason: `${homeTeam}: ${homeFilter.warning}` };
  }
  if (awayFilter?.direction === 'avoid') {
    return { shouldFilter: true, reason: `${awayTeam}: ${awayFilter.warning}` };
  }

  // Check directional mismatches
  const isUnderBet = triggerType === 'under' || triggerType === 'tripleDipper';
  const isOverBet = triggerType === 'over';

  if (isUnderBet) {
    // For under bets, filter if either team is over-only
    if (homeFilter?.direction === 'over_only') {
      return { shouldFilter: true, reason: `${homeTeam} is OVER-ONLY team` };
    }
    if (awayFilter?.direction === 'over_only') {
      return { shouldFilter: true, reason: `${awayTeam} is OVER-ONLY team` };
    }
  }

  if (isOverBet) {
    // For over bets, filter if either team is under-only
    if (homeFilter?.direction === 'under_only') {
      return { shouldFilter: true, reason: `${homeTeam} is UNDER-ONLY team` };
    }
    if (awayFilter?.direction === 'under_only') {
      return { shouldFilter: true, reason: `${awayTeam} is UNDER-ONLY team` };
    }
  }

  return { shouldFilter: false, reason: null };
}

/**
 * Get combined warning message for a game
 */
export function getGameWarnings(homeTeam: string, awayTeam: string): string[] {
  const warnings: string[] = [];

  const homeFilter = getTeamFilter(homeTeam);
  const awayFilter = getTeamFilter(awayTeam);

  if (homeFilter?.warning) {
    warnings.push(`${homeTeam}: ${homeFilter.warning}`);
  }
  if (awayFilter?.warning) {
    warnings.push(`${awayTeam}: ${awayFilter.warning}`);
  }

  return warnings;
}

/**
 * Get display badge for a team
 */
export function getTeamBadge(teamName: string): { text: string; color: string } | null {
  const filter = getTeamFilter(teamName);
  if (!filter) return null;

  switch (filter.direction) {
    case 'avoid':
      return { text: '🚫 AVOID', color: 'red' };
    case 'over_only':
      return { text: '🔥 OVER', color: 'orange' };
    case 'under_only':
      return { text: '❄️ UNDER', color: 'blue' };
    default:
      return null;
  }
}

export type TriggerType = 'over' | 'under' | 'tripleDipper' | null;

export interface BonusStatus {
  inBonus: boolean;
  inDoubleBonus: boolean;
  fouls: number;          // Current half fouls (or total if can't determine)
  isEstimated: boolean;   // True if we can't accurately determine 2nd half fouls
}

export interface Game {
  id: string;
  startTime: string;
  status: 'pre' | 'in' | 'post';
  period: number;
  clock: string;
  minutesRemainingReg: number;
  awayTeam: string;
  homeTeam: string;
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number;
  homeScore: number;
  liveTotal: number;
  ouLine: number | null;
  currentPPM: number | null;
  requiredPPM: number | null;
  triggeredFlag: boolean;      // Under trigger (legacy, kept for compatibility)
  overTriggeredFlag: boolean;  // Over trigger - pace tracking close to line
  triggerType: TriggerType;  // Which trigger is active
  isOvertime: boolean;
  isTomorrow?: boolean;
  // Foul game adjustment fields
  inFoulGame: boolean;         // True if last 2 min and 1-10 point differential
  couldEnterFoulGame: boolean; // True if 5 min out and close game - show projection early
  foulGameAdjustment: number | null;  // Expected extra points from foul game
  adjustedProjectedTotal: number | null;  // Projected total + foul game adjustment
  // Foul game warning fields (shown around 4 min mark)
  foulGameWarning: boolean;    // True if close game around 4 min with notable teams
  foulGameWarningMessage: string | null;  // Warning message to display
  teamFoulGameImpact: number;  // Extra adjustment based on specific team tendencies
  // Team-specific foul game info
  homeFoulGameInfo: string | null;  // Home team's foul game tendency info
  awayFoulGameInfo: string | null;  // Away team's foul game tendency info
  foulGameWarningLevel: 'high' | 'medium' | 'low' | 'none';  // Overall warning level
  // Bonus status - fouls against each team (opponent fouls = your free throws)
  homeBonusStatus?: BonusStatus;  // Based on away team's fouls against home
  awayBonusStatus?: BonusStatus;  // Based on home team's fouls against away
}

export interface ESPNGame {
  id: string;
  date: string;
  status: {
    type: {
      state: string;
      description: string;
    };
    period: number;
    displayClock: string;
  };
  competitions: Array<{
    competitors: Array<{
      homeAway: 'home' | 'away';
      team: {
        displayName: string;
        abbreviation: string;
      };
      score: string;
    }>;
  }>;
}

export interface OddsGame {
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        point?: number;
      }>;
    }>;
  }>;
}

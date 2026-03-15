// ─────────────────────────────────────────────────────────────────────────────
// BRACKET LAB — Mock Data
// Replace with real API/database-fed data when bracket is live.
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamMetrics {
  // Pace & Possessions
  adjustedTempo: number;        // possessions per 40 min
  recentTempo: number;          // last 5 game avg
  tempoRank: number;            // national rank

  // Offense
  offEff: number;               // adjusted offensive efficiency (pts/100 poss)
  offEffRank: number;
  effectiveFGPct: number;       // eFG%
  threePtRate: number;          // % of shots from 3
  ftRate: number;               // FTA / FGA
  offRebPct: number;            // offensive rebound %
  toRate: number;               // turnover rate (TO per 100 poss)
  ptsPerPoss: number;

  // Defense
  defEff: number;               // adjusted defensive efficiency
  defEffRank: number;
  oppEffFGPct: number;
  oppThreePtRate: number;
  defRebPct: number;
  oppToRate: number;
  oppPtsPerPoss: number;

  // Form
  last5: ('W' | 'L')[];
  last5Pace: number[];          // pace in each of last 5 games
  avgTotal: number;             // avg combined score last 5
  streak: string;               // e.g. "W3"
}

export interface BracketTeam {
  id: string;
  name: string;
  shortName: string;
  seed: number;
  record: string;
  conference: string;
  logoPlaceholder: string;      // emoji or initials — swap for real logo URL
  primaryColor: string;         // hex
  metrics: TeamMetrics;
  style: string;                // e.g. "High-Tempo Spread", "Grind-It-Out"
}

export interface BracketMatchup {
  id: string;
  round: number;               // 1 = First Round, 2 = Sweet 16, etc.
  region: string;
  teamA: BracketTeam;
  teamB: BracketTeam;
  projectedLine?: number;      // O/U placeholder
  isFeatured?: boolean;
  result?: { winner: string; score: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAMS
// ─────────────────────────────────────────────────────────────────────────────

const TEAMS: Record<string, BracketTeam> = {
  duke: {
    id: 'duke',
    name: 'Duke Blue Devils',
    shortName: 'DUKE',
    seed: 1,
    record: '29-5',
    conference: 'ACC',
    logoPlaceholder: '🔵',
    primaryColor: '#003087',
    metrics: {
      adjustedTempo: 71.2, recentTempo: 73.1, tempoRank: 48,
      offEff: 121.4, offEffRank: 3, effectiveFGPct: 57.8, threePtRate: 38.2, ftRate: 0.34, offRebPct: 31.2, toRate: 14.1, ptsPerPoss: 1.21,
      defEff: 94.2, defEffRank: 8, oppEffFGPct: 44.1, oppThreePtRate: 30.1, defRebPct: 73.4, oppToRate: 19.8, oppPtsPerPoss: 0.94,
      last5: ['W','W','W','L','W'], last5Pace: [71,74,69,73,75], avgTotal: 152.4, streak: 'W3',
    },
    style: 'Athletic Frontcourt',
  },
  auburn: {
    id: 'auburn',
    name: 'Auburn Tigers',
    shortName: 'AUB',
    seed: 2,
    record: '27-6',
    conference: 'SEC',
    logoPlaceholder: '🐯',
    primaryColor: '#E87722',
    metrics: {
      adjustedTempo: 73.8, recentTempo: 75.2, tempoRank: 22,
      offEff: 118.9, offEffRank: 11, effectiveFGPct: 55.2, threePtRate: 42.1, ftRate: 0.31, offRebPct: 28.8, toRate: 15.3, ptsPerPoss: 1.19,
      defEff: 96.1, defEffRank: 14, oppEffFGPct: 46.2, oppThreePtRate: 32.8, defRebPct: 71.2, oppToRate: 18.4, oppPtsPerPoss: 0.96,
      last5: ['W','W','L','W','W'], last5Pace: [74,76,73,77,75], avgTotal: 154.8, streak: 'W2',
    },
    style: 'Three-Point Barrage',
  },
  houston: {
    id: 'houston',
    name: 'Houston Cougars',
    shortName: 'HOU',
    seed: 1,
    record: '31-3',
    conference: 'Big 12',
    logoPlaceholder: '🔴',
    primaryColor: '#C8102E',
    metrics: {
      adjustedTempo: 64.1, recentTempo: 63.4, tempoRank: 341,
      offEff: 113.2, offEffRank: 28, effectiveFGPct: 51.4, threePtRate: 33.1, ftRate: 0.41, offRebPct: 34.1, toRate: 12.8, ptsPerPoss: 1.13,
      defEff: 90.8, defEffRank: 2, oppEffFGPct: 40.2, oppThreePtRate: 28.1, defRebPct: 76.8, oppToRate: 22.1, oppPtsPerPoss: 0.91,
      last5: ['W','W','W','W','L'], last5Pace: [62,64,63,65,61], avgTotal: 128.2, streak: 'W4',
    },
    style: 'Defensive Fortress',
  },
  tennessee: {
    id: 'tennessee',
    name: 'Tennessee Volunteers',
    shortName: 'TENN',
    seed: 2,
    record: '26-7',
    conference: 'SEC',
    logoPlaceholder: '🟠',
    primaryColor: '#FF8200',
    metrics: {
      adjustedTempo: 66.2, recentTempo: 65.8, tempoRank: 298,
      offEff: 116.1, offEffRank: 18, effectiveFGPct: 53.8, threePtRate: 35.4, ftRate: 0.39, offRebPct: 32.4, toRate: 13.2, ptsPerPoss: 1.16,
      defEff: 93.4, defEffRank: 6, oppEffFGPct: 43.1, oppThreePtRate: 29.4, defRebPct: 75.1, oppToRate: 20.8, oppPtsPerPoss: 0.93,
      last5: ['W','L','W','W','W'], last5Pace: [66,68,65,64,67], avgTotal: 133.6, streak: 'W3',
    },
    style: 'Physical Defense',
  },
  kentucky: {
    id: 'kentucky',
    name: 'Kentucky Wildcats',
    shortName: 'UK',
    seed: 3,
    record: '24-9',
    conference: 'SEC',
    logoPlaceholder: '💙',
    primaryColor: '#0033A0',
    metrics: {
      adjustedTempo: 70.4, recentTempo: 72.1, tempoRank: 71,
      offEff: 115.8, offEffRank: 21, effectiveFGPct: 54.1, threePtRate: 36.8, ftRate: 0.36, offRebPct: 30.1, toRate: 14.8, ptsPerPoss: 1.16,
      defEff: 97.2, defEffRank: 19, oppEffFGPct: 47.1, oppThreePtRate: 33.2, defRebPct: 72.3, oppToRate: 17.9, oppPtsPerPoss: 0.97,
      last5: ['L','W','W','L','W'], last5Pace: [70,73,68,72,74], avgTotal: 147.2, streak: 'W1',
    },
    style: 'High-Low Post Attack',
  },
  marquette: {
    id: 'marquette',
    name: 'Marquette Golden Eagles',
    shortName: 'MRQ',
    seed: 3,
    record: '25-8',
    conference: 'Big East',
    logoPlaceholder: '🦅',
    primaryColor: '#003366',
    metrics: {
      adjustedTempo: 72.8, recentTempo: 74.4, tempoRank: 31,
      offEff: 117.4, offEffRank: 14, effectiveFGPct: 55.9, threePtRate: 40.2, ftRate: 0.33, offRebPct: 29.4, toRate: 13.9, ptsPerPoss: 1.17,
      defEff: 98.1, defEffRank: 24, oppEffFGPct: 47.8, oppThreePtRate: 34.1, defRebPct: 70.8, oppToRate: 17.2, oppPtsPerPoss: 0.98,
      last5: ['W','W','W','W','L'], last5Pace: [72,75,74,73,76], avgTotal: 151.6, streak: 'W4',
    },
    style: 'Guard-Driven Pace',
  },
  gonzaga: {
    id: 'gonzaga',
    name: 'Gonzaga Bulldogs',
    shortName: 'GONZ',
    seed: 4,
    record: '26-7',
    conference: 'WCC',
    logoPlaceholder: '🐕',
    primaryColor: '#002469',
    metrics: {
      adjustedTempo: 74.1, recentTempo: 76.3, tempoRank: 18,
      offEff: 122.1, offEffRank: 1, effectiveFGPct: 59.2, threePtRate: 37.8, ftRate: 0.38, offRebPct: 33.8, toRate: 13.4, ptsPerPoss: 1.22,
      defEff: 101.2, defEffRank: 44, oppEffFGPct: 49.1, oppThreePtRate: 35.8, defRebPct: 69.4, oppToRate: 16.1, oppPtsPerPoss: 1.01,
      last5: ['W','W','W','L','W'], last5Pace: [74,78,75,73,77], avgTotal: 158.8, streak: 'W3',
    },
    style: 'High-Octane Offense',
  },
  kansas: {
    id: 'kansas',
    name: 'Kansas Jayhawks',
    shortName: 'KU',
    seed: 4,
    record: '23-10',
    conference: 'Big 12',
    logoPlaceholder: '🦅',
    primaryColor: '#0051A5',
    metrics: {
      adjustedTempo: 68.9, recentTempo: 70.2, tempoRank: 122,
      offEff: 114.8, offEffRank: 24, effectiveFGPct: 52.8, threePtRate: 34.8, ftRate: 0.37, offRebPct: 31.8, toRate: 14.4, ptsPerPoss: 1.15,
      defEff: 99.4, defEffRank: 31, oppEffFGPct: 48.2, oppThreePtRate: 33.9, defRebPct: 71.8, oppToRate: 18.1, oppPtsPerPoss: 0.99,
      last5: ['W','L','W','W','L'], last5Pace: [68,71,69,72,70], avgTotal: 144.6, streak: 'L1',
    },
    style: 'Balanced Attack',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BRACKET MATCHUPS — 8-team single elimination (expandable to 64)
// ─────────────────────────────────────────────────────────────────────────────

export const BRACKET_MATCHUPS: BracketMatchup[] = [
  // QUARTERFINALS — South Region
  { id: 'R1-S1', round: 1, region: 'South', teamA: TEAMS.duke, teamB: TEAMS.kansas, projectedLine: 147.5, isFeatured: true },
  { id: 'R1-S2', round: 1, region: 'South', teamA: TEAMS.auburn, teamB: TEAMS.kentucky, projectedLine: 151.5 },
  // QUARTERFINALS — West Region
  { id: 'R1-W1', round: 1, region: 'West', teamA: TEAMS.houston, teamB: TEAMS.gonzaga, projectedLine: 140.5 },
  { id: 'R1-W2', round: 1, region: 'West', teamA: TEAMS.tennessee, teamB: TEAMS.marquette, projectedLine: 144.5 },
];

export const ROUND_LABELS: Record<number, string> = {
  1: 'ROUND OF 8',
  2: 'SEMIFINALS',
  3: 'CHAMPIONSHIP',
};

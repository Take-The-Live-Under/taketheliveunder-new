import { NextResponse } from 'next/server';
import { Matchup, TeamStats } from '@/types/team';
import { normalizeTeamName } from '@/lib/teamNormalization';
import { promises as fs } from 'fs';
import path from 'path';

const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';
const ESPN_SUMMARY_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';
const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds';

// Cache for team stats from CSV
let teamStatsCache: Map<string, TeamStats> = new Map();
let lastCacheLoad = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Referee stats cache
interface RefereeStats {
  name: string;
  total_fouls_per_game: number;
  home_fouls_per_game: number;
  away_fouls_per_game: number;
  foul_differential: number;
  total_games: number;
  home_bias: number;
  consistency_score: number;
  ref_style: string;
}

let refereeStatsCache: Map<string, RefereeStats> = new Map();
let lastRefCacheLoad = 0;

// Referee assignments cache (per game)
const refereeAssignmentsCache: Map<string, string[]> = new Map();

interface ESPNCompetitor {
  homeAway: 'home' | 'away';
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
  };
  score: string;
}

interface ESPNEvent {
  id: string;
  date: string;
  status: {
    type: {
      state: string;
    };
  };
  competitions: Array<{
    competitors: ESPNCompetitor[];
  }>;
}

// Load referee stats from CSV
async function loadRefereeStatsFromCSV(): Promise<Map<string, RefereeStats>> {
  const statsMap = new Map<string, RefereeStats>();

  try {
    // Try static-data first (for production), fall back to data (for local dev)
    let csvPath = path.join(process.cwd(), 'static-data', 'refmetrics_fouls_2024_25_auth_latest.csv');

    try {
      await fs.access(csvPath);
    } catch {
      // Fall back to data directory for local development
      csvPath = path.join(process.cwd(), 'data', 'refmetrics_fouls_2024_25_auth_latest.csv');
      try {
        await fs.access(csvPath);
      } catch {
        console.log('Referee stats CSV not found - referee data unavailable');
        return statsMap;
      }
    }

    const content = await fs.readFile(csvPath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) return statsMap;

    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const refName = row.referee_name;
      // Skip placeholder entries (paywalled data)
      if (!refName || refName.toLowerCase().startsWith('subscribe')) continue;

      const stats: RefereeStats = {
        name: refName,
        total_fouls_per_game: parseFloat(row.total_fouls_per_game) || 0,
        home_fouls_per_game: parseFloat(row.home_fouls_per_game) || 0,
        away_fouls_per_game: parseFloat(row.away_fouls_per_game) || 0,
        foul_differential: parseFloat(row.foul_differential) || 0,
        total_games: parseInt(row.total_games) || 0,
        home_bias: parseFloat(row.home_bias) || 0,
        consistency_score: parseFloat(row.consistency_score) || 0,
        ref_style: row.ref_style || 'Average',
      };

      statsMap.set(refName.toLowerCase(), stats);
    }

    console.log(`Loaded ${statsMap.size} referees from CSV`);
    return statsMap;
  } catch (error) {
    console.error('Error loading referee stats:', error);
    return statsMap;
  }
}

async function getRefereeStatsCache(): Promise<Map<string, RefereeStats>> {
  const now = Date.now();

  if (refereeStatsCache.size > 0 && now - lastRefCacheLoad < CACHE_DURATION) {
    return refereeStatsCache;
  }

  refereeStatsCache = await loadRefereeStatsFromCSV();
  lastRefCacheLoad = now;

  return refereeStatsCache;
}

// Fetch referees for a game from ESPN summary API
async function fetchRefereesForGame(gameId: string): Promise<string[]> {
  // Check cache first
  if (refereeAssignmentsCache.has(gameId)) {
    return refereeAssignmentsCache.get(gameId) || [];
  }

  try {
    const response = await fetch(`${ESPN_SUMMARY_URL}?event=${gameId}`, {
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const data = await response.json();
    const referees: string[] = [];

    if (data.gameInfo?.officials) {
      for (const official of data.gameInfo.officials) {
        if (official.displayName) {
          referees.push(official.displayName);
        }
      }
    }

    // Cache the result
    refereeAssignmentsCache.set(gameId, referees);
    return referees;
  } catch {
    refereeAssignmentsCache.set(gameId, []);
    return [];
  }
}

// Look up referee stats from cache
function findRefereeStats(
  cache: Map<string, RefereeStats>,
  refName: string
): RefereeStats | null {
  const direct = cache.get(refName.toLowerCase());
  if (direct) return direct;

  // Try partial match
  const nameLower = refName.toLowerCase();
  const entries = Array.from(cache.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, stats] = entries[i];
    if (key.includes(nameLower) || nameLower.includes(key.split(' ')[0])) {
      return stats;
    }
  }

  return null;
}

// Calculate crew averages
interface CrewStats {
  referees: string[];
  foundRefs: number;
  avgFoulsPerGame: number | null;
  avgHomeBias: number | null;
  crewStyle: string;
  refDetails: RefereeStats[];
}

function calculateCrewStats(
  refNames: string[],
  refCache: Map<string, RefereeStats>
): CrewStats {
  const refDetails: RefereeStats[] = [];

  for (const name of refNames) {
    const stats = findRefereeStats(refCache, name);
    if (stats) {
      refDetails.push(stats);
    }
  }

  if (refDetails.length === 0) {
    return {
      referees: refNames,
      foundRefs: 0,
      avgFoulsPerGame: null,
      avgHomeBias: null,
      crewStyle: 'Unknown',
      refDetails: [],
    };
  }

  const avgFouls = refDetails.reduce((sum, r) => sum + r.total_fouls_per_game, 0) / refDetails.length;
  const avgBias = refDetails.reduce((sum, r) => sum + r.home_bias, 0) / refDetails.length;

  let crewStyle = 'Average';
  if (avgFouls >= 40) crewStyle = 'Tight';
  else if (avgFouls <= 32) crewStyle = 'Loose';

  return {
    referees: refNames,
    foundRefs: refDetails.length,
    avgFoulsPerGame: Math.round(avgFouls * 10) / 10,
    avgHomeBias: Math.round(avgBias * 100) / 100,
    crewStyle,
    refDetails,
  };
}

async function loadTeamStatsFromCSV(): Promise<Map<string, TeamStats>> {
  const statsMap = new Map<string, TeamStats>();

  try {
    // Try static-data first (for production), then fall back to cache (for local dev)
    let latestFile: string | null = null;

    // Try static-data directory first
    const staticDataPath = path.join(process.cwd(), 'static-data');
    try {
      await fs.access(staticDataPath);
      const staticFiles = await fs.readdir(staticDataPath);
      const staticEspnFiles = staticFiles
        .filter(f => f.startsWith('espn_stats_') && f.endsWith('.csv'))
        .sort()
        .reverse();
      if (staticEspnFiles.length > 0) {
        latestFile = path.join(staticDataPath, staticEspnFiles[0]);
      }
    } catch {
      // static-data not found, will try cache
    }

    // Fall back to cache directory
    if (!latestFile) {
      const cachePath = path.join(process.cwd(), 'cache');
      try {
        await fs.access(cachePath);
        const cacheFiles = await fs.readdir(cachePath);
        const cacheEspnFiles = cacheFiles
          .filter(f => f.startsWith('espn_stats_') && f.endsWith('.csv'))
          .sort()
          .reverse();
        if (cacheEspnFiles.length > 0) {
          latestFile = path.join(cachePath, cacheEspnFiles[0]);
        }
      } catch {
        // cache not found either
      }
    }

    if (!latestFile) {
      console.log('No ESPN stats CSV found in static-data or cache');
      return statsMap;
    }

    console.log(`Loading team stats from: ${latestFile}`);

    const content = await fs.readFile(latestFile, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) return statsMap;

    // Parse header
    const headers = lines[0].split(',');

    // Parse each row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const teamName = row.team_name;
      if (!teamName) continue;

      const stats: TeamStats = {
        name: teamName,
        espn_id: row.team_id || undefined,
        games_played: parseFloat(row.games_played) || null,
        pace: parseFloat(row.pace) || null,
        off_efficiency: parseFloat(row.off_efficiency) || null,
        def_efficiency: parseFloat(row.def_efficiency) || null,
        efficiency_margin: parseFloat(row.efficiency_margin) || null,
        fg_pct: parseFloat(row.fg_pct) || null,
        three_p_rate: parseFloat(row.three_p_rate) || null,
        three_p_pct: parseFloat(row.three_p_pct) || null,
        two_p_pct: parseFloat(row.two_p_pct) || null,
        ft_rate: parseFloat(row.ft_rate) || null,
        ft_pct: parseFloat(row.ft_pct) || null,
        oreb_pct: parseFloat(row.oreb_pct) || null,
        dreb_pct: parseFloat(row.dreb_pct) || null,
        to_rate: parseFloat(row.to_rate) || null,
        efg_pct: parseFloat(row.efg_pct) || null,
        ts_pct: parseFloat(row.ts_pct) || null,
        assists_per_game: parseFloat(row.assists_per_game) || null,
        steals_per_game: parseFloat(row.steals_per_game) || null,
        blocks_per_game: parseFloat(row.blocks_per_game) || null,
        fouls_per_game: parseFloat(row.fouls_per_game) || null,
        ast_to_ratio: parseFloat(row.ast_to_ratio) || null,
        espn_rank: parseInt(row.espn_rank) || null,
        avg_ppg: parseFloat(row.avg_ppg) || null,
        avg_ppm: parseFloat(row.avg_ppm) || null,
      };

      // Store with lowercase key for easy lookup
      statsMap.set(teamName.toLowerCase(), stats);
    }

    console.log(`Loaded ${statsMap.size} teams from CSV`);
    return statsMap;
  } catch (error) {
    console.error('Error loading team stats CSV:', error);
    return statsMap;
  }
}

async function getTeamStatsCache(): Promise<Map<string, TeamStats>> {
  const now = Date.now();

  if (teamStatsCache.size > 0 && now - lastCacheLoad < CACHE_DURATION) {
    return teamStatsCache;
  }

  teamStatsCache = await loadTeamStatsFromCSV();
  lastCacheLoad = now;

  return teamStatsCache;
}

function findTeamStats(
  cache: Map<string, TeamStats>,
  teamName: string
): TeamStats | null {
  // Direct match
  const direct = cache.get(teamName.toLowerCase());
  if (direct) return direct;

  // Try normalized name
  const normalized = normalizeTeamName(teamName);
  const normalizedMatch = cache.get(normalized.toLowerCase());
  if (normalizedMatch) return normalizedMatch;

  // Partial match - check if team name contains or is contained
  const teamLower = teamName.toLowerCase();
  const cacheEntries = Array.from(cache.entries());
  for (let i = 0; i < cacheEntries.length; i++) {
    const [key, stats] = cacheEntries[i];
    if (key.includes(teamLower) || teamLower.includes(key.split(' ')[0])) {
      return stats;
    }
  }

  return null;
}

interface OddsBookmaker {
  key: string;
  markets: Array<{
    key: string;
    outcomes: Array<{
      name: string;
      point?: number;
    }>;
  }>;
}

interface OddsGame {
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

async function fetchOddsData(): Promise<Map<string, number | null>> {
  const oddsMap = new Map<string, number | null>();

  try {
    const ODDS_API_KEY = process.env.ODDS_API_KEY;
    if (!ODDS_API_KEY) return oddsMap;

    const response = await fetch(
      `${ODDS_API_URL}?apiKey=${ODDS_API_KEY}&regions=us&markets=totals&oddsFormat=american`,
      { cache: 'no-store' }
    );

    if (!response.ok) return oddsMap;

    const games: OddsGame[] = await response.json();

    for (const game of games) {
      const homeTeam = normalizeTeamName(game.home_team);
      const awayTeam = normalizeTeamName(game.away_team);
      const matchKey = `${awayTeam.toLowerCase()}_${homeTeam.toLowerCase()}`;

      let ouLine: number | null = null;
      for (const bookmaker of game.bookmakers) {
        const totalsMarket = bookmaker.markets.find((m) => m.key === 'totals');
        if (totalsMarket) {
          const overOutcome = totalsMarket.outcomes.find((o) => o.name === 'Over');
          if (overOutcome?.point) {
            ouLine = overOutcome.point;
            break;
          }
        }
      }

      oddsMap.set(matchKey, ouLine);
    }
  } catch (error) {
    console.error('Error fetching odds:', error);
  }

  return oddsMap;
}

// Get current date in US Eastern timezone
function getUSEasternDate(): Date {
  const now = new Date();
  const easternStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(easternStr);
}

// Format date as YYYYMMDD for ESPN API
function formatDateForESPN(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(date).replace(/-/g, '');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const includeRefs = searchParams.get('refs') !== 'false'; // Default true

  try {
    // Load team stats from CSV cache
    const statsCache = await getTeamStatsCache();

    // Load referee stats cache
    const refCache = await getRefereeStatsCache();

    // Get today and tomorrow dates
    const today = new Date();
    const easternToday = getUSEasternDate();
    const easternTomorrow = new Date(easternToday);
    easternTomorrow.setDate(easternTomorrow.getDate() + 1);

    const todayStr = formatDateForESPN(today);
    const tomorrowStr = formatDateForESPN(easternTomorrow);

    // Fetch today's scoreboard data (groups=50 for Division I)
    const espnResponse = await fetch(`${ESPN_SCOREBOARD_URL}?limit=500&groups=50&dates=${todayStr}`, { cache: 'no-store' });
    if (!espnResponse.ok) {
      throw new Error('Failed to fetch ESPN data');
    }

    const espnData = await espnResponse.json();
    let events: ESPNEvent[] = espnData.events || [];

    // Also fetch tomorrow's games
    try {
      const tomorrowResponse = await fetch(`${ESPN_SCOREBOARD_URL}?limit=500&groups=50&dates=${tomorrowStr}`, { cache: 'no-store' });
      if (tomorrowResponse.ok) {
        const tomorrowData = await tomorrowResponse.json();
        const tomorrowEvents: ESPNEvent[] = tomorrowData.events || [];
        events = [...events, ...tomorrowEvents];
      }
    } catch (error) {
      console.error('Error fetching tomorrow matchups:', error);
    }

    // Fetch odds data
    const oddsMap = await fetchOddsData();

    // Build matchups
    const matchups: Matchup[] = [];

    for (const event of events) {
      const competition = event.competitions[0];
      if (!competition) continue;

      const homeComp = competition.competitors.find((c) => c.homeAway === 'home');
      const awayComp = competition.competitors.find((c) => c.homeAway === 'away');

      if (!homeComp || !awayComp) continue;

      const homeTeam = homeComp.team.displayName;
      const awayTeam = awayComp.team.displayName;

      // Get O/U line
      const matchKey = `${normalizeTeamName(awayTeam).toLowerCase()}_${normalizeTeamName(homeTeam).toLowerCase()}`;
      const ouLine = oddsMap.get(matchKey) ?? null;

      // If looking for specific game, filter
      if (gameId && event.id !== gameId) continue;

      // Get team stats from CSV cache
      const homeStats = findTeamStats(statsCache, homeTeam);
      const awayStats = findTeamStats(statsCache, awayTeam);

      const status = event.status.type.state as 'pre' | 'in' | 'post';

      // Get referee data (only for live/upcoming games)
      let crewStats = undefined;
      if (includeRefs && (status === 'in' || status === 'pre')) {
        const refNames = await fetchRefereesForGame(event.id);
        if (refNames.length > 0) {
          crewStats = calculateCrewStats(refNames, refCache);
        }
      }

      const matchup: Matchup = {
        gameId: event.id,
        homeTeam,
        awayTeam,
        startTime: event.date,
        status,
        homeStats,
        awayStats,
        homeScore: parseInt(homeComp.score) || 0,
        awayScore: parseInt(awayComp.score) || 0,
        ouLine,
        crewStats,
      };

      matchups.push(matchup);

      if (gameId) {
        return NextResponse.json({ matchup });
      }
    }

    // Sort: live games first, then by start time
    matchups.sort((a, b) => {
      if (a.status === 'in' && b.status !== 'in') return -1;
      if (b.status === 'in' && a.status !== 'in') return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    return NextResponse.json({
      matchups,
      count: matchups.length,
      statsLoaded: statsCache.size,
      refereesLoaded: refCache.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in matchups API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matchups' },
      { status: 500 }
    );
  }
}

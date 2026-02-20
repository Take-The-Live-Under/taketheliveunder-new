import { NextResponse } from 'next/server';

const KENPOM_API_URL = 'https://kenpom.com/api.php';

export interface KenPomTeamStats {
  teamName: string;
  rank: number | null;
  adjEM: number | null;
  adjO: number | null;
  adjORank: number | null;
  adjD: number | null;
  adjDRank: number | null;
  adjT: number | null;
  adjTRank: number | null;
  luck: number | null;
  luckRank: number | null;
  sosEM: number | null;
  sosRank: number | null;
  ncSosEM: number | null;
  // Four Factors offense
  offEfg: number | null;
  offTO: number | null;
  offOR: number | null;
  offFTR: number | null;
  // Four Factors defense
  defEfg: number | null;
  defTO: number | null;
  defOR: number | null;
  defFTR: number | null;
  // Record
  wins: number | null;
  losses: number | null;
  confWins: number | null;
  confLosses: number | null;
  conference: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KenPomRatingsTeam = Record<string, any>;

// Cache for ratings (refreshes every hour)
let ratingsCache: Map<string, KenPomTeamStats> = new Map();
let lastCacheUpdate = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function normalizeTeamName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\./g, '')
    .replace(/'/g, '')
    .replace(/st\b/g, 'state')
    .replace(/\s+/g, ' ');
}

async function fetchAllRatings(): Promise<Map<string, KenPomTeamStats>> {
  const ratingsMap = new Map<string, KenPomTeamStats>();
  const kenpomApiKey = process.env.KENPOM_API_KEY;

  if (!kenpomApiKey) {
    console.error('KENPOM_API_KEY not configured');
    return ratingsMap;
  }

  // KenPom API requires year parameter (e.g., 2025 for 2024-25 season)
  const currentYear = new Date().getFullYear();
  const season = new Date().getMonth() >= 10 ? currentYear + 1 : currentYear;

  try {
    const response = await fetch(`${KENPOM_API_URL}?endpoint=ratings&y=${season}`, {
      headers: {
        'Authorization': `Bearer ${kenpomApiKey}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('KenPom ratings API error:', response.status, await response.text());
      return ratingsMap;
    }

    const rawData = await response.json();

    // Handle different response formats
    const data: KenPomRatingsTeam[] = Array.isArray(rawData)
      ? rawData
      : rawData.data || rawData.teams || rawData.results || [];

    if (data.length === 0) {
      console.error('KenPom ratings returned empty array. Raw response keys:', Object.keys(rawData));
      return ratingsMap;
    }

    // Log first team's fields for debugging
    if (data.length > 0) {
      console.log('KenPom ratings sample team fields:', Object.keys(data[0]));
    }

    for (const team of data) {
      // Handle flexible field names (API might use different casing)
      const teamName = team.TeamName || team.teamName || team.Team || team.team || '';
      if (!teamName) continue;

      const stats: KenPomTeamStats = {
        teamName: teamName,
        rank: team.Rk ?? team.rk ?? team.Rank ?? team.rank ?? null,
        adjEM: team.AdjEM ?? team.adjEM ?? team.AdjEm ?? null,
        adjO: team.AdjO ?? team.adjO ?? team.AdjOE ?? null,
        adjORank: team.AdjORk ?? team.adjORk ?? team.AdjOERk ?? null,
        adjD: team.AdjD ?? team.adjD ?? team.AdjDE ?? null,
        adjDRank: team.AdjDRk ?? team.adjDRk ?? team.AdjDERk ?? null,
        adjT: team.AdjT ?? team.adjT ?? team.AdjTempo ?? null,
        adjTRank: team.AdjTRk ?? team.adjTRk ?? null,
        luck: team.Luck ?? team.luck ?? null,
        luckRank: team.LuckRk ?? team.luckRk ?? null,
        sosEM: team.SoSEM ?? team.sosEM ?? team.SOS ?? null,
        sosRank: team.SoSRk ?? team.sosRk ?? null,
        ncSosEM: team.NCSoSEM ?? team.ncSosEM ?? null,
        // Four Factors offense - might be in separate endpoint
        offEfg: team.OeFG ?? team.oeFG ?? team.eFG_O ?? null,
        offTO: team.OTO ?? team.oTO ?? team.TO_O ?? null,
        offOR: team.OOR ?? team.oOR ?? team.OR_O ?? null,
        offFTR: team.OFTR ?? team.oFTR ?? team.FTR_O ?? null,
        // Four Factors defense
        defEfg: team.DeFG ?? team.deFG ?? team.eFG_D ?? null,
        defTO: team.DTO ?? team.dTO ?? team.TO_D ?? null,
        defOR: team.DOR ?? team.dOR ?? team.OR_D ?? null,
        defFTR: team.DFTR ?? team.dFTR ?? team.FTR_D ?? null,
        // Record
        wins: team.W ?? team.w ?? team.Wins ?? null,
        losses: team.L ?? team.l ?? team.Losses ?? null,
        confWins: team.CW ?? team.cw ?? null,
        confLosses: team.CL ?? team.cl ?? null,
        conference: team.Conf ?? team.conf ?? team.Conference ?? null,
      };

      // Store by normalized name for flexible lookup
      ratingsMap.set(normalizeTeamName(teamName), stats);
    }

    console.log(`KenPom ratings loaded: ${ratingsMap.size} teams`);

  } catch (error) {
    console.error('Error fetching KenPom ratings:', error);
  }

  return ratingsMap;
}

async function getRatingsWithCache(): Promise<Map<string, KenPomTeamStats>> {
  const now = Date.now();

  if (ratingsCache.size > 0 && now - lastCacheUpdate < CACHE_DURATION) {
    return ratingsCache;
  }

  ratingsCache = await fetchAllRatings();
  lastCacheUpdate = now;

  return ratingsCache;
}

function findTeam(allStats: Map<string, KenPomTeamStats>, teamName: string): KenPomTeamStats | null {
  const normalized = normalizeTeamName(teamName);

  // Direct lookup
  if (allStats.has(normalized)) {
    return allStats.get(normalized)!;
  }

  // Partial match
  let match: KenPomTeamStats | null = null;
  allStats.forEach((stats, key) => {
    if (!match && (key.includes(normalized) || normalized.includes(key))) {
      match = stats;
    }
  });
  if (match) return match;

  // Try matching just the school name (without mascot)
  const parts = normalized.split(' ');
  if (parts.length > 1) {
    const schoolOnly = parts.slice(0, -1).join(' ');
    allStats.forEach((stats, key) => {
      if (!match && (key.startsWith(schoolOnly) || key.includes(schoolOnly))) {
        match = stats;
      }
    });
  }

  return match;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamName = searchParams.get('team');

  try {
    const allStats = await getRatingsWithCache();

    if (teamName) {
      const stats = findTeam(allStats, teamName);
      if (stats) {
        return NextResponse.json(stats);
      }
      return NextResponse.json({ error: 'Team not found', searchedFor: teamName }, { status: 404 });
    }

    // Return all team stats
    const teamsArray = Array.from(allStats.values());
    return NextResponse.json({
      teams: teamsArray,
      count: teamsArray.length,
      cacheAge: Date.now() - lastCacheUpdate,
    });

  } catch (error) {
    console.error('Error in kenpom-team API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KenPom team stats' },
      { status: 500 }
    );
  }
}

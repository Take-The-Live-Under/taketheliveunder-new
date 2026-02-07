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

interface KenPomRatingsTeam {
  TeamName: string;
  Rk: number;
  AdjEM: number;
  AdjO: number;
  AdjORk: number;
  AdjD: number;
  AdjDRk: number;
  AdjT: number;
  AdjTRk: number;
  Luck: number;
  LuckRk: number;
  SoSEM: number;
  SoSRk: number;
  NCSoSEM: number;
  OppOEM: number;
  OppDEM: number;
  // Four Factors
  OeFG: number;
  OTO: number;
  OOR: number;
  OFTR: number;
  DeFG: number;
  DTO: number;
  DOR: number;
  DFTR: number;
  // Record
  W: number;
  L: number;
  CW: number;
  CL: number;
  Conf: string;
}

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

  try {
    const response = await fetch(`${KENPOM_API_URL}?endpoint=ratings`, {
      headers: {
        'Authorization': `Bearer ${kenpomApiKey}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('KenPom ratings API error:', response.status);
      return ratingsMap;
    }

    const data: KenPomRatingsTeam[] = await response.json();

    for (const team of data) {
      const stats: KenPomTeamStats = {
        teamName: team.TeamName,
        rank: team.Rk,
        adjEM: team.AdjEM,
        adjO: team.AdjO,
        adjORank: team.AdjORk,
        adjD: team.AdjD,
        adjDRank: team.AdjDRk,
        adjT: team.AdjT,
        adjTRank: team.AdjTRk,
        luck: team.Luck,
        luckRank: team.LuckRk,
        sosEM: team.SoSEM,
        sosRank: team.SoSRk,
        ncSosEM: team.NCSoSEM,
        // Four Factors offense
        offEfg: team.OeFG,
        offTO: team.OTO,
        offOR: team.OOR,
        offFTR: team.OFTR,
        // Four Factors defense
        defEfg: team.DeFG,
        defTO: team.DTO,
        defOR: team.DOR,
        defFTR: team.DFTR,
        // Record
        wins: team.W,
        losses: team.L,
        confWins: team.CW,
        confLosses: team.CL,
        conference: team.Conf,
      };

      // Store by normalized name for flexible lookup
      ratingsMap.set(normalizeTeamName(team.TeamName), stats);
    }

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

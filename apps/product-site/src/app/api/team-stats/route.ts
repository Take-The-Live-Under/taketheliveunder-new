import { NextResponse } from 'next/server';
import { TeamStats } from '@/types/team';

// ESPN team stats API endpoints
const ESPN_TEAMS_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams';
const ESPN_RANKINGS_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings';

// Cache for team stats (in-memory, refreshes every 30 min)
let teamStatsCache: Map<string, TeamStats> = new Map();
let lastCacheUpdate = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface ESPNTeam {
  id: string;
  displayName: string;
  abbreviation: string;
  record?: {
    items?: Array<{
      stats?: Array<{
        name: string;
        value: number;
      }>;
    }>;
  };
  statistics?: Array<{
    name: string;
    value: number;
  }>;
}

async function fetchAllTeams(): Promise<Map<string, TeamStats>> {
  const teamsMap = new Map<string, TeamStats>();

  try {
    // Fetch team list
    const response = await fetch(`${ESPN_TEAMS_URL}?limit=500`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }

    const data = await response.json();
    const teams: ESPNTeam[] = data.sports?.[0]?.leagues?.[0]?.teams?.map((t: { team: ESPNTeam }) => t.team) || [];

    // For each team, create basic stats entry
    for (const team of teams) {
      const teamStats: TeamStats = {
        name: team.displayName,
        espn_id: team.id,
        games_played: null,
        pace: null,
        off_efficiency: null,
        def_efficiency: null,
        efficiency_margin: null,
        fg_pct: null,
        three_p_rate: null,
        three_p_pct: null,
        two_p_pct: null,
        ft_rate: null,
        ft_pct: null,
        oreb_pct: null,
        dreb_pct: null,
        to_rate: null,
        efg_pct: null,
        ts_pct: null,
        assists_per_game: null,
        steals_per_game: null,
        blocks_per_game: null,
        fouls_per_game: null,
        ast_to_ratio: null,
        espn_rank: null,
        avg_ppg: null,
        avg_ppm: null,
      };

      teamsMap.set(team.displayName.toLowerCase(), teamStats);
    }

    // Fetch rankings for rank data
    const rankingsResponse = await fetch(ESPN_RANKINGS_URL, { cache: 'no-store' });
    if (rankingsResponse.ok) {
      const rankingsData = await rankingsResponse.json();
      const rankings = rankingsData.rankings?.[0]?.ranks || [];

      for (const rank of rankings) {
        const teamName = rank.team?.displayName?.toLowerCase();
        if (teamName && teamsMap.has(teamName)) {
          const teamStats = teamsMap.get(teamName)!;
          teamStats.espn_rank = rank.current;
          teamsMap.set(teamName, teamStats);
        }
      }
    }

  } catch (error) {
    console.error('Error fetching teams:', error);
  }

  return teamsMap;
}

async function getTeamStatsWithCache(): Promise<Map<string, TeamStats>> {
  const now = Date.now();

  if (teamStatsCache.size > 0 && now - lastCacheUpdate < CACHE_DURATION) {
    return teamStatsCache;
  }

  teamStatsCache = await fetchAllTeams();
  lastCacheUpdate = now;

  return teamStatsCache;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamName = searchParams.get('team');

  try {
    const allStats = await getTeamStatsWithCache();

    if (teamName) {
      // Return single team stats
      const stats = allStats.get(teamName.toLowerCase());
      if (stats) {
        return NextResponse.json({ team: stats });
      }
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Return all team stats
    const teamsArray = Array.from(allStats.values());
    return NextResponse.json({
      teams: teamsArray,
      count: teamsArray.length,
      cacheAge: Date.now() - lastCacheUpdate,
    });

  } catch (error) {
    console.error('Error in team-stats API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team stats' },
      { status: 500 }
    );
  }
}

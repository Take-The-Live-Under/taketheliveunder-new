import { NextResponse } from 'next/server';

interface TeamData {
  team_id: string;
  team_name: string;
  games_played: number;
  pace: number;
  off_efficiency: number;
  def_efficiency: number;
  fg_pct: number;
  three_p_rate: number;
  three_p_pct: number;
  ft_pct: number;
  oreb_pct: number;
  dreb_pct: number;
  to_rate: number;
  efg_pct: number;
  ts_pct: number;
  avg_ppm: number;
  avg_ppg: number;
  assists_per_game: number;
  steals_per_game: number;
  blocks_per_game: number;
  fouls_per_game: number;
  ast_to_ratio: number;
  espn_rank: number;
  record: string;
}

interface TeamListItem {
  id: string;
  name: string;
  rank: number;
}

let teamsListCache: TeamListItem[] | null = null;
let teamStatsCache: Map<string, TeamData> = new Map();
let listCacheTime = 0;
const LIST_CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const STATS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Fetch list of all teams
async function fetchTeamsList(): Promise<TeamListItem[]> {
  const now = Date.now();
  if (teamsListCache && now - listCacheTime < LIST_CACHE_DURATION) {
    return teamsListCache;
  }

  try {
    // Fetch teams list
    const teamsResponse = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=500',
      { next: { revalidate: 3600 }, cache: 'no-store' }
    );

    if (!teamsResponse.ok) {
      throw new Error('Failed to fetch teams');
    }

    const teamsData = await teamsResponse.json();

    // Fetch rankings
    let rankings: Map<string, number> = new Map();
    try {
      const rankingsResponse = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings',
        { next: { revalidate: 3600 }, cache: 'no-store' }
      );
      if (rankingsResponse.ok) {
        const rankingsData = await rankingsResponse.json();
        const apPoll = rankingsData.rankings?.find((r: { name: string }) =>
          r.name?.toLowerCase().includes('ap') || r.name?.toLowerCase().includes('poll')
        );
        if (apPoll?.ranks) {
          apPoll.ranks.forEach((r: { team: { id: string }; current: number }) => {
            rankings.set(r.team.id, r.current);
          });
        }
      }
    } catch (e) {
      console.error('Error fetching rankings:', e);
    }

    const teams: TeamListItem[] = teamsData.sports?.[0]?.leagues?.[0]?.teams?.map(
      (t: { team: { id: string; displayName: string } }) => ({
        id: t.team.id,
        name: t.team.displayName,
        rank: rankings.get(t.team.id) || 999,
      })
    ) || [];

    teamsListCache = teams;
    listCacheTime = now;
    return teams;
  } catch (error) {
    console.error('Error fetching teams list:', error);
    return teamsListCache || [];
  }
}

// Fetch detailed stats for a specific team
async function fetchTeamStats(teamId: string, teamName: string): Promise<TeamData> {
  const cacheKey = teamId;
  const cached = teamStatsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Fetch team statistics
    const statsResponse = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}/statistics`,
      { next: { revalidate: 0 }, cache: 'no-store' }
    );

    if (!statsResponse.ok) {
      throw new Error(`Failed to fetch stats for team ${teamId}`);
    }

    const statsData = await statsResponse.json();

    // Extract stats from response
    const stats = statsData.splits?.categories || [];

    const getStat = (category: string, name: string): number => {
      const cat = stats.find((c: { name: string }) => c.name === category);
      if (!cat) return 0;
      const stat = cat.stats?.find((s: { name: string }) => s.name === name);
      return stat?.value ?? 0;
    };

    // Get team record
    const teamInfo = statsData.team || {};
    const record = teamInfo.record?.items?.[0]?.summary || '';
    const gamesPlayed = parseInt(record.split('-').reduce((a: number, b: string) => a + parseInt(b) || 0, 0)) || 0;

    // Calculate derived stats
    const fgm = getStat('offensive', 'fieldGoalsMade');
    const fga = getStat('offensive', 'fieldGoalsAttempted');
    const fg3m = getStat('offensive', 'threePointFieldGoalsMade');
    const fg3a = getStat('offensive', 'threePointFieldGoalsAttempted');
    const ftm = getStat('offensive', 'freeThrowsMade');
    const fta = getStat('offensive', 'freeThrowsAttempted');
    const pts = getStat('offensive', 'avgPoints');
    const oreb = getStat('offensive', 'offensiveRebounds');
    const dreb = getStat('defensive', 'defensiveRebounds');
    const ast = getStat('offensive', 'assists');
    const to = getStat('offensive', 'turnovers');
    const stl = getStat('defensive', 'steals');
    const blk = getStat('defensive', 'blocks');
    const pf = getStat('general', 'fouls');

    const fg_pct = fga > 0 ? (fgm / fga) * 100 : 0;
    const three_p_pct = fg3a > 0 ? (fg3m / fg3a) * 100 : 0;
    const ft_pct = fta > 0 ? (ftm / fta) * 100 : 0;
    const three_p_rate = fga > 0 ? (fg3a / fga) * 100 : 0;

    // Effective FG% = (FGM + 0.5 * 3PM) / FGA
    const efg_pct = fga > 0 ? ((fgm + 0.5 * fg3m) / fga) * 100 : 0;

    // True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))
    const ts_pct = (fga + 0.44 * fta) > 0 ? (pts / (2 * (fga + 0.44 * fta))) * 100 : 0;

    // Estimate pace (simplified)
    const totalReb = oreb + dreb;
    const pace = fga + 0.44 * fta - oreb + to;

    // Offensive/Defensive efficiency (per 100 possessions estimate)
    const possessions = pace > 0 ? pace : 70; // Default to 70 if no data
    const off_efficiency = possessions > 0 ? (pts / possessions) * 100 : 0;

    const teamData: TeamData = {
      team_id: teamId,
      team_name: teamName,
      games_played: gamesPlayed,
      record,
      pace: Math.round(pace * 10) / 10,
      off_efficiency: Math.round(off_efficiency * 10) / 10,
      def_efficiency: 0, // Would need opponent data
      fg_pct: Math.round(fg_pct * 10) / 10,
      three_p_rate: Math.round(three_p_rate * 10) / 10,
      three_p_pct: Math.round(three_p_pct * 10) / 10,
      ft_pct: Math.round(ft_pct * 10) / 10,
      oreb_pct: Math.round((oreb / (oreb + dreb || 1)) * 100 * 10) / 10,
      dreb_pct: Math.round((dreb / (oreb + dreb || 1)) * 100 * 10) / 10,
      to_rate: Math.round(to * 10) / 10,
      efg_pct: Math.round(efg_pct * 10) / 10,
      ts_pct: Math.round(ts_pct * 10) / 10,
      avg_ppm: Math.round((pts / 40) * 100) / 100,
      avg_ppg: Math.round(pts * 10) / 10,
      assists_per_game: Math.round(ast * 10) / 10,
      steals_per_game: Math.round(stl * 10) / 10,
      blocks_per_game: Math.round(blk * 10) / 10,
      fouls_per_game: Math.round(pf * 10) / 10,
      ast_to_ratio: to > 0 ? Math.round((ast / to) * 100) / 100 : 0,
      espn_rank: 999,
    };

    teamStatsCache.set(cacheKey, teamData);

    // Clean old cache entries
    setTimeout(() => {
      teamStatsCache.delete(cacheKey);
    }, STATS_CACHE_DURATION);

    return teamData;
  } catch (error) {
    console.error(`Error fetching stats for team ${teamId}:`, error);
    return {
      team_id: teamId,
      team_name: teamName,
      games_played: 0,
      record: '',
      pace: 0,
      off_efficiency: 0,
      def_efficiency: 0,
      fg_pct: 0,
      three_p_rate: 0,
      three_p_pct: 0,
      ft_pct: 0,
      oreb_pct: 0,
      dreb_pct: 0,
      to_rate: 0,
      efg_pct: 0,
      ts_pct: 0,
      avg_ppm: 0,
      avg_ppg: 0,
      assists_per_game: 0,
      steals_per_game: 0,
      blocks_per_game: 0,
      fouls_per_game: 0,
      ast_to_ratio: 0,
      espn_rank: 999,
    };
  }
}

// Find team by ID or name (ID is the reliable key from ESPN)
function findTeam(teams: TeamListItem[], searchTerm: string): TeamListItem | undefined {
  // ID match first (most reliable - ESPN team IDs are consistent)
  const byId = teams.find(t => t.id === searchTerm);
  if (byId) return byId;

  const searchLower = searchTerm.toLowerCase().trim();

  // Exact name match
  const exact = teams.find(t => t.name.toLowerCase() === searchLower);
  if (exact) return exact;

  // Contains match (search is contained in team name)
  const contains = teams.find(t => t.name.toLowerCase().includes(searchLower));
  if (contains) return contains;

  // Reverse contains (team name is contained in search)
  const reverseContains = teams.find(t => searchLower.includes(t.name.toLowerCase()));
  if (reverseContains) return reverseContains;

  // Word-based match (first word matches, e.g., "Duke" matches "Duke Blue Devils")
  const searchFirstWord = searchLower.split(' ')[0];
  const wordMatch = teams.find(t => {
    const teamFirstWord = t.name.toLowerCase().split(' ')[0];
    return teamFirstWord === searchFirstWord || t.name.toLowerCase().split(' ').includes(searchFirstWord);
  });
  if (wordMatch) return wordMatch;

  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');

  try {
    const allTeams = await fetchTeamsList();

    // If requesting specific teams for comparison
    if (team1 && team2) {
      const teamAInfo = findTeam(allTeams, team1);
      const teamBInfo = findTeam(allTeams, team2);

      if (!teamAInfo || !teamBInfo) {
        const notFound = [];
        if (!teamAInfo) notFound.push(team1);
        if (!teamBInfo) notFound.push(team2);
        console.error(`Teams not found: ${notFound.join(', ')}`);
        return NextResponse.json(
          { error: `Teams not found: ${notFound.join(', ')}` },
          { status: 404 }
        );
      }

      // Fetch detailed stats for both teams in parallel
      const [teamAStats, teamBStats] = await Promise.all([
        fetchTeamStats(teamAInfo.id, teamAInfo.name),
        fetchTeamStats(teamBInfo.id, teamBInfo.name),
      ]);

      // Add rankings
      teamAStats.espn_rank = teamAInfo.rank;
      teamBStats.espn_rank = teamBInfo.rank;

      return NextResponse.json({
        team1: teamAStats,
        team2: teamBStats,
        timestamp: new Date().toISOString(),
      });
    }

    // If searching for teams
    if (search) {
      const filtered = allTeams
        .filter(t => t.name.toLowerCase().includes(search))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 20);

      return NextResponse.json({ teams: filtered });
    }

    // Return all teams (sorted by rank)
    const teamList = allTeams
      .sort((a, b) => a.rank - b.rank);

    return NextResponse.json({ teams: teamList });
  } catch (error) {
    console.error('Error in teams API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

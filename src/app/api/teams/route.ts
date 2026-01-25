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

    // Extract stats from response - ESPN structure is results.stats.categories
    const stats = statsData.results?.stats?.categories || statsData.splits?.categories || [];

    const getStat = (category: string, name: string): number => {
      const cat = stats.find((c: { name: string }) => c.name === category);
      if (!cat) return 0;
      const stat = cat.stats?.find((s: { name: string }) => s.name === name);
      return stat?.value ?? 0;
    };

    // Get team record from either location
    const teamInfo = statsData.team || {};
    const record = teamInfo.recordSummary || teamInfo.record?.items?.[0]?.summary || '';
    const gamesPlayed = getStat('general', 'gamesPlayed') ||
      parseInt(record.split('-').reduce((a: number, b: string) => a + parseInt(b) || 0, 0)) || 0;

    // Get stats using ESPN's actual field names
    // Per-game averages
    const avgPts = getStat('offensive', 'avgPoints');
    const avgFGM = getStat('offensive', 'avgFieldGoalsMade');
    const avgFGA = getStat('offensive', 'avgFieldGoalsAttempted');
    const avg3PM = getStat('offensive', 'avgThreePointFieldGoalsMade');
    const avg3PA = getStat('offensive', 'avgThreePointFieldGoalsAttempted');
    const avgFTM = getStat('offensive', 'avgFreeThrowsMade');
    const avgFTA = getStat('offensive', 'avgFreeThrowsAttempted');
    const avgOReb = getStat('offensive', 'avgOffensiveRebounds');
    const avgDReb = getStat('defensive', 'avgDefensiveRebounds');
    const avgAst = getStat('offensive', 'avgAssists');
    const avgTO = getStat('offensive', 'avgTurnovers');
    const avgStl = getStat('defensive', 'avgSteals');
    const avgBlk = getStat('defensive', 'avgBlocks');
    const avgFouls = getStat('general', 'avgFouls');
    const astToRatio = getStat('general', 'assistTurnoverRatio');

    // Pre-calculated percentages from ESPN
    const fg_pct = getStat('offensive', 'fieldGoalPct');
    const three_p_pct = getStat('offensive', 'threePointFieldGoalPct');
    const ft_pct = getStat('offensive', 'freeThrowPct');

    // Calculate 3P rate (3PA / FGA)
    const three_p_rate = avgFGA > 0 ? (avg3PA / avgFGA) * 100 : 0;

    // Effective FG% = (FGM + 0.5 * 3PM) / FGA
    const efg_pct = avgFGA > 0 ? ((avgFGM + 0.5 * avg3PM) / avgFGA) * 100 : 0;

    // True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))
    const ts_pct = (avgFGA + 0.44 * avgFTA) > 0 ? (avgPts / (2 * (avgFGA + 0.44 * avgFTA))) * 100 : 0;

    // Estimate pace (possessions per game)
    const pace = avgFGA + 0.44 * avgFTA - avgOReb + avgTO;

    // Offensive efficiency (points per 100 possessions estimate)
    const possessions = pace > 0 ? pace : 70;
    const off_efficiency = possessions > 0 ? (avgPts / possessions) * 100 : 0;

    // Calculate rebound percentages
    const totalReb = avgOReb + avgDReb;
    const oreb_pct = totalReb > 0 ? (avgOReb / totalReb) * 100 : 0;
    const dreb_pct = totalReb > 0 ? (avgDReb / totalReb) * 100 : 0;

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
      oreb_pct: Math.round(oreb_pct * 10) / 10,
      dreb_pct: Math.round(dreb_pct * 10) / 10,
      to_rate: Math.round(avgTO * 10) / 10,
      efg_pct: Math.round(efg_pct * 10) / 10,
      ts_pct: Math.round(ts_pct * 10) / 10,
      avg_ppm: Math.round((avgPts / 40) * 100) / 100,
      avg_ppg: Math.round(avgPts * 10) / 10,
      assists_per_game: Math.round(avgAst * 10) / 10,
      steals_per_game: Math.round(avgStl * 10) / 10,
      blocks_per_game: Math.round(avgBlk * 10) / 10,
      fouls_per_game: Math.round(avgFouls * 10) / 10,
      ast_to_ratio: Math.round(astToRatio * 100) / 100,
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

import { NextResponse } from 'next/server';
import { analyzeTeam, TeamStats } from '@/lib/teamClassification';

interface TeamListItem {
  id: string;
  name: string;
  rank: number;
}

let teamsListCache: TeamListItem[] | null = null;
let allTeamsStatsCache: TeamStats[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Fetch list of all teams
async function fetchTeamsList(): Promise<TeamListItem[]> {
  const now = Date.now();
  if (teamsListCache && now - cacheTime < CACHE_DURATION) {
    return teamsListCache;
  }

  try {
    const teamsResponse = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=500',
      { cache: 'no-store' }
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
        { cache: 'no-store' }
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
    cacheTime = now;
    return teams;
  } catch (error) {
    console.error('Error fetching teams list:', error);
    return teamsListCache || [];
  }
}

// Fetch detailed stats for a specific team
async function fetchTeamStats(teamId: string, teamName: string): Promise<TeamStats> {
  try {
    const statsResponse = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}/statistics`,
      { cache: 'no-store' }
    );

    if (!statsResponse.ok) {
      throw new Error(`Failed to fetch stats for team ${teamId}`);
    }

    const statsData = await statsResponse.json();
    const stats = statsData.results?.stats?.categories || statsData.splits?.categories || [];

    const getStat = (category: string, name: string): number => {
      const cat = stats.find((c: { name: string }) => c.name === category);
      if (!cat) return 0;
      const stat = cat.stats?.find((s: { name: string }) => s.name === name);
      return stat?.value ?? 0;
    };

    const teamInfo = statsData.team || {};
    const record = teamInfo.recordSummary || teamInfo.record?.items?.[0]?.summary || '';
    const gamesPlayed = getStat('general', 'gamesPlayed') ||
      parseInt(record.split('-').reduce((a: number, b: string) => a + parseInt(b) || 0, 0)) || 0;

    const avgPts = getStat('offensive', 'avgPoints');
    const avgFGM = getStat('offensive', 'avgFieldGoalsMade');
    const avgFGA = getStat('offensive', 'avgFieldGoalsAttempted');
    const avg3PM = getStat('offensive', 'avgThreePointFieldGoalsMade');
    const avg3PA = getStat('offensive', 'avgThreePointFieldGoalsAttempted');
    const avgFTA = getStat('offensive', 'avgFreeThrowsAttempted');
    const avgOReb = getStat('offensive', 'avgOffensiveRebounds');
    const avgDReb = getStat('defensive', 'avgDefensiveRebounds');
    const avgAst = getStat('offensive', 'avgAssists');
    const avgTO = getStat('offensive', 'avgTurnovers');
    const avgStl = getStat('defensive', 'avgSteals');
    const avgBlk = getStat('defensive', 'avgBlocks');
    const avgFouls = getStat('general', 'avgFouls');
    const astToRatio = getStat('general', 'assistTurnoverRatio');

    const fg_pct = getStat('offensive', 'fieldGoalPct');
    const three_p_pct = getStat('offensive', 'threePointFieldGoalPct');
    const ft_pct = getStat('offensive', 'freeThrowPct');

    const three_p_rate = avgFGA > 0 ? (avg3PA / avgFGA) * 100 : 0;
    const efg_pct = avgFGA > 0 ? ((avgFGM + 0.5 * avg3PM) / avgFGA) * 100 : 0;
    const ts_pct = (avgFGA + 0.44 * avgFTA) > 0 ? (avgPts / (2 * (avgFGA + 0.44 * avgFTA))) * 100 : 0;
    const pace = avgFGA + 0.44 * avgFTA - avgOReb + avgTO;
    const possessions = pace > 0 ? pace : 70;
    const off_efficiency = possessions > 0 ? (avgPts / possessions) * 100 : 0;
    const totalReb = avgOReb + avgDReb;
    const oreb_pct = totalReb > 0 ? (avgOReb / totalReb) * 100 : 0;
    const dreb_pct = totalReb > 0 ? (avgDReb / totalReb) * 100 : 0;

    return {
      team_id: teamId,
      team_name: teamName,
      games_played: gamesPlayed,
      record,
      pace: Math.round(pace * 10) / 10,
      off_efficiency: Math.round(off_efficiency * 10) / 10,
      def_efficiency: 0,
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

// Fetch stats for all teams (for percentile calculations)
async function fetchAllTeamsStats(): Promise<TeamStats[]> {
  const now = Date.now();
  if (allTeamsStatsCache && now - cacheTime < CACHE_DURATION) {
    return allTeamsStatsCache;
  }

  const teams = await fetchTeamsList();

  // Fetch stats for top 100 teams by rank (for percentile reference)
  // This gives us a representative sample without hitting rate limits
  const topTeams = teams
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 150);

  const statsPromises = topTeams.map(t => fetchTeamStats(t.id, t.name));
  const allStats = await Promise.all(statsPromises);

  allTeamsStatsCache = allStats.filter(s => s.games_played > 0);
  return allTeamsStatsCache;
}

// Find team by ID or name
function findTeam(teams: TeamListItem[], searchTerm: string): TeamListItem | undefined {
  const byId = teams.find(t => t.id === searchTerm);
  if (byId) return byId;

  const searchLower = searchTerm.toLowerCase().trim();
  const exact = teams.find(t => t.name.toLowerCase() === searchLower);
  if (exact) return exact;

  const contains = teams.find(t => t.name.toLowerCase().includes(searchLower));
  if (contains) return contains;

  const searchFirstWord = searchLower.split(' ')[0];
  const wordMatch = teams.find(t => {
    const teamFirstWord = t.name.toLowerCase().split(' ')[0];
    return teamFirstWord === searchFirstWord;
  });
  return wordMatch;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamParam = searchParams.get('team');

  if (!teamParam) {
    return NextResponse.json(
      { error: 'Team parameter required' },
      { status: 400 }
    );
  }

  try {
    const allTeams = await fetchTeamsList();
    const teamInfo = findTeam(allTeams, teamParam);

    if (!teamInfo) {
      return NextResponse.json(
        { error: `Team not found: ${teamParam}` },
        { status: 404 }
      );
    }

    // Fetch this team's stats
    const teamStats = await fetchTeamStats(teamInfo.id, teamInfo.name);
    teamStats.espn_rank = teamInfo.rank;

    // Fetch all teams stats for comparison
    const allTeamsStats = await fetchAllTeamsStats();

    // Analyze the team
    const analysis = analyzeTeam(teamStats, allTeamsStats);

    return NextResponse.json({
      ...analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in team analysis API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze team' },
      { status: 500 }
    );
  }
}

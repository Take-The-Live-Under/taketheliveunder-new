import { NextResponse } from 'next/server';

const ESPN_SUMMARY_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';

interface ESPNOfficial {
  fullName: string;
  displayName: string;
  position?: {
    name: string;
  };
  order: number;
}

interface ESPNTeamStat {
  name?: string;
  label?: string;
  displayValue?: string;
  value?: number;
}

interface ESPNBoxscoreTeam {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
  };
  statistics: ESPNTeamStat[];
}

interface ESPNPlayer {
  athlete: {
    id: string;
    displayName: string;
    shortName: string;
    jersey?: string;
    position?: {
      abbreviation: string;
    };
  };
  stats: string[];
  starter: boolean;
}

interface ESPNPlayerGroup {
  team: {
    id: string;
    displayName: string;
  };
  statistics: Array<{
    names: string[];
    labels: string[];
    athletes: ESPNPlayer[];
  }>;
}

// Load referee metrics from CSV
async function loadRefMetrics(): Promise<Map<string, {
  foulsPerGame: number;
  style: string;
  homeBias: number;
}>> {
  const refMap = new Map();

  try {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    const csvPath = path.join(process.cwd(), 'data', 'refmetrics_fouls_2024_25_auth_latest.csv');

    const content = await fs.readFile(csvPath, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');

    const nameIdx = headers.indexOf('referee_name');
    const foulsIdx = headers.indexOf('total_fouls_per_game');
    const styleIdx = headers.indexOf('ref_style');
    const biasIdx = headers.indexOf('home_bias');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length > nameIdx) {
        const name = values[nameIdx]?.trim();
        if (name) {
          // Store with normalized key for better matching
          const normalizedName = name.toLowerCase().replace(/\s+/g, ' ').trim();
          refMap.set(normalizedName, {
            foulsPerGame: parseFloat(values[foulsIdx]) || 0,
            style: values[styleIdx]?.trim() || 'Average',
            homeBias: parseFloat(values[biasIdx]) || 0,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading ref metrics:', error);
  }

  return refMap;
}

function normalizeRefName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[^a-z\s]/g, ''); // Remove non-alpha chars
}

function findRefMetrics(
  refName: string,
  refMap: Map<string, { foulsPerGame: number; style: string; homeBias: number }>
) {
  const normalized = normalizeRefName(refName);

  // Direct match
  if (refMap.has(normalized)) {
    return refMap.get(normalized);
  }

  // Try partial match with normalized keys
  const entries = Array.from(refMap.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const normalizedKey = normalizeRefName(key);

    // Check if names match after normalization
    if (normalized === normalizedKey) {
      return value;
    }

    // Check if one contains the other
    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      return value;
    }

    // Match last name only (for cases like "J. Smith" vs "John Smith")
    const normalizedParts = normalized.split(' ').filter(p => p.length > 1);
    const keyParts = normalizedKey.split(' ').filter(p => p.length > 1);

    if (normalizedParts.length > 0 && keyParts.length > 0) {
      const normalizedLastName = normalizedParts[normalizedParts.length - 1];
      const keyLastName = keyParts[keyParts.length - 1];

      // Match on last name + first letter of first name
      if (normalizedLastName === keyLastName) {
        if (normalizedParts.length === 1 || keyParts.length === 1) {
          return value; // Just last name match
        }
        // Check first initial
        if (normalizedParts[0][0] === keyParts[0][0]) {
          return value;
        }
      }
    }
  }

  return null;
}

function extractStat(stats: ESPNTeamStat[], name: string): string | number | null {
  const stat = stats.find(s => s.name === name || s.label === name);
  if (stat) {
    return stat.displayValue ?? stat.value ?? null;
  }
  return null;
}

// Determine bonus status based on fouls for current half
// Note: This function is now called with current-half fouls, not total game fouls
function getBonusStatus(currentHalfFouls: number): { inBonus: boolean; inDoubleBonus: boolean; label: string } {
  // NCAA: Bonus at 7 fouls per half, Double bonus at 10
  if (currentHalfFouls >= 10) {
    return { inBonus: true, inDoubleBonus: true, label: 'Double Bonus' };
  } else if (currentHalfFouls >= 7) {
    return { inBonus: true, inDoubleBonus: false, label: 'Bonus' };
  }
  return { inBonus: false, inDoubleBonus: false, label: '' };
}

// Count fouls from plays for a specific half
function countFoulsByHalf(
  plays: Array<{ period?: { number: number }; type?: { text: string }; team?: { id: string } }>,
  targetPeriod: number,
  teamId: string
): number {
  const foulPlayTypes = ['foul', 'personalfoul', 'shootingfoul', 'offensivefoul', 'technicalfoul', 'flagrantfoul'];

  let fouls = 0;
  for (const play of plays) {
    const playPeriod = play.period?.number || 1;
    if (playPeriod !== targetPeriod) continue;

    const playType = (play.type?.text || '').toLowerCase().replace(/\s+/g, '');
    const isFoul = foulPlayTypes.some(ft => playType.includes(ft));

    if (isFoul && play.team?.id === teamId) {
      fouls++;
    }
  }

  return fouls;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
  }

  try {
    // Fetch ESPN summary
    const response = await fetch(`${ESPN_SUMMARY_URL}?event=${gameId}`, {
      next: { revalidate: 0 },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();

    // Load referee metrics
    const refMetrics = await loadRefMetrics();

    // Extract officials
    const officials: Array<{
      name: string;
      foulsPerGame: number | null;
      style: string | null;
      homeBias: number | null;
    }> = [];

    const gameOfficials = data.gameInfo?.officials || [];
    for (const official of gameOfficials) {
      const metrics = findRefMetrics(official.fullName || official.displayName, refMetrics);
      officials.push({
        name: official.fullName || official.displayName,
        foulsPerGame: metrics?.foulsPerGame ?? null,
        style: metrics?.style ?? null,
        homeBias: metrics?.homeBias ?? null,
      });
    }

    // Calculate crew average
    const crewFouls = officials
      .filter(o => o.foulsPerGame !== null)
      .map(o => o.foulsPerGame as number);
    const crewAvgFouls = crewFouls.length > 0
      ? crewFouls.reduce((a, b) => a + b, 0) / crewFouls.length
      : null;

    // Extract team stats from boxscore
    const boxscoreTeams = data.boxscore?.teams || [];
    const teamStats: Array<{
      teamId: string;
      teamName: string;
      abbreviation: string;
      isHome: boolean;
      stats: {
        fouls: number;
        technicalFouls: number;
        fieldGoals: string;
        fieldGoalPct: number;
        threePointers: string;
        threePointPct: number;
        freeThrows: string;
        freeThrowPct: number;
        rebounds: number;
        offRebounds: number;
        defRebounds: number;
        assists: number;
        steals: number;
        blocks: number;
        turnovers: number;
        pointsInPaint: number;
        fastBreakPoints: number;
        largestLead: number;
      };
      bonusStatus: { inBonus: boolean; inDoubleBonus: boolean; label: string };
    }> = [];

    // Get current period from header
    const header = data.header;
    const competition = header?.competitions?.[0];
    const currentPeriod = competition?.status?.period || 1;
    const gameStatus = competition?.status?.type?.state || 'pre';
    const clock = competition?.status?.displayClock || '20:00';

    // Find home/away from competition
    const competitors = competition?.competitors || [];
    const homeTeamId = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')?.id;

    // Get plays data for accurate per-half foul counting
    const plays = data.plays || [];

    // First pass: collect team data and fouls
    interface TeamFoulData {
      teamId: string;
      isHome: boolean;
      totalFouls: number;
      currentHalfFouls: number;
      stats: typeof boxscoreTeams[0]['statistics'];
      teamName: string;
      abbreviation: string;
    }

    const teamFoulData: TeamFoulData[] = [];

    for (const team of boxscoreTeams) {
      const stats = team.statistics || [];
      const isHome = team.team?.id === homeTeamId;
      const teamId = team.team?.id;

      const totalFouls = parseInt(extractStat(stats, 'fouls') as string) || 0;

      // Calculate current-half fouls for accurate bonus status
      let currentHalfFouls: number;
      if (currentPeriod === 1) {
        // First half: total fouls = first half fouls
        currentHalfFouls = totalFouls;
      } else if (plays.length > 0) {
        // Second half+: count fouls from plays for current period
        currentHalfFouls = countFoulsByHalf(plays, currentPeriod, teamId);
      } else {
        // Fallback if no plays data: conservative estimate
        currentHalfFouls = totalFouls;
      }

      teamFoulData.push({
        teamId,
        isHome,
        totalFouls,
        currentHalfFouls,
        stats,
        teamName: team.team?.displayName,
        abbreviation: team.team?.abbreviation,
      });
    }

    // Second pass: calculate bonus status based on OPPONENT's fouls
    // A team is "in bonus" when the OPPONENT has committed 7+ fouls
    const homeTeamData = teamFoulData.find(t => t.isHome);
    const awayTeamData = teamFoulData.find(t => !t.isHome);

    for (const teamData of teamFoulData) {
      // Bonus is based on opponent's fouls, not your own
      const opponentFouls = teamData.isHome
        ? (awayTeamData?.currentHalfFouls || 0)
        : (homeTeamData?.currentHalfFouls || 0);

      const bonusStatus = getBonusStatus(opponentFouls);

      teamStats.push({
        teamId: teamData.teamId,
        teamName: teamData.teamName,
        abbreviation: teamData.abbreviation,
        isHome: teamData.isHome,
        stats: {
          fouls: teamData.totalFouls, // Keep showing total game fouls in stats
          technicalFouls: parseInt(extractStat(teamData.stats, 'technicalFouls') as string) || 0,
          fieldGoals: extractStat(teamData.stats, 'fieldGoalsMade-fieldGoalsAttempted') as string || '0-0',
          fieldGoalPct: parseInt(extractStat(teamData.stats, 'fieldGoalPct') as string) || 0,
          threePointers: extractStat(teamData.stats, 'threePointFieldGoalsMade-threePointFieldGoalsAttempted') as string || '0-0',
          threePointPct: parseInt(extractStat(teamData.stats, 'threePointFieldGoalPct') as string) || 0,
          freeThrows: extractStat(teamData.stats, 'freeThrowsMade-freeThrowsAttempted') as string || '0-0',
          freeThrowPct: parseInt(extractStat(teamData.stats, 'freeThrowPct') as string) || 0,
          rebounds: parseInt(extractStat(teamData.stats, 'totalRebounds') as string) || 0,
          offRebounds: parseInt(extractStat(teamData.stats, 'offensiveRebounds') as string) || 0,
          defRebounds: parseInt(extractStat(teamData.stats, 'defensiveRebounds') as string) || 0,
          assists: parseInt(extractStat(teamData.stats, 'assists') as string) || 0,
          steals: parseInt(extractStat(teamData.stats, 'steals') as string) || 0,
          blocks: parseInt(extractStat(teamData.stats, 'blocks') as string) || 0,
          turnovers: parseInt(extractStat(teamData.stats, 'turnovers') as string) || 0,
          pointsInPaint: parseInt(extractStat(teamData.stats, 'pointsInPaint') as string) || 0,
          fastBreakPoints: parseInt(extractStat(teamData.stats, 'fastBreakPoints') as string) || 0,
          largestLead: parseInt(extractStat(teamData.stats, 'largestLead') as string) || 0,
        },
        bonusStatus,
      });
    }

    // Sort so away team is first, home team second
    teamStats.sort((a, b) => (a.isHome ? 1 : -1) - (b.isHome ? 1 : -1));

    // Extract top players
    const playerGroups = data.boxscore?.players || [];
    const topPlayers: Array<{
      teamName: string;
      players: Array<{
        name: string;
        jersey: string;
        points: number;
        rebounds: number;
        assists: number;
        fouls: number;
      }>;
    }> = [];

    for (const group of playerGroups) {
      const athletes = group.statistics?.[0]?.athletes || [];
      const statNames = group.statistics?.[0]?.names || [];

      const ptsIdx = statNames.indexOf('PTS');
      const rebIdx = statNames.indexOf('REB');
      const astIdx = statNames.indexOf('AST');
      const pfIdx = statNames.indexOf('PF');

      const players = athletes
        .map((a: ESPNPlayer) => ({
          name: a.athlete?.shortName || a.athlete?.displayName,
          jersey: a.athlete?.jersey || '',
          points: parseInt(a.stats?.[ptsIdx]) || 0,
          rebounds: parseInt(a.stats?.[rebIdx]) || 0,
          assists: parseInt(a.stats?.[astIdx]) || 0,
          fouls: parseInt(a.stats?.[pfIdx]) || 0,
        }))
        .sort((a: { points: number }, b: { points: number }) => b.points - a.points)
        .slice(0, 5); // Top 5 scorers

      topPlayers.push({
        teamName: group.team?.displayName,
        players,
      });
    }

    // Game info
    const venue = data.gameInfo?.venue;
    const attendance = data.gameInfo?.attendance;

    return NextResponse.json({
      gameId,
      status: gameStatus,
      period: currentPeriod,
      clock,
      venue: venue?.fullName || null,
      attendance,
      officials,
      crewAvgFouls,
      crewStyle: crewAvgFouls !== null
        ? crewAvgFouls >= 40 ? 'Tight' : crewAvgFouls <= 32 ? 'Loose' : 'Average'
        : null,
      teamStats,
      topPlayers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching game details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game details', details: String(error) },
      { status: 500 }
    );
  }
}

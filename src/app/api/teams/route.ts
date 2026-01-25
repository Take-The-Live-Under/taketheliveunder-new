import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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
  ft_rate: number;
  ft_pct: number;
  oreb_pct: number;
  dreb_pct: number;
  to_rate: number;
  efg_pct: number;
  ts_pct: number;
  two_p_pct: number;
  efficiency_margin: number;
  avg_ppm: number;
  avg_ppg: number;
  assists_per_game: number;
  steals_per_game: number;
  blocks_per_game: number;
  fouls_per_game: number;
  ast_to_ratio: number;
  espn_rank: number;
}

let teamsCache: TeamData[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function loadTeamsFromCache(): Promise<TeamData[]> {
  const now = Date.now();
  if (teamsCache && now - cacheTime < CACHE_DURATION) {
    return teamsCache;
  }

  try {
    // Find the most recent ESPN stats CSV
    const cacheDir = path.join(process.cwd(), 'cache');
    const files = await fs.readdir(cacheDir);
    const espnFiles = files
      .filter(f => f.startsWith('espn_stats_') && f.endsWith('.csv'))
      .sort()
      .reverse();

    if (espnFiles.length === 0) {
      console.log('No ESPN stats files found, fetching from API...');
      return await fetchTeamsFromESPN();
    }

    const latestFile = path.join(cacheDir, espnFiles[0]);
    const content = await fs.readFile(latestFile, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');

    const teams: TeamData[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',');

      const team: Record<string, string | number> = {};
      headers.forEach((header, idx) => {
        const value = values[idx]?.trim();
        team[header] = isNaN(Number(value)) ? value : Number(value);
      });

      teams.push(team as unknown as TeamData);
    }

    teamsCache = teams;
    cacheTime = now;
    return teams;
  } catch (error) {
    console.error('Error loading teams from cache:', error);
    return await fetchTeamsFromESPN();
  }
}

async function fetchTeamsFromESPN(): Promise<TeamData[]> {
  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=500',
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch teams from ESPN');
    }

    const data = await response.json();
    const teams: TeamData[] = data.sports?.[0]?.leagues?.[0]?.teams?.map((t: { team: { id: string; displayName: string } }) => ({
      team_id: t.team.id,
      team_name: t.team.displayName,
      games_played: 0,
      pace: 0,
      off_efficiency: 0,
      def_efficiency: 0,
      fg_pct: 0,
      three_p_rate: 0,
      three_p_pct: 0,
      ft_rate: 0,
      ft_pct: 0,
      oreb_pct: 0,
      dreb_pct: 0,
      to_rate: 0,
      efg_pct: 0,
      ts_pct: 0,
      two_p_pct: 0,
      efficiency_margin: 0,
      avg_ppm: 0,
      avg_ppg: 0,
      assists_per_game: 0,
      steals_per_game: 0,
      blocks_per_game: 0,
      fouls_per_game: 0,
      ast_to_ratio: 0,
      espn_rank: 999,
    })) || [];

    return teams;
  } catch (error) {
    console.error('Error fetching from ESPN:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');

  try {
    const allTeams = await loadTeamsFromCache();

    // If requesting specific teams for comparison
    if (team1 && team2) {
      const teamA = allTeams.find(t =>
        t.team_name.toLowerCase() === team1.toLowerCase() ||
        t.team_id === team1
      );
      const teamB = allTeams.find(t =>
        t.team_name.toLowerCase() === team2.toLowerCase() ||
        t.team_id === team2
      );

      if (!teamA || !teamB) {
        return NextResponse.json(
          { error: 'One or both teams not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        team1: teamA,
        team2: teamB,
        timestamp: new Date().toISOString(),
      });
    }

    // If searching for teams
    if (search) {
      const filtered = allTeams
        .filter(t => t.team_name.toLowerCase().includes(search))
        .slice(0, 20)
        .map(t => ({
          id: t.team_id,
          name: t.team_name,
          rank: t.espn_rank,
        }));

      return NextResponse.json({ teams: filtered });
    }

    // Return all teams (for initial list)
    const teamList = allTeams
      .sort((a, b) => (a.espn_rank || 999) - (b.espn_rank || 999))
      .map(t => ({
        id: t.team_id,
        name: t.team_name,
        rank: t.espn_rank,
      }));

    return NextResponse.json({ teams: teamList });
  } catch (error) {
    console.error('Error in teams API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

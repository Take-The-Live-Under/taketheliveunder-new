import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface GameOdds {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  bookmaker: string;
  spreadLine: number | null;
  spreadHomeOdds: number | null;
  spreadAwayOdds: number | null;
  totalLine: number | null;
  totalOverOdds: number | null;
  totalUnderOdds: number | null;
  moneylineHome: number | null;
  moneylineAway: number | null;
}

export async function GET() {
  try {
    // Find the most recent odds file
    const oddsDir = path.join(process.cwd(), 'odds_snapshots_today');

    let files: string[];
    try {
      files = await fs.readdir(oddsDir);
    } catch {
      return NextResponse.json({ games: [], error: 'No odds data found' });
    }

    const csvFiles = files.filter(f => f.endsWith('.csv') && f.startsWith('all_games_'));
    if (csvFiles.length === 0) {
      return NextResponse.json({ games: [], error: 'No odds CSV found' });
    }

    // Get most recent file
    csvFiles.sort().reverse();
    const latestFile = csvFiles[0];
    const filePath = path.join(oddsDir, latestFile);

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) {
      return NextResponse.json({ games: [], error: 'Empty CSV' });
    }

    // Parse CSV
    const headers = lines[0].split(',');
    const games: GameOdds[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      const getValue = (col: string): string => {
        const idx = headers.indexOf(col);
        return idx >= 0 ? values[idx] : '';
      };

      const parseNum = (val: string): number | null => {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };

      const game: GameOdds = {
        id: getValue('odds_api_id') || getValue('espn_id') || `game-${i}`,
        sport: getValue('sport'),
        homeTeam: getValue('home_team'),
        awayTeam: getValue('away_team'),
        commenceTime: getValue('commence_time'),
        status: getValue('status'),
        homeScore: parseNum(getValue('home_score')),
        awayScore: parseNum(getValue('away_score')),
        bookmaker: getValue('bookmaker'),
        spreadLine: parseNum(getValue('spread_line')),
        spreadHomeOdds: parseNum(getValue('spread_home_odds')),
        spreadAwayOdds: parseNum(getValue('spread_away_odds')),
        totalLine: parseNum(getValue('total_line')),
        totalOverOdds: parseNum(getValue('total_over_odds')),
        totalUnderOdds: parseNum(getValue('total_under_odds')),
        moneylineHome: parseNum(getValue('moneyline_home')),
        moneylineAway: parseNum(getValue('moneyline_away')),
      };

      // Only include games with valid odds
      if (game.homeTeam && game.awayTeam && (game.totalLine || game.moneylineHome)) {
        games.push(game);
      }
    }

    // Sort by commence time
    games.sort((a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime());

    return NextResponse.json({
      games,
      source: latestFile,
      count: games.length,
    });
  } catch (error) {
    console.error('Error loading odds data:', error);
    return NextResponse.json({ games: [], error: 'Failed to load odds' }, { status: 500 });
  }
}

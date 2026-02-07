import { NextResponse } from 'next/server';
import { teamsMatch } from '@/lib/teamNormalization';

const KENPOM_API_URL = 'https://kenpom.com/api.php';
const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';
const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/';

interface KenPomPrediction {
  Season: number;
  GameID: string;
  DateOfGame: string;
  Visitor: string;
  Home: string;
  HomeRank: number;
  VisitorRank: number;
  HomePred: number;
  VisitorPred: number;
  HomeWP: number;
  PredTempo: number;
}

interface OddsAPIGame {
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        point?: number;
      }>;
    }>;
  }>;
}

export interface GamePrediction {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRank: number | null;
  awayRank: number | null;
  kenpomHomeScore: number;
  kenpomAwayScore: number;
  kenpomTotal: number;
  kenpomWinProb: number;
  kenpomTempo: number;
  vegasLine: number | null;
  lineDiff: number | null;
  projectedWinner: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  gameTime: string | null;
  status: 'pre' | 'in' | 'post';
}

function extractOULine(bookmakers: OddsAPIGame['bookmakers']): number | null {
  if (!bookmakers || bookmakers.length === 0) return null;

  const fanduel = bookmakers.find(b => b.key === 'fanduel');
  const bookToUse = fanduel || bookmakers[0];

  const totalsMarket = bookToUse.markets.find(m => m.key === 'totals');
  if (!totalsMarket?.outcomes?.length) return null;

  const overOutcome = totalsMarket.outcomes.find(o => o.name === 'Over');
  return overOutcome?.point ?? null;
}

function getConfidence(winProb: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (winProb >= 80 || winProb <= 20) return 'HIGH';
  if (winProb >= 65 || winProb <= 35) return 'MEDIUM';
  return 'LOW';
}

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

function formatDateForKenPom(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(date);
}

export async function GET() {
  try {
    const kenpomApiKey = process.env.KENPOM_API_KEY;
    const oddsApiKey = process.env.ODDS_API_KEY;

    if (!kenpomApiKey) {
      return NextResponse.json(
        { error: 'KENPOM_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Get today's date
    const today = new Date();
    const todayStr = formatDateForKenPom(today);
    const espnDateStr = formatDateForESPN(today);

    // Fetch KenPom fanmatch predictions
    const kenpomResponse = await fetch(
      `${KENPOM_API_URL}?endpoint=fanmatch&d=${todayStr}`,
      {
        headers: {
          'Authorization': `Bearer ${kenpomApiKey}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!kenpomResponse.ok) {
      console.error('KenPom API error:', kenpomResponse.status);
      return NextResponse.json(
        { error: 'Failed to fetch KenPom predictions' },
        { status: 500 }
      );
    }

    const kenpomData: KenPomPrediction[] = await kenpomResponse.json();

    // Fetch ESPN games for game times and status
    const espnResponse = await fetch(
      `${ESPN_URL}?limit=500&groups=50&dates=${espnDateStr}`,
      { cache: 'no-store' }
    );

    interface ESPNEvent {
      id: string;
      date: string;
      status: { type: { state: string } };
      competitions: Array<{
        competitors: Array<{
          homeAway: string;
          team: { displayName: string };
        }>;
      }>;
    }

    let espnEvents: ESPNEvent[] = [];
    if (espnResponse.ok) {
      const espnData = await espnResponse.json();
      espnEvents = espnData.events || [];
    }

    // Fetch odds for Vegas lines
    let oddsGames: OddsAPIGame[] = [];
    if (oddsApiKey) {
      try {
        const oddsResponse = await fetch(
          `${ODDS_API_URL}?apiKey=${oddsApiKey}&regions=us&markets=totals&oddsFormat=american`,
          { cache: 'no-store' }
        );
        if (oddsResponse.ok) {
          oddsGames = await oddsResponse.json();
        }
      } catch (e) {
        console.error('Odds API error:', e);
      }
    }

    // Build predictions with matched data
    const predictions: GamePrediction[] = kenpomData.map(kp => {
      const kenpomTotal = Math.round((kp.HomePred + kp.VisitorPred) * 10) / 10;

      // Find matching ESPN game
      const espnGame = espnEvents.find(e => {
        const comp = e.competitions?.[0];
        const home = comp?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName;
        const away = comp?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName;
        return home && away && teamsMatch(home, kp.Home) && teamsMatch(away, kp.Visitor);
      });

      // Find matching odds game
      const oddsGame = oddsGames.find(o =>
        teamsMatch(o.home_team, kp.Home) && teamsMatch(o.away_team, kp.Visitor)
      );

      const vegasLine = oddsGame ? extractOULine(oddsGame.bookmakers) : null;
      const lineDiff = vegasLine !== null ? Math.round((vegasLine - kenpomTotal) * 10) / 10 : null;

      const homeWins = kp.HomeWP >= 50;
      const projectedWinner = homeWins ? kp.Home : kp.Visitor;

      return {
        gameId: espnGame?.id || kp.GameID,
        homeTeam: kp.Home,
        awayTeam: kp.Visitor,
        homeRank: kp.HomeRank || null,
        awayRank: kp.VisitorRank || null,
        kenpomHomeScore: Math.round(kp.HomePred * 10) / 10,
        kenpomAwayScore: Math.round(kp.VisitorPred * 10) / 10,
        kenpomTotal,
        kenpomWinProb: kp.HomeWP,
        kenpomTempo: kp.PredTempo,
        vegasLine,
        lineDiff,
        projectedWinner,
        confidence: getConfidence(kp.HomeWP),
        gameTime: espnGame?.date || null,
        status: (espnGame?.status?.type?.state as 'pre' | 'in' | 'post') || 'pre',
      };
    });

    // Sort by confidence (HIGH first), then by win probability extremity
    predictions.sort((a, b) => {
      const confOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (confOrder[a.confidence] !== confOrder[b.confidence]) {
        return confOrder[a.confidence] - confOrder[b.confidence];
      }
      // Sort by how extreme the win probability is
      const aExtreme = Math.abs(a.kenpomWinProb - 50);
      const bExtreme = Math.abs(b.kenpomWinProb - 50);
      return bExtreme - aExtreme;
    });

    return NextResponse.json({
      predictions,
      timestamp: new Date().toISOString(),
      date: todayStr,
      count: predictions.length,
    });

  } catch (error) {
    console.error('Error in /api/predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions', details: String(error) },
      { status: 500 }
    );
  }
}

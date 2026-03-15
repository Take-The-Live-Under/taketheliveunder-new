import { NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BracketTeam {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  seed: number;
  logo: string;
  score?: number;
  winner?: boolean;
}

export interface BracketGame {
  id: string;
  round: number;          // 1=R64, 2=R32, 3=S16, 4=E8, 5=F4, 6=Championship
  region: string;         // South, East, West, Midwest
  regionSlot: number;     // position within region (1-8 for R64)
  topTeam: BracketTeam | null;
  bottomTeam: BracketTeam | null;
  winner: BracketTeam | null;
  date: string;           // e.g. "Mar 20"
  venue: string;
  location: string;       // "City, ST"
  status: string;         // pre, in, post
  gameDate: string;       // ISO
}

export interface BracketData {
  rounds: {
    round: number;
    label: string;
    games: BracketGame[];
  }[];
  lastUpdated: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROUND_LABELS: Record<number, string> = {
  0: 'First Four',
  1: 'First Round',
  2: 'Second Round',
  3: 'Sweet 16',
  4: 'Elite Eight',
  5: 'Final Four',
  6: 'Championship',
};

// All tournament dates for 2025
const TOURNAMENT_DATES = [
  '20250318', '20250319', // First Four
  '20250320', '20250321', // R64
  '20250322', '20250323', // R32
  '20250327', '20250328', // S16
  '20250329', '20250330', // E8
  '20250405',             // F4
  '20250407',             // Championship
];

// Map ESPN round names to round numbers
function getRoundNumber(headline: string): number {
  if (headline.includes('First Four') || headline.includes('Play-In')) return 0;
  if (headline.includes('1st Round') || headline.includes('First Round')) return 1;
  if (headline.includes('2nd Round') || headline.includes('Second Round')) return 2;
  if (headline.includes('Sweet 16') || headline.includes('Sweet Sixteen')) return 3;
  if (headline.includes('Elite Eight') || headline.includes('Elite 8')) return 4;
  if (headline.includes('Final Four') || headline.includes('Semifinal')) return 5;
  if (headline.includes('Championship') && !headline.includes('Region')) return 6;
  return 1;
}

function getRegion(headline: string): string {
  if (headline.includes('South')) return 'South';
  if (headline.includes('East')) return 'East';
  if (headline.includes('West')) return 'West';
  if (headline.includes('Midwest')) return 'Midwest';
  if (headline.includes('Final Four') || headline.includes('Championship')) return 'National';
  return 'Unknown';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}

// ─── Fetch and parse ESPN data ────────────────────────────────────────────────

async function fetchGamesForDate(date: string): Promise<BracketGame[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${date}&groups=100&limit=20`;
    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) return [];
    const data = await res.json();

    const games: BracketGame[] = [];

    for (const event of (data.events || [])) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const headline = competition.notes?.[0]?.headline || '';
      const round = getRoundNumber(headline);
      const region = getRegion(headline);

      const venue = competition.venue || {};
      const address = venue.address || {};
      const venueName = venue.fullName || '';
      const location = [address.city, address.state].filter(Boolean).join(', ');

      const statusType = competition.status?.type?.state || 'pre';
      const gameDate = event.date || '';

      // Sort competitors: lower seed = top, higher seed = bottom
      const competitors = [...(competition.competitors || [])];
      competitors.sort((a: any, b: any) => {
        const seedA = a.curatedRank?.current ?? 99;
        const seedB = b.curatedRank?.current ?? 99;
        return seedA - seedB;
      });

      function parseTeam(c: any): BracketTeam | null {
        if (!c?.team) return null;
        return {
          id: c.team.id,
          name: c.team.displayName,
          shortName: c.team.shortDisplayName || c.team.name,
          abbreviation: c.team.abbreviation,
          seed: c.curatedRank?.current ?? 0,
          logo: c.team.logo || '',
          score: c.score ? parseInt(c.score) : undefined,
          winner: c.winner ?? false,
        };
      }

      const topTeam = parseTeam(competitors[0]) ;
      const bottomTeam = parseTeam(competitors[1]);
      const winnerCompetitor = competitors.find((c: any) => c.winner);
      const winner = parseTeam(winnerCompetitor) || null;

      games.push({
        id: event.id,
        round,
        region,
        regionSlot: 0, // filled in below
        topTeam,
        bottomTeam,
        winner: statusType === 'post' ? winner : null,
        date: formatDate(gameDate),
        venue: venueName,
        location,
        status: statusType,
        gameDate,
      });
    }

    return games;
  } catch {
    return [];
  }
}

// ─── Assign region slots (for bracket positioning) ───────────────────────────

function assignRegionSlots(games: BracketGame[]): BracketGame[] {
  // Group by region + round, assign slot positions
  const regionRoundMap: Record<string, BracketGame[]> = {};
  for (const g of games) {
    const key = `${g.region}-${g.round}`;
    if (!regionRoundMap[key]) regionRoundMap[key] = [];
    regionRoundMap[key].push(g);
  }

  // Sort by game date within each group for consistent ordering
  for (const key in regionRoundMap) {
    regionRoundMap[key].sort((a, b) => {
      const seedDiffA = (a.topTeam?.seed ?? 99);
      const seedDiffB = (b.topTeam?.seed ?? 99);
      return seedDiffA - seedDiffB;
    });
    regionRoundMap[key].forEach((g, i) => { g.regionSlot = i + 1; });
  }

  return games;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Fetch all dates in parallel
    const allGamesArrays = await Promise.all(
      TOURNAMENT_DATES.map(date => fetchGamesForDate(date))
    );

    const allGames = allGamesArrays.flat();

    // Deduplicate by event ID
    const seen = new Set<string>();
    const uniqueGames = allGames.filter(g => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });

    // Assign positioning slots
    const positioned = assignRegionSlots(uniqueGames);

    // Group into rounds
    const roundNumbers = [0, 1, 2, 3, 4, 5, 6];
    const rounds = roundNumbers
      .map(round => ({
        round,
        label: ROUND_LABELS[round],
        games: positioned
          .filter(g => g.round === round)
          .sort((a, b) => {
            // Sort by region then slot
            const regionOrder = ['South', 'East', 'West', 'Midwest', 'National'];
            const rA = regionOrder.indexOf(a.region);
            const rB = regionOrder.indexOf(b.region);
            if (rA !== rB) return rA - rB;
            return a.regionSlot - b.regionSlot;
          }),
      }))
      .filter(r => r.games.length > 0);

    const bracketData: BracketData = {
      rounds,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(bracketData, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('Bracket API error:', error);
    return NextResponse.json({ error: 'Failed to fetch bracket data' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

const ESPN_SUMMARY_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';

export interface Play {
  id: string;
  sequenceNumber: number;
  period: number;
  clock: string;          // e.g. "14:32"
  description: string;    // e.g. "John Smith makes 2-pt jumper"
  playType: string;       // e.g. "Field Goal", "Foul", "Timeout", etc.
  teamId: string | null;
  teamAbbrev: string | null;
  homeScore: number;
  awayScore: number;
  totalScore: number;
  scoringPlay: boolean;
  // Visual grouping helpers
  isHomeTeam: boolean | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  if (!gameId) {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${ESPN_SUMMARY_URL}?event=${gameId}`, {
      next: { revalidate: 0 },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ESPN API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Pull team IDs so we can label plays by home/away
    const header = data.header;
    const competition = header?.competitions?.[0];
    const competitors = competition?.competitors || [];
    const homeTeamId: string = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')?.id ?? '';
    const awayTeamId: string = competitors.find((c: { homeAway: string }) => c.homeAway === 'away')?.id ?? '';
    const homeTeamAbbrev: string = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')?.team?.abbreviation ?? '';
    const awayTeamAbbrev: string = competitors.find((c: { homeAway: string }) => c.homeAway === 'away')?.team?.abbreviation ?? '';

    const homeTeamName: string = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')?.team?.displayName ?? '';
    const awayTeamName: string = competitors.find((c: { homeAway: string }) => c.homeAway === 'away')?.team?.displayName ?? '';

    // Game status
    const status = competition?.status?.type?.state ?? 'pre';
    const period = competition?.status?.period ?? 0;
    const clock = competition?.status?.displayClock ?? '';

    // Current score
    const homeScore = parseInt(competitors.find((c: { homeAway: string }) => c.homeAway === 'home')?.score ?? '0') || 0;
    const awayScore = parseInt(competitors.find((c: { homeAway: string }) => c.homeAway === 'away')?.score ?? '0') || 0;

    // Parse plays array from ESPN
    const rawPlays: Play[] = [];
    for (const play of (data.plays || [])) {
      const playTeamId: string = play.team?.id ?? '';
      const isHome = playTeamId === homeTeamId ? true : playTeamId === awayTeamId ? false : null;
      const abbrev = isHome === true ? homeTeamAbbrev : isHome === false ? awayTeamAbbrev : null;

      const pHomeScore = parseInt(play.homeScore ?? play.homeTeamScore ?? '0') || 0;
      const pAwayScore = parseInt(play.awayScore ?? play.awayTeamScore ?? '0') || 0;

      rawPlays.push({
        id: play.id ?? String(play.sequenceNumber ?? rawPlays.length),
        sequenceNumber: play.sequenceNumber ?? rawPlays.length,
        period: play.period?.number ?? 1,
        clock: play.clock?.displayValue ?? play.clock?.value ?? '',
        description: play.text ?? play.description ?? '',
        playType: play.type?.text ?? 'Play',
        teamId: playTeamId || null,
        teamAbbrev: abbrev,
        homeScore: pHomeScore,
        awayScore: pAwayScore,
        totalScore: pHomeScore + pAwayScore,
        scoringPlay: play.scoringPlay === true || (play.scoreValue != null && play.scoreValue > 0),
        isHomeTeam: isHome,
      });
    }

    // Return most recent plays first (reverse chronological — newest at top)
    const plays = rawPlays
      .sort((a, b) => b.sequenceNumber - a.sequenceNumber)
      .slice(0, limit);

    return NextResponse.json({
      gameId,
      homeTeamName,
      awayTeamName,
      homeTeamAbbrev,
      awayTeamAbbrev,
      homeTeamId,
      awayTeamId,
      homeScore,
      awayScore,
      status,
      period,
      clock,
      plays,
      totalPlays: rawPlays.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching play-by-play:', error);
    return NextResponse.json(
      { error: 'Failed to fetch play-by-play', details: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getGameSnapshots, GameSnapshot } from '@/lib/queries/snapshots';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'gameId required' }, { status: 400 });
  }

  try {
    const data = await getGameSnapshots(gameId);

    // Transform data for charting - track line movement over game time
    const snapshots = data || [];

    // Group by approximate game time (minutes remaining)
    const timelineData = snapshots.map((s) => ({
      time: s.created_at,
      minutesRemaining: s.minutes_remaining,
      period: s.period,
      clock: s.clock,
      homeScore: s.home_score,
      awayScore: s.away_score,
      liveTotal: s.live_total,
      ouLine: s.ou_line,
      requiredPPM: s.required_ppm,
      currentPPM: s.current_ppm,
      isUnderTriggered: s.is_under_triggered,
      isOverTriggered: s.is_over_triggered,
    }));

    return NextResponse.json({
      gameId,
      homeTeam: snapshots[0]?.home_team || 'Unknown',
      awayTeam: snapshots[0]?.away_team || 'Unknown',
      snapshotCount: snapshots.length,
      timeline: timelineData,
    });
  } catch (err) {
    console.error('Error in game-snapshots API:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

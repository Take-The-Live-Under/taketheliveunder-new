import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, GameSnapshot } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'gameId required' }, { status: 400 });
  }

  const client = getSupabase();
  if (!client) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await client
      .from('game_snapshots')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching game snapshots:', error);
      return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
    }

    // Transform data for charting - track line movement over game time
    const snapshots: GameSnapshot[] = data || [];

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

import { db } from '../db';
import { gameSnapshots } from '../schema';
import { eq } from 'drizzle-orm';

export interface GameSnapshot {
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  live_total: number;
  ou_line: number | null;
  current_ppm: number | null;
  required_ppm: number | null;
  ppm_difference: number | null;
  minutes_remaining: number;
  period: number;
  clock: string;
  status: string;
  is_under_triggered: boolean;
  is_over_triggered: boolean;
}

export async function logGameSnapshots(snapshots: GameSnapshot[]): Promise<void> {
  if (snapshots.length === 0) return;

  try {
    const values = snapshots.map(s => ({
      gameId: s.game_id,
      homeTeam: s.home_team,
      awayTeam: s.away_team,
      homeScore: s.home_score,
      awayScore: s.away_score,
      liveTotal: s.live_total,
      ouLine: s.ou_line,
      currentPpm: s.current_ppm,
      requiredPpm: s.required_ppm,
      ppmDifference: s.ppm_difference,
      minutesRemaining: s.minutes_remaining,
      period: s.period,
      clock: s.clock,
      status: s.status,
      isUnderTriggered: s.is_under_triggered,
      isOverTriggered: s.is_over_triggered,
    }));
    
    await db.insert(gameSnapshots).values(values);
  } catch (err) {
    console.error('Failed to log game snapshots:', err);
  }
}

export async function getGameSnapshots(gameId: string) {
  try {
    const data = await db.query.gameSnapshots.findMany({
      where: eq(gameSnapshots.gameId, gameId),
      orderBy: (gameSnapshots, { asc }) => [asc(gameSnapshots.createdAt)],
    });

    return data.map((s: any) => ({
      game_id: s.gameId,
      home_team: s.homeTeam,
      away_team: s.awayTeam,
      home_score: s.homeScore,
      away_score: s.awayScore,
      live_total: s.liveTotal,
      ou_line: s.ouLine,
      current_ppm: s.currentPpm,
      required_ppm: s.requiredPpm,
      ppm_difference: s.ppmDifference,
      minutes_remaining: s.minutesRemaining,
      period: s.period,
      clock: s.clock,
      status: s.status,
      is_under_triggered: s.isUnderTriggered,
      is_over_triggered: s.isOverTriggered,
      created_at: s.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error('Failed to fetch game snapshots:', err);
    return [];
  }
}

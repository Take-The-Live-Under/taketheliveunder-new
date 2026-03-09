import { db } from '../db';
import { triggerLogs } from '../schema';
import { desc, gte, eq, and } from 'drizzle-orm';

export interface TriggerLog {
  id?: string;
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  live_total: number;
  ou_line: number;
  required_ppm: number;
  current_ppm: number;
  ppm_difference: number;
  minutes_remaining: number;
  period: number;
  clock: string;
  trigger_strength: string;
  trigger_type: 'under' | 'over' | 'tripleDipper';
  created_at?: string;
}

export async function logTrigger(trigger: TriggerLog): Promise<void> {
  try {
    await db.insert(triggerLogs).values({
      gameId: trigger.game_id,
      homeTeam: trigger.home_team,
      awayTeam: trigger.away_team,
      homeScore: trigger.home_score,
      awayScore: trigger.away_score,
      liveTotal: trigger.live_total,
      ouLine: trigger.ou_line,
      requiredPpm: trigger.required_ppm,
      currentPpm: trigger.current_ppm,
      ppmDifference: trigger.ppm_difference,
      minutesRemaining: trigger.minutes_remaining,
      period: trigger.period,
      clock: trigger.clock,
      triggerStrength: trigger.trigger_strength,
      triggerType: trigger.trigger_type,
    });
  } catch (err) {
    console.error('Failed to log trigger:', err);
  }
}

export async function getTriggerLogs(limit = 100) {
  try {
    const logs = await db.query.triggerLogs.findMany({
      orderBy: [desc(triggerLogs.createdAt)],
      limit: limit,
    });
    
    return logs.map(log => ({
      id: log.id,
      created_at: log.createdAt.toISOString(),
      game_id: log.gameId,
      home_team: log.homeTeam,
      away_team: log.awayTeam,
      home_score: log.homeScore,
      away_score: log.awayScore,
      live_total: log.liveTotal,
      ou_line: log.ouLine,
      required_ppm: log.requiredPpm,
      current_ppm: log.currentPpm,
      ppm_difference: log.ppmDifference,
      minutes_remaining: log.minutesRemaining,
      period: log.period,
      clock: log.clock,
      trigger_strength: log.triggerStrength,
      trigger_type: log.triggerType,
    }));
  } catch (err) {
    console.error('Failed to fetch trigger logs:', err);
    return [];
  }
}

export async function hasBeenLoggedRecently(gameId: string, minutesRemaining: number): Promise<boolean> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentLogs = await db.query.triggerLogs.findMany({
      columns: {
        id: true,
        minutesRemaining: true,
      },
      where: and(
        eq(triggerLogs.gameId, gameId),
        gte(triggerLogs.createdAt, fiveMinutesAgo)
      ),
      limit: 1,
    });

    if (recentLogs.length > 0) {
      const diff = Math.abs(recentLogs[0].minutesRemaining - minutesRemaining);
      return diff < 2; // Don't log again if within 2 minutes of game time
    }

    return false;
  } catch (err) {
    console.error('Failed to check recent logs:', err);
    return false;
  }
}

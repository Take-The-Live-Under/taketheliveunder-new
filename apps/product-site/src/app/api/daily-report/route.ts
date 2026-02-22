import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, TriggerLog } from '@/lib/supabase';

const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';

// Parse date string (YYYY-MM-DD) to get ESPN date format (YYYYMMDD)
function getESPNDateStr(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

// Get date range for Supabase query from a specific date (US Eastern timezone)
// Games are played in US timezones, so we need to query based on Eastern time
function getDateRange(dateStr: string): { start: string; end: string } {
  // Parse as US Eastern time - games from "Feb 4" means Feb 4 6am ET to Feb 5 6am ET
  // This captures evening games that get stored as next day in UTC
  // 6am ET = 11:00 UTC (standard) or 10:00 UTC (daylight)

  // Create date at 6am Eastern (covers full game day including late night games)
  const startDate = new Date(`${dateStr}T06:00:00-05:00`); // 6am EST
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1); // Next day 6am EST

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

interface TriggerEntry {
  triggerTime: string;
  triggerMinutesRemaining: number;
  triggerScore: number;
  triggerStrength: string;
  triggerType: 'under' | 'over' | 'tripleDipper';
  ouLine: number;
}

interface GameResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  finalHomeScore: number;
  finalAwayScore: number;
  finalTotal: number;
  ouLine: number;
  result: 'under' | 'over' | 'push';
  margin: number; // Positive = under, Negative = over
  triggerTime: string;
  triggerMinutesRemaining: number;
  triggerScore: number;
  triggerStrength: string;
  triggerType: 'under' | 'over' | 'tripleDipper';
  isWin: boolean; // Whether this trigger was a win based on its type
  allTriggers: TriggerEntry[]; // All triggers for this game (for graph display)
}

interface DailyReport {
  reportDate: string;
  generatedAt: string;
  summary: {
    totalTriggered: number; // Total individual triggers (bets)
    uniqueGames: number; // Number of unique games that triggered
    totalUnders: number;
    totalOvers: number;
    winRate: number;
    avgMargin: number;
    biggestWin: GameResult | null;
    // Trigger type counts
    underTriggers: number;
    overTriggers: number;
    tripleDipperTriggers: number;
    // Win rates by type
    underWinRate: number;
    overWinRate: number;
    tripleDipperWinRate: number;
  };
  topPerformers: GameResult[]; // Games that went most under
  allResults: GameResult[];
}

// Get yesterday's date in YYYY-MM-DD format
function getYesterdayDateStr(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Fetch final scores from ESPN for a specific date
async function fetchFinalScores(dateStr: string): Promise<Map<string, { home: number; away: number }>> {
  const scores = new Map<string, { home: number; away: number }>();

  try {
    const response = await fetch(`${ESPN_SCOREBOARD_URL}?dates=${dateStr}&limit=500&groups=50`, {
      next: { revalidate: 0 },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('ESPN API error:', response.status);
      return scores;
    }

    const data = await response.json();
    const events = data.events || [];

    for (const event of events) {
      const status = event.status?.type?.state;
      if (status !== 'post') continue; // Only completed games

      const competition = event.competitions?.[0];
      const competitors = competition?.competitors || [];

      const homeComp = competitors.find((c: { homeAway: string }) => c.homeAway === 'home');
      const awayComp = competitors.find((c: { homeAway: string }) => c.homeAway === 'away');

      if (homeComp && awayComp) {
        scores.set(event.id, {
          home: parseInt(homeComp.score || '0', 10),
          away: parseInt(awayComp.score || '0', 10),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching ESPN scores:', error);
  }

  return scores;
}

// Get triggered games for a specific date (all trigger types)
async function getTriggersForDate(dateStr: string): Promise<TriggerLog[]> {
  const client = getSupabase();
  if (!client) return [];

  const { start, end } = getDateRange(dateStr);

  try {
    const { data, error } = await client
      .from('trigger_logs')
      .select('*')
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching triggers:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to fetch triggers:', err);
    return [];
  }
}

// Group triggers by game - returns map of gameId to all triggers for that game
function groupTriggersByGame(triggers: TriggerLog[]): Map<string, TriggerLog[]> {
  const gameMap = new Map<string, TriggerLog[]>();

  for (const trigger of triggers) {
    const existing = gameMap.get(trigger.game_id) || [];
    existing.push(trigger);
    gameMap.set(trigger.game_id, existing);
  }

  // Sort each game's triggers by minutes remaining (descending - earliest first)
  Array.from(gameMap.entries()).forEach(([gameId, gameTriggers]) => {
    gameMap.set(gameId, gameTriggers.sort((a, b) => b.minutes_remaining - a.minutes_remaining));
  });

  return gameMap;
}

// Determine if a trigger is a win based on its type and game result
function isTriggerWin(triggerType: 'under' | 'over' | 'tripleDipper', gameResult: 'under' | 'over' | 'push'): boolean {
  if (triggerType === 'under' || triggerType === 'tripleDipper') {
    return gameResult === 'under';
  } else if (triggerType === 'over') {
    return gameResult === 'over';
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    // Get date from query param, default to yesterday
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const reportDate = dateParam || getYesterdayDateStr();
    const espnDateStr = getESPNDateStr(reportDate);

    // Fetch triggered games for the specified date
    const allTriggers = await getTriggersForDate(reportDate);
    const triggersByGame = groupTriggersByGame(allTriggers);

    if (triggersByGame.size === 0) {
      return NextResponse.json({
        reportDate,
        generatedAt: new Date().toISOString(),
        summary: {
          totalTriggered: 0,
          uniqueGames: 0,
          totalUnders: 0,
          totalOvers: 0,
          winRate: 0,
          avgMargin: 0,
          biggestWin: null,
          underTriggers: 0,
          overTriggers: 0,
          tripleDipperTriggers: 0,
          underWinRate: 0,
          overWinRate: 0,
          tripleDipperWinRate: 0,
        },
        topPerformers: [],
        allResults: [],
        message: 'No triggers found for this date',
      });
    }

    // Fetch final scores from ESPN
    const finalScores = await fetchFinalScores(espnDateStr);

    // Match triggers with final scores - COUNT EACH TRIGGER AS A SEPARATE BET
    const results: GameResult[] = [];

    for (const [gameId, gameTriggers] of Array.from(triggersByGame.entries())) {
      const finalScore = finalScores.get(gameId);
      if (!finalScore) continue; // Game not found or not finished

      const finalTotal = finalScore.home + finalScore.away;

      // Build all triggers for this game (for graph display)
      const allTriggersForGame: TriggerEntry[] = gameTriggers.map(t => ({
        triggerTime: t.created_at || '',
        triggerMinutesRemaining: t.minutes_remaining,
        triggerScore: t.live_total,
        triggerStrength: t.trigger_strength,
        triggerType: t.trigger_type,
        ouLine: t.ou_line,
      }));

      // Create a result for EACH trigger (each trigger = one bet)
      for (const trigger of gameTriggers) {
        const margin = trigger.ou_line - finalTotal; // Positive = under
        const gameResult = margin > 0 ? 'under' : margin < 0 ? 'over' : 'push';

        results.push({
          gameId: trigger.game_id,
          homeTeam: trigger.home_team,
          awayTeam: trigger.away_team,
          finalHomeScore: finalScore.home,
          finalAwayScore: finalScore.away,
          finalTotal,
          ouLine: trigger.ou_line,
          result: gameResult,
          margin,
          triggerTime: trigger.created_at || '',
          triggerMinutesRemaining: trigger.minutes_remaining,
          triggerScore: trigger.live_total,
          triggerStrength: trigger.trigger_strength,
          triggerType: trigger.trigger_type,
          isWin: isTriggerWin(trigger.trigger_type, gameResult),
          allTriggers: allTriggersForGame,
        });
      }
    }

    // Calculate summary stats
    const unders = results.filter(r => r.result === 'under');
    const overs = results.filter(r => r.result === 'over');

    // Overall win rate is based on trigger type (not just unders)
    const wins = results.filter(r => r.isWin);
    const winRate = results.length > 0 ? (wins.length / results.length) * 100 : 0;

    const avgMargin = results.length > 0
      ? results.reduce((sum, r) => sum + r.margin, 0) / results.length
      : 0;

    // Count by trigger type
    const underTriggers = results.filter(r => r.triggerType === 'under');
    const overTriggers = results.filter(r => r.triggerType === 'over');
    const tripleDipperTriggers = results.filter(r => r.triggerType === 'tripleDipper');

    // Win rates by trigger type (using isWin which is already calculated correctly)
    const underWins = underTriggers.filter(r => r.isWin);
    const underWinRate = underTriggers.length > 0 ? (underWins.length / underTriggers.length) * 100 : 0;

    const overWins = overTriggers.filter(r => r.isWin);
    const overWinRate = overTriggers.length > 0 ? (overWins.length / overTriggers.length) * 100 : 0;

    const tripleDipperWins = tripleDipperTriggers.filter(r => r.isWin);
    const tripleDipperWinRate = tripleDipperTriggers.length > 0 ? (tripleDipperWins.length / tripleDipperTriggers.length) * 100 : 0;

    // Sort by margin descending (biggest unders first for the main list)
    const sortedByMargin = [...results].sort((a, b) => b.margin - a.margin);

    // Top performers are the biggest wins (positive margin of victory)
    // For under/triple triggers: higher positive margin = better
    // For over triggers: higher negative margin (inverted) = better
    const topPerformers = results
      .filter(r => r.isWin)
      .map(r => ({
        ...r,
        // For display, show the "margin of victory" as positive
        displayMargin: r.triggerType === 'over' ? Math.abs(r.margin) : r.margin
      }))
      .sort((a, b) => b.displayMargin - a.displayMargin)
      .slice(0, 5)
      .map(r => {
        // Remove the temporary displayMargin field
        const { displayMargin, ...game } = r;
        return game;
      });
    const biggestWin = topPerformers[0] || null;

    const report: DailyReport = {
      reportDate,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTriggered: results.length, // Each trigger = one bet
        uniqueGames: triggersByGame.size, // Number of distinct games
        totalUnders: unders.length,
        totalOvers: overs.length,
        winRate: Math.round(winRate * 10) / 10,
        avgMargin: Math.round(avgMargin * 10) / 10,
        biggestWin,
        underTriggers: underTriggers.length,
        overTriggers: overTriggers.length,
        tripleDipperTriggers: tripleDipperTriggers.length,
        underWinRate: Math.round(underWinRate * 10) / 10,
        overWinRate: Math.round(overWinRate * 10) / 10,
        tripleDipperWinRate: Math.round(tripleDipperWinRate * 10) / 10,
      },
      topPerformers,
      allResults: sortedByMargin,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: String(error) },
      { status: 500 }
    );
  }
}

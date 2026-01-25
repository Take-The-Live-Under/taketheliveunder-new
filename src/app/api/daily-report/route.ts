import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, TriggerLog } from '@/lib/supabase';

const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';

// Parse date string (YYYY-MM-DD) to get ESPN date format (YYYYMMDD)
function getESPNDateStr(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

// Get date range for Supabase query from a specific date
function getDateRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr + 'T00:00:00');
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  return {
    start: date.toISOString(),
    end: nextDay.toISOString(),
  };
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
}

interface DailyReport {
  reportDate: string;
  generatedAt: string;
  summary: {
    totalTriggered: number;
    totalUnders: number;
    totalOvers: number;
    winRate: number;
    avgMargin: number;
    biggestWin: GameResult | null;
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

// Get triggered games for a specific date
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
      .eq('trigger_type', 'under') // Focus on under triggers (Golden Zone)
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

// Deduplicate triggers - keep earliest trigger per game
function deduplicateTriggers(triggers: TriggerLog[]): TriggerLog[] {
  const gameMap = new Map<string, TriggerLog>();

  for (const trigger of triggers) {
    const existing = gameMap.get(trigger.game_id);
    if (!existing || trigger.minutes_remaining > existing.minutes_remaining) {
      // Keep the earlier trigger (more minutes remaining)
      gameMap.set(trigger.game_id, trigger);
    }
  }

  return Array.from(gameMap.values());
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
    const triggers = deduplicateTriggers(allTriggers);

    if (triggers.length === 0) {
      return NextResponse.json({
        reportDate,
        generatedAt: new Date().toISOString(),
        summary: {
          totalTriggered: 0,
          totalUnders: 0,
          totalOvers: 0,
          winRate: 0,
          avgMargin: 0,
          biggestWin: null,
        },
        topPerformers: [],
        allResults: [],
        message: 'No triggers found for yesterday',
      });
    }

    // Fetch final scores from ESPN
    const finalScores = await fetchFinalScores(espnDateStr);

    // Match triggers with final scores
    const results: GameResult[] = [];

    for (const trigger of triggers) {
      const finalScore = finalScores.get(trigger.game_id);
      if (!finalScore) continue; // Game not found or not finished

      const finalTotal = finalScore.home + finalScore.away;
      const margin = trigger.ou_line - finalTotal; // Positive = under
      const result = margin > 0 ? 'under' : margin < 0 ? 'over' : 'push';

      results.push({
        gameId: trigger.game_id,
        homeTeam: trigger.home_team,
        awayTeam: trigger.away_team,
        finalHomeScore: finalScore.home,
        finalAwayScore: finalScore.away,
        finalTotal,
        ouLine: trigger.ou_line,
        result,
        margin,
        triggerTime: trigger.created_at || '',
        triggerMinutesRemaining: trigger.minutes_remaining,
        triggerScore: trigger.live_total,
        triggerStrength: trigger.trigger_strength,
      });
    }

    // Calculate summary stats
    const unders = results.filter(r => r.result === 'under');
    const overs = results.filter(r => r.result === 'over');
    const winRate = results.length > 0 ? (unders.length / results.length) * 100 : 0;
    const avgMargin = results.length > 0
      ? results.reduce((sum, r) => sum + r.margin, 0) / results.length
      : 0;

    // Sort by margin descending (biggest unders first)
    const sortedByMargin = [...results].sort((a, b) => b.margin - a.margin);
    const topPerformers = sortedByMargin.filter(r => r.result === 'under').slice(0, 5);
    const biggestWin = topPerformers[0] || null;

    const report: DailyReport = {
      reportDate,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTriggered: results.length,
        totalUnders: unders.length,
        totalOvers: overs.length,
        winRate: Math.round(winRate * 10) / 10,
        avgMargin: Math.round(avgMargin * 10) / 10,
        biggestWin,
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

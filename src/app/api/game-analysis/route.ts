import { NextRequest, NextResponse } from 'next/server';

const ESPN_PLAYBYPLAY_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';

interface Play {
  period: number;
  clock: string;
  text: string;
  scoreValue?: number;
  team?: { id: string };
  scoringPlay?: boolean;
}

interface QuarterScoring {
  period: number;
  periodName: string;
  homePoints: number;
  awayPoints: number;
  totalPoints: number;
  ppm: number; // Points per minute in this period
}

interface ScoringRun {
  startTime: string;
  endTime: string;
  period: number;
  points: number;
  duration: number; // in seconds
  description: string;
}

interface LossAnalysis {
  gameId: string;
  wentToOT: boolean;
  otPeriods: number;
  quarterScoring: QuarterScoring[];
  biggestScoringRun: ScoringRun | null;
  finalMinutePoints: number;
  freeThrowsInFinal2Min: number;
  summary: string;
  factors: string[];
}

function parseClockToSeconds(clock: string, periodMinutes: number = 20): number {
  const parts = clock.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
}

function analyzePlays(plays: Play[], homeTeamId: string): {
  quarterScoring: QuarterScoring[];
  biggestRun: ScoringRun | null;
  finalMinutePoints: number;
  freeThrowsInFinal2Min: number;
} {
  const quarterScoring: QuarterScoring[] = [];
  const periodPoints: Record<number, { home: number; away: number }> = {};

  let finalMinutePoints = 0;
  let freeThrowsInFinal2Min = 0;

  // Track scoring runs
  let currentRun: { points: number; startTime: string; startPeriod: number; lastTime: string } | null = null;
  let biggestRun: ScoringRun | null = null;

  for (const play of plays) {
    const period = play.period || 1;

    if (!periodPoints[period]) {
      periodPoints[period] = { home: 0, away: 0 };
    }

    if (play.scoringPlay && play.scoreValue) {
      const isHome = play.team?.id === homeTeamId;
      if (isHome) {
        periodPoints[period].home += play.scoreValue;
      } else {
        periodPoints[period].away += play.scoreValue;
      }

      // Track scoring runs (consecutive scoring)
      if (!currentRun) {
        currentRun = {
          points: play.scoreValue,
          startTime: play.clock,
          startPeriod: period,
          lastTime: play.clock
        };
      } else {
        currentRun.points += play.scoreValue;
        currentRun.lastTime = play.clock;
      }

      // Check for final 2 minutes scoring
      if (period === 2) { // 2nd half
        const seconds = parseClockToSeconds(play.clock);
        if (seconds <= 120) { // Last 2 minutes
          finalMinutePoints += play.scoreValue;
          if (play.text?.toLowerCase().includes('free throw')) {
            freeThrowsInFinal2Min += play.scoreValue;
          }
        }
      }

      // Check if this run is biggest
      if (currentRun && currentRun.points >= 10) {
        const startSec = parseClockToSeconds(currentRun.startTime);
        const endSec = parseClockToSeconds(currentRun.lastTime);
        const duration = startSec - endSec;

        if (!biggestRun || currentRun.points > biggestRun.points) {
          biggestRun = {
            startTime: currentRun.startTime,
            endTime: currentRun.lastTime,
            period: currentRun.startPeriod,
            points: currentRun.points,
            duration,
            description: `${currentRun.points}-0 run`
          };
        }
      }
    } else {
      // Reset run on non-scoring play (simplified)
      if (currentRun && currentRun.points >= 8) {
        const startSec = parseClockToSeconds(currentRun.startTime);
        const endSec = parseClockToSeconds(currentRun.lastTime);
        const duration = startSec - endSec;

        if (!biggestRun || currentRun.points > biggestRun.points) {
          biggestRun = {
            startTime: currentRun.startTime,
            endTime: currentRun.lastTime,
            period: currentRun.startPeriod,
            points: currentRun.points,
            duration,
            description: `${currentRun.points} point run`
          };
        }
      }
      currentRun = null;
    }
  }

  // Build quarter scoring summary
  for (const [periodStr, points] of Object.entries(periodPoints)) {
    const period = parseInt(periodStr);
    const periodMinutes = period <= 2 ? 20 : 5; // Regular halves are 20 min, OT is 5
    const totalPoints = points.home + points.away;

    quarterScoring.push({
      period,
      periodName: period === 1 ? '1st Half' : period === 2 ? '2nd Half' : `OT${period - 2}`,
      homePoints: points.home,
      awayPoints: points.away,
      totalPoints,
      ppm: totalPoints / periodMinutes
    });
  }

  return { quarterScoring, biggestRun, finalMinutePoints, freeThrowsInFinal2Min };
}

function generateSummary(analysis: Omit<LossAnalysis, 'summary' | 'factors'>, ouLine: number, finalTotal: number): { summary: string; factors: string[] } {
  const factors: string[] = [];
  const margin = finalTotal - ouLine;

  // Check for overtime
  if (analysis.wentToOT) {
    const otPoints = analysis.quarterScoring
      .filter(q => q.period > 2)
      .reduce((sum, q) => sum + q.totalPoints, 0);
    factors.push(`Overtime added ${otPoints} points`);
  }

  // Check for high-scoring period
  const highScoringPeriod = analysis.quarterScoring.find(q => q.ppm > 5);
  if (highScoringPeriod) {
    factors.push(`${highScoringPeriod.periodName} had ${highScoringPeriod.totalPoints} pts (${highScoringPeriod.ppm.toFixed(1)} PPM)`);
  }

  // Check 2nd half vs 1st half
  const firstHalf = analysis.quarterScoring.find(q => q.period === 1);
  const secondHalf = analysis.quarterScoring.find(q => q.period === 2);
  if (firstHalf && secondHalf && secondHalf.totalPoints > firstHalf.totalPoints + 15) {
    factors.push(`2nd half surge: ${secondHalf.totalPoints} pts vs ${firstHalf.totalPoints} in 1st`);
  }

  // Check final minutes
  if (analysis.finalMinutePoints > 15) {
    factors.push(`Final 2 min had ${analysis.finalMinutePoints} points`);
  }

  // Free throw frenzy
  if (analysis.freeThrowsInFinal2Min > 10) {
    factors.push(`Free throw frenzy: ${analysis.freeThrowsInFinal2Min} FT points in final 2 min`);
  }

  // Biggest run
  if (analysis.biggestScoringRun && analysis.biggestScoringRun.points >= 12) {
    factors.push(`Big run: ${analysis.biggestScoringRun.description} in ${analysis.biggestScoringRun.period === 1 ? '1st half' : analysis.biggestScoringRun.period === 2 ? '2nd half' : 'OT'}`);
  }

  // Generate summary
  let summary = '';
  if (factors.length === 0) {
    summary = `Game went over by ${margin.toFixed(1)} points. Steady scoring throughout with no single major factor.`;
  } else if (analysis.wentToOT) {
    summary = `Overtime was the killer - would have hit without OT.`;
  } else if (analysis.freeThrowsInFinal2Min > 10) {
    summary = `Free throw frenzy at the end pushed it over.`;
  } else if (highScoringPeriod) {
    summary = `${highScoringPeriod.periodName} scoring explosion (${highScoringPeriod.ppm.toFixed(1)} PPM) pushed it over.`;
  } else {
    summary = `Multiple factors contributed to going over by ${margin.toFixed(1)}.`;
  }

  return { summary, factors };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gameId = searchParams.get('gameId');
  const ouLine = parseFloat(searchParams.get('ouLine') || '0');
  const finalTotal = parseFloat(searchParams.get('finalTotal') || '0');

  if (!gameId) {
    return NextResponse.json({ error: 'gameId required' }, { status: 400 });
  }

  try {
    // Fetch play-by-play data from ESPN
    const response = await fetch(`${ESPN_PLAYBYPLAY_URL}?event=${gameId}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch game data' }, { status: 500 });
    }

    const data = await response.json();

    // Extract plays
    const plays: Play[] = [];
    const playByPlay = data.plays || [];

    for (const play of playByPlay) {
      plays.push({
        period: play.period?.number || 1,
        clock: play.clock?.displayValue || '0:00',
        text: play.text || '',
        scoreValue: play.scoreValue,
        team: play.team,
        scoringPlay: play.scoringPlay
      });
    }

    // Get home team ID
    const homeTeamId = data.boxscore?.teams?.find((t: { homeAway: string }) => t.homeAway === 'home')?.team?.id || '';

    // Check for overtime
    const maxPeriod = Math.max(...plays.map(p => p.period), 2);
    const wentToOT = maxPeriod > 2;
    const otPeriods = wentToOT ? maxPeriod - 2 : 0;

    // Analyze the plays
    const { quarterScoring, biggestRun, finalMinutePoints, freeThrowsInFinal2Min } = analyzePlays(plays, homeTeamId);

    const analysisBase: Omit<LossAnalysis, 'summary' | 'factors'> = {
      gameId,
      wentToOT,
      otPeriods,
      quarterScoring,
      biggestScoringRun: biggestRun,
      finalMinutePoints,
      freeThrowsInFinal2Min
    };

    const { summary, factors } = generateSummary(analysisBase, ouLine, finalTotal);

    const analysis: LossAnalysis = {
      ...analysisBase,
      summary,
      factors
    };

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('Error analyzing game:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { Game, BonusStatus } from '@/types/game';
import {
  calculateMinutesRemainingRegulation,
  calculateCurrentPPM,
  calculateRequiredPPM,
  calculateProjectedTotal,
  isOvertime,
  getTriggerType,
  isOverTriggered,
  parseClock,
  isInFoulGame,
  getFoulGameAdjustment,
  couldEnterFoulGame,
  getExpectedFoulGameAdjustment,
  TriggerType,
} from '@/lib/calculations';
import { logTrigger, hasBeenLoggedRecently, logGameSnapshots } from '@/lib/supabase';
import { analyzeMatchup } from '@/lib/allTeamFoulGameData';

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';
const ESPN_SUMMARY_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';
const ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/';

interface ESPNEvent {
  id: string;
  date: string;
  status: {
    type: {
      state: string;
      description: string;
    };
    period: number;
    displayClock: string;
  };
  competitions: Array<{
    competitors: Array<{
      homeAway: 'home' | 'away';
      team: {
        id: string;
        displayName: string;
        abbreviation: string;
      };
      score: string;
    }>;
  }>;
}

interface OddsAPIGame {
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        point?: number;
      }>;
    }>;
  }>;
}

interface GameBonusData {
  homeTeamFouls: number;  // Fouls committed BY home team (against away)
  awayTeamFouls: number;  // Fouls committed BY away team (against home)
  homeBonusStatus: BonusStatus;
  awayBonusStatus: BonusStatus;
}

/**
 * Calculate bonus status from fouls
 * NCAA: Bonus at 7 fouls per half, Double bonus at 10
 */
function calculateBonusStatus(fouls: number, isEstimated: boolean): BonusStatus {
  return {
    fouls,
    inBonus: fouls >= 7,
    inDoubleBonus: fouls >= 10,
    isEstimated,
  };
}

/**
 * Fetch bonus/foul data for a live game from ESPN summary API
 * Returns null if fetch fails or data unavailable
 */
async function fetchGameBonusData(gameId: string, currentPeriod: number): Promise<GameBonusData | null> {
  try {
    const response = await fetch(`${ESPN_SUMMARY_URL}?event=${gameId}`, {
      next: { revalidate: 0 },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const boxscoreTeams = data.boxscore?.teams || [];
    const plays = data.plays || [];

    // Get home team ID from header
    const header = data.header;
    const competition = header?.competitions?.[0];
    const competitors = competition?.competitors || [];
    const homeTeamId = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')?.id;

    // Find home and away team data
    let homeTeamTotalFouls = 0;
    let awayTeamTotalFouls = 0;

    for (const team of boxscoreTeams) {
      const stats = team.statistics || [];
      const foulsStr = stats.find((s: { name: string }) => s.name === 'fouls')?.displayValue || '0';
      const fouls = parseInt(foulsStr, 10) || 0;

      if (team.team?.id === homeTeamId) {
        homeTeamTotalFouls = fouls;
      } else {
        awayTeamTotalFouls = fouls;
      }
    }

    // For first half (period 1), total fouls = first half fouls
    // For second half (period 2+), we need to count fouls from plays
    let homeTeamCurrentHalfFouls = homeTeamTotalFouls;
    let awayTeamCurrentHalfFouls = awayTeamTotalFouls;
    let isEstimated = false;

    if (currentPeriod >= 2) {
      // Count fouls from plays for the current half
      // Foul play types include: Personal Foul, Shooting Foul, Offensive Foul, Technical Foul, etc.
      const foulPlayTypes = ['foul', 'personalfoul', 'shootingfoul', 'offensivefoul', 'technicalfoul', 'flagrantfoul'];

      let homeSecondHalfFouls = 0;
      let awaySecondHalfFouls = 0;

      for (const play of plays) {
        const playPeriod = play.period?.number || 1;
        if (playPeriod < 2) continue; // Skip first half plays

        const playType = (play.type?.text || '').toLowerCase().replace(/\s+/g, '');
        const isFoul = foulPlayTypes.some(ft => playType.includes(ft));

        if (isFoul) {
          // Determine which team committed the foul
          const teamId = play.team?.id;
          if (teamId === homeTeamId) {
            homeSecondHalfFouls++;
          } else if (teamId) {
            awaySecondHalfFouls++;
          }
        }
      }

      // If we found plays, use the counted fouls
      if (plays.length > 0) {
        homeTeamCurrentHalfFouls = homeSecondHalfFouls;
        awayTeamCurrentHalfFouls = awaySecondHalfFouls;
      } else {
        // Fallback: can't determine accurately, mark as estimated
        isEstimated = true;
        // Conservative estimate: assume even distribution between halves
        homeTeamCurrentHalfFouls = Math.max(0, Math.floor(homeTeamTotalFouls / 2));
        awayTeamCurrentHalfFouls = Math.max(0, Math.floor(awayTeamTotalFouls / 2));
      }
    }

    return {
      homeTeamFouls: homeTeamCurrentHalfFouls,
      awayTeamFouls: awayTeamCurrentHalfFouls,
      // Bonus status is based on OPPONENT's fouls (your team gets free throws when opponent fouls)
      homeBonusStatus: calculateBonusStatus(awayTeamCurrentHalfFouls, isEstimated),
      awayBonusStatus: calculateBonusStatus(homeTeamCurrentHalfFouls, isEstimated),
    };
  } catch (error) {
    console.error(`Error fetching bonus data for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Normalize team names for matching between ESPN and Odds API
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(boilermakers|badgers|fighting illini|nittany lions|gators|tigers|wildcats|bulldogs|huskies|bears|longhorns|sooners|cowboys|aggies|jayhawks|cyclones|mountaineers|red raiders|horned frogs|baylor|razorbacks|rebels|volunteers|commodores|gamecocks|crimson tide|war eagles|dawgs|seminoles|hurricanes|cavaliers|hokies|wolfpack|tar heels|blue devils|cardinals|panthers|orange|red storm|hoyas|friars|musketeers|bluejays|pirates|golden eagles|marquette|depauls|demon deacons|yellow jackets|hokies|49ers|shockers|wolf pack)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match ESPN team name to Odds API team name
 */
function teamsMatch(espnName: string, oddsName: string): boolean {
  const espnNorm = normalizeTeamName(espnName);
  const oddsNorm = normalizeTeamName(oddsName);

  // Direct match
  if (espnNorm === oddsNorm) return true;

  // Partial match (one contains the other)
  if (espnNorm.includes(oddsNorm) || oddsNorm.includes(espnNorm)) return true;

  // Check if main part of name matches
  const espnParts = espnNorm.split(' ');
  const oddsParts = oddsNorm.split(' ');

  // Match on first word (school name)
  if (espnParts[0] === oddsParts[0]) return true;

  return false;
}

/**
 * Extract O/U line from bookmakers, preferring FanDuel
 */
function extractOULine(bookmakers: OddsAPIGame['bookmakers']): number | null {
  if (!bookmakers || bookmakers.length === 0) return null;

  // Prefer FanDuel
  const fanduel = bookmakers.find((b) => b.key === 'fanduel');
  const bookToUse = fanduel || bookmakers[0];

  const totalsMarket = bookToUse.markets.find((m) => m.key === 'totals');
  if (!totalsMarket || !totalsMarket.outcomes || totalsMarket.outcomes.length === 0) {
    return null;
  }

  const overOutcome = totalsMarket.outcomes.find((o) => o.name === 'Over');
  return overOutcome?.point ?? null;
}

// Get current date in US Eastern timezone
function getUSEasternDate(): Date {
  const now = new Date();
  // Convert to US Eastern time string, then parse back
  const easternStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(easternStr);
}

// Format date as YYYYMMDD for ESPN API (using US Eastern time)
function formatDateForESPN(date: Date): string {
  // Use US Eastern timezone for formatting
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD format
  const formatted = formatter.format(date);
  return formatted.replace(/-/g, ''); // Remove dashes to get YYYYMMDD
}

// Check if a date is tomorrow (in US Eastern time)
function isTomorrow(dateStr: string): boolean {
  const gameDate = new Date(dateStr);
  const eastern = getUSEasternDate();
  const tomorrow = new Date(eastern);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Compare just the date portions in Eastern time
  const gameDateEastern = new Date(gameDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return gameDateEastern.toDateString() === tomorrow.toDateString();
}

// Check if a date is today (in US Eastern time)
function isToday(dateStr: string): boolean {
  const gameDate = new Date(dateStr);
  const eastern = getUSEasternDate();

  // Compare just the date portions in Eastern time
  const gameDateEastern = new Date(gameDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return gameDateEastern.toDateString() === eastern.toDateString();
}

// Get trigger strength label based on required PPM
function getTriggerStrength(requiredPPM: number | null): string {
  if (requiredPPM === null || requiredPPM < 4.5) return 'NONE';
  const strength = Math.min(((requiredPPM - 4.5) / 1.5) * 100, 100);
  if (strength >= 80) return 'STRONG';
  if (strength >= 50) return 'GOOD';
  return 'MODERATE';
}

export async function GET() {
  try {
    const oddsApiKey = process.env.ODDS_API_KEY;

    // Get today and tomorrow dates for ESPN API (in US Eastern time)
    const today = new Date();
    const easternToday = getUSEasternDate();
    const easternTomorrow = new Date(easternToday);
    easternTomorrow.setDate(easternTomorrow.getDate() + 1);

    const todayStr = formatDateForESPN(today);
    const tomorrowStr = formatDateForESPN(easternTomorrow);

    // Fetch today's ESPN games
    const espnResponse = await fetch(`${ESPN_URL}?limit=500&groups=50&dates=${todayStr}`, {
      next: { revalidate: 0 },
      cache: 'no-store'
    });

    if (!espnResponse.ok) {
      throw new Error(`ESPN API error: ${espnResponse.status}`);
    }

    const espnData = await espnResponse.json();
    let espnEvents: ESPNEvent[] = espnData.events || [];

    // Check if there are any upcoming games today
    const hasUpcomingToday = espnEvents.some(
      (e) => e.status?.type?.state === 'pre' && isToday(e.date)
    );

    // If no upcoming games today, also fetch tomorrow's games
    if (!hasUpcomingToday) {
      try {
        const tomorrowResponse = await fetch(`${ESPN_URL}?limit=500&groups=50&dates=${tomorrowStr}`, {
          next: { revalidate: 0 },
          cache: 'no-store'
        });

        if (tomorrowResponse.ok) {
          const tomorrowData = await tomorrowResponse.json();
          const tomorrowEvents: ESPNEvent[] = tomorrowData.events || [];
          // Add tomorrow's games to the list
          espnEvents = [...espnEvents, ...tomorrowEvents];
        }
      } catch (error) {
        console.error('Error fetching tomorrow games:', error);
      }
    }

    // Fetch odds if API key is available
    let oddsGames: OddsAPIGame[] = [];
    if (oddsApiKey) {
      try {
        // Add timestamp to bust any caching and get fresh live lines
        const timestamp = Date.now();
        const oddsResponse = await fetch(
          `${ODDS_API_URL}?apiKey=${oddsApiKey}&regions=us&markets=totals&oddsFormat=american&_t=${timestamp}`,
          {
            next: { revalidate: 0 },
            cache: 'no-store'
          }
        );

        if (oddsResponse.ok) {
          oddsGames = await oddsResponse.json();
        }
      } catch (error) {
        console.error('Error fetching odds:', error);
      }
    }

    // Create odds lookup map
    const oddsMap = new Map<string, number | null>();
    for (const oddsGame of oddsGames) {
      const key = `${normalizeTeamName(oddsGame.away_team)}|${normalizeTeamName(oddsGame.home_team)}`;
      oddsMap.set(key, extractOULine(oddsGame.bookmakers));
    }

    // Transform ESPN events to Game objects
    const games: Game[] = espnEvents.map((event) => {
      const status = event.status?.type?.state || 'pre';
      const period = event.status?.period || 0;
      const clockStr = event.status?.displayClock || '20:00';

      const competition = event.competitions?.[0];
      const competitors = competition?.competitors || [];

      const homeComp = competitors.find((c) => c.homeAway === 'home');
      const awayComp = competitors.find((c) => c.homeAway === 'away');

      const homeTeam = homeComp?.team?.displayName || 'Unknown';
      const awayTeam = awayComp?.team?.displayName || 'Unknown';
      const homeTeamId = homeComp?.team?.id || '';
      const awayTeamId = awayComp?.team?.id || '';
      const homeScore = parseInt(homeComp?.score || '0', 10);
      const awayScore = parseInt(awayComp?.score || '0', 10);
      const liveTotal = homeScore + awayScore;

      const [clockMinutes, clockSeconds] = parseClock(clockStr);

      const isOT = isOvertime(period);
      const minutesRemainingReg = isOT
        ? 0
        : calculateMinutesRemainingRegulation(period, clockMinutes, clockSeconds);

      const currentPPM = calculateCurrentPPM(liveTotal, minutesRemainingReg);

      // Find O/U line from odds data
      let ouLine: number | null = null;
      const oddsEntries = Array.from(oddsMap.entries());
      for (let i = 0; i < oddsEntries.length; i++) {
        const [key, line] = oddsEntries[i];
        const parts = key.split('|');
        const oddsAway = parts[0];
        const oddsHome = parts[1];
        if (teamsMatch(awayTeam, oddsAway) && teamsMatch(homeTeam, oddsHome)) {
          ouLine = line;
          break;
        }
      }

      const requiredPPM = calculateRequiredPPM(liveTotal, ouLine, minutesRemainingReg);

      // Calculate trigger type using new unified logic
      const triggerType: TriggerType = getTriggerType(status, minutesRemainingReg, currentPPM, requiredPPM, isOT);

      // triggeredFlag = true for UNDER or TRIPLE DIPPER (legacy compatibility)
      const triggeredFlag = triggerType === 'under' || triggerType === 'tripleDipper';
      // overTriggeredFlag = true for OVER trigger
      const overTriggeredFlag = triggerType === 'over';

      // Calculate foul game adjustment
      const pointDiff = Math.abs(homeScore - awayScore);
      const inFoulGame = status === 'in' && isInFoulGame(period, clockMinutes, clockSeconds, pointDiff);
      const couldEnterFoul = status === 'in' && couldEnterFoulGame(period, clockMinutes, clockSeconds, pointDiff);

      // Check team-specific foul game tendencies (now with data on 358 teams)
      const matchupAnalysis = analyzeMatchup(homeTeam, awayTeam);

      // Team-specific extra impact (on top of base adjustment)
      const teamFoulGameImpact = matchupAnalysis.combinedImpact;

      // Calculate foul game adjustment - show it earlier when game could enter foul territory
      let foulGameAdjustment: number | null = null;
      if (inFoulGame) {
        // Actually in foul game - use exact adjustment
        const baseAdj = getFoulGameAdjustment(pointDiff);
        foulGameAdjustment = baseAdj !== null ? baseAdj + teamFoulGameImpact : null;
      } else if (couldEnterFoul) {
        // Could enter foul game soon - show expected adjustment
        const expectedAdj = getExpectedFoulGameAdjustment(pointDiff);
        foulGameAdjustment = expectedAdj + teamFoulGameImpact;
      }

      // Foul game warning: show when game could enter foul territory (up to 5 min out)
      const secondsRemaining = clockMinutes * 60 + clockSeconds;
      const hasTeamData = matchupAnalysis.homeData !== null || matchupAnalysis.awayData !== null;
      const foulGameWarning = couldEnterFoul && hasTeamData && matchupAnalysis.warningLevel !== 'none';

      // Calculate adjusted projected total with half-based scoring adjustment
      // Second half typically scores ~9% more than first half
      let adjustedProjectedTotal: number | null = null;
      if (currentPPM !== null && minutesRemainingReg > 0) {
        // Use half-adjusted projection (accounts for higher 2nd half scoring)
        const baseProjected = calculateProjectedTotal(liveTotal, minutesRemainingReg, period);

        if ((inFoulGame || couldEnterFoul) && foulGameAdjustment !== null) {
          adjustedProjectedTotal = baseProjected + foulGameAdjustment;
        } else {
          adjustedProjectedTotal = baseProjected;
        }
        adjustedProjectedTotal = Math.round(adjustedProjectedTotal * 10) / 10;
      }

      return {
        id: event.id,
        startTime: event.date,
        status: status as 'pre' | 'in' | 'post',
        period,
        clock: clockStr,
        minutesRemainingReg: Math.round(minutesRemainingReg * 100) / 100,
        awayTeam,
        homeTeam,
        awayTeamId,
        homeTeamId,
        awayScore,
        homeScore,
        liveTotal,
        ouLine,
        currentPPM: currentPPM !== null ? Math.round(currentPPM * 100) / 100 : null,
        requiredPPM: requiredPPM !== null ? Math.round(requiredPPM * 100) / 100 : null,
        triggeredFlag,
        overTriggeredFlag,
        triggerType,
        isOvertime: isOT,
        isTomorrow: isTomorrow(event.date),
        inFoulGame,
        couldEnterFoulGame: couldEnterFoul,
        foulGameAdjustment: foulGameAdjustment !== null ? Math.round(foulGameAdjustment * 10) / 10 : null,
        adjustedProjectedTotal,
        foulGameWarning,
        foulGameWarningMessage: foulGameWarning && matchupAnalysis.combinedImpact > 0
          ? `Expect +${(5.8 + matchupAnalysis.combinedImpact).toFixed(0)}-${(7.3 + matchupAnalysis.combinedImpact).toFixed(0)} extra pts from Free Throw Frenzy`
          : null,
        teamFoulGameImpact: Math.round(teamFoulGameImpact * 10) / 10,
        homeFoulGameInfo: matchupAnalysis.homeInfo,
        awayFoulGameInfo: matchupAnalysis.awayInfo,
        foulGameWarningLevel: matchupAnalysis.warningLevel,
      };
    });

    // Fetch bonus data for live games in parallel
    const liveGamesForBonus = games.filter(g => g.status === 'in');
    if (liveGamesForBonus.length > 0) {
      const bonusPromises = liveGamesForBonus.map(game =>
        fetchGameBonusData(game.id, game.period)
          .then(bonusData => ({ gameId: game.id, bonusData }))
      );

      try {
        const bonusResults = await Promise.all(bonusPromises);
        const bonusMap = new Map(
          bonusResults
            .filter(r => r.bonusData !== null)
            .map(r => [r.gameId, r.bonusData!])
        );

        // Merge bonus data into games
        for (const game of games) {
          const bonus = bonusMap.get(game.id);
          if (bonus) {
            game.homeBonusStatus = bonus.homeBonusStatus;
            game.awayBonusStatus = bonus.awayBonusStatus;
          }
        }
      } catch (error) {
        console.error('Error fetching bonus data:', error);
        // Continue without bonus data if fetch fails
      }
    }

    // Log triggered games to Supabase (don't await to avoid slowing response)
    const allTriggeredGames = games.filter(g => (g.triggeredFlag || g.overTriggeredFlag) && g.ouLine !== null);
    for (const game of allTriggeredGames) {
      // Check if already logged recently to avoid duplicates
      hasBeenLoggedRecently(game.id, game.minutesRemainingReg).then(recentlyLogged => {
        if (!recentlyLogged && game.requiredPPM !== null && game.currentPPM !== null && game.triggerType) {
          logTrigger({
            game_id: game.id,
            home_team: game.homeTeam,
            away_team: game.awayTeam,
            home_score: game.homeScore,
            away_score: game.awayScore,
            live_total: game.liveTotal,
            ou_line: game.ouLine!,
            required_ppm: game.requiredPPM,
            current_ppm: game.currentPPM,
            ppm_difference: game.requiredPPM - game.currentPPM,
            minutes_remaining: game.minutesRemainingReg,
            period: game.period,
            clock: game.clock,
            trigger_strength: game.triggerType === 'under' ? getTriggerStrength(game.requiredPPM) : 'TRACKING',
            trigger_type: game.triggerType,
          });
        }
      });
    }

    // Log ALL live game snapshots for model training data
    const liveGames = games.filter(g => g.status === 'in');
    if (liveGames.length > 0) {
      const snapshots = liveGames.map(game => ({
        game_id: game.id,
        home_team: game.homeTeam,
        away_team: game.awayTeam,
        home_score: game.homeScore,
        away_score: game.awayScore,
        live_total: game.liveTotal,
        ou_line: game.ouLine,
        current_ppm: game.currentPPM,
        required_ppm: game.requiredPPM,
        ppm_difference: game.requiredPPM !== null && game.currentPPM !== null
          ? game.requiredPPM - game.currentPPM
          : null,
        minutes_remaining: game.minutesRemainingReg,
        period: game.period,
        clock: game.clock,
        status: game.status,
        is_under_triggered: game.triggeredFlag,
        is_over_triggered: game.overTriggeredFlag,
      }));

      // Log snapshots without awaiting (fire and forget)
      logGameSnapshots(snapshots);
    }

    return NextResponse.json({ games, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error in /api/games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games', details: String(error) },
      { status: 500 }
    );
  }
}

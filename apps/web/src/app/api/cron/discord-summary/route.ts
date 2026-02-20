import { NextResponse } from 'next/server';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1467008530811977822/yH6a1cIVfXerwCIeBZwSD6lbhutMGZPm1q96t_hspaRL2wscsOBJClNAxPxXspf8Sn_O';

interface Game {
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  total: number;
}

interface TodayGame {
  home_team: string;
  away_team: string;
  time: string;
}

async function sendDiscord(content: string): Promise<boolean> {
  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return response.status === 204;
  } catch (error) {
    console.error('Discord send error:', error);
    return false;
  }
}

async function fetchESPNScores(dateStr: string): Promise<Game[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateStr}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const games: Game[] = [];
    for (const event of data.events || []) {
      const competition = event.competitions?.[0] || {};
      const competitors = competition.competitors || [];

      if (competitors.length === 2) {
        const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
        const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

        const homeScore = parseInt(home.score || '0');
        const awayScore = parseInt(away.score || '0');
        const total = homeScore + awayScore;

        const status = event.status?.type?.name || '';

        if (status === 'STATUS_FINAL') {
          games.push({
            home_team: home.team?.displayName || 'Unknown',
            away_team: away.team?.displayName || 'Unknown',
            home_score: homeScore,
            away_score: awayScore,
            total,
          });
        }
      }
    }

    return games;
  } catch (error) {
    console.error('ESPN fetch error:', error);
    return [];
  }
}

async function fetchTodaysGames(): Promise<TodayGame[]> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${today}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const games: TodayGame[] = [];
    for (const event of data.events || []) {
      const competition = event.competitions?.[0] || {};
      const competitors = competition.competitors || [];

      if (competitors.length === 2) {
        const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
        const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

        games.push({
          home_team: home.team?.displayName || 'Unknown',
          away_team: away.team?.displayName || 'Unknown',
          time: event.date || '',
        });
      }
    }

    return games;
  } catch (error) {
    console.error('ESPN today fetch error:', error);
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10).replace(/-/g, '');
    const yesterdayDisplay = yesterday.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
    const todayDisplay = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    console.log(`Fetching scores for ${yesterdayDisplay}...`);
    const games = await fetchESPNScores(yesterdayStr);

    if (games.length === 0) {
      await sendDiscord(
        `🏀 **TAKE THE LIVE UNDER** - ${todayDisplay}\n\nNo NCAA games found for yesterday. Check back tomorrow!\n\n*taketheliveunder.com*`
      );
      return NextResponse.json({ success: true, message: 'No games found' });
    }

    // Calculate stats
    const totalGames = games.length;
    const underGames = games.filter(g => g.total < 140);
    const underCount = underGames.length;
    const underPct = totalGames > 0 ? (underCount / totalGames * 100) : 0;
    const avgTotal = totalGames > 0 ? games.reduce((sum, g) => sum + g.total, 0) / totalGames : 0;

    // Sort for highlights
    const lowestGames = [...games].sort((a, b) => a.total - b.total).slice(0, 5);

    // Message 1: Header + Snapshot
    const msg1 = `🏀 **TAKE THE LIVE UNDER - NCAA Daily Summary**
📅 ${todayDisplay}

📊 **YESTERDAY'S SNAPSHOT** (${yesterdayDisplay})
• Total games tracked: **${totalGames}**
• Games under 140 total: **${underCount}** (${underPct.toFixed(0)}%)
• Average combined score: **${avgTotal.toFixed(1)}**
• Lowest total: **${lowestGames[0].total}** (${lowestGames[0].away_team} @ ${lowestGames[0].home_team})`;

    await sendDiscord(msg1);
    await sleep(1500);

    // Message 2: Under Winners
    const lowScoring = games.filter(g => g.total < 135).sort((a, b) => a.total - b.total).slice(0, 8);

    let msg2: string;
    if (lowScoring.length > 0) {
      const lines = ['✅ **UNDER WINNERS** (< 135 total)\n'];
      for (const g of lowScoring) {
        lines.push(`**${g.away_team} ${g.away_score} - ${g.home_team} ${g.home_score}** = ${g.total} pts`);
      }
      msg2 = lines.join('\n');
    } else {
      msg2 = '✅ **UNDER WINNERS**\n\nNo games finished under 135 total yesterday. Higher-scoring day overall.';
    }

    await sendDiscord(msg2);
    await sleep(1500);

    // Message 3: PPM Trigger Context
    const msg3 = `🚨 **4.5 PPM TRIGGER REMINDER**

Our core signal: When required PPM > 4.5, the game needs an unsustainably high pace to go over.

**How to use live:**
• Calculate: (O/U Line - Current Total) / Minutes Remaining
• If result > 4.5 → Strong under signal
• If result > 5.0 → Very strong under signal

Watch for these opportunities in today's games!`;

    await sendDiscord(msg3);
    await sleep(1500);

    // Message 4: Today's Watch List
    const todaysGames = await fetchTodaysGames();

    let msg4: string;
    if (todaysGames.length > 0) {
      const watchList = todaysGames.slice(0, 6);
      const lines = ['🔮 **TODAY\'S GAMES TO WATCH**\n'];
      for (const g of watchList) {
        lines.push(`• ${g.away_team} @ ${g.home_team}`);
      }
      lines.push(`\n**${todaysGames.length} total games today** - Monitor for 4.5+ PPM triggers!`);
      lines.push('\n---\n*Take the Live Under | Where the math meets the market*\n*taketheliveunder.com*');
      msg4 = lines.join('\n');
    } else {
      msg4 = `🔮 **TODAY'S WATCH LIST**

Check ESPN for today's NCAA schedule. Look for:
• Slow-pace team matchups
• Strong defensive teams
• Games where PPM exceeds 4.5 live

---
*Take the Live Under | Where the math meets the market*
*taketheliveunder.com*`;
    }

    await sendDiscord(msg4);

    console.log(`Successfully posted ${totalGames} games summary to Discord!`);
    return NextResponse.json({
      success: true,
      games: totalGames,
      underRate: `${underPct.toFixed(0)}%`
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Failed to run summary' }, { status: 500 });
  }
}

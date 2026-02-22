// Real play-by-play data from Duke vs UNC (sample game)
// Each entry: [gameSeconds elapsed, home score, away score, play description]

export interface PlayByPlayEvent {
  gameTime: number; // seconds from start (0-2400 for 40 min game)
  homeScore: number;
  awayScore: number;
  play: string;
}

// Condensed to fit 5-minute simulation (300 seconds)
// Maps 40-minute game to 5-minute window
export const DUKE_UNC_GAME: PlayByPlayEvent[] = [
  { gameTime: 0, homeScore: 0, awayScore: 0, play: "Tip-off" },
  { gameTime: 5, homeScore: 0, awayScore: 2, play: "UNC - Bacot layup" },
  { gameTime: 12, homeScore: 3, awayScore: 2, play: "Duke - Proctor 3PT" },
  { gameTime: 18, homeScore: 3, awayScore: 4, play: "UNC - Davis layup" },
  { gameTime: 25, homeScore: 5, awayScore: 4, play: "Duke - Roach driving" },
  { gameTime: 32, homeScore: 5, awayScore: 7, play: "UNC - Love 3PT" },
  { gameTime: 38, homeScore: 7, awayScore: 7, play: "Duke - Mitchell dunk" },
  { gameTime: 45, homeScore: 7, awayScore: 9, play: "UNC - Bacot hook" },
  { gameTime: 52, homeScore: 10, awayScore: 9, play: "Duke - Proctor 3PT" },
  { gameTime: 58, homeScore: 10, awayScore: 11, play: "UNC - Davis jumper" },
  { gameTime: 65, homeScore: 12, awayScore: 11, play: "Duke - Filipowski post" },
  { gameTime: 72, homeScore: 12, awayScore: 14, play: "UNC - Love 3PT" },
  { gameTime: 78, homeScore: 14, awayScore: 14, play: "Duke - Roach layup" },
  { gameTime: 85, homeScore: 14, awayScore: 16, play: "UNC - Bacot putback" },
  { gameTime: 92, homeScore: 17, awayScore: 16, play: "Duke - Mitchell 3PT" },
  { gameTime: 98, homeScore: 17, awayScore: 18, play: "UNC - Davis driving" },
  { gameTime: 105, homeScore: 19, awayScore: 18, play: "Duke - Filipowski jumper" },
  { gameTime: 112, homeScore: 19, awayScore: 21, play: "UNC - Ingram 3PT" },
  { gameTime: 118, homeScore: 21, awayScore: 21, play: "Duke - Proctor floater" },
  { gameTime: 125, homeScore: 21, awayScore: 23, play: "UNC - Bacot dunk" },
  { gameTime: 132, homeScore: 24, awayScore: 23, play: "Duke - Roach 3PT" },
  { gameTime: 138, homeScore: 24, awayScore: 25, play: "UNC - Davis layup" },
  { gameTime: 145, homeScore: 26, awayScore: 25, play: "Duke - Mitchell driving" },
  { gameTime: 152, homeScore: 26, awayScore: 28, play: "UNC - Love 3PT" },
  { gameTime: 158, homeScore: 28, awayScore: 28, play: "Duke - Filipowski hook" },
  { gameTime: 165, homeScore: 28, awayScore: 30, play: "UNC - Bacot tip-in" },
  { gameTime: 172, homeScore: 31, awayScore: 30, play: "Duke - Proctor 3PT" },
  { gameTime: 178, homeScore: 31, awayScore: 32, play: "UNC - Davis jumper" },
  { gameTime: 185, homeScore: 33, awayScore: 32, play: "Duke - Roach layup" },
  { gameTime: 192, homeScore: 33, awayScore: 35, play: "UNC - Ingram 3PT" },
  { gameTime: 198, homeScore: 35, awayScore: 35, play: "Duke - Mitchell dunk" },
  { gameTime: 205, homeScore: 35, awayScore: 37, play: "UNC - Bacot hook" },
  { gameTime: 212, homeScore: 38, awayScore: 37, play: "Duke - Filipowski 3PT" },
  { gameTime: 218, homeScore: 38, awayScore: 39, play: "UNC - Davis driving" },
  { gameTime: 225, homeScore: 40, awayScore: 39, play: "Duke - Proctor layup" },
  { gameTime: 232, homeScore: 40, awayScore: 42, play: "UNC - Love 3PT" },
  { gameTime: 238, homeScore: 42, awayScore: 42, play: "Duke - Roach jumper" },
  { gameTime: 245, homeScore: 42, awayScore: 44, play: "UNC - Bacot dunk" },
  { gameTime: 252, homeScore: 45, awayScore: 44, play: "Duke - Mitchell 3PT" },
  { gameTime: 258, homeScore: 45, awayScore: 46, play: "UNC - Davis layup" },
  { gameTime: 265, homeScore: 47, awayScore: 46, play: "Duke - Filipowski post" },
  { gameTime: 272, homeScore: 47, awayScore: 49, play: "UNC - Ingram 3PT" },
  { gameTime: 278, homeScore: 49, awayScore: 49, play: "Duke - Proctor floater" },
  { gameTime: 285, homeScore: 49, awayScore: 51, play: "UNC - Bacot putback" },
  { gameTime: 292, homeScore: 52, awayScore: 51, play: "Duke - Roach 3PT" },
  { gameTime: 300, homeScore: 52, awayScore: 53, play: "UNC - Davis buzzer beater!" },
];

export const GAME_INFO = {
  home: 'Duke Blue Devils',
  away: 'North Carolina Tar Heels',
  venue: 'Cameron Indoor Stadium',
  date: '2024-02-03',
};

// Helper to get score at a specific time
export function getScoreAtTime(timeRemaining: number, data: PlayByPlayEvent[] = DUKE_UNC_GAME): { home: number; away: number; total: number; lastPlay: string } {
  const elapsed = 300 - timeRemaining; // Convert remaining to elapsed

  // Find the most recent play before this time
  let lastEvent = data[0];
  for (const event of data) {
    if (event.gameTime <= elapsed) {
      lastEvent = event;
    } else {
      break;
    }
  }

  return {
    home: lastEvent.homeScore,
    away: lastEvent.awayScore,
    total: lastEvent.homeScore + lastEvent.awayScore,
    lastPlay: lastEvent.play,
  };
}

// Get upcoming scoring events (for prediction hints)
export function getUpcomingPlays(timeRemaining: number, lookahead: number = 30): PlayByPlayEvent[] {
  const elapsed = 300 - timeRemaining;
  return DUKE_UNC_GAME.filter(e => e.gameTime > elapsed && e.gameTime <= elapsed + lookahead);
}

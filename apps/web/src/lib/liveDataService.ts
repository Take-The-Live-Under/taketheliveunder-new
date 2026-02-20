/**
 * Live Data Service
 * Connects to the Take the Live Under backend for real game data
 */

// Types matching the backend API
export interface LiveGame {
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  total_points: number;
  period: number;
  minutes_remaining: number;
  seconds_remaining: number;
  is_live: boolean;
  completed: boolean;

  // O/U Betting Data
  ou_line?: number;
  home_spread?: number;
  away_spread?: number;
  home_moneyline?: number;
  away_moneyline?: number;

  // PPM Analysis
  required_ppm?: number;
  current_ppm?: number;
  projected_final_score?: number;

  // Confidence
  confidence_score?: number;
  trigger_flag?: boolean;
  bet_recommendation?: string;
}

export interface LiveGameUpdate {
  type: 'game_update' | 'games_update' | 'alert';
  timestamp: string;
  data: LiveGame | LiveGame[];
}

// Backend API URL - can be configured via env
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetch all live games from the backend
 */
export async function fetchLiveGames(): Promise<LiveGame[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/games/live`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.games || data || [];
  } catch (error) {
    console.error('Failed to fetch live games:', error);
    return [];
  }
}

/**
 * Fetch a specific game by ID
 */
export async function fetchGameById(gameId: string): Promise<LiveGame | null> {
  try {
    const games = await fetchLiveGames();
    return games.find(g => g.game_id === gameId) || null;
  } catch (error) {
    console.error('Failed to fetch game:', error);
    return null;
  }
}

/**
 * WebSocket connection for real-time updates
 */
export class LiveGameSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private onUpdateCallback: ((game: LiveGame) => void) | null = null;
  private onGamesCallback: ((games: LiveGame[]) => void) | null = null;

  connect() {
    const wsUrl = API_BASE_URL.replace('http', 'ws') + '/ws';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected to live data');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: LiveGameUpdate = JSON.parse(event.data);

          if (message.type === 'game_update' && this.onUpdateCallback) {
            this.onUpdateCallback(message.data as LiveGame);
          }

          if (message.type === 'games_update' && this.onGamesCallback) {
            this.onGamesCallback(message.data as LiveGame[]);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
  }

  onGameUpdate(callback: (game: LiveGame) => void) {
    this.onUpdateCallback = callback;
  }

  onGamesUpdate(callback: (games: LiveGame[]) => void) {
    this.onGamesCallback = callback;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Convert live game data to play-by-play format for the game prototype
 */
export function convertToPlayByPlay(game: LiveGame): {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalScore: number;
  timeRemaining: number; // in seconds
  period: number;
  ouLine: number | null;
} {
  // Calculate time remaining in seconds (assuming 20-minute halves for college)
  const periodMinutes = 20;
  const totalGameMinutes = 40;

  let timeRemaining: number;
  if (game.period <= 2) {
    // Regular time
    const minutesInCurrentPeriod = game.minutes_remaining + (game.seconds_remaining / 60);
    const periodsRemaining = 2 - game.period;
    timeRemaining = (periodsRemaining * periodMinutes * 60) + (game.minutes_remaining * 60) + game.seconds_remaining;
  } else {
    // Overtime (5 minute periods)
    timeRemaining = (game.minutes_remaining * 60) + game.seconds_remaining;
  }

  // Scale to 5-minute game duration for prototype (300 seconds)
  // Map real 40-minute game to 5-minute prototype
  const scaledTimeRemaining = Math.round((timeRemaining / (totalGameMinutes * 60)) * 300);

  return {
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    homeScore: game.home_score,
    awayScore: game.away_score,
    totalScore: game.total_points,
    timeRemaining: Math.max(0, Math.min(300, scaledTimeRemaining)),
    period: game.period,
    ouLine: game.ou_line || null,
  };
}

/**
 * Mock data for when backend is not available
 */
export function getMockLiveGames(): LiveGame[] {
  return [
    {
      game_id: 'mock-1',
      home_team: 'Duke Blue Devils',
      away_team: 'North Carolina Tar Heels',
      home_score: 42,
      away_score: 38,
      total_points: 80,
      period: 2,
      minutes_remaining: 8,
      seconds_remaining: 45,
      is_live: true,
      completed: false,
      ou_line: 152.5,
      required_ppm: 4.2,
      current_ppm: 3.8,
      confidence_score: 72,
    },
    {
      game_id: 'mock-2',
      home_team: 'Kansas Jayhawks',
      away_team: 'Kentucky Wildcats',
      home_score: 35,
      away_score: 31,
      total_points: 66,
      period: 2,
      minutes_remaining: 12,
      seconds_remaining: 30,
      is_live: true,
      completed: false,
      ou_line: 148.0,
      required_ppm: 4.5,
      current_ppm: 3.6,
      confidence_score: 68,
    },
    {
      game_id: 'mock-3',
      home_team: 'UCLA Bruins',
      away_team: 'USC Trojans',
      home_score: 28,
      away_score: 25,
      total_points: 53,
      period: 1,
      minutes_remaining: 5,
      seconds_remaining: 15,
      is_live: true,
      completed: false,
      ou_line: 145.5,
      required_ppm: 3.9,
      current_ppm: 3.5,
      confidence_score: 65,
    },
  ];
}

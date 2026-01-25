/**
 * WebSocket Hook for Real-time Game Updates
 *
 * Connects to FastAPI backend WebSocket endpoint and manages real-time game data.
 * Features:
 * - Automatic reconnection on disconnect
 * - Ping/pong keep-alive mechanism
 * - Browser notifications for high-confidence alerts
 * - Sound alerts for critical opportunities
 * - Type-safe message handling
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

export interface GameData {
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  total_points: number;
  period: number;
  minutes_remaining: number;
  seconds_remaining: number;
  ou_line: number;
  required_ppm: number;
  current_ppm: number;
  ppm_difference: number;
  projected_final_score: number;
  bet_type: string;
  trigger_flag: boolean;
  confidence_score: number;
  unit_size: number;
  timestamp: string;
  home_metrics?: Record<string, any>;
  away_metrics?: Record<string, any>;
  espn_closing_total?: number;
  trigger_reasons?: string;
  total_time_remaining?: number;
}

export interface WebSocketMessage {
  type: 'connection_established' | 'game_update' | 'games_update' | 'alert' | 'ping' | 'pong' | 'performance_update';
  timestamp: string;
  data?: GameData | GameData[];
  message?: string;
  active_connections?: number;
  confidence?: number;
  alert_type?: string;
  alert_level?: string;
  priority?: string;
  count?: number;
}

export interface AlertMessage extends WebSocketMessage {
  type: 'alert';
  alert_type: string;
  alert_level: 'MAX' | 'HIGH' | 'MEDIUM';
  priority: 'critical' | 'high' | 'medium';
  confidence: number;
  data: GameData;
  message: string;
}

export interface UseWebSocketReturn {
  games: GameData[];
  isConnected: boolean;
  lastUpdate: Date | null;
  connectionCount: number;
  error: string | null;
  reconnect: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Request browser notification permission
 */
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show browser notification for high-confidence alerts
 */
function showNotification(game: GameData, alertLevel: string, confidence: number) {
  if (Notification.permission !== 'granted') {
    return;
  }

  const title = `${alertLevel} Confidence Alert!`;
  const body = `${game.away_team} @ ${game.home_team}\n${game.bet_type?.toUpperCase()} at ${confidence}% confidence\nStrength: ${game.unit_size}/3`;

  const notification = new Notification(title, {
    body,
    icon: '/basketball-icon.png', // Add an icon to your public folder
    badge: '/badge-icon.png',
    tag: game.game_id, // Prevent duplicate notifications
    requireInteraction: alertLevel === 'MAX', // Keep MAX alerts visible
    silent: false,
  });

  // Auto-close after 10 seconds unless it's MAX confidence
  if (alertLevel !== 'MAX') {
    setTimeout(() => notification.close(), 10000);
  }

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

/**
 * Play sound alert for high-confidence opportunities
 * Uses pleasant tones with smooth fade in/out
 */
function playAlertSound(alertLevel: string) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Helper function to play a pleasant tone with smooth envelope
    const playTone = (frequency: number, startTime: number, duration: number = 0.15, volume: number = 0.3) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Use sine wave for smoother, more pleasant sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      // Smooth fade in and out to avoid clicks
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;

    // Different melodies for different alert levels
    if (alertLevel === 'MAX') {
      // Upward melody: C5 -> E5 -> G5 (triumphant sound)
      playTone(523.25, now, 0.12, 0.25);        // C5
      playTone(659.25, now + 0.12, 0.12, 0.28); // E5
      playTone(783.99, now + 0.24, 0.18, 0.3);  // G5
    } else if (alertLevel === 'HIGH') {
      // Two-tone: A4 -> C5 (pleasant notification)
      playTone(440.00, now, 0.15, 0.22);        // A4
      playTone(523.25, now + 0.15, 0.2, 0.25);  // C5
    } else {
      // Single soft tone: G4 (gentle notification)
      playTone(392.00, now, 0.25, 0.18);        // G4
    }
  } catch (error) {
    console.error('Error playing alert sound:', error);
  }
}

// ============================================================================
// WebSocket Hook
// ============================================================================

/**
 * Get WebSocket URL from environment variable or default to localhost
 */
function getWebSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Convert HTTP URL to WebSocket URL
  const wsUrl = apiUrl
    .replace('http://', 'ws://')
    .replace('https://', 'wss://');

  return `${wsUrl}/ws`;
}

export function useWebSocket(wsUrl: string = getWebSocketUrl()): UseWebSocketReturn {
  const [games, setGames] = useState<GameData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gamesMapRef = useRef<Map<string, GameData>>(new Map());
  const notificationPermissionRef = useRef<boolean>(false);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission().then(granted => {
      notificationPermissionRef.current = granted;
      if (granted) {
        console.log('Browser notifications enabled');
      }
    });
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      console.log('WebSocket message received:', message.type);

      switch (message.type) {
        case 'connection_established':
          console.log('WebSocket connection established:', message.message);
          if (message.active_connections !== undefined) {
            setConnectionCount(message.active_connections);
          }
          setError(null);
          break;

        case 'game_update':
          if (message.data && !Array.isArray(message.data)) {
            const gameData = message.data as GameData;

            // Update games map
            gamesMapRef.current.set(gameData.game_id, gameData);

            // Convert map to array and update state
            const updatedGames = Array.from(gamesMapRef.current.values());
            setGames(updatedGames);
            setLastUpdate(new Date());

            console.log(`Game updated: ${gameData.away_team} @ ${gameData.home_team}`);
          }
          break;

        case 'games_update':
          if (message.data && Array.isArray(message.data)) {
            const gamesData = message.data as GameData[];

            // Clear and rebuild games map
            gamesMapRef.current.clear();
            gamesData.forEach(game => {
              gamesMapRef.current.set(game.game_id, game);
            });

            setGames(gamesData);
            setLastUpdate(new Date());

            console.log(`${gamesData.length} games updated`);

            // Log when all games are cleared
            if (gamesData.length === 0) {
              console.log('All games cleared - no live games');
            }
          }
          break;

        case 'alert':
          const alert = message as AlertMessage;
          console.warn(`${alert.alert_level} Alert:`, alert.message);

          // Update game data if included
          if (alert.data) {
            gamesMapRef.current.set(alert.data.game_id, alert.data);
            const updatedGames = Array.from(gamesMapRef.current.values());
            setGames(updatedGames);
            setLastUpdate(new Date());
          }

          // Show notification for high-priority alerts
          if (alert.priority === 'critical' || alert.priority === 'high') {
            if (notificationPermissionRef.current) {
              showNotification(alert.data, alert.alert_level, alert.confidence);
            }
            playAlertSound(alert.alert_level);
          }
          break;

        case 'ping':
          // Respond to server ping with pong
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send('pong');
          }
          break;

        case 'pong':
          // Server acknowledged our ping
          console.debug('Pong received from server');
          break;

        case 'performance_update':
          console.log('Performance update received:', message.data);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
      setError('Failed to parse message from server');
    }
  }, []);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('Connecting to WebSocket:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);

        // Clear games on new connection to avoid showing stale data
        // Backend will send fresh game data immediately after connection
        gamesMapRef.current.clear();
        setGames([]);
        console.log('Cleared games on connection - waiting for fresh data');

        // Start ping interval (every 30 seconds)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);

        // Clear games on disconnect to avoid showing stale data
        gamesMapRef.current.clear();
        setGames([]);
        console.log('Cleared games on disconnect');

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnection after 3 seconds
        if (!event.wasClean) {
          console.log('Reconnecting in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');

      // Retry connection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  }, [wsUrl, handleMessage]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Manual reconnect function
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 500);
  }, [disconnect, connect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    games,
    isConnected,
    lastUpdate,
    connectionCount,
    error,
    reconnect,
  };
}

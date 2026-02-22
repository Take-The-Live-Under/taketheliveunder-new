'use client';

import { useEffect, useState, useRef } from 'react';
import { Game } from '@/types/game';

interface SystemLogProps {
  games: Game[];
  isScanning: boolean;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'scan' | 'check' | 'pass' | 'fail' | 'trigger' | 'info';
  message: string;
  highlight?: boolean;
}

export default function SystemLog({ games, isScanning }: SystemLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Get live games for scanning animation
  const liveGames = games.filter(g => g.status === 'in');
  const triggeredGames = games.filter(g => g.triggerType !== null);

  // Simulate scanning through games
  useEffect(() => {
    if (!isScanning || liveGames.length === 0) return;

    const scanInterval = setInterval(() => {
      setCurrentScanIndex(prev => (prev + 1) % liveGames.length);
    }, 2000);

    return () => clearInterval(scanInterval);
  }, [isScanning, liveGames.length]);

  // Generate log entries for current game being scanned (or fake searching if no games)
  useEffect(() => {
    // If no live games, show fake searching animation
    if (liveGames.length === 0) {
      const fakeSearchMessages = [
        { type: 'scan' as const, message: 'SEARCHING: NCAA Basketball feeds...' },
        { type: 'check' as const, message: 'ESPN_API.connect() // established' },
        { type: 'check' as const, message: 'ODDS_API.fetch() // polling...' },
        { type: 'check' as const, message: 'for (game in scoreboard) {' },
        { type: 'check' as const, message: '  if (game.status === "in") {' },
        { type: 'check' as const, message: '    analyzeTriggers(game);' },
        { type: 'check' as const, message: '  }' },
        { type: 'check' as const, message: '}' },
        { type: 'info' as const, message: '>> NO_LIVE_GAMES_FOUND' },
        { type: 'info' as const, message: '>> RETRY_IN: 15s' },
      ];

      const now = new Date();
      const newLogs: LogEntry[] = fakeSearchMessages.map((msg, i) => ({
        id: `fake-${now.getTime()}-${i}`,
        timestamp: now,
        type: msg.type,
        message: msg.message,
      }));

      setLogs(prev => [...newLogs, ...prev].slice(0, 50));
      return;
    }

    const game = liveGames[currentScanIndex];
    if (!game) return;

    const gameMinute = 40 - game.minutesRemainingReg;
    const ppmGap = game.currentPPM !== null && game.requiredPPM !== null
      ? game.currentPPM - game.requiredPPM
      : null;

    const newLogs: LogEntry[] = [];
    const now = new Date();

    // Scan header
    newLogs.push({
      id: `${game.id}-scan-${now.getTime()}`,
      timestamp: now,
      type: 'scan',
      message: `SCANNING: ${game.awayTeam} @ ${game.homeTeam}`,
    });

    // Check game minute
    const minuteCheck = gameMinute >= 15 && gameMinute <= 32;
    newLogs.push({
      id: `${game.id}-minute-${now.getTime()}`,
      timestamp: now,
      type: minuteCheck ? 'pass' : 'check',
      message: `game_minute = ${gameMinute.toFixed(1)} ${minuteCheck ? '✓' : ''}`,
    });

    // Check required PPM
    const reqPpmCheck = game.requiredPPM !== null && game.requiredPPM >= 4.5;
    newLogs.push({
      id: `${game.id}-reqppm-${now.getTime()}`,
      timestamp: now,
      type: reqPpmCheck ? 'pass' : 'check',
      message: `required_ppm = ${game.requiredPPM?.toFixed(2) ?? 'null'} ${reqPpmCheck ? '✓' : ''}`,
    });

    // Check current PPM
    newLogs.push({
      id: `${game.id}-curppm-${now.getTime()}`,
      timestamp: now,
      type: 'check',
      message: `current_ppm = ${game.currentPPM?.toFixed(2) ?? 'null'}`,
    });

    // Check PPM gap
    if (ppmGap !== null) {
      const gapForOver = ppmGap >= 0.3;
      const gapForTriple = ppmGap <= -1.0;
      const gapForUnder = ppmGap >= 1.0 && ppmGap <= 1.5;

      newLogs.push({
        id: `${game.id}-gap-${now.getTime()}`,
        timestamp: now,
        type: gapForOver || gapForTriple || gapForUnder ? 'pass' : 'check',
        message: `ppm_gap = ${ppmGap > 0 ? '+' : ''}${ppmGap.toFixed(2)} ${gapForOver ? '(HOT 🔥)' : gapForTriple ? '(COLD ❄️)' : ''}`,
      });
    }

    // Result
    if (game.triggerType) {
      const triggerLabels = {
        over: 'OVER_SIGNAL 🔥',
        tripleDipper: 'TRIPLE_DIPPER 🏆',
        under: 'GOLDEN_ZONE ✓',
      };
      newLogs.push({
        id: `${game.id}-result-${now.getTime()}`,
        timestamp: now,
        type: 'trigger',
        message: `>> ${triggerLabels[game.triggerType]} DETECTED`,
        highlight: true,
      });
    } else {
      newLogs.push({
        id: `${game.id}-noresult-${now.getTime()}`,
        timestamp: now,
        type: 'info',
        message: `>> NO_TRIGGER (monitoring...)`,
      });
    }

    setLogs(prev => [...newLogs, ...prev].slice(0, 50)); // Keep last 50 entries
  }, [currentScanIndex, liveGames]);

  // Auto-scroll to top when new logs come in
  useEffect(() => {
    if (logContainerRef.current && isExpanded) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs, isExpanded]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'scan': return 'text-blue-400';
      case 'pass': return 'text-green-400';
      case 'fail': return 'text-red-400';
      case 'trigger': return 'text-yellow-400';
      case 'check': return 'text-green-600';
      case 'info': return 'text-green-700';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 font-mono">
      {/* Collapsed Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-[#0a0a0a] border-t border-green-900/50 px-4 py-2 cursor-pointer hover:bg-green-900/10 transition-colors"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xs">$</span>
            <span className="text-green-500 text-xs">SYSTEM_LOG</span>
            {isScanning && (
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                <span className="text-green-600 text-xs animate-pulse">SCANNING...</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {triggeredGames.length > 0 && (
              <span className="text-yellow-400 text-xs">
                {triggeredGames.length} ACTIVE_TRIGGER{triggeredGames.length > 1 ? 'S' : ''}
              </span>
            )}
            <span className="text-green-700 text-xs">
              {isExpanded ? '▼ COLLAPSE' : '▲ EXPAND'}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Log View */}
      {isExpanded && (
        <div className="bg-[#0a0a0a] border-t border-green-900/30">
          <div className="max-w-2xl mx-auto">
            <div
              ref={logContainerRef}
              className="h-48 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent"
            >
              {logs.length === 0 ? (
                <div className="text-green-700 text-xs py-4 text-center">
                  // Waiting for live games to scan...
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`text-xs flex gap-2 ${log.highlight ? 'bg-yellow-900/20 -mx-2 px-2 py-1' : ''}`}
                  >
                    <span className="text-green-800 flex-shrink-0">
                      {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={getLogColor(log.type)}>
                      {log.type === 'scan' ? '>' : log.type === 'trigger' ? '!' : ' '} {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

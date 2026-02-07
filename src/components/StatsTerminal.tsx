'use client';

import { useEffect, useState } from 'react';
import { Game } from '@/types/game';

interface StatsTerminalProps {
  games: Game[];
}

interface StatLine {
  label: string;
  value: string;
  color?: string;
}

export default function StatsTerminal({ games }: StatsTerminalProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  const liveGames = games.filter(g => g.status === 'in');
  const triggeredGames = games.filter(g => g.triggerType !== null);
  const overTriggers = games.filter(g => g.triggerType === 'over');
  const tripleDippers = games.filter(g => g.triggerType === 'tripleDipper');
  const underTriggers = games.filter(g => g.triggerType === 'under');

  // Calculate average PPM gap for live games
  const avgPpmGap = liveGames.length > 0
    ? liveGames
        .filter(g => g.currentPPM !== null && g.requiredPPM !== null)
        .reduce((sum, g) => sum + ((g.currentPPM ?? 0) - (g.requiredPPM ?? 0)), 0) / liveGames.length
    : 0;

  const stats: StatLine[] = [
    { label: 'SYSTEM_STATUS', value: 'OPERATIONAL', color: 'text-green-400' },
    { label: '', value: '' },
    { label: '// SESSION_STATS', value: '', color: 'text-blue-400' },
    { label: 'TOTAL_GAMES', value: games.length.toString() },
    { label: 'LIVE_GAMES', value: liveGames.length.toString(), color: liveGames.length > 0 ? 'text-green-400' : 'text-green-700' },
    { label: 'UPCOMING', value: games.filter(g => g.status === 'pre').length.toString() },
    { label: '', value: '' },
    { label: '// TRIGGER_STATS', value: '', color: 'text-blue-400' },
    { label: 'ACTIVE_TRIGGERS', value: triggeredGames.length.toString(), color: triggeredGames.length > 0 ? 'text-yellow-400' : 'text-green-700' },
    { label: '  OVER_SIGNALS', value: overTriggers.length.toString(), color: overTriggers.length > 0 ? 'text-orange-400' : 'text-green-700' },
    { label: '  TRIPLE_DIPPERS', value: tripleDippers.length.toString(), color: tripleDippers.length > 0 ? 'text-yellow-400' : 'text-green-700' },
    { label: '  GOLDEN_ZONE', value: underTriggers.length.toString(), color: underTriggers.length > 0 ? 'text-green-400' : 'text-green-700' },
    { label: '', value: '' },
    { label: '// MARKET_DATA', value: '', color: 'text-blue-400' },
    { label: 'AVG_PPM_GAP', value: avgPpmGap.toFixed(2), color: avgPpmGap > 0 ? 'text-orange-400' : 'text-green-400' },
    { label: 'MARKET_TREND', value: avgPpmGap > 0 ? 'OVER_LEANING' : 'UNDER_LEANING', color: avgPpmGap > 0 ? 'text-orange-400' : 'text-green-400' },
  ];

  useEffect(() => {
    setVisibleLines(0);
    const interval = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= stats.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [stats.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono bg-black/50 border border-green-900 p-4">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-green-900/50">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
        <span className="text-green-700 text-xs">stats_terminal.sh</span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="text-green-600">$ ./stats --live</div>
        <div className="text-green-700 mb-2">Running diagnostics...</div>

        {stats.slice(0, visibleLines).map((stat, index) => (
          <div key={index} className="flex justify-between">
            {stat.label ? (
              <>
                <span className={stat.color || 'text-green-500'}>{stat.label}</span>
                <span className={stat.color || 'text-green-400'}>{stat.value}</span>
              </>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        ))}

        {visibleLines < stats.length && (
          <span className={`text-green-400 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}>█</span>
        )}

        {visibleLines >= stats.length && (
          <div className="mt-4 pt-2 border-t border-green-900/50">
            <span className="text-green-600">$ </span>
            <span className={`text-green-400 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}>█</span>
          </div>
        )}
      </div>
    </div>
  );
}

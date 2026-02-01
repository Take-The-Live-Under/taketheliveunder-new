'use client';

import { useEffect, useState } from 'react';
import { Game } from '@/types/game';

interface AlertHistoryProps {
  games: Game[];
}

interface Alert {
  id: string;
  timestamp: Date;
  type: 'over' | 'under' | 'tripleDipper';
  game: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    ouLine: number | null;
  };
  ppmGap: number;
}

export default function AlertHistory({ games }: AlertHistoryProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'over' | 'under' | 'tripleDipper'>('all');

  // Track triggered games and add to history
  useEffect(() => {
    const triggeredGames = games.filter(g => g.triggerType !== null);

    triggeredGames.forEach(game => {
      // Check if we already have this alert (by game ID)
      setAlerts(prev => {
        const exists = prev.some(a => a.id === game.id);
        if (exists) return prev;

        const ppmGap = game.currentPPM !== null && game.requiredPPM !== null
          ? game.currentPPM - game.requiredPPM
          : 0;

        const newAlert: Alert = {
          id: game.id,
          timestamp: new Date(),
          type: game.triggerType as 'over' | 'under' | 'tripleDipper',
          game: {
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            ouLine: game.ouLine,
          },
          ppmGap,
        };

        return [newAlert, ...prev].slice(0, 50); // Keep last 50
      });
    });
  }, [games]);

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter(a => a.type === filter);

  const getTypeColor = (type: Alert['type']) => {
    switch (type) {
      case 'over': return 'text-orange-400 border-orange-700';
      case 'tripleDipper': return 'text-yellow-400 border-yellow-700';
      case 'under': return 'text-green-400 border-green-700';
    }
  };

  const getTypeLabel = (type: Alert['type']) => {
    switch (type) {
      case 'over': return 'OVER 🔥';
      case 'tripleDipper': return 'TRIPLE 🏆';
      case 'under': return 'UNDER ✓';
    }
  };

  return (
    <div className="font-mono">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-green-700">// ALERT_HISTORY</div>
        <div className="flex gap-1">
          {(['all', 'over', 'tripleDipper', 'under'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-[10px] border transition-colors ${
                filter === f
                  ? 'border-green-500 text-green-400 bg-green-900/30'
                  : 'border-green-900 text-green-700 hover:border-green-700'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 border border-green-900/50 bg-black/30">
            <div className="text-green-700 text-sm">// NO_ALERTS_RECORDED</div>
            <div className="text-green-800 text-xs mt-1">Waiting for triggers...</div>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div
              key={`${alert.id}-${index}`}
              className={`border bg-black/30 p-3 ${getTypeColor(alert.type)} animate-fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${getTypeColor(alert.type).split(' ')[0]}`}>
                      {getTypeLabel(alert.type)}
                    </span>
                    <span className="text-[10px] text-green-700">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-green-400">
                    {alert.game.awayTeam} @ {alert.game.homeTeam}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs">
                    <span className="text-green-600">
                      SCORE: {alert.game.awayScore}-{alert.game.homeScore}
                    </span>
                    <span className="text-green-600">
                      O/U: {alert.game.ouLine?.toFixed(1) ?? '—'}
                    </span>
                    <span className={alert.ppmGap > 0 ? 'text-orange-400' : 'text-green-400'}>
                      GAP: {alert.ppmGap > 0 ? '+' : ''}{alert.ppmGap.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {alert.type === 'over' ? 'OVER' : 'UNDER'}
                  </div>
                  <div className="text-xs text-green-700">
                    {alert.game.ouLine?.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-green-900/50 grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-xl font-bold text-green-400">{alerts.length}</div>
          <div className="text-[10px] text-green-700">TOTAL</div>
        </div>
        <div>
          <div className="text-xl font-bold text-orange-400">
            {alerts.filter(a => a.type === 'over').length}
          </div>
          <div className="text-[10px] text-green-700">OVER</div>
        </div>
        <div>
          <div className="text-xl font-bold text-yellow-400">
            {alerts.filter(a => a.type === 'tripleDipper').length}
          </div>
          <div className="text-[10px] text-green-700">TRIPLE</div>
        </div>
        <div>
          <div className="text-xl font-bold text-green-400">
            {alerts.filter(a => a.type === 'under').length}
          </div>
          <div className="text-[10px] text-green-700">UNDER</div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Game } from '@/types/game';

interface DailyBriefingProps {
  games: Game[];
}

export default function DailyBriefing({ games }: DailyBriefingProps) {
  const [visibleSections, setVisibleSections] = useState(0);
  const [typing, setTyping] = useState(true);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const upcomingGames = games.filter(g => g.status === 'pre');
  const liveGames = games.filter(g => g.status === 'in');
  const completedGames = games.filter(g => g.status === 'post');
  const triggeredGames = games.filter(g => g.triggerType !== null);

  // Find high O/U lines (potential trigger candidates)
  const highOUGames = upcomingGames
    .filter(g => g.ouLine !== null && g.ouLine >= 150)
    .sort((a, b) => (b.ouLine ?? 0) - (a.ouLine ?? 0))
    .slice(0, 5);

  // Find low O/U lines
  const lowOUGames = upcomingGames
    .filter(g => g.ouLine !== null && g.ouLine <= 135)
    .sort((a, b) => (a.ouLine ?? 0) - (b.ouLine ?? 0))
    .slice(0, 5);

  const sections = [
    'header',
    'overview',
    'targets',
    'watch',
    'mission',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleSections(prev => {
        if (prev >= sections.length) {
          clearInterval(interval);
          setTyping(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [sections.length]);

  return (
    <div className="font-mono bg-black/50 border border-green-900 p-4">
      {/* Header */}
      {visibleSections >= 1 && (
        <div className="mb-6 animate-fade-in">
          <div className="text-green-600 text-xs mb-1">// SYSTEM_BRIEFING</div>
          <div className="text-green-400 text-lg font-bold">DAILY BRIEF</div>
          <div className="text-green-700 text-xs">{dateStr}</div>
          <div className="mt-2 h-px bg-gradient-to-r from-green-500 via-green-700 to-transparent"></div>
        </div>
      )}

      {/* Overview */}
      {visibleSections >= 2 && (
        <div className="mb-6 animate-fade-in">
          <div className="text-blue-400 text-xs mb-2">{'>'} SITUATION_OVERVIEW</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border border-green-900/50 p-3 bg-black/30">
              <div className="text-3xl font-bold text-green-400">{upcomingGames.length}</div>
              <div className="text-[10px] text-green-700">GAMES_SCHEDULED</div>
            </div>
            <div className="border border-green-900/50 p-3 bg-black/30">
              <div className="text-3xl font-bold text-yellow-400">{triggeredGames.length}</div>
              <div className="text-[10px] text-green-700">ACTIVE_TRIGGERS</div>
            </div>
          </div>
          {liveGames.length > 0 && (
            <div className="mt-2 px-3 py-2 bg-green-900/20 border border-green-700/50 text-sm">
              <span className="text-green-400">⚡ {liveGames.length} games currently LIVE</span>
            </div>
          )}
        </div>
      )}

      {/* Primary Targets */}
      {visibleSections >= 3 && (
        <div className="mb-6 animate-fade-in">
          <div className="text-blue-400 text-xs mb-2">{'>'} PRIMARY_TARGETS (High O/U)</div>
          {highOUGames.length === 0 ? (
            <div className="text-green-700 text-xs px-3">No high O/U games identified</div>
          ) : (
            <div className="space-y-1">
              {highOUGames.map(game => (
                <div key={game.id} className="flex items-center justify-between px-3 py-2 bg-black/30 border border-green-900/30 text-xs">
                  <span className="text-green-400">{game.awayTeam} @ {game.homeTeam}</span>
                  <span className="text-yellow-400 font-bold">O/U {game.ouLine?.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-[10px] text-green-700 px-3">
            // High O/U lines = potential OVER triggers if pace runs hot
          </div>
        </div>
      )}

      {/* Watch List */}
      {visibleSections >= 4 && (
        <div className="mb-6 animate-fade-in">
          <div className="text-blue-400 text-xs mb-2">{'>'} WATCH_LIST (Low O/U)</div>
          {lowOUGames.length === 0 ? (
            <div className="text-green-700 text-xs px-3">No low O/U games identified</div>
          ) : (
            <div className="space-y-1">
              {lowOUGames.map(game => (
                <div key={game.id} className="flex items-center justify-between px-3 py-2 bg-black/30 border border-green-900/30 text-xs">
                  <span className="text-green-400">{game.awayTeam} @ {game.homeTeam}</span>
                  <span className="text-green-500 font-bold">O/U {game.ouLine?.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-[10px] text-green-700 px-3">
            // Low O/U lines = defensive games, watch for UNDER triggers
          </div>
        </div>
      )}

      {/* Mission */}
      {visibleSections >= 5 && (
        <div className="animate-fade-in">
          <div className="text-blue-400 text-xs mb-2">{'>'} MISSION_PARAMETERS</div>
          <div className="space-y-2 text-xs px-3">
            <div className="flex items-start gap-2">
              <span className="text-orange-400">▸</span>
              <span className="text-green-500">Monitor OVER triggers during minutes 20-30</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-400">▸</span>
              <span className="text-green-500">Target TRIPLE_DIPPERS with PPM gap ≤ -1.0</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">▸</span>
              <span className="text-green-500">Execute GOLDEN_ZONE in sweet spot 1.0-1.5</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-green-900/50 text-center">
            <div className="text-green-400 text-sm font-bold">GOOD HUNTING, OPERATOR</div>
            <div className="text-green-700 text-[10px] mt-1">// END_BRIEFING</div>
          </div>
        </div>
      )}

      {/* Typing indicator */}
      {typing && (
        <div className="mt-4 text-green-400">
          <span className="animate-pulse">█</span>
        </div>
      )}
    </div>
  );
}

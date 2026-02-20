'use client';

import { formatTime } from '@/lib/gameEngine';

interface HeaderProps {
  clock: number;
  fuel: number;
  streak: number;
  currentScore: number;
  homeTeam: string;
  awayTeam: string;
}

export default function Header({
  clock,
  fuel,
  streak,
  currentScore,
  homeTeam,
  awayTeam,
}: HeaderProps) {
  const isLowTime = clock <= 60;
  const isCriticalTime = clock <= 30;

  return (
    <div className="w-full">
      {/* Game Info Bar */}
      <div className="bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-purple-900/80 backdrop-blur-sm rounded-xl p-3 mb-3 border border-purple-500/30">
        <div className="text-center">
          <div className="text-xs text-purple-300 uppercase tracking-wider mb-1">Live Game</div>
          <div className="text-sm font-bold text-white">
            {homeTeam} vs {awayTeam}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="text-2xl font-bold text-yellow-400">{currentScore}</span>
            <span className="text-xs text-gray-400">Combined Score</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1.5"></span>
              <span className="text-xs text-red-400 font-medium">LIVE</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        {/* Streak */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-green-900/60 to-green-800/40 rounded-xl px-4 py-2 border border-green-500/30">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-green-400">Streak</div>
            <div className="text-lg font-bold text-white flex items-center">
              x{streak}
              {streak >= 3 && <span className="ml-1">🔥</span>}
            </div>
          </div>
        </div>

        {/* Clock */}
        <div className={`flex-1 text-center py-2 px-4 rounded-xl border ${
          isCriticalTime
            ? 'bg-red-900/60 border-red-500/50 animate-pulse'
            : isLowTime
              ? 'bg-orange-900/60 border-orange-500/50'
              : 'bg-slate-800/60 border-slate-600/50'
        }`}>
          <div className="text-xs text-gray-400 uppercase">Time Left</div>
          <div className={`text-3xl font-mono font-bold ${
            isCriticalTime ? 'text-red-400' : isLowTime ? 'text-orange-400' : 'text-white'
          }`}>
            {formatTime(clock)}
          </div>
        </div>

        {/* Fuel */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-900/60 to-amber-800/40 rounded-xl px-4 py-2 border border-yellow-500/30">
          <div className="text-2xl">⚡</div>
          <div>
            <div className="text-xs text-yellow-400">Fuel</div>
            <div className="text-lg font-bold text-white">{fuel.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

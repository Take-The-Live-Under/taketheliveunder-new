'use client';

import { Pick } from '@/lib/gameEngine';

interface ResultsModalProps {
  isOpen: boolean;
  finalScore: number;
  picks: Pick[];
  totalPayout: number;
  newFuel: number;
  streak: number;
  hasHit: boolean;
  onPlayAgain: () => void;
}

export default function ResultsModal({
  isOpen,
  finalScore,
  picks,
  totalPayout,
  newFuel,
  streak,
  hasHit,
  onPlayAgain,
}: ResultsModalProps) {
  if (!isOpen) return null;

  const totalWagered = picks.length * 100;
  const netProfit = totalPayout - totalWagered;
  const isProfit = netProfit > 0;

  const hitCount = picks.filter(p => p.result === 'HIT').length;
  const nearCount = picks.filter(p => p.result === 'NEAR_2' || p.result === 'NEAR_4').length;
  const missCount = picks.filter(p => p.result === 'MISS').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-600/50 shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center ${
          hasHit
            ? 'bg-gradient-to-r from-green-900/50 via-emerald-900/50 to-green-900/50'
            : 'bg-gradient-to-r from-slate-700/50 via-slate-600/50 to-slate-700/50'
        }`}>
          <div className="text-5xl mb-3">
            {hasHit ? '🎉' : '😢'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {hasHit ? 'Winner!' : 'Game Over'}
          </h2>
          <div className="text-gray-400">
            Final Score: <span className="text-2xl font-bold text-yellow-400">{finalScore}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 grid grid-cols-3 gap-3 border-b border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{hitCount}</div>
            <div className="text-xs text-gray-500 uppercase">Hits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{nearCount}</div>
            <div className="text-xs text-gray-500 uppercase">Near</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{missCount}</div>
            <div className="text-xs text-gray-500 uppercase">Miss</div>
          </div>
        </div>

        {/* Picks list */}
        <div className="p-4 max-h-48 overflow-y-auto">
          <div className="text-xs text-gray-500 uppercase mb-2">Your Picks</div>
          <div className="space-y-2">
            {picks.map((pick, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  pick.result === 'HIT'
                    ? 'bg-green-900/30 border border-green-500/30'
                    : pick.result === 'NEAR_2' || pick.result === 'NEAR_4'
                      ? 'bg-yellow-900/30 border border-yellow-500/30'
                      : 'bg-slate-800/50 border border-slate-700/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">{pick.score}</span>
                  <span className="text-sm text-gray-400">{pick.totalMultiplier.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    pick.result === 'HIT'
                      ? 'bg-green-500/20 text-green-400'
                      : pick.result === 'NEAR_2'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : pick.result === 'NEAR_4'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-red-500/20 text-red-400'
                  }`}>
                    {pick.result === 'HIT' ? 'HIT!' :
                     pick.result === 'NEAR_2' ? 'NEAR (2)' :
                     pick.result === 'NEAR_4' ? 'NEAR (4)' : 'MISS'}
                  </span>
                  <span className={`font-bold ${pick.payout && pick.payout > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    +{pick.payout || 0}
                  </span>
                </div>
              </div>
            ))}
            {picks.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No picks made
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-800/50 border-t border-slate-700/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400">Wagered:</span>
            <span className="text-white font-medium">-{totalWagered} ⚡</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400">Won:</span>
            <span className="text-green-400 font-medium">+{totalPayout} ⚡</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
            <span className="text-gray-400">Net Profit:</span>
            <span className={`text-xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{netProfit} ⚡
            </span>
          </div>
        </div>

        {/* New totals */}
        <div className="p-4 flex justify-between items-center bg-gradient-to-r from-yellow-900/30 to-amber-900/30">
          <div>
            <div className="text-xs text-gray-500 uppercase">New Fuel</div>
            <div className="text-xl font-bold text-yellow-400">⚡ {newFuel.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase">Streak</div>
            <div className="text-xl font-bold text-white flex items-center justify-end gap-1">
              x{streak}
              {streak >= 3 && <span>🔥</span>}
            </div>
          </div>
        </div>

        {/* Play Again */}
        <div className="p-4">
          <button
            onClick={onPlayAgain}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-yellow-500/25"
          >
            🎮 Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

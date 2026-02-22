'use client';

import { useEffect, useState } from 'react';

interface BonusBarProps {
  isActive: boolean;
  multiplier: number;
  timeRemaining: number;
  isSpinning: boolean;
}

const SLOT_SYMBOLS = ['🏀', '⭐', '🔥', '💰', '🎯', '⚡'];

export default function BonusBar({
  isActive,
  multiplier,
  timeRemaining,
  isSpinning,
}: BonusBarProps) {
  const [slots, setSlots] = useState(['🏀', '⭐', '🔥']);
  const [spinningSlots, setSpinningSlots] = useState([false, false, false]);

  useEffect(() => {
    if (isSpinning) {
      // Start spinning animation
      setSpinningSlots([true, true, true]);

      // Stop slots one by one
      const timers = [
        setTimeout(() => {
          setSlots(prev => [SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)], prev[1], prev[2]]);
          setSpinningSlots(prev => [false, prev[1], prev[2]]);
        }, 500),
        setTimeout(() => {
          setSlots(prev => [prev[0], SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)], prev[2]]);
          setSpinningSlots(prev => [prev[0], false, prev[2]]);
        }, 800),
        setTimeout(() => {
          setSlots(prev => [prev[0], prev[1], SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]]);
          setSpinningSlots([false, false, false]);
        }, 1100),
      ];

      return () => timers.forEach(clearTimeout);
    }
  }, [isSpinning]);

  const progress = isActive ? (timeRemaining / 10000) * 100 : 0;

  return (
    <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
      isActive
        ? 'bg-gradient-to-r from-amber-900/80 via-yellow-800/80 to-orange-900/80 border-yellow-500/50 shadow-lg shadow-yellow-500/20'
        : 'bg-slate-800/60 border-slate-600/30'
    }`}>
      {/* Progress bar background */}
      {isActive && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="relative flex items-center justify-between p-3">
        {/* Left - Timer indicator */}
        <div className="flex items-center gap-2">
          {isActive && (
            <div className="text-xs text-yellow-300 font-medium animate-pulse">
              +{Math.ceil(timeRemaining / 1000)}s
            </div>
          )}
        </div>

        {/* Center - Slot machine */}
        <div className="flex items-center gap-1">
          <div className="text-xs text-gray-400 mr-2 uppercase tracking-wider">
            {isActive ? 'Random Bonus!' : 'Bonus'}
          </div>

          <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1">
            {slots.map((symbol, i) => (
              <div
                key={i}
                className={`w-10 h-10 flex items-center justify-center rounded-md text-2xl
                  ${spinningSlots[i] ? 'animate-spin-slot bg-slate-700' : 'bg-slate-800'}
                  ${isActive && !spinningSlots[i] ? 'ring-2 ring-yellow-500/50' : ''}
                `}
              >
                {spinningSlots[i] ? '?' : symbol}
              </div>
            ))}
          </div>

          {/* Multiplier display */}
          <div className={`ml-2 px-3 py-1 rounded-lg font-bold text-lg transition-all ${
            isActive
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black scale-110'
              : 'bg-slate-700 text-gray-400'
          }`}>
            +{isActive ? multiplier.toFixed(1) : '0.0'}x
          </div>
        </div>

        {/* Right - Fire indicator */}
        <div className={`text-2xl transition-all ${isActive ? 'animate-bounce' : 'opacity-30'}`}>
          🔥
        </div>
      </div>

      {/* Active glow effect */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-yellow-500/10 to-transparent animate-pulse" />
        </div>
      )}
    </div>
  );
}

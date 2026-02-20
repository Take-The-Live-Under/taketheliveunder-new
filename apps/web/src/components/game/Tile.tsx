'use client';

import { useEffect, useState, memo } from 'react';

interface TileProps {
  score: number;
  baseMultiplier: number;
  liveBoost: number;
  isSelected: boolean;
  isDisabled: boolean;
  isCurrentScore: boolean;
  isBoosted: boolean;
  bonusMultiplier: number;
  onSelect: () => void;
}

// Glass shard component
function GlassShard({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute w-2 h-3 bg-gradient-to-br from-white/60 to-blue-200/40 animate-shard"
      style={{
        left: '50%',
        top: '50%',
        animationDelay: `${delay}ms`,
        '--shard-x': `${x}px`,
        '--shard-y': `${y}px`,
      } as React.CSSProperties}
    />
  );
}

// Money/coin particle
function MoneyParticle({ delay, x, y, emoji }: { delay: number; x: number; y: number; emoji: string }) {
  return (
    <div
      className="absolute text-lg animate-money-explode"
      style={{
        left: '50%',
        top: '50%',
        animationDelay: `${delay}ms`,
        '--money-x': `${x}px`,
        '--money-y': `${y}px`,
      } as React.CSSProperties}
    >
      {emoji}
    </div>
  );
}

const Tile = memo(function Tile({
  score,
  baseMultiplier,
  liveBoost,
  isSelected,
  isDisabled,
  isCurrentScore,
  isBoosted,
  bonusMultiplier,
  onSelect,
}: TileProps) {
  const [isBreaking, setIsBreaking] = useState(false);
  const [showMoney, setShowMoney] = useState(false);
  const [wasCurrentScore, setWasCurrentScore] = useState(false);

  const totalBoost = liveBoost + (isBoosted ? bonusMultiplier : 0);
  const displayMultiplier = baseMultiplier + totalBoost;
  const hasBoost = totalBoost > 0;

  // Trigger breaking animation when rocket passes through
  useEffect(() => {
    if (isCurrentScore && !wasCurrentScore) {
      setIsBreaking(true);
      if (isSelected) {
        setShowMoney(true);
      }
      const timer = setTimeout(() => {
        setIsBreaking(false);
        setShowMoney(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
    setWasCurrentScore(isCurrentScore);
  }, [isCurrentScore, wasCurrentScore, isSelected]);

  // Generate random shards
  const shards = Array.from({ length: 8 }, (_, i) => ({
    delay: i * 30,
    x: (Math.random() - 0.5) * 80,
    y: (Math.random() - 0.5) * 80,
  }));

  // Generate money particles
  const moneyParticles = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 50,
    x: (Math.random() - 0.5) * 120,
    y: -30 - Math.random() * 80,
    emoji: ['💰', '💵', '🪙', '💎', '⚡'][Math.floor(Math.random() * 5)],
  }));

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`
        relative w-full aspect-square rounded-xl font-bold transition-all duration-200 overflow-hidden
        flex flex-col items-center justify-center gap-0.5
        ${isDisabled
          ? 'bg-slate-800/40 border-slate-700/30 cursor-not-allowed opacity-50'
          : isSelected
            ? 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-400 scale-105 shadow-lg shadow-blue-500/30 ring-2 ring-blue-400'
            : isCurrentScore
              ? 'bg-gradient-to-br from-yellow-600/80 to-orange-700/80 border-yellow-400 scale-110 shadow-xl shadow-yellow-500/40 ring-2 ring-yellow-400'
              : hasBoost
                ? 'bg-gradient-to-br from-orange-900/80 to-amber-900/60 border-orange-500/50 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20'
                : 'bg-gradient-to-br from-slate-700/80 to-slate-800/80 border-slate-600/50 hover:border-slate-500 hover:scale-102 hover:bg-slate-700'
        }
        border-2
        ${isBreaking ? 'animate-shake' : ''}
      `}
    >
      {/* Breaking glass effect */}
      {isBreaking && !isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          {shards.map((shard, i) => (
            <GlassShard key={i} {...shard} />
          ))}
          {/* Crack lines */}
          <svg className="absolute inset-0 w-full h-full animate-crack-appear" viewBox="0 0 100 100">
            <path d="M50 0 L45 30 L20 50 L45 45 L50 100" stroke="white" strokeWidth="1" fill="none" opacity="0.6" />
            <path d="M50 0 L55 25 L80 40 L60 50 L50 100" stroke="white" strokeWidth="1" fill="none" opacity="0.6" />
            <path d="M0 50 L30 45 L50 50 L70 55 L100 50" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
          </svg>
        </div>
      )}

      {/* Money explosion effect */}
      {showMoney && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {moneyParticles.map((particle, i) => (
            <MoneyParticle key={i} {...particle} />
          ))}
          {/* Flash effect */}
          <div className="absolute inset-0 bg-yellow-400/50 animate-flash rounded-xl" />
        </div>
      )}

      {/* Current score rocket indicator */}
      {isCurrentScore && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping shadow-lg shadow-yellow-400/50" />
          <div className="absolute inset-0 w-3 h-3 bg-yellow-400 rounded-full" />
        </div>
      )}

      {/* Score */}
      <div className={`text-xl sm:text-2xl ${
        isCurrentScore
          ? 'text-yellow-100 font-black'
          : isSelected ? 'text-white' : hasBoost ? 'text-orange-200' : 'text-white'
      }`}>
        {score}
      </div>

      {/* Multiplier */}
      <div className={`text-xs sm:text-sm ${
        isCurrentScore
          ? 'text-yellow-200 font-bold'
          : isSelected
            ? 'text-blue-200'
            : hasBoost
              ? 'text-orange-300 font-bold'
              : 'text-gray-400'
      }`}>
        {displayMultiplier.toFixed(1)}x
      </div>

      {/* Live boost indicator */}
      {hasBoost && !isSelected && !isCurrentScore && (
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full text-[10px] text-black font-bold animate-pulse">
          +{totalBoost.toFixed(1)}x
        </div>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Glow effect for boosted tiles */}
      {hasBoost && !isSelected && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-orange-500/20 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Current score glow */}
      {isCurrentScore && (
        <div className="absolute inset-0 rounded-xl bg-yellow-400/20 animate-pulse pointer-events-none" />
      )}
    </button>
  );
});

export default Tile;

'use client';

import { useEffect, useState, useMemo } from 'react';
import Tile from './Tile';
import { Tile as TileType, formatTime } from '@/lib/gameEngine';

interface GridProps {
  tiles: Map<number, TileType>;
  currentScore: number;
  selectedScores: Set<number>;
  bonusActive: boolean;
  bonusMultiplier: number;
  onSelectTile: (score: number) => void;
  canAffordPick: boolean;
  timeRemaining: number;
}

// Grid configuration
const COLS = 6; // Time columns (every 15 seconds)
const ROWS = 6; // Score rows (current score in middle)

export default function Grid({
  tiles,
  currentScore,
  selectedScores,
  bonusActive,
  bonusMultiplier,
  onSelectTile,
  canAffordPick,
  timeRemaining,
}: GridProps) {
  const [moneyRain, setMoneyRain] = useState(false);
  const [multiplierBoost, setMultiplierBoost] = useState(1);
  const [shotClock, setShotClock] = useState(15);

  // Shot clock - counts down every second, resets at 15
  useEffect(() => {
    const newShotClock = timeRemaining % 15;
    setShotClock(newShotClock === 0 && timeRemaining > 0 ? 15 : newShotClock);
  }, [timeRemaining]);

  // Money rain every 30 seconds - doubles multipliers!
  useEffect(() => {
    if (timeRemaining > 0 && timeRemaining % 30 === 0 && timeRemaining < 300) {
      setMoneyRain(true);
      setMultiplierBoost(2);
      const timer = setTimeout(() => {
        setMoneyRain(false);
        setMultiplierBoost(1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  // Generate time checkpoints for columns (upcoming 15-second marks)
  // Nearest checkpoint on LEFT, furthest on RIGHT
  const timeColumns = useMemo(() => {
    const cols: number[] = [];
    // Find next 15-second checkpoint (the one we're approaching)
    const nextCheckpoint = Math.floor(timeRemaining / 15) * 15;
    for (let i = 0; i < COLS; i++) {
      const checkpoint = nextCheckpoint - (i * 15);
      if (checkpoint >= 0) {
        cols.push(checkpoint);
      }
    }
    return cols; // Nearest time (highest) on left, furthest (lowest) on right
  }, [timeRemaining]);

  // Score rows - center on current score, show above and below
  const scoreRows = useMemo(() => {
    const rows: number[] = [];
    // Show 3 rows above current, current, 2 rows below (but not below 0)
    const offsets = [+6, +4, +2, 0, -2, -4]; // High to low
    for (const offset of offsets) {
      const score = currentScore + offset;
      if (score >= 0) {
        rows.push(score);
      }
    }
    return rows; // Already ordered high to low
  }, [currentScore]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with Shot Clock */}
      <div className="flex-shrink-0 flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏀</span>
          <div>
            <div className="text-xs text-gray-500">SCORE</div>
            <div className="text-2xl font-black text-yellow-400">{currentScore}</div>
          </div>
        </div>

        {/* Shot Clock */}
        <div className="flex flex-col items-center bg-slate-800 rounded-lg px-4 py-2">
          <span className="text-[10px] text-orange-400 uppercase tracking-wider">Shot Clock</span>
          <div className={`text-4xl font-mono font-black ${shotClock <= 5 ? 'text-red-500 animate-pulse' : 'text-orange-400'}`}>
            {shotClock}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">GAME TIME</div>
          <div className={`text-2xl font-mono font-black ${timeRemaining <= 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden p-3">

        {/* MONEY RAIN ANIMATION */}
        {moneyRain && (
          <div className="absolute inset-0 z-50 pointer-events-none">
            <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="text-4xl sm:text-6xl font-black text-yellow-400 animate-bounce whitespace-nowrap"
                   style={{ textShadow: '0 0 40px rgba(250,204,21,0.8)' }}>
                2X MULTIPLIER!
              </div>
            </div>
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute text-2xl animate-fall"
                style={{
                  left: `${5 + (i * 6)}%`,
                  top: '-30px',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {['💰', '💵', '🪙', '💎', '⚡'][i % 5]}
              </div>
            ))}
          </div>
        )}

        {/* Column Headers (Time) - Nearest on left */}
        <div className="flex mb-2 ml-10">
          {timeColumns.map((time, i) => {
            // First column (i=0) is the nearest upcoming checkpoint
            const isNext = i === 0;
            const secondsUntil = timeRemaining - time;
            return (
              <div
                key={time}
                className={`flex-1 text-center text-xs font-mono font-bold py-1.5 mx-0.5 rounded transition-all ${
                  isNext
                    ? 'bg-yellow-500 text-black scale-105 shadow-lg shadow-yellow-500/30'
                    : 'bg-slate-700/50 text-gray-400'
                }`}
              >
                <div>{formatTime(time)}</div>
                {isNext && <div className="text-[9px] opacity-75">in {secondsUntil}s</div>}
              </div>
            );
          })}
        </div>

        {/* Grid with Row Labels */}
        <div className="flex flex-col gap-1.5">
          {scoreRows.map((score, rowIndex) => {
            const isCurrentScoreRow = score === currentScore;
            return (
              <div
                key={score}
                className={`flex items-center gap-1 rounded-lg transition-all ${
                  isCurrentScoreRow ? 'bg-yellow-500/10 -mx-1 px-1' : ''
                }`}
              >
                {/* Row Label (Score) */}
                <div className={`w-8 text-right text-sm font-mono font-bold ${
                  isCurrentScoreRow ? 'text-yellow-400' : 'text-gray-500'
                }`}>
                  {score}
                  {isCurrentScoreRow && <span className="ml-1 text-xs">◀</span>}
                </div>

                {/* Tiles for this row */}
                {timeColumns.map((time, colIndex) => {
                  const tile = tiles.get(score);
                  const isSelected = selectedScores.has(score);
                  const isNextCheckpoint = colIndex === 0;
                  const isPassed = timeRemaining < time;
                  const canSelect = canAffordPick || isSelected;

                  return (
                    <div
                      key={`${time}-${score}`}
                      className={`flex-1 aspect-square max-h-14 transition-all ${
                        isNextCheckpoint && isCurrentScoreRow ? 'scale-110 z-10' : ''
                      }`}
                    >
                      {tile && (
                        <Tile
                          score={score}
                          baseMultiplier={tile.baseMultiplier * multiplierBoost}
                          liveBoost={tile.liveBoost}
                          isSelected={isSelected}
                          isDisabled={!canSelect || isPassed}
                          isCurrentScore={isCurrentScoreRow && isNextCheckpoint}
                          isBoosted={bonusActive || moneyRain}
                          bonusMultiplier={moneyRain ? 1 : bonusMultiplier}
                          onSelect={() => onSelectTile(score)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Pick Bar */}
      <div className="flex-shrink-0 mt-2 bg-slate-800/50 rounded-lg p-2">
        <div className="text-[10px] text-gray-500 mb-1">QUICK PICK (for next checkpoint):</div>
        <div className="flex gap-1.5 justify-center">
          {scoreRows.map(score => {
            const tile = tiles.get(score);
            if (!tile) return null;
            const isSelected = selectedScores.has(score);
            const isCurrentScoreRow = score === currentScore;

            return (
              <button
                key={score}
                onClick={() => onSelectTile(score)}
                disabled={!canAffordPick && !isSelected}
                className={`flex-shrink-0 px-3 py-2 rounded-lg font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30 scale-105 ring-2 ring-green-400'
                    : isCurrentScoreRow
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-500/30'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                } ${!canAffordPick && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="text-lg">{score}</div>
                <div className="text-[10px] text-gray-300">{(tile.baseMultiplier * multiplierBoost).toFixed(1)}x</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

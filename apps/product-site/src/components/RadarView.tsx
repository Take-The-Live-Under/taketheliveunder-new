'use client';

import { useEffect, useState } from 'react';
import { Game } from '@/types/game';

interface RadarViewProps {
  games: Game[];
}

export default function RadarView({ games }: RadarViewProps) {
  const [rotation, setRotation] = useState(0);
  const liveGames = games.filter(g => g.status === 'in');

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate position on radar based on trigger proximity
  const getGamePosition = (game: Game) => {
    if (game.currentPPM === null || game.requiredPPM === null) {
      return { x: 50, y: 50, distance: 100 };
    }

    const ppmGap = Math.abs(game.currentPPM - game.requiredPPM);
    const gameMinute = 40 - game.minutesRemainingReg;

    // Distance from center = how far from triggering (closer = more likely)
    const distance = Math.min(ppmGap * 20, 45); // 0-45% from center

    // Angle based on game minute (spread around the circle)
    const angle = (gameMinute / 40) * 360;

    const x = 50 + distance * Math.cos((angle - 90) * Math.PI / 180);
    const y = 50 + distance * Math.sin((angle - 90) * Math.PI / 180);

    return { x, y, distance };
  };

  const getBlipColor = (game: Game) => {
    if (game.triggerType === 'over') return '#f97316'; // orange
    if (game.triggerType === 'tripleDipper') return '#facc15'; // yellow
    if (game.triggerType === 'under') return '#22c55e'; // green
    return '#166534'; // dim green
  };

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      {/* Radar background */}
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Background circles */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="#14532d" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="#14532d" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="25" fill="none" stroke="#14532d" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="15" fill="none" stroke="#14532d" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="5" fill="none" stroke="#22c55e" strokeWidth="0.5" />

        {/* Cross lines */}
        <line x1="50" y1="5" x2="50" y2="95" stroke="#14532d" strokeWidth="0.5" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="#14532d" strokeWidth="0.5" />

        {/* Sweep line */}
        <line
          x1="50"
          y1="50"
          x2={50 + 45 * Math.cos((rotation - 90) * Math.PI / 180)}
          y2={50 + 45 * Math.sin((rotation - 90) * Math.PI / 180)}
          stroke="#22c55e"
          strokeWidth="1"
          opacity="0.8"
        />

        {/* Sweep gradient trail */}
        <defs>
          <linearGradient id="sweepGradient" gradientTransform={`rotate(${rotation - 90}, 50, 50)`}>
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d={`M 50 50 L ${50 + 45 * Math.cos((rotation - 90) * Math.PI / 180)} ${50 + 45 * Math.sin((rotation - 90) * Math.PI / 180)} A 45 45 0 0 0 ${50 + 45 * Math.cos((rotation - 120) * Math.PI / 180)} ${50 + 45 * Math.sin((rotation - 120) * Math.PI / 180)} Z`}
          fill="url(#sweepGradient)"
        />

        {/* Game blips */}
        {liveGames.map(game => {
          const pos = getGamePosition(game);
          const color = getBlipColor(game);
          const isTriggered = game.triggerType !== null;

          return (
            <g key={game.id}>
              {/* Glow effect for triggered */}
              {isTriggered && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="4"
                  fill={color}
                  opacity="0.3"
                  className="animate-ping"
                />
              )}
              {/* Main blip */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isTriggered ? 2.5 : 1.5}
                fill={color}
              />
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx="50" cy="50" r="2" fill="#22c55e" />
      </svg>

      {/* Labels */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-green-700 font-mono">
        MIN 0
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-green-700 font-mono">
        MIN 20
      </div>
      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-green-700 font-mono">
        MIN 30
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-700 font-mono">
        MIN 10
      </div>

      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-[10px] font-mono pb-8">
        <span className="text-orange-400">● OVER</span>
        <span className="text-yellow-400">● TRIPLE</span>
        <span className="text-green-400">● UNDER</span>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 text-right font-mono">
        <div className="text-[10px] text-green-700">SCANNING</div>
        <div className="text-lg text-green-400">{liveGames.length}</div>
        <div className="text-[10px] text-green-700">GAMES</div>
      </div>
    </div>
  );
}

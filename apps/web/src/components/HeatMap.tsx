'use client';

import { Game } from '@/types/game';

interface HeatMapProps {
  games: Game[];
  onGameClick?: (game: Game) => void;
}

export default function HeatMap({ games, onGameClick }: HeatMapProps) {
  const liveGames = games.filter(g => g.status === 'in');

  // Calculate heat level (0-100) based on trigger proximity
  const getHeatLevel = (game: Game): number => {
    if (game.currentPPM === null || game.requiredPPM === null) return 0;

    const gameMinute = 40 - game.minutesRemainingReg;
    const ppmGap = game.currentPPM - game.requiredPPM;

    // For OVER: positive gap is good (hot)
    // For UNDER: negative gap is good (cold, but "hot" for triggering)
    let heat = 0;

    // Check OVER proximity (minute 20-30, gap >= 0.3)
    if (gameMinute >= 18 && gameMinute <= 32) {
      if (ppmGap > 0) {
        heat = Math.min((ppmGap / 0.5) * 50, 50);
      }
    }

    // Check UNDER proximity (gap <= -1.0, reqPPM >= 4.5)
    if (game.requiredPPM >= 4.0 && ppmGap < 0) {
      const underHeat = Math.min((Math.abs(ppmGap) / 1.5) * 50, 50);
      heat = Math.max(heat, underHeat);
    }

    // Boost if already triggered
    if (game.triggerType) heat = 100;

    return heat;
  };

  const getHeatColor = (heat: number, game: Game) => {
    if (game.triggerType === 'over') return 'bg-orange-500';
    if (game.triggerType === 'tripleDipper') return 'bg-yellow-500';
    if (game.triggerType === 'under') return 'bg-green-500';

    if (heat > 70) return 'bg-yellow-600';
    if (heat > 50) return 'bg-green-600';
    if (heat > 30) return 'bg-green-700';
    if (heat > 10) return 'bg-green-800';
    return 'bg-green-900';
  };

  const getTeamAbbrev = (name: string) => {
    // Get first 3 letters or abbreviation
    const words = name.split(' ');
    if (words.length === 1) return name.slice(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').slice(0, 3).toUpperCase();
  };

  // Sort by heat level
  const sortedGames = [...liveGames].sort((a, b) => getHeatLevel(b) - getHeatLevel(a));

  return (
    <div className="font-mono">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-green-700">// TRIGGER_HEAT_MAP</div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-green-900">COLD</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 bg-green-900"></div>
            <div className="w-3 h-3 bg-green-800"></div>
            <div className="w-3 h-3 bg-green-700"></div>
            <div className="w-3 h-3 bg-green-600"></div>
            <div className="w-3 h-3 bg-yellow-600"></div>
            <div className="w-3 h-3 bg-orange-500"></div>
          </div>
          <span className="text-orange-400">HOT</span>
        </div>
      </div>

      {liveGames.length === 0 ? (
        <div className="text-center py-8 text-green-700">
          // NO_LIVE_GAMES_TO_DISPLAY
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1">
          {sortedGames.map(game => {
            const heat = getHeatLevel(game);
            const colorClass = getHeatColor(heat, game);

            return (
              <div
                key={game.id}
                onClick={() => onGameClick?.(game)}
                className={`
                  ${colorClass}
                  aspect-square p-1 cursor-pointer
                  transition-all duration-200
                  hover:scale-110 hover:z-10
                  flex flex-col items-center justify-center
                  text-[8px] sm:text-[10px]
                  ${game.triggerType ? 'animate-pulse ring-1 ring-white/30' : ''}
                `}
                title={`${game.awayTeam} @ ${game.homeTeam}`}
              >
                <div className="text-black/80 font-bold truncate w-full text-center">
                  {getTeamAbbrev(game.awayTeam)}
                </div>
                <div className="text-black/60">@</div>
                <div className="text-black/80 font-bold truncate w-full text-center">
                  {getTeamAbbrev(game.homeTeam)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      <div className="mt-4 pt-4 border-t border-green-900/50 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-400">
            {liveGames.filter(g => g.triggerType).length}
          </div>
          <div className="text-[10px] text-green-700">TRIGGERED</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-400">
            {liveGames.filter(g => !g.triggerType && getHeatLevel(g) > 50).length}
          </div>
          <div className="text-[10px] text-green-700">WARMING</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {liveGames.filter(g => !g.triggerType && getHeatLevel(g) <= 50).length}
          </div>
          <div className="text-[10px] text-green-700">MONITORING</div>
        </div>
      </div>
    </div>
  );
}

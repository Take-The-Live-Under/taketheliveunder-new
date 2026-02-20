'use client';

import { GamePrediction } from '@/app/api/predictions/route';
import { getTeamBadge } from '@/lib/teamFilters';

interface UpcomingGameCardProps {
  prediction: GamePrediction;
  onClick?: () => void;
}

function formatGameTime(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

export default function UpcomingGameCard({ prediction, onClick }: UpcomingGameCardProps) {
  const {
    homeTeam,
    awayTeam,
    homeRank,
    awayRank,
    kenpomHomeScore,
    kenpomAwayScore,
    kenpomTotal,
    kenpomWinProb,
    kenpomTempo,
    vegasLine,
    lineDiff,
    confidence,
    gameTime,
  } = prediction;

  // Get team badges
  const homeBadge = getTeamBadge(homeTeam);
  const awayBadge = getTeamBadge(awayTeam);

  // Determine if KenPom favors under (KenPom total < Vegas line)
  const favorsUnder = lineDiff !== null && lineDiff > 0;
  const favorsOver = lineDiff !== null && lineDiff < 0;
  const lineDiffAbs = lineDiff !== null ? Math.abs(lineDiff) : null;

  // Color coding for line difference
  const getLineDiffStyle = () => {
    if (lineDiff === null) return { color: 'text-green-700', label: '' };
    const abs = Math.abs(lineDiff);
    if (abs >= 5) return { color: favorsUnder ? 'text-blue-400' : 'text-orange-400', label: 'STRONG' };
    if (abs >= 3) return { color: favorsUnder ? 'text-blue-400' : 'text-orange-400', label: 'GOOD' };
    if (abs >= 1) return { color: 'text-green-500', label: '' };
    return { color: 'text-green-700', label: '' };
  };

  const lineDiffStyle = getLineDiffStyle();

  // Tempo indicator
  const getTempoStyle = () => {
    if (kenpomTempo >= 72) return { label: 'FAST', color: 'text-orange-400' };
    if (kenpomTempo >= 68) return { label: 'AVG', color: 'text-green-500' };
    return { label: 'SLOW', color: 'text-blue-400' };
  };

  const tempoStyle = getTempoStyle();

  return (
    <div
      onClick={onClick}
      className={`border p-4 transition-all duration-200 font-mono bg-black/40 hover:border-green-700 ${
        lineDiffAbs && lineDiffAbs >= 3
          ? favorsUnder
            ? 'border-blue-700/50'
            : 'border-orange-700/50'
          : 'border-green-900'
      } ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      {/* KenPom Signal Banner */}
      {lineDiffAbs !== null && lineDiffAbs >= 3 && (
        <div className={`mb-3 flex items-center justify-between gap-2 px-2 py-1.5 ${
          favorsUnder ? 'bg-blue-900/30 border border-blue-800' : 'bg-orange-900/30 border border-orange-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${favorsUnder ? 'text-blue-400' : 'text-orange-400'}`}>
              {favorsUnder ? '❄️ KENPOM_UNDER' : '🔥 KENPOM_OVER'}
            </span>
          </div>
          <span className={`text-xs font-bold ${lineDiffStyle.color}`}>
            {lineDiffStyle.label} {lineDiffAbs >= 1 && `(${lineDiffAbs.toFixed(1)} pts)`}
          </span>
        </div>
      )}

      {/* Game Time */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-green-700">
          {formatGameTime(gameTime)} ET
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 border ${tempoStyle.color} border-current`}>
            {tempoStyle.label} TEMPO
          </span>
          <span className="text-[10px] text-green-600">{kenpomTempo.toFixed(0)} poss</span>
        </div>
      </div>

      {/* Teams with KenPom Scores */}
      <div className="mb-3">
        {/* Away Team */}
        <div className="flex items-center justify-between gap-3 py-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[10px] text-green-700 font-medium w-8">AWAY</span>
            {awayRank && awayRank <= 50 && (
              <span className="text-[10px] text-yellow-500 font-bold">#{awayRank}</span>
            )}
            <span className="text-sm font-semibold text-green-400 truncate">{awayTeam}</span>
            {awayBadge && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                awayBadge.color === 'red' ? 'border-red-700 text-red-400 bg-red-900/30' :
                awayBadge.color === 'orange' ? 'border-orange-700 text-orange-400 bg-orange-900/30' :
                awayBadge.color === 'blue' ? 'border-blue-700 text-blue-400 bg-blue-900/30' :
                'border-green-700 text-green-400 bg-green-900/30'
              }`}>
                {awayBadge.text}
              </span>
            )}
          </div>
          <span className="text-lg font-bold text-green-500 tabular-nums">{kenpomAwayScore.toFixed(0)}</span>
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between gap-3 py-1.5 border-t border-green-900/30">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[10px] text-green-700 font-medium w-8">HOME</span>
            {homeRank && homeRank <= 50 && (
              <span className="text-[10px] text-yellow-500 font-bold">#{homeRank}</span>
            )}
            <span className="text-sm font-semibold text-green-400 truncate">{homeTeam}</span>
            {homeBadge && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                homeBadge.color === 'red' ? 'border-red-700 text-red-400 bg-red-900/30' :
                homeBadge.color === 'orange' ? 'border-orange-700 text-orange-400 bg-orange-900/30' :
                homeBadge.color === 'blue' ? 'border-blue-700 text-blue-400 bg-blue-900/30' :
                'border-green-700 text-green-400 bg-green-900/30'
              }`}>
                {homeBadge.text}
              </span>
            )}
          </div>
          <span className="text-lg font-bold text-green-500 tabular-nums">{kenpomHomeScore.toFixed(0)}</span>
        </div>
      </div>

      {/* KenPom Stats Bar */}
      <div className="grid grid-cols-3 gap-2 bg-green-900/20 border border-green-900/50 p-2">
        {/* KenPom Total */}
        <div className="text-center">
          <div className="text-[10px] text-green-700 mb-0.5">KENPOM</div>
          <div className="text-sm font-bold text-green-400">{kenpomTotal.toFixed(1)}</div>
        </div>

        {/* Vegas Line */}
        <div className="text-center border-x border-green-900/50">
          <div className="text-[10px] text-green-700 mb-0.5">VEGAS</div>
          <div className="text-sm font-bold text-green-400">
            {vegasLine !== null ? vegasLine.toFixed(1) : '—'}
          </div>
        </div>

        {/* Line Difference */}
        <div className="text-center">
          <div className="text-[10px] text-green-700 mb-0.5">DIFF</div>
          <div className={`text-sm font-bold ${lineDiffStyle.color}`}>
            {lineDiff !== null ? (
              <>
                {favorsUnder ? '↓' : favorsOver ? '↑' : ''} {lineDiffAbs?.toFixed(1)}
              </>
            ) : '—'}
          </div>
        </div>
      </div>

      {/* Win Probability Bar */}
      <div className="mt-2 pt-2 border-t border-green-900/30">
        <div className="flex items-center justify-between text-[10px] text-green-700 mb-1">
          <span>{awayTeam.split(' ').pop()} {(100 - kenpomWinProb).toFixed(0)}%</span>
          <span>WIN PROB</span>
          <span>{homeTeam.split(' ').pop()} {kenpomWinProb.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 w-full bg-green-900/50 overflow-hidden flex">
          <div
            className="h-full bg-green-600 transition-all duration-500"
            style={{ width: `${100 - kenpomWinProb}%` }}
          />
          <div
            className="h-full bg-green-400 transition-all duration-500"
            style={{ width: `${kenpomWinProb}%` }}
          />
        </div>
      </div>
    </div>
  );
}

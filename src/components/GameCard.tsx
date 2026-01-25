'use client';

import { Game } from '@/types/game';

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

function formatPPM(ppm: number | null): string {
  if (ppm === null) return '—';
  return ppm.toFixed(2);
}

function getPeriodDisplay(game: Game): string {
  if (game.isOvertime) {
    const otNumber = game.period - 2;
    return otNumber > 1 ? `OT${otNumber}` : 'OT';
  }
  if (game.period === 1) return '1st Half';
  if (game.period === 2) return '2nd Half';
  return `Period ${game.period}`;
}

// Edge color coding based on PPM difference
function getEdgeColor(edge: number | null): { bg: string; text: string; label: string } {
  if (edge === null) return { bg: 'bg-slate-700', text: 'text-slate-400', label: '' };

  const absEdge = Math.abs(edge);

  if (absEdge >= 1.5) {
    return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'STRONG' };
  }
  if (absEdge >= 1.0) {
    return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'GOOD' };
  }
  if (absEdge >= 0.5) {
    return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'MODERATE' };
  }
  return { bg: 'bg-slate-700', text: 'text-slate-400', label: '' };
}

// Calculate trigger strength (0-100) based on how far above 4.5 the required PPM is
function getUnderTriggerStrength(requiredPPM: number | null): number {
  if (requiredPPM === null || requiredPPM < 4.5) return 0;
  const strength = Math.min(((requiredPPM - 4.5) / 1.5) * 100, 100);
  return Math.round(strength);
}

export default function GameCard({ game, onClick }: GameCardProps) {
  const isLive = game.status === 'in';
  const isUnderTriggered = game.triggeredFlag;
  const isOverTriggered = game.overTriggeredFlag;
  const triggerStrength = getUnderTriggerStrength(game.requiredPPM);

  // Calculate derived metrics
  const edge =
    game.requiredPPM !== null && game.currentPPM !== null
      ? game.requiredPPM - game.currentPPM
      : null;

  const edgeStyle = getEdgeColor(edge);

  // Projected final = current total + (current PPM * minutes remaining)
  const projectedFinal =
    game.currentPPM !== null && game.minutesRemainingReg > 0
      ? game.liveTotal + (game.currentPPM * game.minutesRemainingReg)
      : null;

  // Calculate if under-friendly (current PPM < required PPM means pace is slow)
  const isUnderFriendly =
    game.currentPPM !== null &&
    game.requiredPPM !== null &&
    game.currentPPM < game.requiredPPM;

  // Determine card styling based on trigger type
  const getCardStyle = () => {
    if (isUnderTriggered) {
      return 'border-yellow-500 bg-gradient-to-br from-yellow-900/20 to-slate-900 shadow-lg shadow-yellow-500/20 animate-pulse-glow';
    }
    if (isOverTriggered) {
      return 'border-blue-500 bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg shadow-blue-500/10';
    }
    return 'border-slate-700 bg-slate-800/50 hover:border-slate-600';
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border-2 p-5 transition-all duration-300 card-enter ${getCardStyle()} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
      {/* Trigger Badge */}
      {(isUnderTriggered || isOverTriggered) && (
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${isUnderTriggered ? 'bg-yellow-400' : 'bg-blue-400'} opacity-75`}></span>
                <span className={`relative inline-flex h-3 w-3 rounded-full ${isUnderTriggered ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
              </span>
              <span className={`text-sm font-bold uppercase tracking-wide ${isUnderTriggered ? 'text-yellow-400' : 'text-blue-400'}`}>
                {isUnderTriggered ? 'Golden Zone' : 'Over Edge'}
              </span>
            </div>
            {edge !== null && (
              <span className={`text-xs font-bold px-2 py-1 rounded ${edgeStyle.bg} ${edgeStyle.text}`}>
                {edgeStyle.label}
              </span>
            )}
          </div>
          {isUnderTriggered && (
            <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-yellow-500 to-orange-400"
                style={{ width: `${triggerStrength}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Teams & Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-slate-500 font-medium w-10">AWAY</span>
            <span className="text-base font-semibold text-slate-100 truncate">{game.awayTeam}</span>
            {/* Away team bonus indicator */}
            {isLive && game.awayBonusStatus && (game.awayBonusStatus.inBonus || game.awayBonusStatus.inDoubleBonus) && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                game.awayBonusStatus.inDoubleBonus
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {game.awayBonusStatus.inDoubleBonus ? '2X' : 'BONUS'}
              </span>
            )}
          </div>
          <span className="text-2xl font-bold text-white tabular-nums">{game.awayScore}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-slate-500 font-medium w-10">HOME</span>
            <span className="text-base font-semibold text-slate-100 truncate">{game.homeTeam}</span>
            {/* Home team bonus indicator */}
            {isLive && game.homeBonusStatus && (game.homeBonusStatus.inBonus || game.homeBonusStatus.inDoubleBonus) && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                game.homeBonusStatus.inDoubleBonus
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {game.homeBonusStatus.inDoubleBonus ? '2X' : 'BONUS'}
              </span>
            )}
          </div>
          <span className="text-2xl font-bold text-white tabular-nums">{game.homeScore}</span>
        </div>
      </div>

      {/* Game Status Bar */}
      <div className="mb-4 flex items-center gap-3 bg-slate-800/80 rounded-xl px-4 py-3">
        {isLive ? (
          <>
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
            <span className="text-sm font-semibold text-red-400">
              {game.clock} · {getPeriodDisplay(game)}
            </span>
            <span className="text-xs text-slate-500 ml-auto">
              {game.minutesRemainingReg.toFixed(1)} min left
            </span>
          </>
        ) : game.status === 'post' ? (
          <span className="text-sm font-medium text-slate-400">Final</span>
        ) : (
          <div className="flex items-center gap-2">
            {game.isTomorrow && (
              <span className="rounded bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-xs font-medium text-purple-400">
                Tomorrow
              </span>
            )}
            <span className="text-sm font-medium text-blue-400">
              {new Date(game.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        )}
        {game.isOvertime && (
          <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-400">
            OT
          </span>
        )}
      </div>

      {/* Foul Game Warning - appears around 4 min mark */}
      {isLive && game.foulGameWarning && (
        <div className={`mb-4 rounded-xl border p-3 ${
          game.foulGameWarningLevel === 'high'
            ? 'bg-gradient-to-r from-red-900/40 to-orange-900/40 border-red-500/30'
            : game.foulGameWarningLevel === 'medium'
            ? 'bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/30'
            : 'bg-gradient-to-r from-slate-800/60 to-slate-700/40 border-slate-600/30'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{game.foulGameWarningLevel === 'high' ? '🔥' : '⚠️'}</span>
            <div className="flex-1">
              <div className={`text-xs font-bold uppercase tracking-wide ${
                game.foulGameWarningLevel === 'high' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {game.foulGameWarningLevel === 'high' ? '🏀 Free Throw Frenzy - High Impact' : '🏀 Free Throw Frenzy Alert'}
              </div>
              {game.foulGameWarningMessage && (
                <div className="text-sm text-amber-200/90 mt-0.5">{game.foulGameWarningMessage}</div>
              )}
              {/* Show team-specific info */}
              <div className="flex flex-wrap gap-2 mt-2">
                {game.homeFoulGameInfo && (
                  <span className="text-xs bg-slate-700/50 rounded px-2 py-0.5 text-slate-300">
                    {game.homeTeam.split(' ')[0]}: {game.homeFoulGameInfo}
                  </span>
                )}
                {game.awayFoulGameInfo && (
                  <span className="text-xs bg-slate-700/50 rounded px-2 py-0.5 text-slate-300">
                    {game.awayTeam.split(' ')[0]}: {game.awayFoulGameInfo}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid for Live Games */}
      {isLive && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Current Total */}
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Score</div>
            <div className="text-xl font-bold text-white tabular-nums">{game.liveTotal}</div>
          </div>

          {/* O/U Line */}
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">O/U</div>
            <div className="text-xl font-bold text-yellow-400 tabular-nums">
              {game.ouLine !== null ? game.ouLine.toFixed(1) : '—'}
            </div>
          </div>

          {/* Edge */}
          <div className={`rounded-xl p-3 text-center ${edgeStyle.bg}`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Edge</div>
            <div className={`text-xl font-bold tabular-nums ${edgeStyle.text}`}>
              {edge !== null ? (edge > 0 ? '+' : '') + edge.toFixed(2) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* PPM Details Row */}
      {isLive && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Current PPM */}
          <div className="bg-slate-800/60 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Current PPM</div>
              <div className="text-lg font-bold text-slate-200 tabular-nums">
                {formatPPM(game.currentPPM)}
              </div>
            </div>
          </div>

          {/* Required PPM */}
          <div className="bg-slate-800/60 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">Required PPM</div>
              <div className={`text-lg font-bold tabular-nums ${isUnderFriendly ? 'text-orange-400' : 'text-slate-200'}`}>
                {formatPPM(game.requiredPPM)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projected Final - with foul game adjustment */}
      {isLive && projectedFinal !== null && game.ouLine !== null && (
        <div className="bg-slate-800/60 rounded-xl p-3 mb-4">
          {/* Base projection */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Projected Final</span>
            <span className={`text-lg font-bold tabular-nums ${
              projectedFinal < game.ouLine ? 'text-green-400' : 'text-red-400'
            }`}>
              {projectedFinal.toFixed(1)}
              <span className="text-xs text-slate-500 ml-2">
                ({projectedFinal < game.ouLine ? 'Under' : 'Over'} by {Math.abs(projectedFinal - game.ouLine).toFixed(1)})
              </span>
            </span>
          </div>

          {/* Foul game adjusted projection */}
          {game.inFoulGame && game.adjustedProjectedTotal !== null && game.foulGameAdjustment !== null && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
                </span>
                <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">🏀 Free Throw Frenzy Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Adjusted Projection</span>
                <span className={`text-lg font-bold tabular-nums ${
                  game.adjustedProjectedTotal < game.ouLine ? 'text-green-400' : 'text-red-400'
                }`}>
                  {game.adjustedProjectedTotal.toFixed(1)}
                  <span className="text-xs text-orange-400 ml-2">
                    (+{game.foulGameAdjustment.toFixed(1)} FTF pts)
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simplified view for non-live games */}
      {!isLive && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800/60 rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">O/U Line</div>
            <div className="text-2xl font-bold text-yellow-400 tabular-nums">
              {game.ouLine !== null ? game.ouLine.toFixed(1) : '—'}
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</div>
            <div className="text-2xl font-bold text-slate-200">
              {game.status === 'pre' ? 'Scheduled' : 'Final'}
            </div>
          </div>
        </div>
      )}

      {/* CTA for triggered games */}
      {isUnderTriggered && game.ouLine !== null && (
        <div className="rounded-xl bg-gradient-to-r from-yellow-600 to-orange-500 p-4 text-center shadow-lg">
          <div className="text-xs text-yellow-100 uppercase tracking-wider mb-1">Golden Zone Signal</div>
          <div className="text-xl font-bold text-white">
            UNDER {game.ouLine.toFixed(1)}
          </div>
          <div className="text-xs text-yellow-200/80 mt-1">69.7% Win Rate</div>
        </div>
      )}

      {isOverTriggered && game.ouLine !== null && (
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-center shadow-lg">
          <div className="text-xs text-blue-100 uppercase tracking-wider mb-1">Signal</div>
          <div className="text-xl font-bold text-white">
            OVER {game.ouLine.toFixed(1)}
          </div>
        </div>
      )}

      {/* Tap indicator */}
      {onClick && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Tap for details</span>
        </div>
      )}
    </div>
  );
}

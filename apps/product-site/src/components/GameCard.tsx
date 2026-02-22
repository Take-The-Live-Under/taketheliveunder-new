'use client';

import { Game } from '@/types/game';
import TriggerBuilder from './TriggerBuilder';

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
  if (game.period === 1) return 'H1';
  if (game.period === 2) return 'H2';
  return `P${game.period}`;
}

// Edge color coding based on PPM difference
function getEdgeColor(edge: number | null): { bg: string; text: string; label: string } {
  if (edge === null) return { bg: 'bg-green-900/30', text: 'text-green-700', label: '' };

  const absEdge = Math.abs(edge);

  if (absEdge >= 1.5) {
    return { bg: 'bg-yellow-900/40', text: 'text-yellow-400', label: 'STRONG' };
  }
  if (absEdge >= 1.0) {
    return { bg: 'bg-green-900/40', text: 'text-green-400', label: 'GOOD' };
  }
  if (absEdge >= 0.5) {
    return { bg: 'bg-green-900/30', text: 'text-green-500', label: 'MODERATE' };
  }
  return { bg: 'bg-green-900/20', text: 'text-green-700', label: '' };
}

// Calculate trigger strength (0-100) based on how far above 4.5 the required PPM is
function getUnderTriggerStrength(requiredPPM: number | null): number {
  if (requiredPPM === null || requiredPPM < 4.5) return 0;
  const strength = Math.min(((requiredPPM - 4.5) / 1.5) * 100, 100);
  return Math.round(strength);
}

export default function GameCard({ game, onClick }: GameCardProps) {
  const isLive = game.status === 'in';
  const isUnderTriggered = game.triggerType === 'under';
  const isTripleDipper = game.triggerType === 'tripleDipper';
  const isOverTriggered = game.triggerType === 'over';
  const hasAnyTrigger = game.triggerType !== null;
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
    if (isTripleDipper) {
      return 'border-yellow-500/50 bg-black/60 terminal-glow-box';
    }
    if (isOverTriggered) {
      return 'border-orange-500/50 bg-black/60 terminal-glow-box';
    }
    if (isUnderTriggered) {
      return 'border-green-500/50 bg-black/60 terminal-glow-box';
    }
    return 'border-green-900 bg-black/40 hover:border-green-700';
  };

  // Determine if trigger badge should be shown
  const showTriggerBadge = hasAnyTrigger;

  // Get trigger badge color and text
  const getTriggerStyle = () => {
    if (isTripleDipper) {
      return { color: 'text-yellow-400', ping: 'bg-yellow-400', dot: 'bg-yellow-500', label: 'TRIPLE_DIPPER 🏆' };
    }
    if (isOverTriggered) {
      return { color: 'text-orange-400', ping: 'bg-orange-400', dot: 'bg-orange-500', label: 'OVER_SIGNAL' };
    }
    return { color: 'text-green-400', ping: 'bg-green-400', dot: 'bg-green-500', label: 'GOLDEN_ZONE' };
  };
  const triggerStyle = getTriggerStyle();

  return (
    <div
      onClick={onClick}
      className={`border p-4 transition-all duration-200 card-enter font-mono game-card-stable ${getCardStyle()} ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      {/* Trigger Badge - uses opacity for smooth transitions instead of unmounting */}
      <div
        className={`mb-3 transition-all duration-300 ${showTriggerBadge ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden mb-0'}`}
        aria-hidden={!showTriggerBadge}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${triggerStyle.ping} opacity-75`}></span>
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${triggerStyle.dot}`}></span>
            </span>
            <span className={`text-xs font-bold uppercase tracking-wide ${triggerStyle.color}`}>
              {triggerStyle.label}
            </span>
          </div>
          {edge !== null && edgeStyle.label && (
            <span className={`text-[10px] font-bold px-2 py-0.5 border ${
              isTripleDipper ? 'border-yellow-700 text-yellow-400' :
              isOverTriggered ? 'border-orange-700 text-orange-400' :
              'border-green-700 text-green-400'
            }`}>
              {edgeStyle.label}
            </span>
          )}
        </div>
        {(isUnderTriggered || isTripleDipper) && (
          <div className="mt-2 h-1 w-full bg-green-900/50 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isTripleDipper ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-green-500 to-green-400'
              }`}
              style={{ width: `${triggerStrength}%` }}
            />
          </div>
        )}
      </div>

      {/* Teams & Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-3 py-1.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] text-green-700 font-medium w-8">AWAY</span>
            <span className="text-sm font-semibold text-green-400 truncate">{game.awayTeam}</span>
            {/* Away team direction badge */}
            {game.awayTeamBadge && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                game.awayTeamBadge.color === 'red' ? 'border-red-700 text-red-400 bg-red-900/30' :
                game.awayTeamBadge.color === 'orange' ? 'border-orange-700 text-orange-400 bg-orange-900/30' :
                game.awayTeamBadge.color === 'blue' ? 'border-blue-700 text-blue-400 bg-blue-900/30' :
                'border-green-700 text-green-400 bg-green-900/30'
              }`}>
                {game.awayTeamBadge.text}
              </span>
            )}
            {/* Away team bonus indicator */}
            {isLive && game.awayBonusStatus && (game.awayBonusStatus.inBonus || game.awayBonusStatus.inDoubleBonus) && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                game.awayBonusStatus.inDoubleBonus
                  ? 'border-red-700 text-red-400'
                  : 'border-yellow-700 text-yellow-400'
              }`}>
                {game.awayBonusStatus.inDoubleBonus ? '2X' : 'BNS'}
              </span>
            )}
          </div>
          <span className="text-xl font-bold text-green-400 tabular-nums">{game.awayScore}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5 border-t border-green-900/30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] text-green-700 font-medium w-8">HOME</span>
            <span className="text-sm font-semibold text-green-400 truncate">{game.homeTeam}</span>
            {/* Home team direction badge */}
            {game.homeTeamBadge && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                game.homeTeamBadge.color === 'red' ? 'border-red-700 text-red-400 bg-red-900/30' :
                game.homeTeamBadge.color === 'orange' ? 'border-orange-700 text-orange-400 bg-orange-900/30' :
                game.homeTeamBadge.color === 'blue' ? 'border-blue-700 text-blue-400 bg-blue-900/30' :
                'border-green-700 text-green-400 bg-green-900/30'
              }`}>
                {game.homeTeamBadge.text}
              </span>
            )}
            {/* Home team bonus indicator */}
            {isLive && game.homeBonusStatus && (game.homeBonusStatus.inBonus || game.homeBonusStatus.inDoubleBonus) && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                game.homeBonusStatus.inDoubleBonus
                  ? 'border-red-700 text-red-400'
                  : 'border-yellow-700 text-yellow-400'
              }`}>
                {game.homeBonusStatus.inDoubleBonus ? '2X' : 'BNS'}
              </span>
            )}
          </div>
          <span className="text-xl font-bold text-green-400 tabular-nums">{game.homeScore}</span>
        </div>
      </div>

      {/* Game Status Bar */}
      <div className="mb-3 flex items-center gap-3 bg-green-900/20 border border-green-900/50 px-3 py-2">
        {isLive ? (
          <>
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-green-400">
              {game.clock} | {getPeriodDisplay(game)}
            </span>
            <span className="text-[10px] text-green-700 ml-auto">
              {game.minutesRemainingReg.toFixed(1)}m LEFT
            </span>
          </>
        ) : game.status === 'post' ? (
          <span className="text-xs font-medium text-green-600">FINAL</span>
        ) : (
          <div className="flex items-center gap-2">
            {game.isTomorrow && (
              <span className="border border-green-700 px-2 py-0.5 text-[10px] font-medium text-green-500">
                TOMORROW
              </span>
            )}
            <span className="text-xs font-medium text-green-500">
              {new Date(game.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        )}
        {game.isOvertime && (
          <span className="border border-yellow-700 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
            OT
          </span>
        )}
      </div>

      {/* Foul Game Warning - smooth transition instead of conditional mount */}
      <div
        className={`transition-all duration-300 ease-out ${
          isLive && game.foulGameWarning
            ? 'opacity-100 max-h-32 mb-3'
            : 'opacity-0 max-h-0 overflow-hidden mb-0'
        }`}
        aria-hidden={!(isLive && game.foulGameWarning)}
      >
        <div className={`border p-3 ${
          game.foulGameWarningLevel === 'high'
            ? 'bg-red-900/20 border-red-700/50'
            : game.foulGameWarningLevel === 'medium'
            ? 'bg-yellow-900/20 border-yellow-700/50'
            : 'bg-green-900/20 border-green-700/50'
        }`}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className={`text-[10px] font-bold uppercase tracking-wide ${
                game.foulGameWarningLevel === 'high' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                // FT_FRENZY {game.foulGameWarningLevel === 'high' ? '- HIGH IMPACT' : ''}
              </div>
              {game.foulGameWarningMessage && (
                <div className="text-xs text-green-500 mt-1">{game.foulGameWarningMessage}</div>
              )}
              {/* Show team-specific info */}
              <div className="flex flex-wrap gap-2 mt-2">
                {game.homeFoulGameInfo && (
                  <span className="text-[10px] bg-green-900/30 border border-green-900 px-2 py-0.5 text-green-500">
                    {game.homeTeam.split(' ')[0]}: {game.homeFoulGameInfo}
                  </span>
                )}
                {game.awayFoulGameInfo && (
                  <span className="text-[10px] bg-green-900/30 border border-green-900 px-2 py-0.5 text-green-500">
                    {game.awayTeam.split(' ')[0]}: {game.awayFoulGameInfo}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid for Live Games */}
      {isLive && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* Current Total */}
          <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
            <div className="text-[10px] text-green-700 uppercase tracking-wide">SCORE</div>
            <div className="text-lg font-bold text-green-400 tabular-nums">{game.liveTotal}</div>
          </div>

          {/* O/U Line */}
          <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
            <div className="text-[10px] text-green-700 uppercase tracking-wide">O/U</div>
            <div className="text-lg font-bold text-green-400 tabular-nums">
              {game.ouLine !== null ? game.ouLine.toFixed(1) : '—'}
            </div>
          </div>

          {/* Required PPM */}
          <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
            <div className="text-[10px] text-green-700 uppercase tracking-wide">REQ_PPM</div>
            <div className={`text-lg font-bold tabular-nums ${isUnderFriendly ? 'text-yellow-400' : 'text-green-400'}`}>
              {formatPPM(game.requiredPPM)}
            </div>
          </div>

          {/* Current PPM */}
          <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
            <div className="text-[10px] text-green-700 uppercase tracking-wide">CUR_PPM</div>
            <div className="text-lg font-bold text-green-400 tabular-nums">
              {formatPPM(game.currentPPM)}
            </div>
          </div>
        </div>
      )}

      {/* Line Movement Tracking for Live Games */}
      {isLive && game.openingLine !== null && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
            <div className="text-[10px] text-green-700 uppercase tracking-wide">OPEN</div>
            <div className="text-sm font-bold text-green-500 tabular-nums">{game.openingLine.toFixed(1)}</div>
          </div>
          <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
            <div className="text-[10px] text-green-700 uppercase tracking-wide">HIGH</div>
            <div className="text-sm font-bold text-green-500 tabular-nums">
              {game.maxLine !== null ? game.maxLine.toFixed(1) : '—'}
            </div>
          </div>
          <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
            <div className="text-[10px] text-green-700 uppercase tracking-wide">LOW</div>
            <div className="text-sm font-bold text-green-500 tabular-nums">
              {game.minLine !== null ? game.minLine.toFixed(1) : '—'}
            </div>
          </div>
          <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
            <div className="text-[10px] text-green-700 uppercase tracking-wide">MOVE</div>
            <div className={`text-sm font-bold tabular-nums ${
              game.lineMovement === null ? 'text-green-500' :
              game.lineMovement > 0 ? 'text-orange-400' :
              game.lineMovement < 0 ? 'text-blue-400' : 'text-green-500'
            }`}>
              {game.lineMovement !== null ? (game.lineMovement > 0 ? '+' : '') + game.lineMovement.toFixed(1) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Edge Display */}
      {isLive && edge !== null && (
        <div className={`border p-2 mb-3 ${edgeStyle.bg} ${isUnderTriggered ? 'border-yellow-700/50' : 'border-green-900/50'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-green-700 uppercase">EDGE</span>
            <span className={`text-lg font-bold tabular-nums ${edgeStyle.text}`}>
              {edge > 0 ? '+' : ''}{edge.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Projected Final - with foul game adjustment */}
      {isLive && projectedFinal !== null && game.ouLine !== null && (
        <div className="bg-green-900/20 border border-green-900/50 p-3 mb-3">
          {/* Base projection */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-green-700">PROJ_FINAL</span>
            <span className={`text-sm font-bold tabular-nums ${
              projectedFinal < game.ouLine ? 'text-green-400' : 'text-red-400'
            }`}>
              {projectedFinal.toFixed(1)}
              <span className="text-[10px] ml-2 text-green-700">
                ({projectedFinal < game.ouLine ? 'UNDER' : 'OVER'} {Math.abs(projectedFinal - game.ouLine).toFixed(1)})
              </span>
            </span>
          </div>

          {/* Foul game adjusted projection - show when in foul game OR could enter soon */}
          {(game.inFoulGame || game.couldEnterFoulGame) && game.adjustedProjectedTotal !== null && game.foulGameAdjustment !== null && (
            <div className="mt-2 pt-2 border-t border-green-900/50">
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${game.inFoulGame ? 'bg-yellow-400' : 'bg-orange-400'} opacity-75`}></span>
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${game.inFoulGame ? 'bg-yellow-500' : 'bg-orange-500'}`}></span>
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${game.inFoulGame ? 'text-yellow-400' : 'text-orange-400'}`}>
                  {game.inFoulGame ? 'FT_FRENZY_ACTIVE' : 'FT_FRENZY_INCOMING'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700">ADJ_PROJ</span>
                <span className={`text-sm font-bold tabular-nums ${
                  game.adjustedProjectedTotal < game.ouLine ? 'text-green-400' : 'text-red-400'
                }`}>
                  {game.adjustedProjectedTotal.toFixed(1)}
                  <span className={`text-[10px] ml-2 ${game.inFoulGame ? 'text-yellow-500' : 'text-orange-500'}`}>
                    (+{game.foulGameAdjustment.toFixed(1)} FTF{!game.inFoulGame ? ' est' : ''})
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simplified view for non-live games */}
      {!isLive && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-green-900/20 border border-green-900/50 p-3">
            <div className="text-[10px] text-green-700 uppercase tracking-wide mb-1">O/U_LINE</div>
            <div className="text-xl font-bold text-green-400 tabular-nums">
              {game.ouLine !== null ? game.ouLine.toFixed(1) : '—'}
            </div>
          </div>
          <div className="bg-green-900/20 border border-green-900/50 p-3">
            <div className="text-[10px] text-green-700 uppercase tracking-wide mb-1">STATUS</div>
            <div className="text-xl font-bold text-green-500">
              {game.status === 'pre' ? 'SCHED' : 'FINAL'}
            </div>
          </div>
        </div>
      )}

      {/* Trigger Builder - Shows code being executed */}
      {hasAnyTrigger && isLive && (
        <div className="mb-3">
          <TriggerBuilder game={game} />
        </div>
      )}

      {/* CTA for triggered games - smooth transitions */}
      {/* Triple Dipper CTA */}
      <div
        className={`transition-all duration-300 ease-out ${
          isTripleDipper && game.ouLine !== null
            ? 'opacity-100 max-h-24'
            : 'opacity-0 max-h-0 overflow-hidden'
        }`}
        aria-hidden={!(isTripleDipper && game.ouLine !== null)}
      >
        <div className="border border-yellow-500/50 bg-yellow-900/20 p-3 text-center terminal-glow-box">
          <div className="text-[10px] text-yellow-500 uppercase tracking-wider mb-1">// TRIPLE_DIPPER_SIGNAL 🏆</div>
          <div className="text-xl font-bold text-yellow-400">
            UNDER {game.ouLine?.toFixed(1) ?? '—'}
          </div>
        </div>
      </div>

      {/* Standard Under CTA */}
      <div
        className={`transition-all duration-300 ease-out ${
          isUnderTriggered && game.ouLine !== null
            ? 'opacity-100 max-h-24'
            : 'opacity-0 max-h-0 overflow-hidden'
        }`}
        aria-hidden={!(isUnderTriggered && game.ouLine !== null)}
      >
        <div className="border border-green-500/50 bg-green-900/20 p-3 text-center terminal-glow-box">
          <div className="text-[10px] text-green-500 uppercase tracking-wider mb-1">// GOLDEN_ZONE_SIGNAL</div>
          <div className="text-xl font-bold text-green-400">
            UNDER {game.ouLine?.toFixed(1) ?? '—'}
          </div>
        </div>
      </div>

      {/* Over CTA */}
      <div
        className={`transition-all duration-300 ease-out ${
          isOverTriggered && game.ouLine !== null
            ? 'opacity-100 max-h-24'
            : 'opacity-0 max-h-0 overflow-hidden'
        }`}
        aria-hidden={!(isOverTriggered && game.ouLine !== null)}
      >
        <div className="border border-orange-500/50 bg-orange-900/20 p-3 text-center terminal-glow-box">
          <div className="text-[10px] text-orange-500 uppercase tracking-wider mb-1">// OVER_SIGNAL 🔥</div>
          <div className="text-xl font-bold text-orange-400">
            OVER {game.ouLine?.toFixed(1) ?? '—'}
          </div>
        </div>
      </div>

      {/* Tap indicator */}
      {onClick && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-green-800">
          <span>// TAP_FOR_DETAILS</span>
        </div>
      )}
    </div>
  );
}

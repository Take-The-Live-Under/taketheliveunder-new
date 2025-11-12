'use client';

import React from 'react';
import clsx from 'clsx';

interface GameCardProps {
  game: any;
  onClick?: () => void;
}

export default function GameCard({ game, onClick }: GameCardProps) {
  const confidence = parseFloat(game.confidence_score || 0);
  const units = parseFloat(game.unit_size || 0);
  const requiredPpm = parseFloat(game.required_ppm || 0);
  const currentPpm = parseFloat(game.current_ppm || 0);
  const ppmDifference = parseFloat(game.ppm_difference || (currentPpm - requiredPpm));
  const projectedFinalScore = parseFloat(game.projected_final_score || 0);
  const totalMinutesRemaining = parseFloat(game.total_time_remaining || 0);
  const triggered = game.trigger_flag === 'True' || game.trigger_flag === true;
  const betType = (game.bet_type || 'under').toLowerCase();
  const currentTotal = parseFloat(game.total_points || 0);
  const ouLine = parseFloat(game.ou_line || 0);
  const espnClosingTotal = parseFloat(game.espn_closing_total || 0);
  const minutesRemaining = parseFloat(game.minutes_remaining || 0);
  const secondsRemaining = parseFloat(game.seconds_remaining || 0);

  // Determine if projected score is over or under the line
  const projectedOverUnder = projectedFinalScore > ouLine ? 'over' : 'under';
  const projectedDiff = Math.abs(projectedFinalScore - ouLine);

  // Determine confidence tier and color
  const getConfidenceTier = (score: number) => {
    if (score >= 86) return { tier: 'MAX', color: 'confidence-high', bg: 'bg-green-500' };
    if (score >= 76) return { tier: 'HIGH', color: 'confidence-high', bg: 'bg-green-600' };
    if (score >= 61) return { tier: 'MEDIUM', color: 'confidence-medium', bg: 'bg-yellow-500' };
    if (score >= 41) return { tier: 'LOW', color: 'confidence-low', bg: 'bg-red-500' };
    return { tier: 'NO BET', color: 'text-gray-500', bg: 'bg-gray-600' };
  };

  const { tier, color, bg } = getConfidenceTier(confidence);

  // Bet type styling
  const getBetTypeStyle = () => {
    if (betType === 'over') {
      return {
        borderColor: 'border-green-500/50',
        bgColor: 'bg-green-500/10',
        badgeBg: 'bg-green-500',
        badgeText: 'text-white',
        label: 'OVER'
      };
    } else {
      return {
        borderColor: 'border-blue-500/50',
        bgColor: 'bg-blue-500/10',
        badgeBg: 'bg-blue-500',
        badgeText: 'text-white',
        label: 'UNDER'
      };
    }
  };

  const betStyle = getBetTypeStyle();

  return (
    <div
      onClick={onClick}
      className={clsx(
        'border-2 rounded-lg p-4 cursor-pointer transition-all hover:scale-[1.02]',
        triggered ? betStyle.bgColor : 'bg-gray-800/50',
        triggered ? betStyle.borderColor : 'border-gray-700',
        'backdrop-blur-sm'
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold">{game.away_team}</span>
            <span className="text-gray-400">@</span>
            <span className="text-lg font-bold">{game.home_team}</span>
          </div>
          <div className="text-sm text-gray-400">
            Period {game.period} • {game.minutes_remaining}:{String(game.seconds_remaining || 0).padStart(2, '0')} • {totalMinutesRemaining.toFixed(1)} min left
          </div>
        </div>

        {/* Bet Type & Confidence Badges */}
        {triggered && (
          <div className="flex gap-2">
            <div className={clsx('px-3 py-1 rounded-full text-xs font-bold', betStyle.badgeBg, betStyle.badgeText)}>
              {betStyle.label}
            </div>
            <div className={clsx('px-3 py-1 rounded-full text-xs font-bold', bg)}>
              {tier}
            </div>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-2xl font-bold">
          {game.away_score} - {game.home_score}
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">O/U Line (Live)</div>
          <div className="text-xl font-bold">{game.ou_line}</div>
          {espnClosingTotal > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Close: {espnClosingTotal}
            </div>
          )}
        </div>
      </div>

      {/* Current Total & Projected Score */}
      <div className="mb-3">
        <div className="text-sm text-gray-300 mb-2">
          Current Total: <span className="font-bold">{game.total_points}</span>
        </div>

        {currentPpm > 0 && (
          <div className={clsx(
            'p-2 rounded-lg border-2',
            projectedOverUnder === 'over'
              ? 'bg-green-500/20 border-green-500/50'
              : 'bg-blue-500/20 border-blue-500/50'
          )}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-400">Projected Final Score (at current pace)</div>
                <div className="text-xl font-bold">
                  {projectedFinalScore.toFixed(1)}
                </div>
              </div>
              <div className="text-right">
                <div className={clsx(
                  'text-sm font-semibold',
                  projectedOverUnder === 'over' ? 'text-green-400' : 'text-blue-400'
                )}>
                  {projectedOverUnder.toUpperCase()}
                </div>
                <div className="text-xs text-gray-400">
                  by {projectedDiff.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={clsx(
          'rounded p-2 transition-all',
          requiredPpm > 4.5
            ? 'bg-green-500/20 animate-pulse border-2 border-green-500/50'
            : 'bg-gray-900/50'
        )}>
          <div className="text-xs text-gray-400">Required PPM</div>
          <div className={clsx('text-lg font-bold',
            requiredPpm > 4.5
              ? 'text-green-300'
              : (betType === 'over' ? 'text-green-400' : 'text-blue-400')
          )}>
            {(requiredPpm ?? 0).toFixed(2)}
          </div>
        </div>

        {currentPpm > 0 && (
          <div className="bg-gray-900/50 rounded p-2">
            <div className="text-xs text-gray-400">Current PPM</div>
            <div className="text-lg font-bold text-gray-300">
              {currentPpm.toFixed(2)}
            </div>
          </div>
        )}

        {currentPpm > 0 && (
          <div className="bg-gray-900/50 rounded p-2">
            <div className="text-xs text-gray-400">PPM Difference</div>
            <div className={clsx('text-lg font-bold',
              ppmDifference > 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {ppmDifference > 0 ? '+' : ''}{ppmDifference.toFixed(2)}
            </div>
          </div>
        )}

        {triggered && (
          <>
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-xs text-gray-400">Confidence</div>
              <div className={clsx('text-lg font-bold', color)}>
                {confidence.toFixed(0)}/100
              </div>
            </div>

            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-xs text-gray-400">Unit Recommendation</div>
              <div className={clsx('text-xl font-bold',
                betType === 'over' ? 'text-green-400' : 'text-blue-400'
              )}>
                {units} {units === 1 ? 'unit' : 'units'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Team Stats Preview */}
      {triggered && (
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Home Pace:</span>{' '}
              <span className="font-semibold">{parseFloat(game.home_pace || 0).toFixed(1)}</span>
            </div>
            <div>
              <span className="text-gray-400">Away Pace:</span>{' '}
              <span className="font-semibold">{parseFloat(game.away_pace || 0).toFixed(1)}</span>
            </div>
            <div>
              <span className="text-gray-400">Home Def:</span>{' '}
              <span className="font-semibold">{parseFloat(game.home_def_eff || 0).toFixed(1)}</span>
            </div>
            <div>
              <span className="text-gray-400">Away Def:</span>{' '}
              <span className="font-semibold">{parseFloat(game.away_def_eff || 0).toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import Tooltip from './Tooltip';
import CollapsibleSection from './CollapsibleSection';

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
  const signalType = (game.bet_type || 'under').toLowerCase();
  const currentTotal = parseFloat(game.total_points || 0);
  const ouLine = parseFloat(game.ou_line || 0);
  const espnClosingTotal = parseFloat(game.espn_closing_total || 0);
  const minutesRemaining = parseFloat(game.minutes_remaining || 0);
  const secondsRemaining = parseFloat(game.seconds_remaining || 0);
  const timeWeightedThreshold = parseFloat(game.time_weighted_threshold || 0);
  const homeFouls = parseInt(game.home_fouls || '0');
  const awayFouls = parseInt(game.away_fouls || '0');
  const recommendation = game.bet_recommendation || 'MONITOR';
  const statusReason = game.bet_status_reason || '';

  // Determine if projected score is over or under the line
  const projectedOverUnder = projectedFinalScore > ouLine ? 'over' : 'under';
  const projectedDiff = Math.abs(projectedFinalScore - ouLine);

  // Determine confidence tier and color
  const getConfidenceTier = (score: number) => {
    if (score >= 86) return { tier: 'MAX', colorClass: 'badge-gradient-max' };
    if (score >= 76) return { tier: 'HIGH', colorClass: 'badge-gradient-purple' };
    if (score >= 61) return { tier: 'MEDIUM', colorClass: 'badge-gradient-orange' };
    if (score >= 41) return { tier: 'LOW', colorClass: 'bg-deep-slate-600 text-deep-slate-300' };
    return { tier: 'MONITOR', colorClass: 'bg-deep-slate-700 text-deep-slate-400' };
  };

  const { tier, colorClass } = getConfidenceTier(confidence);

  // Signal type styling
  const getSignalTypeStyle = () => {
    if (signalType === 'over') {
      return {
        containerClass: 'border-glow-orange bg-gradient-over',
        badgeClass: 'badge-gradient-orange',
        label: 'OVER',
        textColor: 'text-brand-orange-400',
        progressClass: 'progress-fill-orange'
      };
    } else {
      return {
        containerClass: 'border-glow-teal bg-gradient-under',
        badgeClass: 'badge-gradient-teal',
        label: 'UNDER',
        textColor: 'text-brand-teal-400',
        progressClass: 'progress-fill-teal'
      };
    }
  };

  const signalStyle = getSignalTypeStyle();

  // Action recommendation styling
  const getRecommendationStyle = () => {
    if (recommendation === 'BET_NOW') {
      return {
        containerClass: 'bg-gradient-to-r from-green-600 to-green-500 border-2 border-green-400',
        textClass: 'text-white font-bold',
        icon: '✓',
        label: 'STRONG SIGNAL'
      };
    } else if (recommendation === 'WAIT') {
      return {
        containerClass: 'bg-gradient-to-r from-yellow-600 to-yellow-500 border-2 border-yellow-400',
        textClass: 'text-white font-bold',
        icon: '⏳',
        label: 'WAIT FOR CONFIRMATION'
      };
    } else if (recommendation === 'DANGER_ZONE') {
      return {
        containerClass: 'bg-gradient-to-r from-red-600 to-red-500 border-2 border-red-400',
        textClass: 'text-white font-bold',
        icon: '⚠',
        label: 'LOW CONFIDENCE - AVOID'
      };
    } else {
      return {
        containerClass: 'bg-deep-slate-700 border border-deep-slate-600',
        textClass: 'text-deep-slate-400',
        icon: '👁',
        label: 'MONITORING'
      };
    }
  };

  const recStyle = getRecommendationStyle();

  // Calculate stat percentages for progress bars
  const getStatPercentage = (value: number, max: number = 120) => Math.min((value / max) * 100, 100);

  // Radial progress component for efficiency
  const RadialProgress = ({ value, max = 120, label, color }: { value: number; max?: number; label: string; color: string }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 36;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <svg className="transform -rotate-90 w-24 h-24">
            <circle
              cx="48"
              cy="48"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-deep-slate-700"
            />
            <circle
              cx="48"
              cy="48"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={color}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{value.toFixed(1)}</span>
          </div>
        </div>
        <span className="text-xs text-deep-slate-400 mt-1">{label}</span>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-xl p-5 cursor-pointer card-lift shadow-elevation-3',
        triggered ? signalStyle.containerClass : 'glass-card-hover',
        'animate-fade-in'
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-white leading-tight">{game.away_team}</span>
            <span className="text-deep-slate-500 text-lg">@</span>
            <span className="text-2xl font-bold text-white leading-tight">{game.home_team}</span>
          </div>
          <div className="text-xs text-deep-slate-400 flex items-center gap-2">
            <span className="bg-deep-slate-800 px-2 py-0.5 rounded font-medium">Period {game.period}</span>
            <span className="font-mono font-semibold text-sm">{game.minutes_remaining}:{String(game.seconds_remaining || 0).padStart(2, '0')}</span>
            <span className="text-deep-slate-600">•</span>
            <span className="text-xs">{totalMinutesRemaining.toFixed(1)} min left</span>
          </div>
          {game.referees && game.referees.length > 0 && (
            <div className="text-xs text-deep-slate-500 mt-1.5 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Officials: {game.referees.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Signal Type & Confidence Badges */}
        {triggered && (
          <div className="flex gap-2">
            <div className={clsx('px-4 py-1.5 rounded-full text-xs font-bold shadow-elevation-2', signalStyle.badgeClass)}>
              {signalStyle.label}
            </div>
            <div className={clsx('px-4 py-1.5 rounded-full text-xs', colorClass)}>
              {tier}
            </div>
          </div>
        )}
      </div>

      {/* Action Recommendation Indicator */}
      {triggered && recommendation !== 'MONITOR' && (
        <Tooltip
          content={
            recommendation === 'BET_NOW'
              ? 'All conditions met: Confidence ≥65 AND (PPM ≥5.0 OR Confidence ≥75)'
              : recommendation === 'WAIT'
              ? 'Waiting for: Higher confidence (≥65) OR stronger PPM confirmation (≥5.0)'
              : recommendation === 'DANGER_ZONE'
              ? 'Avoid: Medium confidence (60-70) with weak PPM (<4.0) has only 50% accuracy'
              : 'Monitoring game for trigger conditions'
          }
          position="bottom"
        >
          <div className={clsx(
            'mb-4 p-3 rounded-lg shadow-lg cursor-help',
            recStyle.containerClass
          )}>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{recStyle.icon}</span>
              <div className="flex-1">
                <div className={clsx('text-sm font-bold', recStyle.textClass)}>
                  {recStyle.label}
                </div>
                {statusReason && (
                  <div className="text-xs mt-1 opacity-90 text-white">
                    {statusReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tooltip>
      )}

      {/* Score */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-3xl font-bold text-white">
          {game.away_score} - {game.home_score}
        </div>
        <div className="text-right">
          <div className="text-sm text-deep-slate-400 mb-1">
            O/U Line {game.sportsbook && <span className="text-xs bg-deep-slate-800 px-2 py-0.5 rounded ml-1">(Source: {game.sportsbook})</span>}
          </div>
          <div className="text-2xl font-bold text-gradient-purple-orange">{game.ou_line}</div>
          {espnClosingTotal > 0 && (
            <div className="text-xs text-deep-slate-500 mt-1">
              Close: {espnClosingTotal}
            </div>
          )}
          {game.ou_position && (
            <div className={clsx(
              'text-xs font-semibold mt-2 px-3 py-1 rounded-full inline-block',
              game.ou_position === 'PEAK' ? 'bg-brand-orange-900/30 text-brand-orange-400 border border-brand-orange-500/30' :
              game.ou_position === 'VALLEY' ? 'bg-brand-teal-900/30 text-brand-teal-400 border border-brand-teal-500/30' :
              game.ou_position === 'STABLE' ? 'bg-deep-slate-700/50 text-deep-slate-400 border border-deep-slate-600' :
              'bg-deep-slate-800/50 text-deep-slate-500 border border-deep-slate-700'
            )}>
              {game.ou_position === 'PEAK' ? '📈 PEAK' :
               game.ou_position === 'VALLEY' ? '📉 VALLEY' :
               game.ou_position === 'STABLE' ? '→ STABLE' :
               '— NEUTRAL'}
            </div>
          )}
          {game.ou_peak && game.ou_valley && (
            <div className="text-xs text-deep-slate-500 mt-1">
              Range: {game.ou_valley} - {game.ou_peak}
            </div>
          )}
        </div>
      </div>

      {/* Moneyline & Spread Odds - Collapsible */}
      {(game.home_moneyline || game.home_spread) && (
        <div className="mb-4">
          <CollapsibleSection
            title="Moneyline & Spread Odds"
            defaultOpen={false}
            variant="compact"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            <div className="space-y-2">
              {game.home_moneyline && game.away_moneyline && (
                <div>
                  <div className="text-xs text-deep-slate-400 mb-1.5 font-medium">Moneyline</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-brand-teal-400 font-semibold">{game.away_team}: {game.away_moneyline > 0 ? '+' : ''}{game.away_moneyline}</span>
                    <span className="text-brand-orange-400 font-semibold">{game.home_team}: {game.home_moneyline > 0 ? '+' : ''}{game.home_moneyline}</span>
                  </div>
                </div>
              )}
              {game.home_spread && game.away_spread && (
                <div className="pt-2 border-t border-deep-slate-700/50">
                  <div className="text-xs text-deep-slate-400 mb-1.5 font-medium">Spread</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-brand-teal-400 font-semibold">
                      {game.away_team}: {game.away_spread > 0 ? '+' : ''}{game.away_spread} ({game.away_spread_odds > 0 ? '+' : ''}{game.away_spread_odds})
                    </span>
                    <span className="text-brand-orange-400 font-semibold">
                      {game.home_team}: {game.home_spread > 0 ? '+' : ''}{game.home_spread} ({game.home_spread_odds > 0 ? '+' : ''}{game.home_spread_odds})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Referee Information */}
      {game.referees && game.referees.length > 0 && (
        <div className="mb-4">
          <CollapsibleSection
            title="Referee Crew"
            defaultOpen={false}
            variant="compact"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            <div className="space-y-2">
              {/* Referee Names */}
              <div>
                <div className="text-xs text-deep-slate-400 mb-1.5 font-medium">Officials</div>
                <div className="flex flex-wrap gap-1.5">
                  {game.referees.map((ref: string, idx: number) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-deep-slate-800 text-deep-slate-300 rounded">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>

              {/* Crew Stats if available */}
              {game.referee_crew_stats && game.referee_crew_stats.found_refs > 0 && (
                <div className="pt-2 border-t border-deep-slate-700/50">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="stat-card text-center">
                      <div className="text-xs text-deep-slate-500 mb-1">Crew Style</div>
                      <div className={clsx(
                        "text-sm font-semibold px-2 py-1 rounded inline-block",
                        game.referee_crew_stats.crew_style === 'Tight' ? 'bg-red-900/30 text-red-400' :
                        game.referee_crew_stats.crew_style === 'Loose' ? 'bg-green-900/30 text-green-400' :
                        'bg-yellow-900/30 text-yellow-400'
                      )}>
                        {game.referee_crew_stats.crew_style}
                      </div>
                    </div>
                    <div className="stat-card text-center">
                      <div className="text-xs text-deep-slate-500 mb-1">Avg Fouls/Game</div>
                      <div className="text-sm font-semibold text-brand-purple-400">
                        {game.referee_crew_stats.avg_fouls_per_game?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                  </div>
                  {game.referee_crew_stats.avg_home_bias !== null && (
                    <div className="mt-2 text-center">
                      <div className="text-xs text-deep-slate-500 mb-1">Home Bias</div>
                      <div className={clsx(
                        "text-xs font-semibold",
                        game.referee_crew_stats.avg_home_bias < -1 ? 'text-brand-teal-400' :
                        game.referee_crew_stats.avg_home_bias > 1 ? 'text-brand-orange-400' :
                        'text-deep-slate-400'
                      )}>
                        {game.referee_crew_stats.avg_home_bias > 0 ? '+' : ''}{game.referee_crew_stats.avg_home_bias.toFixed(2)}
                        <span className="text-xs text-deep-slate-500 ml-1">
                          ({game.referee_crew_stats.avg_home_bias < -1 ? 'favors away' :
                            game.referee_crew_stats.avg_home_bias > 1 ? 'favors home' : 'neutral'})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Live In-Game Statistics */}
      {(game.home_fg_made || game.away_fg_made) && (
        <div className="mb-4 p-4 bg-deep-slate-800/40 rounded-lg border border-deep-slate-700/50">
          <div className="text-xs font-semibold mb-3 text-gradient-purple-orange uppercase tracking-wider">
            Live In-Game Stats
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {/* Shooting Stats */}
            <div className="text-center">
              <div className="text-xs text-deep-slate-400 mb-1">FG%</div>
              <div className="text-sm font-bold text-brand-orange-400">{game.home_fg_pct || 0}%</div>
              <div className="text-xs text-deep-slate-500">{game.home_fg_made}/{game.home_fg_attempted}</div>
            </div>

            <div className="text-center">
              <div className="text-xs text-deep-slate-400 mb-1">3P%</div>
              <div className="text-sm font-bold text-brand-orange-400">{game.home_three_pct || 0}%</div>
              <div className="text-xs text-deep-slate-500">{game.home_three_made}/{game.home_three_attempted}</div>
            </div>

            <div className="text-center">
              <div className="text-xs text-deep-slate-400 mb-1">FT%</div>
              <div className="text-sm font-bold text-brand-orange-400">{game.home_ft_pct || 0}%</div>
              <div className="text-xs text-deep-slate-500">{game.home_ft_made}/{game.home_ft_attempted}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-sm font-bold text-brand-teal-400">{game.away_fg_pct || 0}%</div>
              <div className="text-xs text-deep-slate-500">{game.away_fg_made}/{game.away_fg_attempted}</div>
            </div>

            <div className="text-center">
              <div className="text-sm font-bold text-brand-teal-400">{game.away_three_pct || 0}%</div>
              <div className="text-xs text-deep-slate-500">{game.away_three_made}/{game.away_three_attempted}</div>
            </div>

            <div className="text-center">
              <div className="text-sm font-bold text-brand-teal-400">{game.away_ft_pct || 0}%</div>
              <div className="text-xs text-deep-slate-500">{game.away_ft_made}/{game.away_ft_attempted}</div>
            </div>
          </div>

          {/* Possession Stats */}
          <div className="pt-3 border-t border-deep-slate-700/50">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-xs text-deep-slate-400 mb-1">REB</div>
                <div className="text-sm font-bold text-brand-orange-400">{game.home_rebounds || 0}</div>
                <div className="text-sm font-bold text-brand-teal-400">{game.away_rebounds || 0}</div>
              </div>
              <div>
                <div className="text-xs text-deep-slate-400 mb-1">AST</div>
                <div className="text-sm font-bold text-brand-orange-400">{game.home_assists || 0}</div>
                <div className="text-sm font-bold text-brand-teal-400">{game.away_assists || 0}</div>
              </div>
              <div>
                <div className="text-xs text-deep-slate-400 mb-1">TO</div>
                <div className="text-sm font-bold text-brand-orange-400">{game.home_turnovers || 0}</div>
                <div className="text-sm font-bold text-brand-teal-400">{game.away_turnovers || 0}</div>
              </div>
              <div>
                <div className="text-xs text-deep-slate-400 mb-1">FOULS</div>
                <div className="text-sm font-bold text-brand-orange-400">{game.home_fouls || 0}</div>
                <div className="text-sm font-bold text-brand-teal-400">{game.away_fouls || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Total & Projected Score */}
      <div className="mb-4">
        <div className="text-sm text-deep-slate-300 mb-3 flex items-center gap-2">
          <span>Current Total:</span>
          <span className="font-bold text-lg text-white">{game.total_points}</span>
        </div>

        {currentPpm > 0 && (
          <div className={clsx(
            'p-4 rounded-xl border-2 shadow-elevation-2',
            projectedOverUnder === 'over'
              ? 'bg-gradient-over border-brand-orange-500/30'
              : 'bg-gradient-under border-brand-teal-500/30'
          )}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-deep-slate-400 mb-1">Projected Final (current pace)</div>
                <div className="text-2xl font-bold text-white">
                  {projectedFinalScore.toFixed(1)}
                </div>
              </div>
              <div className="text-right">
                <div className={clsx(
                  'text-lg font-bold mb-1',
                  projectedOverUnder === 'over' ? 'text-brand-orange-400' : 'text-brand-teal-400'
                )}>
                  {projectedOverUnder.toUpperCase()}
                </div>
                <div className="text-sm text-deep-slate-400">
                  by {projectedDiff.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={clsx(
          'rounded-xl p-4 transition-all shadow-elevation-2',
          requiredPpm > 4.5
            ? 'bg-brand-orange-900/20 border-glow-orange animate-pulse-slow'
            : 'glass-card'
        )}>
          <div className="text-xs text-deep-slate-400 mb-1">Required PPM</div>
          <div className={clsx('text-2xl font-bold',
            requiredPpm > 4.5
              ? 'text-brand-orange-300'
              : 'text-brand-purple-400'
          )}>
            {(requiredPpm ?? 0).toFixed(2)}
          </div>
        </div>

        {currentPpm > 0 && (
          <div className="glass-card rounded-xl p-4 shadow-elevation-2">
            <div className="text-xs text-deep-slate-400 mb-1">Current PPM</div>
            <div className="text-2xl font-bold text-white">
              {currentPpm.toFixed(2)}
            </div>
          </div>
        )}

        {currentPpm > 0 && (
          <div className="glass-card rounded-xl p-4 shadow-elevation-2">
            <div className="text-xs text-deep-slate-400 mb-1">PPM Difference</div>
            <div className={clsx('text-2xl font-bold',
              ppmDifference > 0 ? 'text-brand-teal-400' : 'text-brand-orange-400'
            )}>
              {ppmDifference > 0 ? '+' : ''}{ppmDifference.toFixed(2)}
            </div>
          </div>
        )}

        {timeWeightedThreshold > 0 && (
          <div className="glass-card rounded-xl p-4 shadow-elevation-2">
            <div className="text-xs text-deep-slate-400 mb-1">Time-Weighted Threshold</div>
            <div className="text-2xl font-bold text-brand-purple-400">
              {timeWeightedThreshold.toFixed(2)}
            </div>
            <div className="text-xs text-deep-slate-500 mt-1">
              {game.period === 1 ? '1st Half' : game.period === 2 ? '2nd Half' : 'OT'} - {minutesRemaining}:{secondsRemaining.toString().padStart(2, '0')}
            </div>
          </div>
        )}

        {triggered && (
          <>
            <div className="glass-card rounded-xl p-4 shadow-elevation-2">
              <div className="text-xs text-deep-slate-400 mb-2">Confidence</div>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-gradient-purple-orange">
                  {confidence.toFixed(0)}
                </div>
                <div className="flex-1">
                  <div className="progress-bar">
                    <div
                      className="progress-fill-purple"
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={clsx(
              'rounded-xl p-4 shadow-elevation-2 border-2',
              units >= 2 ? 'bg-brand-purple-900/20 border-brand-purple-500/50' : 'glass-card border-deep-slate-700/50'
            )}>
              <div className="text-xs text-deep-slate-400 mb-1">Units</div>
              <div className="text-3xl font-bold text-gradient-purple-orange">
                {units} <span className="text-base text-deep-slate-400">{units === 1 ? 'unit' : 'units'}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Team Stats - Collapsible with Data Visualization */}
      {(game.home_pace || game.home_off_eff || game.home_assists_per_game) && (
        <div className="mt-2">
          <CollapsibleSection
            title="Team Matchup Analysis"
            defaultOpen={false}
            variant="default"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          >
            <div>

          {/* Radial Efficiency Comparison */}
          <div className="flex justify-around items-center mb-5 p-4 glass-card rounded-xl">
            <div className="text-center">
              <RadialProgress
                value={parseFloat(game.home_off_eff || 0)}
                label="Home Off Eff"
                color="text-brand-orange-500"
              />
              <div className="text-xs text-deep-slate-500 mt-1">#{game.home_kenpom_rank || 'N/A'}</div>
            </div>
            <div className="text-2xl text-deep-slate-600 font-bold">VS</div>
            <div className="text-center">
              <RadialProgress
                value={parseFloat(game.away_off_eff || 0)}
                label="Away Off Eff"
                color="text-brand-teal-500"
              />
              <div className="text-xs text-deep-slate-500 mt-1">#{game.away_kenpom_rank || 'N/A'}</div>
            </div>
          </div>

          {/* Progress Bar Stats */}
          <div className="space-y-3">
            {/* Pace */}
            <div className="glass-card rounded-lg p-3">
              <div className="flex justify-between text-xs text-deep-slate-400 mb-2">
                <span>Pace</span>
                <span className="font-semibold text-white">{parseFloat(game.home_pace || 0).toFixed(1)} / {parseFloat(game.away_pace || 0).toFixed(1)}</span>
              </div>
              <div className="progress-bar h-3">
                <div
                  className="progress-fill-orange h-full"
                  style={{ width: `${getStatPercentage(parseFloat(game.home_pace || 0), 80)}%` }}
                />
              </div>
            </div>

            {/* Defensive Efficiency */}
            <div className="glass-card rounded-lg p-3">
              <div className="flex justify-between text-xs text-deep-slate-400 mb-2">
                <span>Def Efficiency</span>
                <span className="font-semibold text-white">{parseFloat(game.home_def_eff || 0).toFixed(1)} / {parseFloat(game.away_def_eff || 0).toFixed(1)}</span>
              </div>
              <div className="progress-bar h-3">
                <div
                  className="progress-fill-teal h-full"
                  style={{ width: `${getStatPercentage(parseFloat(game.home_def_eff || 0), 110)}%` }}
                />
              </div>
            </div>

            {/* Shooting Efficiency */}
            <div className="glass-card rounded-lg p-3">
              <div className="flex justify-between text-xs text-deep-slate-400 mb-2">
                <span>eFG%</span>
                <span className="font-semibold text-white">{parseFloat(game.home_efg_pct || 0).toFixed(1)}% / {parseFloat(game.away_efg_pct || 0).toFixed(1)}%</span>
              </div>
              <div className="progress-bar h-3">
                <div
                  className="progress-fill-purple h-full"
                  style={{ width: `${parseFloat(game.home_efg_pct || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Compact Advanced Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">TS%</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_ts_pct || 0).toFixed(1)}%</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_ts_pct || 0).toFixed(1)}%</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">Avg PPM</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_avg_ppm || 0).toFixed(2)}</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_avg_ppm || 0).toFixed(2)}</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">Avg PPG</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_avg_ppg || 0).toFixed(1)}</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_avg_ppg || 0).toFixed(1)}</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">Fouls</div>
              <div className="text-sm font-semibold text-brand-orange-400">{homeFouls || '-'}</div>
              <div className="text-sm font-semibold text-brand-teal-400">{awayFouls || '-'}</div>
            </div>
          </div>

          {/* Phase 2 Team Stats - Comprehensive Statistics */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">AST/G</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_assists_per_game || 0).toFixed(1)}</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_assists_per_game || 0).toFixed(1)}</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">STL/G</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_steals_per_game || 0).toFixed(1)}</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_steals_per_game || 0).toFixed(1)}</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">BLK/G</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_blocks_per_game || 0).toFixed(1)}</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_blocks_per_game || 0).toFixed(1)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">Fouls/G</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_fouls_per_game || 0).toFixed(1)}</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_fouls_per_game || 0).toFixed(1)}</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">A/TO Ratio</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_ast_to_ratio || 0).toFixed(2)}</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_ast_to_ratio || 0).toFixed(2)}</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-xs text-deep-slate-500 mb-1">DReb%</div>
              <div className="text-sm font-semibold text-brand-orange-400">{parseFloat(game.home_dreb_pct || 0).toFixed(1)}%</div>
              <div className="text-sm font-semibold text-brand-teal-400">{parseFloat(game.away_dreb_pct || 0).toFixed(1)}%</div>
            </div>
          </div>

              <div className="text-xs text-deep-slate-500 mt-3 flex justify-between px-2">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-brand-orange-500"></span>
                  <span>{game.home_team}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-brand-teal-500"></span>
                  <span>{game.away_team}</span>
                </span>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

'use client';

import { TeamStats, COMPARISON_METRICS, ComparisonMetric, CrewStats } from '@/types/team';
import { useEffect, useCallback } from 'react';

interface ComparisonModalProps {
  homeTeam: string;
  awayTeam: string;
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
  homeScore: number;
  awayScore: number;
  ouLine: number | null;
  crewStats?: CrewStats;
  onClose: () => void;
}

function formatValue(value: number | null, metric: ComparisonMetric): string {
  if (value === null || isNaN(value)) return '—';

  const decimals = metric.decimals ?? 1;

  switch (metric.format) {
    case 'percent':
      // Values are already 0-100 (e.g., 44.39 for 44.39%)
      return `${value.toFixed(decimals)}%`;
    case 'decimal':
      return value.toFixed(decimals);
    case 'ratio':
      return value.toFixed(decimals);
    case 'rank':
      return `#${Math.round(value)}`;
    case 'number':
      return Math.round(value).toString();
    default:
      return value.toFixed(decimals);
  }
}

function getComparisonClass(
  homeValue: number | null,
  awayValue: number | null,
  higherIsBetter: boolean,
  side: 'home' | 'away'
): string {
  if (homeValue === null || awayValue === null) return 'text-gray-400';

  const homeWins = higherIsBetter ? homeValue > awayValue : homeValue < awayValue;
  const awayWins = higherIsBetter ? awayValue > homeValue : awayValue < homeValue;

  if (side === 'home' && homeWins) return 'text-green-400 font-semibold';
  if (side === 'away' && awayWins) return 'text-green-400 font-semibold';
  if (side === 'home' && awayWins) return 'text-red-400';
  if (side === 'away' && homeWins) return 'text-red-400';

  return 'text-gray-300';
}

// Group metrics by category for better organization
const METRIC_GROUPS = [
  { title: 'Tempo & Scoring', keys: ['pace', 'avg_ppg', 'avg_ppm'] },
  { title: 'Efficiency', keys: ['off_efficiency', 'def_efficiency', 'efficiency_margin'] },
  { title: 'Shooting', keys: ['efg_pct', 'ts_pct', 'fg_pct', 'three_p_pct', 'three_p_rate', 'two_p_pct', 'ft_pct'] },
  { title: 'Rebounding', keys: ['oreb_pct', 'dreb_pct'] },
  { title: 'Ball Control', keys: ['to_rate', 'ast_to_ratio', 'assists_per_game'] },
  { title: 'Defense', keys: ['steals_per_game', 'blocks_per_game'] },
  { title: 'Ranking', keys: ['espn_rank'] },
];

function getCrewStyleColor(style: string): string {
  switch (style) {
    case 'Tight':
      return 'text-red-400 bg-red-500/20';
    case 'Loose':
      return 'text-green-400 bg-green-500/20';
    default:
      return 'text-yellow-400 bg-yellow-500/20';
  }
}

export default function ComparisonModal({
  homeTeam,
  awayTeam,
  homeStats,
  awayStats,
  homeScore,
  awayScore,
  ouLine,
  crewStats,
  onClose,
}: ComparisonModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown]);

  const renderMetricRow = (metric: ComparisonMetric) => {
    const homeValue = homeStats?.[metric.key] as number | null;
    const awayValue = awayStats?.[metric.key] as number | null;

    // Skip if both values are null
    if (homeValue === null && awayValue === null) return null;

    return (
      <div
        key={metric.key}
        className="grid grid-cols-3 py-2 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
      >
        <div
          className={`text-right pr-3 text-sm ${getComparisonClass(
            homeValue,
            awayValue,
            metric.higherIsBetter,
            'away'
          )}`}
        >
          {formatValue(awayValue, metric)}
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-300 font-medium">{metric.label}</div>
          <div className="text-[10px] text-gray-500">{metric.description}</div>
        </div>
        <div
          className={`text-left pl-3 text-sm ${getComparisonClass(
            homeValue,
            awayValue,
            metric.higherIsBetter,
            'home'
          )}`}
        >
          {formatValue(homeValue, metric)}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl bg-gray-900 border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Matchup Comparison</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
          {/* Team Headers */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700">
            <div className="grid grid-cols-3 px-4 py-3">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-100 truncate">
                  {awayTeam}
                </div>
                <div className="text-2xl font-bold text-white">{awayScore}</div>
                {awayStats?.espn_rank && (
                  <div className="text-xs text-gray-400">#{awayStats.espn_rank}</div>
                )}
              </div>
              <div className="text-center flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500 uppercase tracking-wide">O/U</span>
                <span className="text-lg font-semibold text-yellow-400">
                  {ouLine !== null ? ouLine.toFixed(1) : '—'}
                </span>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-100 truncate">
                  {homeTeam}
                </div>
                <div className="text-2xl font-bold text-white">{homeScore}</div>
                {homeStats?.espn_rank && (
                  <div className="text-xs text-gray-400">#{homeStats.espn_rank}</div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Comparison */}
          <div className="px-4 py-2">
            {!homeStats && !awayStats ? (
              <div className="text-center py-8 text-gray-400">
                No team statistics available
              </div>
            ) : (
              <div className="space-y-4">
                {METRIC_GROUPS.map((group) => {
                  const groupMetrics = COMPARISON_METRICS.filter((m) =>
                    group.keys.includes(m.key as string)
                  );

                  // Check if any metrics in this group have values
                  const hasData = groupMetrics.some((metric) => {
                    const homeVal = homeStats?.[metric.key];
                    const awayVal = awayStats?.[metric.key];
                    return homeVal !== null || awayVal !== null;
                  });

                  if (!hasData) return null;

                  return (
                    <div key={group.title}>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-3">
                        {group.title}
                      </div>
                      {groupMetrics.map((metric) => renderMetricRow(metric))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Referee Crew Section */}
          {crewStats && crewStats.foundRefs > 0 && (
            <div className="px-4 py-3 border-t border-gray-700">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Referee Crew
              </div>

              {/* Crew Style Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${getCrewStyleColor(
                      crewStats.crewStyle
                    )}`}
                  >
                    {crewStats.crewStyle}
                  </span>
                  <span className="text-xs text-gray-500">
                    {crewStats.foundRefs}/{crewStats.referees.length} refs found
                  </span>
                </div>
              </div>

              {/* Crew Stats */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-800 rounded-lg p-2">
                  <div className="text-xs text-gray-500">Avg Fouls/Game</div>
                  <div className={`text-lg font-bold ${
                    crewStats.avgFoulsPerGame && crewStats.avgFoulsPerGame >= 40
                      ? 'text-red-400'
                      : crewStats.avgFoulsPerGame && crewStats.avgFoulsPerGame <= 32
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }`}>
                    {crewStats.avgFoulsPerGame ?? '—'}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <div className="text-xs text-gray-500">Home Bias</div>
                  <div className={`text-lg font-bold ${
                    crewStats.avgHomeBias && crewStats.avgHomeBias > 0
                      ? 'text-blue-400'
                      : crewStats.avgHomeBias && crewStats.avgHomeBias < 0
                      ? 'text-orange-400'
                      : 'text-gray-400'
                  }`}>
                    {crewStats.avgHomeBias !== null
                      ? (crewStats.avgHomeBias > 0 ? '+' : '') + crewStats.avgHomeBias.toFixed(1)
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Individual Refs */}
              <div className="space-y-1">
                {crewStats.refDetails.map((ref) => (
                  <div
                    key={ref.name}
                    className="flex items-center justify-between text-xs py-1 border-b border-gray-800/50"
                  >
                    <span className="text-gray-300">{ref.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {ref.total_fouls_per_game.toFixed(1)} F/G
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${getCrewStyleColor(
                          ref.ref_style
                        )}`}
                      >
                        {ref.ref_style}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-gray-500 mt-2">
                Tight = more fouls (40+), Loose = fewer fouls (32-)
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span className="text-gray-400">Advantage</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="text-gray-400">Disadvantage</span>
              </div>
            </div>
            {(homeStats?.games_played || awayStats?.games_played) && (
              <div className="text-center text-xs text-gray-500 mt-2">
                Based on {homeStats?.games_played || awayStats?.games_played} games played
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { games } from '@/lib/api';

interface PregameGame {
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  time_until_start: string;
  ou_line: number;
  ou_line_opening: number | null;
  ou_line_closing: number | null;
  sportsbook: string;
  predicted_total: number;
  edge: number;
  confidence_score: number;
  recommendation: string;
  factors: string[];
  home_metrics: {
    pace: number;
    def_eff: number;
    off_eff: number;
    avg_ppg: number;
    three_point_rate: number;
  };
  away_metrics: {
    pace: number;
    def_eff: number;
    off_eff: number;
    avg_ppg: number;
    three_point_rate: number;
  };
}

interface PregameResponse {
  games: PregameGame[];
  count: number;
  hours_ahead: number;
}

export default function PregamePredictions() {
  const { data, error, isLoading } = useSWR<PregameResponse>(
    'upcoming-games',
    () => games.getUpcoming(24),
    {
      refreshInterval: 60000, // Refresh every 1 minute (betting lines change fast)
      revalidateOnFocus: false,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple-500 mb-4 mx-auto"></div>
          <p className="text-deep-slate-400">Loading upcoming games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-lg p-6 text-center">
        <p className="text-red-400 mb-2">Error loading upcoming games</p>
        <p className="text-deep-slate-500 text-sm">{error.message}</p>
      </div>
    );
  }

  if (!data || data.count === 0) {
    return (
      <div className="glass-card rounded-lg p-8 text-center">
        <div className="text-5xl mb-4">🏀</div>
        <h3 className="text-xl font-bold text-white mb-2">No Upcoming Games</h3>
        <p className="text-deep-slate-400">
          No games scheduled within the next 24 hours with available odds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Pregame Predictions
            <span className="text-brand-purple-400 ml-3">({data.count})</span>
          </h2>
          <p className="text-deep-slate-400 mt-1">
            Games starting within the next {data.hours_ahead} hours
          </p>
        </div>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-1 gap-4">
        {data.games.map((game) => (
          <PregameGameCard key={game.game_id} game={game} />
        ))}
      </div>
    </div>
  );
}

function PregameGameCard({ game }: { game: PregameGame }) {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'BET_UNDER':
        return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'LEAN_UNDER':
        return 'bg-teal-500/20 border-teal-500/50 text-teal-400';
      case 'PASS':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
      case 'LEAN_OVER':
        return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      case 'BET_OVER':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    }
  };

  const getRecommendationLabel = (recommendation: string) => {
    return recommendation.replace(/_/g, ' ');
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 75 || score <= 25) return 'text-green-400';
    if (score >= 60 || score <= 40) return 'text-teal-400';
    return 'text-gray-400';
  };

  const avgPace = (game.home_metrics.pace + game.away_metrics.pace) / 2;
  const avgDefEff = (game.home_metrics.def_eff + game.away_metrics.def_eff) / 2;

  return (
    <div className="glass-card rounded-lg p-5 border border-deep-slate-700/50 hover:border-deep-slate-600/70 transition-all">
      {/* Header: Teams and Time */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-bold text-white">{game.away_team}</span>
            <span className="text-deep-slate-500 text-sm">@</span>
            <span className="text-xl font-bold text-white">{game.home_team}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-deep-slate-400">
              Starts in <span className="text-brand-purple-400 font-semibold">{game.time_until_start}</span>
            </span>
          </div>
        </div>

        {/* Recommendation Badge */}
        <div className={clsx(
          'px-4 py-2 rounded-lg border font-bold text-sm whitespace-nowrap',
          getRecommendationColor(game.recommendation)
        )}>
          {getRecommendationLabel(game.recommendation)}
        </div>
      </div>

      {/* O/U Line and Prediction */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="glass-card rounded p-3">
          <div className="text-xs text-deep-slate-400 mb-1">O/U Line</div>
          <div className="text-lg font-bold text-white">{game.ou_line}</div>
          <div className="text-xs text-deep-slate-500">{game.sportsbook}</div>
        </div>

        <div className="glass-card rounded p-3">
          <div className="text-xs text-deep-slate-400 mb-1">Predicted Total</div>
          <div className="text-lg font-bold text-brand-teal-400">{game.predicted_total}</div>
        </div>

        <div className="glass-card rounded p-3">
          <div className="text-xs text-deep-slate-400 mb-1">Edge</div>
          <div className={clsx(
            'text-lg font-bold',
            game.edge > 0 ? 'text-green-400' : game.edge < 0 ? 'text-red-400' : 'text-gray-400'
          )}>
            {game.edge > 0 ? '↓' : game.edge < 0 ? '↑' : ''} {Math.abs(game.edge).toFixed(1)}
          </div>
          <div className="text-xs text-deep-slate-500">
            {game.edge > 0 ? 'Under' : game.edge < 0 ? 'Over' : 'Push'}
          </div>
        </div>

        <div className="glass-card rounded p-3">
          <div className="text-xs text-deep-slate-400 mb-1">Confidence</div>
          <div className={clsx('text-lg font-bold', getConfidenceColor(game.confidence_score))}>
            {game.confidence_score.toFixed(0)}%
          </div>
          <div className="text-xs text-deep-slate-500">
            {game.confidence_score > 50 ? 'Under' : game.confidence_score < 50 ? 'Over' : 'Neutral'}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-card rounded p-3">
          <div className="text-xs text-deep-slate-400 mb-2">Pace</div>
          <div className="text-sm text-deep-slate-300">
            Avg: <span className="font-semibold text-white">{avgPace.toFixed(1)}</span> poss/game
          </div>
          <div className="text-xs text-deep-slate-500 mt-1">
            {avgPace < 66 ? '🐢 Very Slow' : avgPace < 68 ? '🐢 Slow' : avgPace > 74 ? '⚡ Fast' : avgPace > 72 ? '⚡ Above Avg' : '➡️ Average'}
          </div>
        </div>

        <div className="glass-card rounded p-3">
          <div className="text-xs text-deep-slate-400 mb-2">Defense</div>
          <div className="text-sm text-deep-slate-300">
            Avg: <span className="font-semibold text-white">{avgDefEff.toFixed(1)}</span> pts/100
          </div>
          <div className="text-xs text-deep-slate-500 mt-1">
            {avgDefEff < 95 ? '🛡️ Elite' : avgDefEff < 98 ? '🛡️ Strong' : avgDefEff > 105 ? '⚠️ Weak' : avgDefEff > 102 ? '⚠️ Below Avg' : '➡️ Average'}
          </div>
        </div>
      </div>

      {/* Factors */}
      {game.factors && game.factors.length > 0 && (
        <div className="border-t border-deep-slate-700/50 pt-4">
          <div className="text-xs font-semibold text-deep-slate-400 mb-2 uppercase tracking-wide">
            Key Factors
          </div>
          <div className="space-y-1">
            {game.factors.slice(0, 5).map((factor, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span className="text-brand-purple-400 mt-0.5">•</span>
                <span className="text-deep-slate-300">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

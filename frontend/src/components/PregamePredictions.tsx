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
  // New betting optimization fields
  in_tempo_sweet_spot?: boolean;
  is_blowout_risk?: boolean;
  early_season_bonus?: number;
  tempo_bonus?: number;
  adjem_differential?: number;
  home_adjem?: number;
  away_adjem?: number;
  pomeroy_prediction?: number;
  ml_prediction?: number;
  model_agreement?: number;
}

interface PregameResponse {
  games: PregameGame[];
  count: number;
  hours_ahead: number;
}

export default function PregamePredictions() {
  // Fetch from /api/predictions/latest instead of ESPN upcoming games
  const { data: predictionsData, error, isLoading } = useSWR(
    '/api/predictions/latest',
    async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/predictions/latest`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      return response.json();
    },
    {
      refreshInterval: 60000, // Refresh every 1 minute
      revalidateOnFocus: false,
    }
  );

  // Transform predictions data to match expected format
  const data = predictionsData ? {
    games: (predictionsData.predictions || []).map((pred: any) => ({
      game_id: `${pred.home_team}-${pred.away_team}`,
      home_team: pred.home_team,
      away_team: pred.away_team,
      commence_time: pred.date,
      time_until_start: pred.date || 'Soon',
      ou_line: pred.ou_line || 0,
      ou_line_opening: pred.ou_line,
      ou_line_closing: null,
      sportsbook: 'Multiple',
      predicted_total: pred.projected_total || 0,
      edge: pred.vs_line || 0,
      confidence_score: pred.confidence || 50,
      recommendation: pred.ai_recommendation || pred.suggestion || 'PASS',
      factors: pred.ai_key_factors || [],
      home_metrics: {
        pace: pred.projected_tempo || 68,
        def_eff: 105,
        off_eff: pred.home_efficiency || 105,
        avg_ppg: pred.home_projected_score || 75,
        three_point_rate: 0.35
      },
      away_metrics: {
        pace: pred.projected_tempo || 68,
        def_eff: 105,
        off_eff: pred.away_efficiency || 105,
        avg_ppg: pred.away_projected_score || 75,
        three_point_rate: 0.35
      },
      ai_summary: pred.ai_summary,
      // New betting optimization fields
      in_tempo_sweet_spot: pred.in_tempo_sweet_spot,
      is_blowout_risk: pred.is_blowout_risk,
      early_season_bonus: pred.early_season_bonus || 0,
      tempo_bonus: pred.tempo_bonus || 0,
      adjem_differential: pred.adjem_differential,
      home_adjem: pred.home_adjem,
      away_adjem: pred.away_adjem,
      pomeroy_prediction: pred.pomeroy_prediction,
      ml_prediction: pred.ml_prediction,
      model_agreement: pred.model_agreement
    })),
    count: predictionsData.count || 0,
    hours_ahead: 24
  } : null;

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
        {data.games.map((game: PregameGame) => (
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

      {/* Betting Indicators */}
      {(game.in_tempo_sweet_spot || game.is_blowout_risk || (game.early_season_bonus ?? 0) > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {game.in_tempo_sweet_spot && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <span>⚡</span>
              <span>Tempo Sweet Spot (66-68) - Higher Scoring Expected</span>
            </div>
          )}
          {game.is_blowout_risk && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Blowout Risk (AdjEM Δ: {game.adjem_differential?.toFixed(1)}) - Lower Confidence</span>
            </div>
          )}
          {(game.early_season_bonus ?? 0) > 0 && (
            <div className="bg-purple-500/20 border border-purple-500/50 text-purple-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <span>📈</span>
              <span>Early Season Bonus: +{game.early_season_bonus?.toFixed(1)} pts</span>
            </div>
          )}
        </div>
      )}

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

      {/* Model Breakdown */}
      {(game.pomeroy_prediction || game.ml_prediction) && (
        <div className="glass-card rounded p-3 mb-4">
          <div className="text-xs font-semibold text-deep-slate-400 mb-2 uppercase tracking-wide">
            Model Breakdown (60% Pomeroy + 40% ML)
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-deep-slate-500 mb-1">Pomeroy (Formula)</div>
              <div className="text-lg font-bold text-blue-400">{game.pomeroy_prediction?.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-deep-slate-500 mb-1">ML (Random Forest)</div>
              <div className="text-lg font-bold text-purple-400">{game.ml_prediction?.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-deep-slate-500 mb-1">Agreement</div>
              <div className={clsx(
                'text-lg font-bold',
                (game.model_agreement ?? 999) < 3 ? 'text-green-400' : (game.model_agreement ?? 999) < 5 ? 'text-yellow-400' : 'text-red-400'
              )}>
                ±{game.model_agreement?.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

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

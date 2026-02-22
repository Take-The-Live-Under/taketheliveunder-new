'use client';

import { useState, useEffect } from 'react';

interface GamePrediction {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRank: number | null;
  awayRank: number | null;
  kenpomHomeScore: number;
  kenpomAwayScore: number;
  kenpomTotal: number;
  kenpomWinProb: number;
  kenpomTempo: number;
  vegasLine: number | null;
  lineDiff: number | null;
  projectedWinner: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  gameTime: string | null;
  status: 'pre' | 'in' | 'post';
}

interface PredictionsResponse {
  predictions: GamePrediction[];
  timestamp: string;
  date: string;
  count: number;
}

export default function ProjectedWinners() {
  const [predictions, setPredictions] = useState<GamePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const res = await fetch('/api/predictions');
        if (!res.ok) throw new Error('Failed to fetch predictions');
        const data: PredictionsResponse = await res.json();
        setPredictions(data.predictions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPredictions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-gray-800/50 p-4 h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-4 text-center">
        <p className="text-sm text-red-400">Failed to load predictions</p>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/30 p-8 text-center">
        <p className="text-gray-400">No predictions available for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {predictions.map((pred) => {
        const homeWins = pred.kenpomWinProb >= 50;
        const winProb = homeWins ? pred.kenpomWinProb : 100 - pred.kenpomWinProb;
        const confidenceColor = {
          HIGH: 'border-green-500/50 bg-green-900/20',
          MEDIUM: 'border-yellow-500/50 bg-yellow-900/20',
          LOW: 'border-gray-600 bg-gray-800/30',
        }[pred.confidence];

        const confidenceBadge = {
          HIGH: 'bg-green-600 text-white',
          MEDIUM: 'bg-yellow-600 text-white',
          LOW: 'bg-gray-600 text-gray-200',
        }[pred.confidence];

        // Determine if there's value in the line
        const hasLineValue = pred.lineDiff !== null && Math.abs(pred.lineDiff) >= 3;
        const lineValueText = pred.lineDiff !== null
          ? pred.lineDiff > 0
            ? `Vegas ${pred.lineDiff.toFixed(1)} pts higher`
            : `KenPom ${Math.abs(pred.lineDiff).toFixed(1)} pts higher`
          : null;

        return (
          <div
            key={pred.gameId}
            className={`rounded-xl border p-4 transition-all ${confidenceColor}`}
          >
            {/* Header: Teams */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {pred.awayRank && pred.awayRank <= 25 && (
                    <span className="text-xs font-bold text-yellow-400">#{pred.awayRank}</span>
                  )}
                  <span className={`font-medium ${pred.projectedWinner === pred.awayTeam ? 'text-white' : 'text-gray-400'}`}>
                    {pred.awayTeam}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pred.homeRank && pred.homeRank <= 25 && (
                    <span className="text-xs font-bold text-yellow-400">#{pred.homeRank}</span>
                  )}
                  <span className={`font-medium ${pred.projectedWinner === pred.homeTeam ? 'text-white' : 'text-gray-400'}`}>
                    {pred.homeTeam}
                  </span>
                </div>
              </div>

              {/* Confidence Badge */}
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceBadge}`}>
                {Math.round(winProb)}%
              </span>
            </div>

            {/* Prediction Details */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {/* KenPom Score */}
              <div className="rounded-lg bg-gray-800/50 p-2">
                <div className="text-xs text-gray-500 mb-1">KenPom</div>
                <div className="text-sm font-semibold text-white">
                  {pred.kenpomAwayScore}-{pred.kenpomHomeScore}
                </div>
                <div className="text-xs text-purple-400 font-medium">
                  {pred.kenpomTotal} total
                </div>
              </div>

              {/* Vegas Line */}
              <div className="rounded-lg bg-gray-800/50 p-2">
                <div className="text-xs text-gray-500 mb-1">Vegas O/U</div>
                <div className="text-sm font-semibold text-white">
                  {pred.vegasLine !== null ? pred.vegasLine : '—'}
                </div>
                {hasLineValue && (
                  <div className={`text-xs font-medium ${(pred.lineDiff ?? 0) > 0 ? 'text-green-400' : 'text-blue-400'}`}>
                    {(pred.lineDiff ?? 0) > 0 ? 'Under value' : 'Over value'}
                  </div>
                )}
              </div>

              {/* Tempo */}
              <div className="rounded-lg bg-gray-800/50 p-2">
                <div className="text-xs text-gray-500 mb-1">Tempo</div>
                <div className="text-sm font-semibold text-white">
                  {pred.kenpomTempo}
                </div>
                <div className="text-xs text-gray-400">
                  {pred.kenpomTempo >= 70 ? 'Fast' : pred.kenpomTempo >= 65 ? 'Avg' : 'Slow'}
                </div>
              </div>
            </div>

            {/* Line Difference Alert */}
            {hasLineValue && lineValueText && (
              <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
                (pred.lineDiff ?? 0) > 0
                  ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                  : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
              }`}>
                {lineValueText}
              </div>
            )}

            {/* Game Time */}
            {pred.gameTime && pred.status === 'pre' && (
              <div className="mt-3 text-xs text-gray-500 text-center">
                {new Date(pred.gameTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

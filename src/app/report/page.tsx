'use client';

import { useState, useEffect } from 'react';

interface GameResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  finalHomeScore: number;
  finalAwayScore: number;
  finalTotal: number;
  ouLine: number;
  result: 'under' | 'over' | 'push';
  margin: number;
  triggerTime: string;
  triggerMinutesRemaining: number;
  triggerScore: number;
  triggerStrength: string;
}

interface DailyReport {
  reportDate: string;
  generatedAt: string;
  summary: {
    totalTriggered: number;
    totalUnders: number;
    totalOvers: number;
    winRate: number;
    avgMargin: number;
    biggestWin: GameResult | null;
  };
  topPerformers: GameResult[];
  allResults: GameResult[];
  message?: string;
}

export default function ReportPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch('/api/daily-report');
        if (!response.ok) throw new Error('Failed to fetch report');
        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8 flex items-center justify-center">
        <div className="text-xl">Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="text-slate-400">No report available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">
            🏀 Daily Performance Report
          </h1>
          <p className="text-slate-400">
            Golden Zone Triggers from {report.reportDate}
          </p>
        </div>

        {report.message ? (
          <div className="bg-slate-800 rounded-xl p-6 text-center text-slate-400">
            {report.message}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-white">{report.summary.totalTriggered}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Triggers</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{report.summary.totalUnders}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Unders</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <div className={`text-3xl font-bold ${report.summary.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {report.summary.winRate}%
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Win Rate</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-center">
                <div className={`text-3xl font-bold ${report.summary.avgMargin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {report.summary.avgMargin > 0 ? '+' : ''}{report.summary.avgMargin}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Avg Margin</div>
              </div>
            </div>

            {/* Top Performers */}
            {report.topPerformers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                  <span>🏆</span> Top Performers
                </h2>
                <div className="space-y-3">
                  {report.topPerformers.map((game, index) => (
                    <div
                      key={game.gameId}
                      className={`bg-gradient-to-r ${
                        index === 0
                          ? 'from-yellow-900/40 to-amber-900/20 border-yellow-500/30'
                          : 'from-slate-800 to-slate-800/50 border-slate-700'
                      } border rounded-xl p-4`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && <span className="text-2xl">🥇</span>}
                          {index === 1 && <span className="text-xl">🥈</span>}
                          {index === 2 && <span className="text-lg">🥉</span>}
                          <div>
                            <div className="font-semibold">
                              {game.awayTeam} @ {game.homeTeam}
                            </div>
                            <div className="text-sm text-slate-400">
                              Final: {game.finalAwayScore}-{game.finalHomeScore} ({game.finalTotal})
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">
                            +{game.margin.toFixed(1)}
                          </div>
                          <div className="text-xs text-slate-400">under line</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>O/U: {game.ouLine}</span>
                        <span>Triggered at {game.triggerMinutesRemaining.toFixed(1)} min</span>
                        <span className="text-yellow-400">{game.triggerStrength}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Results */}
            <div>
              <h2 className="text-xl font-bold text-slate-300 mb-4">All Results</h2>
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="text-left p-3 text-slate-300">Game</th>
                      <th className="text-center p-3 text-slate-300">Final</th>
                      <th className="text-center p-3 text-slate-300">O/U</th>
                      <th className="text-center p-3 text-slate-300">Result</th>
                      <th className="text-center p-3 text-slate-300">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.allResults.map((game) => (
                      <tr key={game.gameId} className="border-t border-slate-700">
                        <td className="p-3">
                          <div className="font-medium">{game.awayTeam}</div>
                          <div className="text-slate-400">@ {game.homeTeam}</div>
                        </td>
                        <td className="text-center p-3">
                          <div>{game.finalAwayScore}-{game.finalHomeScore}</div>
                          <div className="text-slate-400">({game.finalTotal})</div>
                        </td>
                        <td className="text-center p-3 text-yellow-400">{game.ouLine}</td>
                        <td className="text-center p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            game.result === 'under'
                              ? 'bg-green-500/20 text-green-400'
                              : game.result === 'over'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-slate-600 text-slate-300'
                          }`}>
                            {game.result.toUpperCase()}
                          </span>
                        </td>
                        <td className={`text-center p-3 font-bold ${
                          game.margin > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {game.margin > 0 ? '+' : ''}{game.margin.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-slate-500">
              Report generated at {new Date(report.generatedAt).toLocaleString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

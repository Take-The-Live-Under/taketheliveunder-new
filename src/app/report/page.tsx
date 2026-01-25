'use client';

import { useState, useEffect, useCallback } from 'react';

// Get yesterday's date in YYYY-MM-DD format
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Format date for display
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

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

interface TimelinePoint {
  time: string;
  minutesRemaining: number;
  period: number;
  clock: string;
  homeScore: number;
  awayScore: number;
  liveTotal: number;
  ouLine: number | null;
  requiredPPM: number | null;
  currentPPM: number | null;
  isUnderTriggered: boolean;
  isOverTriggered: boolean;
}

interface GameDetail {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  snapshotCount: number;
  timeline: TimelinePoint[];
}

export default function ReportPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getYesterdayDate());
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchReport = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/daily-report?date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate, fetchReport]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate + 'T12:00:00');
    date.setDate(date.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date <= today) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const openGameDetail = async (game: GameResult) => {
    setSelectedGame(game);
    setLoadingDetail(true);
    setGameDetail(null);

    try {
      const res = await fetch(`/api/game-snapshots?gameId=${game.gameId}`);
      if (res.ok) {
        const data = await res.json();
        setGameDetail(data);
      }
    } catch (err) {
      console.error('Failed to load game detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setSelectedGame(null);
    setGameDetail(null);
  };

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

          {/* Date Picker */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Previous day"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <button
              onClick={goToNextDay}
              disabled={selectedDate >= new Date().toISOString().split('T')[0]}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next day"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <p className="text-slate-400 mt-2">
            {formatDisplayDate(selectedDate)}
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
                    <button
                      key={game.gameId}
                      onClick={() => openGameDetail(game)}
                      className={`w-full text-left bg-gradient-to-r ${
                        index === 0
                          ? 'from-yellow-900/40 to-amber-900/20 border-yellow-500/30 hover:from-yellow-900/60'
                          : 'from-slate-800 to-slate-800/50 border-slate-700 hover:from-slate-700'
                      } border rounded-xl p-4 transition-colors`}
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
                        <span className="ml-auto text-xs text-slate-500">Click for details →</span>
                      </div>
                    </button>
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
                      <tr
                        key={game.gameId}
                        onClick={() => openGameDetail(game)}
                        className="border-t border-slate-700 hover:bg-slate-700/50 cursor-pointer transition-colors"
                      >
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

        {/* Game Detail Modal */}
        {selectedGame && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <div
              className="bg-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedGame.awayTeam} @ {selectedGame.homeTeam}
                  </h2>
                  <p className="text-sm text-slate-400">
                    Final: {selectedGame.finalAwayScore}-{selectedGame.finalHomeScore} ({selectedGame.finalTotal}) | O/U: {selectedGame.ouLine}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4">
                {loadingDetail ? (
                  <div className="text-center py-8 text-slate-400">Loading game data...</div>
                ) : gameDetail && gameDetail.timeline.length > 0 ? (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {selectedGame.margin > 0 ? '+' : ''}{selectedGame.margin.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-400">Margin</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {selectedGame.triggerMinutesRemaining.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-400">Trigger Min</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-white">
                          {gameDetail.snapshotCount}
                        </div>
                        <div className="text-xs text-slate-400">Snapshots</div>
                      </div>
                    </div>

                    {/* Line Movement Chart */}
                    <h3 className="text-lg font-semibold text-white mb-3">Score vs O/U Line</h3>
                    <div className="bg-slate-900 rounded-lg p-4 mb-4">
                      {/* Legend */}
                      <div className="flex items-center gap-4 mb-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-0.5 bg-green-500"></span> Live Total
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-0.5 bg-yellow-500"></span> O/U Line
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-cyan-500 border-2 border-white"></span> Entry Point
                        </span>
                      </div>

                      <div className="relative h-56">
                        {(() => {
                          // Calculate chart bounds
                          const allTotals = gameDetail.timeline.map(t => t.liveTotal).filter(t => t > 0);
                          const allLines = gameDetail.timeline.map(t => t.ouLine).filter(l => l !== null) as number[];
                          const minVal = Math.min(...allTotals, ...allLines, 0);
                          const maxVal = Math.max(...allTotals, ...allLines, selectedGame.ouLine) + 10;
                          const range = maxVal - minVal;

                          // Find entry point (first trigger)
                          const entryIdx = gameDetail.timeline.findIndex(t => t.isUnderTriggered);
                          const entryPoint = entryIdx >= 0 ? gameDetail.timeline[entryIdx] : null;

                          const getY = (val: number) => 100 - ((val - minVal) / range) * 100;
                          const getX = (idx: number) => (idx / Math.max(gameDetail.timeline.length - 1, 1)) * 100;

                          return (
                            <>
                              {/* Y-axis labels */}
                              <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-slate-500 pr-1">
                                <span className="text-right">{maxVal.toFixed(0)}</span>
                                <span className="text-right text-yellow-500">{selectedGame.ouLine}</span>
                                <span className="text-right">{minVal.toFixed(0)}</span>
                              </div>

                              {/* Chart area */}
                              <div className="ml-10 h-full relative border-l border-b border-slate-700">
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  {/* O/U Line (yellow) */}
                                  <polyline
                                    fill="none"
                                    stroke="#eab308"
                                    strokeWidth="0.5"
                                    strokeDasharray="2,2"
                                    vectorEffect="non-scaling-stroke"
                                    points={gameDetail.timeline.map((point, i) => {
                                      const x = getX(i);
                                      const y = getY(point.ouLine || selectedGame.ouLine);
                                      return `${x},${y}`;
                                    }).join(' ')}
                                  />

                                  {/* Live Total Score (green) */}
                                  <polyline
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="0.8"
                                    vectorEffect="non-scaling-stroke"
                                    points={gameDetail.timeline.map((point, i) => {
                                      const x = getX(i);
                                      const y = getY(point.liveTotal);
                                      return `${x},${y}`;
                                    }).join(' ')}
                                  />

                                  {/* Entry point marker (cyan, larger) */}
                                  {entryPoint && (
                                    <>
                                      {/* Vertical line at entry */}
                                      <line
                                        x1={getX(entryIdx)}
                                        y1="0"
                                        x2={getX(entryIdx)}
                                        y2="100"
                                        stroke="#06b6d4"
                                        strokeWidth="0.3"
                                        strokeDasharray="1,1"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                      {/* Circle at entry point on score line */}
                                      <circle
                                        cx={getX(entryIdx)}
                                        cy={getY(entryPoint.liveTotal)}
                                        r="2"
                                        fill="#06b6d4"
                                        stroke="#fff"
                                        strokeWidth="0.5"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    </>
                                  )}

                                  {/* Final score marker */}
                                  <circle
                                    cx="100"
                                    cy={getY(selectedGame.finalTotal)}
                                    r="1.5"
                                    fill="#22c55e"
                                    stroke="#fff"
                                    strokeWidth="0.3"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                </svg>

                                {/* Entry point label */}
                                {entryPoint && (
                                  <div
                                    className="absolute text-xs bg-cyan-500 text-black px-1 rounded font-bold"
                                    style={{
                                      left: `${getX(entryIdx)}%`,
                                      top: '-20px',
                                      transform: 'translateX(-50%)'
                                    }}
                                  >
                                    IN @ {entryPoint.liveTotal}
                                  </div>
                                )}

                                {/* Final score label */}
                                <div
                                  className="absolute text-xs text-green-400 font-bold"
                                  style={{
                                    right: '-5px',
                                    top: `${getY(selectedGame.finalTotal)}%`,
                                    transform: 'translateY(-50%) translateX(100%)'
                                  }}
                                >
                                  {selectedGame.finalTotal}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mt-2 ml-10">
                        <span>Start</span>
                        <span>Halftime</span>
                        <span>Final</span>
                      </div>
                    </div>

                    {/* Timeline Table */}
                    <h3 className="text-lg font-semibold text-white mb-3">Game Timeline</h3>
                    <div className="bg-slate-900 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-700 sticky top-0">
                          <tr>
                            <th className="text-left p-2 text-slate-300">Time</th>
                            <th className="text-center p-2 text-slate-300">Score</th>
                            <th className="text-center p-2 text-slate-300">Total</th>
                            <th className="text-center p-2 text-slate-300">O/U</th>
                            <th className="text-center p-2 text-slate-300">PPM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameDetail.timeline.slice().reverse().map((point, i) => (
                            <tr key={i} className={`border-t border-slate-800 ${point.isUnderTriggered ? 'bg-yellow-500/10' : ''}`}>
                              <td className="p-2 text-slate-400">
                                {point.period === 1 ? '1H' : point.period === 2 ? '2H' : `OT${point.period - 2}`} {point.clock}
                              </td>
                              <td className="text-center p-2">{point.awayScore}-{point.homeScore}</td>
                              <td className="text-center p-2 font-medium">{point.liveTotal}</td>
                              <td className="text-center p-2 text-yellow-400">{point.ouLine || '-'}</td>
                              <td className="text-center p-2">
                                {point.currentPPM ? point.currentPPM.toFixed(2) : '-'}
                                {point.isUnderTriggered && <span className="ml-1 text-yellow-400">⚡</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No snapshot data available for this game
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

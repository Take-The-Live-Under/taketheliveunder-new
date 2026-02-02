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
  triggerType: 'under' | 'over' | 'tripleDipper';
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
    underTriggers: number;
    overTriggers: number;
    tripleDipperTriggers: number;
    underWinRate: number;
    overWinRate: number;
    tripleDipperWinRate: number;
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

interface QuarterScoring {
  period: number;
  periodName: string;
  homePoints: number;
  awayPoints: number;
  totalPoints: number;
  ppm: number;
}

interface LossAnalysis {
  gameId: string;
  wentToOT: boolean;
  otPeriods: number;
  quarterScoring: QuarterScoring[];
  biggestScoringRun: {
    points: number;
    period: number;
    description: string;
  } | null;
  finalMinutePoints: number;
  freeThrowsInFinal2Min: number;
  summary: string;
  factors: string[];
}

export default function ReportPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getYesterdayDate());
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [lossAnalysis, setLossAnalysis] = useState<LossAnalysis | null>(null);
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
    setLossAnalysis(null);

    try {
      // Fetch snapshots
      const snapshotRes = await fetch(`/api/game-snapshots?gameId=${game.gameId}`);
      if (snapshotRes.ok) {
        const data = await snapshotRes.json();
        setGameDetail(data);
      }

      // If it's a loss (went over), fetch analysis
      if (game.result === 'over') {
        const analysisRes = await fetch(
          `/api/game-analysis?gameId=${game.gameId}&ouLine=${game.ouLine}&finalTotal=${game.finalTotal}`
        );
        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();
          setLossAnalysis(analysisData);
        }
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
    setLossAnalysis(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-green-500 p-8 flex items-center justify-center font-mono">
        <div className="text-sm">LOADING_REPORT...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-green-500 p-8 font-mono">
        <div className="text-red-400">ERROR: {error}</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-green-500 p-8 font-mono">
        <div className="text-green-700">NO_REPORT_AVAILABLE</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-green-500 p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 border-b border-green-800 pb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-green-400 mb-2 tracking-wider">
            DAILY_PERFORMANCE_REPORT
          </h1>

          {/* Date Picker */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 border border-green-700 hover:bg-green-900/30 transition-colors"
              title="Previous day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
                className="bg-[#0a0a0a] border border-green-700 px-3 py-2 text-green-400 focus:outline-none focus:border-green-500 text-sm"
              />
            </div>

            <button
              onClick={goToNextDay}
              disabled={selectedDate >= new Date().toISOString().split('T')[0]}
              className="p-2 border border-green-700 hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <p className="text-green-700 mt-2 text-sm">
            {formatDisplayDate(selectedDate)}
          </p>
        </div>

        {report.message ? (
          <div className="border border-green-800 bg-green-900/10 p-6 text-center text-green-600">
            {report.message}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="border border-green-800 bg-green-900/10 p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{report.summary.totalTriggered}</div>
                <div className="text-xs text-green-700 uppercase tracking-wide">TOTAL_TRIGGERS</div>
              </div>
              <div className="border border-green-800 bg-green-900/10 p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{report.summary.totalUnders}</div>
                <div className="text-xs text-green-700 uppercase tracking-wide">WENT_UNDER</div>
              </div>
              <div className="border border-green-800 bg-green-900/10 p-4 text-center">
                <div className={`text-2xl font-bold ${report.summary.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {report.summary.winRate}%
                </div>
                <div className="text-xs text-green-700 uppercase tracking-wide">WIN_RATE</div>
              </div>
              <div className="border border-green-800 bg-green-900/10 p-4 text-center">
                <div className={`text-2xl font-bold ${report.summary.avgMargin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {report.summary.avgMargin > 0 ? '+' : ''}{report.summary.avgMargin}
                </div>
                <div className="text-xs text-green-700 uppercase tracking-wide">AVG_MARGIN</div>
              </div>
            </div>

            {/* Trigger Type Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {/* Under Triggers */}
              <div className="border border-green-600 bg-green-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-sm font-bold text-green-400">UNDER</span>
                </div>
                <div className="text-2xl font-bold text-green-400">{report.summary.underTriggers}</div>
                <div className="text-xs text-green-600">
                  {report.summary.underWinRate}% win rate
                </div>
              </div>

              {/* Over Triggers */}
              <div className="border border-orange-600 bg-orange-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-400">🔥</span>
                  <span className="text-sm font-bold text-orange-400">OVER</span>
                </div>
                <div className="text-2xl font-bold text-orange-400">{report.summary.overTriggers}</div>
                <div className="text-xs text-orange-600">
                  {report.summary.overWinRate}% win rate
                </div>
              </div>

              {/* Triple Dipper Triggers */}
              <div className="border border-yellow-600 bg-yellow-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400">🏆</span>
                  <span className="text-sm font-bold text-yellow-400">TRIPLE</span>
                </div>
                <div className="text-2xl font-bold text-yellow-400">{report.summary.tripleDipperTriggers}</div>
                <div className="text-xs text-yellow-600">
                  {report.summary.tripleDipperWinRate}% win rate
                </div>
              </div>
            </div>

            {/* Top Performers */}
            {report.topPerformers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-green-400 mb-4 border-b border-green-800 pb-2">
                  TOP_PERFORMERS
                </h2>
                <div className="space-y-3">
                  {report.topPerformers.map((game, index) => (
                    <button
                      key={game.gameId}
                      onClick={() => openGameDetail(game)}
                      className={`w-full text-left border ${
                        index === 0
                          ? 'border-yellow-600 bg-yellow-900/10 hover:bg-yellow-900/20'
                          : 'border-green-800 bg-green-900/10 hover:bg-green-900/20'
                      } p-4 transition-colors`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && <span className="text-yellow-500 font-bold">[1ST]</span>}
                          {index === 1 && <span className="text-green-500 font-bold">[2ND]</span>}
                          {index === 2 && <span className="text-green-600 font-bold">[3RD]</span>}
                          <div>
                            <div className="font-medium text-green-300">
                              {game.awayTeam} @ {game.homeTeam}
                            </div>
                            <div className="text-xs text-green-600">
                              Final: {game.finalAwayScore}-{game.finalHomeScore} ({game.finalTotal})
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-400">
                            +{game.margin.toFixed(1)}
                          </div>
                          <div className="text-xs text-green-700">under line</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-green-600">
                        <span>O/U: {game.ouLine}</span>
                        <span>Triggered at {game.triggerMinutesRemaining.toFixed(1)} min</span>
                        <span className="text-yellow-500">{game.triggerStrength}</span>
                        <span className="ml-auto text-green-700">Click for details &gt;</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Results */}
            <div>
              <h2 className="text-lg font-bold text-green-400 mb-4 border-b border-green-800 pb-2">ALL_RESULTS</h2>
              <div className="border border-green-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-green-900/30 border-b border-green-800">
                    <tr>
                      <th className="text-left p-3 text-green-600">GAME</th>
                      <th className="text-center p-3 text-green-600">TYPE</th>
                      <th className="text-center p-3 text-green-600">FINAL</th>
                      <th className="text-center p-3 text-green-600">O/U</th>
                      <th className="text-center p-3 text-green-600">RESULT</th>
                      <th className="text-center p-3 text-green-600">MARGIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.allResults.map((game) => {
                      // Determine if this trigger was a "win"
                      const isWin = (game.triggerType === 'under' && game.result === 'under') ||
                                    (game.triggerType === 'over' && game.result === 'over') ||
                                    (game.triggerType === 'tripleDipper' && game.result === 'under');
                      return (
                        <tr
                          key={game.gameId}
                          onClick={() => openGameDetail(game)}
                          className="border-t border-green-900 hover:bg-green-900/20 cursor-pointer transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-medium text-green-300">{game.awayTeam}</div>
                            <div className="text-green-600">@ {game.homeTeam}</div>
                          </td>
                          <td className="text-center p-3">
                            <span className={`px-2 py-0.5 border text-xs font-bold ${
                              game.triggerType === 'under'
                                ? 'border-green-600 text-green-400 bg-green-900/30'
                                : game.triggerType === 'over'
                                ? 'border-orange-600 text-orange-400 bg-orange-900/30'
                                : 'border-yellow-600 text-yellow-400 bg-yellow-900/30'
                            }`}>
                              {game.triggerType === 'tripleDipper' ? '🏆' : game.triggerType === 'over' ? '🔥' : '✓'}
                            </span>
                          </td>
                          <td className="text-center p-3">
                            <div className="text-green-400">{game.finalAwayScore}-{game.finalHomeScore}</div>
                            <div className="text-green-600">({game.finalTotal})</div>
                          </td>
                          <td className="text-center p-3 text-yellow-500">{game.ouLine}</td>
                          <td className="text-center p-3">
                            <span className={`px-2 py-0.5 border text-xs font-bold ${
                              isWin
                                ? 'border-green-500 text-green-400 bg-green-500/10'
                                : 'border-red-500 text-red-400 bg-red-500/10'
                            }`}>
                              {isWin ? 'WIN' : 'LOSS'}
                            </span>
                          </td>
                          <td className={`text-center p-3 font-bold ${
                            game.margin > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {game.margin > 0 ? '+' : ''}{game.margin.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-green-700">
              Report generated at {new Date(report.generatedAt).toLocaleString()}
            </div>
          </>
        )}

        {/* Game Detail Modal */}
        {selectedGame && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <div
              className="bg-[#0a0a0a] border border-green-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#0a0a0a] border-b border-green-800 p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-green-400">
                    {selectedGame.awayTeam} @ {selectedGame.homeTeam}
                  </h2>
                  <p className="text-xs text-green-600">
                    Final: {selectedGame.finalAwayScore}-{selectedGame.finalHomeScore} ({selectedGame.finalTotal}) | O/U: {selectedGame.ouLine}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 border border-green-700 hover:bg-green-900/30 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4">
                {loadingDetail ? (
                  <div className="text-center py-8 text-green-600">LOADING_GAME_DATA...</div>
                ) : gameDetail && gameDetail.timeline.length > 0 ? (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="border border-green-800 bg-green-900/10 p-3 text-center">
                        <div className="text-xl font-bold text-green-400">
                          {selectedGame.margin > 0 ? '+' : ''}{selectedGame.margin.toFixed(1)}
                        </div>
                        <div className="text-xs text-green-700">MARGIN</div>
                      </div>
                      <div className="border border-green-800 bg-green-900/10 p-3 text-center">
                        <div className="text-xl font-bold text-yellow-500">
                          {selectedGame.triggerMinutesRemaining.toFixed(1)}
                        </div>
                        <div className="text-xs text-green-700">TRIGGER_MIN</div>
                      </div>
                      <div className="border border-green-800 bg-green-900/10 p-3 text-center">
                        <div className="text-xl font-bold text-green-400">
                          {gameDetail.snapshotCount}
                        </div>
                        <div className="text-xs text-green-700">SNAPSHOTS</div>
                      </div>
                    </div>

                    {(() => {
                      // Get unique values to check if we have progression data
                      const uniqueTotals = Array.from(new Set(gameDetail.timeline.map(t => t.liveTotal)));
                      const uniqueLines = Array.from(new Set(gameDetail.timeline.map(t => t.ouLine).filter(l => l !== null)));
                      const hasProgression = uniqueTotals.length > 3;

                      // Find entry point (first trigger)
                      const entryIdx = gameDetail.timeline.findIndex(t => t.isUnderTriggered);
                      const entryPoint = entryIdx >= 0 ? gameDetail.timeline[entryIdx] : null;

                      const getX = (idx: number) => (idx / Math.max(gameDetail.timeline.length - 1, 1)) * 100;

                      if (!hasProgression) {
                        return (
                          <div className="border border-green-800 bg-green-900/10 p-6 mb-4">
                            <div className="flex flex-col items-center justify-center text-green-600">
                              <div className="text-3xl mb-3">[DATA]</div>
                              <p className="text-center font-medium">LIMITED_SNAPSHOT_DATA</p>
                              <p className="text-xs text-green-700 mt-2">
                                Final: {selectedGame.finalTotal} | O/U: {selectedGame.ouLine} |
                                <span className={selectedGame.margin > 0 ? ' text-green-400' : ' text-red-400'}>
                                  {' '}{selectedGame.margin > 0 ? '+' : ''}{selectedGame.margin.toFixed(1)} margin
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Chart 1: Score Progression */}
                          <h3 className="text-sm font-semibold text-green-400 mb-2 border-b border-green-800 pb-1">SCORE_PROGRESSION</h3>
                          <div className="border border-green-800 bg-green-900/10 p-4 mb-4">
                            <div className="flex items-center gap-4 mb-2 text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-0.5 bg-green-500"></span> Live Total
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-cyan-500"></span> Entry Point
                              </span>
                            </div>
                            <div className="relative h-40">
                              {(() => {
                                const allTotals = gameDetail.timeline.map(t => t.liveTotal).filter(t => t > 0);
                                const minScore = 0;
                                const maxScore = Math.max(...allTotals, selectedGame.finalTotal) + 10;
                                const range = maxScore - minScore || 1;
                                const getY = (val: number) => 100 - ((val - minScore) / range) * 100;

                                return (
                                  <>
                                    <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-green-700">
                                      <span>{maxScore.toFixed(0)}</span>
                                      <span>{(maxScore / 2).toFixed(0)}</span>
                                      <span>0</span>
                                    </div>
                                    <div className="ml-8 h-full relative border-l border-b border-green-800">
                                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <polyline
                                          fill="none"
                                          stroke="#22c55e"
                                          strokeWidth="0.8"
                                          vectorEffect="non-scaling-stroke"
                                          points={gameDetail.timeline.map((point, i) => `${getX(i)},${getY(point.liveTotal)}`).join(' ')}
                                        />
                                        {entryPoint && (
                                          <>
                                            <line x1={getX(entryIdx)} y1="0" x2={getX(entryIdx)} y2="100" stroke="#06b6d4" strokeWidth="0.3" strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
                                            <circle cx={getX(entryIdx)} cy={getY(entryPoint.liveTotal)} r="2.5" fill="#06b6d4" stroke="#fff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                                          </>
                                        )}
                                        <circle cx="100" cy={getY(selectedGame.finalTotal)} r="2" fill="#22c55e" stroke="#fff" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
                                      </svg>
                                      {entryPoint && (
                                        <div className="absolute text-xs bg-cyan-500 text-black px-1 font-bold" style={{ left: `${getX(entryIdx)}%`, top: '-18px', transform: 'translateX(-50%)' }}>
                                          IN @ {entryPoint.liveTotal}
                                        </div>
                                      )}
                                      <div className="absolute text-xs text-green-400 font-bold" style={{ right: '2px', top: `${getY(selectedGame.finalTotal)}%`, transform: 'translateY(-50%)' }}>
                                        {selectedGame.finalTotal}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="flex justify-between text-xs text-green-700 mt-1 ml-8">
                              <span>Start</span>
                              <span>Halftime</span>
                              <span>Final</span>
                            </div>
                          </div>

                          {/* Chart 2: O/U Line Movement */}
                          <h3 className="text-sm font-semibold text-green-400 mb-2 border-b border-green-800 pb-1">OU_LINE_MOVEMENT</h3>
                          <div className="border border-green-800 bg-green-900/10 p-4 mb-4">
                            <div className="flex items-center gap-4 mb-2 text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-0.5 bg-yellow-500"></span> O/U Line
                              </span>
                              {uniqueLines.length <= 1 && (
                                <span className="text-green-700">(Line stayed flat at {selectedGame.ouLine})</span>
                              )}
                            </div>
                            <div className="relative h-32">
                              {(() => {
                                const allLines = gameDetail.timeline.map(t => t.ouLine || selectedGame.ouLine);
                                const minLine = Math.min(...allLines) - 2;
                                const maxLine = Math.max(...allLines) + 2;
                                const range = maxLine - minLine || 1;
                                const getY = (val: number) => 100 - ((val - minLine) / range) * 100;

                                return (
                                  <>
                                    <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-xs text-yellow-600">
                                      <span>{maxLine.toFixed(1)}</span>
                                      <span>{selectedGame.ouLine}</span>
                                      <span>{minLine.toFixed(1)}</span>
                                    </div>
                                    <div className="ml-10 h-full relative border-l border-b border-green-800">
                                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <polyline
                                          fill="none"
                                          stroke="#eab308"
                                          strokeWidth="1"
                                          vectorEffect="non-scaling-stroke"
                                          points={gameDetail.timeline.map((point, i) => `${getX(i)},${getY(point.ouLine || selectedGame.ouLine)}`).join(' ')}
                                        />
                                        {entryPoint && (
                                          <>
                                            <line x1={getX(entryIdx)} y1="0" x2={getX(entryIdx)} y2="100" stroke="#06b6d4" strokeWidth="0.3" strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
                                            <circle cx={getX(entryIdx)} cy={getY(entryPoint.ouLine || selectedGame.ouLine)} r="2" fill="#06b6d4" stroke="#fff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                                          </>
                                        )}
                                      </svg>
                                      {entryPoint && entryPoint.ouLine && (
                                        <div className="absolute text-xs bg-cyan-500 text-black px-1 font-bold" style={{ left: `${getX(entryIdx)}%`, top: '-18px', transform: 'translateX(-50%)' }}>
                                          Line: {entryPoint.ouLine}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="flex justify-between text-xs text-green-700 mt-1 ml-10">
                              <span>Start</span>
                              <span>Halftime</span>
                              <span>Final</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Timeline Table */}
                    <h3 className="text-sm font-semibold text-green-400 mb-3 border-b border-green-800 pb-1">GAME_TIMELINE</h3>
                    <div className="border border-green-800 overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-green-900/30 sticky top-0 border-b border-green-800">
                          <tr>
                            <th className="text-left p-2 text-green-600">TIME</th>
                            <th className="text-center p-2 text-green-600">SCORE</th>
                            <th className="text-center p-2 text-green-600">TOTAL</th>
                            <th className="text-center p-2 text-green-600">O/U</th>
                            <th className="text-center p-2 text-green-600">PPM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameDetail.timeline.slice().reverse().map((point, i) => (
                            <tr key={i} className={`border-t border-green-900 ${point.isUnderTriggered ? 'bg-yellow-500/10' : ''}`}>
                              <td className="p-2 text-green-600">
                                {point.period === 1 ? '1H' : point.period === 2 ? '2H' : `OT${point.period - 2}`} {point.clock}
                              </td>
                              <td className="text-center p-2 text-green-400">{point.awayScore}-{point.homeScore}</td>
                              <td className="text-center p-2 font-medium text-green-300">{point.liveTotal}</td>
                              <td className="text-center p-2 text-yellow-500">{point.ouLine || '-'}</td>
                              <td className="text-center p-2">
                                <span className="text-green-400">{point.currentPPM ? point.currentPPM.toFixed(2) : '-'}</span>
                                {point.isUnderTriggered && <span className="ml-1 text-yellow-400">*</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Loss Analysis (only for games that went over) */}
                    {lossAnalysis && selectedGame.result === 'over' && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-red-400 mb-3 border-b border-red-800 pb-1">
                          LOSS_ANALYSIS: WHY_DID_IT_GO_OVER?
                        </h3>
                        <div className="border border-red-700 bg-red-900/10 p-4">
                          {/* Summary */}
                          <p className="text-green-300 font-medium mb-3">{lossAnalysis.summary}</p>

                          {/* Factors */}
                          {lossAnalysis.factors.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-green-600 mb-2">Contributing factors:</p>
                              <ul className="space-y-1">
                                {lossAnalysis.factors.map((factor, i) => (
                                  <li key={i} className="text-xs text-red-400 flex items-start gap-2">
                                    <span className="text-red-500">-</span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Quarter Breakdown */}
                          {lossAnalysis.quarterScoring.length > 0 && (
                            <div>
                              <p className="text-xs text-green-600 mb-2">Scoring by period:</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {lossAnalysis.quarterScoring.map((q) => (
                                  <div key={q.period} className={`border ${q.ppm > 4.5 ? 'border-red-500 bg-red-900/20' : 'border-green-800 bg-green-900/10'} p-2 text-center`}>
                                    <div className="text-xs text-green-700">{q.periodName}</div>
                                    <div className="text-lg font-bold text-green-400">{q.totalPoints}</div>
                                    <div className={`text-xs ${q.ppm > 4.5 ? 'text-red-400' : 'text-green-600'}`}>
                                      {q.ppm.toFixed(1)} PPM
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* OT Badge */}
                          {lossAnalysis.wentToOT && (
                            <div className="mt-3 inline-flex items-center gap-1 border border-red-600 bg-red-900/20 text-red-400 px-2 py-1 text-xs">
                              [OT] Game went to {lossAnalysis.otPeriods > 1 ? `${lossAnalysis.otPeriods}x ` : ''}OT
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-green-600">
                    NO_SNAPSHOT_DATA_AVAILABLE
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-xs text-green-700 hover:text-green-500 transition-colors"
          >
            &lt; BACK_TO_DASHBOARD
          </a>
        </div>
      </div>
    </div>
  );
}

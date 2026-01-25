'use client';

import React, { useState, useEffect } from 'react';
import TrendsView from './TrendsView';

interface GameDetailModalProps {
  gameId: string;
  gameTitle?: string;
  onClose: () => void;
}

interface AISummary {
  summary: string;
  recommendation: string;
  reasoning: string;
  timestamp: string;
}

interface HistoricalDataPoint {
  timestamp: string;
  period: number;
  minutes_remaining: number;
  seconds_remaining: number;
  total_points: number;
  away_score: number;
  home_score: number;
  ou_line: number;
  required_ppm: number;
  current_ppm?: number;
  projected_final_score?: number;
  ppm_difference?: number;
}

export default function GameDetailModal({ gameId, gameTitle, onClose }: GameDetailModalProps) {
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch Historical Data on mount
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoadingHistory(true);
      setHistoryError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/games/${gameId}/history`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch historical data: ${response.statusText}`);
        }

        const data = await response.json();
        setHistoricalData(data.history || []);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setHistoryError(error instanceof Error ? error.message : 'Failed to fetch historical data');
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistoricalData();
  }, [gameId]);

  // Fetch AI Summary
  const fetchAISummary = async () => {
    setLoadingAI(true);
    setAiError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/games/${gameId}/ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate AI summary: ${response.statusText}`);
      }

      const data = await response.json();
      setAiSummary(data);
    } catch (error) {
      console.error('Error fetching AI summary:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to generate AI summary');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-700 w-full max-w-7xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">
            {gameTitle || 'Game Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl font-bold px-3 py-1 hover:bg-gray-700 rounded"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* AI Game Analysis Section */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Game Analysis
              </h3>
              <button
                onClick={fetchAISummary}
                disabled={loadingAI}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                {loadingAI ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Summary
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200 mb-4">
                <p className="font-medium">Error generating AI summary</p>
                <p className="text-sm mt-1">{aiError}</p>
              </div>
            )}

            {aiSummary ? (
              <div className="space-y-4">
                <div className="prose prose-invert max-w-none">
                  <div className="bg-gray-800 rounded-lg p-4 whitespace-pre-wrap text-gray-200">
                    {aiSummary.summary}
                  </div>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  Generated {new Date(aiSummary.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-lg">Click Generate Summary to get AI-powered game analysis</p>
                <p className="text-sm mt-2">Analyzes game state, team metrics, and scoring patterns to provide intelligent insights</p>
              </div>
            )}
          </div>

          {/* Historical Data Section */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Game History Timeline
            </h3>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : historyError ? (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
                <p className="font-medium">Error loading historical data</p>
                <p className="text-sm mt-1">{historyError}</p>
              </div>
            ) : historicalData.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg">No historical data available for this game yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {historicalData.map((point, index) => {
                  const isFirst = index === 0;
                  const isLast = index === historicalData.length - 1;
                  const totalTime = point.minutes_remaining || 0;
                  const totalScore = point.total_points || 0;
                  const isOverLine = totalScore > (point.ou_line || 0);

                  return (
                    <div
                      key={index}
                      className={`relative pl-8 pb-4 ${!isLast ? 'border-l-2 border-gray-700' : ''}`}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-0 w-4 h-4 rounded-full border-2 ${
                        isFirst ? 'bg-green-500 border-green-400' :
                        isLast ? 'bg-red-500 border-red-400' :
                        'bg-gray-600 border-gray-500'
                      }`} />

                      {/* Data point card */}
                      <div className="bg-gray-800 rounded-lg p-3 ml-4 border border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-xs text-gray-400">
                              Period {point.period} • {point.minutes_remaining}:{String(point.seconds_remaining || 0).padStart(2, '0')} remaining
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(point.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-white">
                              {point.away_score} - {point.home_score}
                            </div>
                            <div className="text-xs text-gray-400">
                              Total: {totalScore}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-gray-900/50 rounded p-2">
                            <div className="text-xs text-gray-400">O/U Line</div>
                            <div className="text-sm font-semibold text-gray-300">{point.ou_line}</div>
                          </div>
                          <div className={`rounded p-2 ${isOverLine ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                            <div className="text-xs text-gray-400">Status</div>
                            <div className={`text-sm font-semibold ${isOverLine ? 'text-green-400' : 'text-blue-400'}`}>
                              {isOverLine ? 'Over' : 'Under'} by {Math.abs(totalScore - parseFloat(String(point.ou_line || 0))).toFixed(1)}
                            </div>
                          </div>
                          {point.required_ppm && (
                            <div className="bg-gray-900/50 rounded p-2">
                              <div className="text-xs text-gray-400">Required PPM</div>
                              <div className="text-sm font-semibold text-gray-300">{parseFloat(String(point.required_ppm)).toFixed(2)}</div>
                            </div>
                          )}
                          {point.current_ppm && parseFloat(String(point.current_ppm)) > 0 && (
                            <div className="bg-gray-900/50 rounded p-2">
                              <div className="text-xs text-gray-400">Current PPM</div>
                              <div className="text-sm font-semibold text-gray-300">{parseFloat(String(point.current_ppm)).toFixed(2)}</div>
                            </div>
                          )}
                          {point.projected_final_score && parseFloat(String(point.projected_final_score)) > 0 && (
                            <div className="bg-gray-900/50 rounded p-2 col-span-2">
                              <div className="text-xs text-gray-400">Projected Final Score</div>
                              <div className="text-sm font-semibold text-gray-300">{parseFloat(String(point.projected_final_score)).toFixed(1)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trends View */}
          <TrendsView preSelectedGameId={gameId} hideSelector={true} />
        </div>
      </div>
    </div>
  );
}

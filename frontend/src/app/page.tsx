'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { games, stats } from '@/lib/api';
import GameCard from '@/components/GameCard';
import TrendsView from '@/components/TrendsView';
import CompletedGamesAnalysis from '@/components/CompletedGamesAnalysis';
import AllGamesComparison from '@/components/AllGamesComparison';
import clsx from 'clsx';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'live' | 'trends' | 'analysis' | 'comparison'>('live');
  const [filter, setFilter] = useState<'all' | 'triggered'>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'time'>('confidence');
  const [minRequiredPpm, setMinRequiredPpm] = useState<number>(0);
  const [maxRequiredPpm, setMaxRequiredPpm] = useState<number>(10);
  const [minCurrentPpm, setMinCurrentPpm] = useState<number>(0);
  const [maxCurrentPpm, setMaxCurrentPpm] = useState<number>(10);

  // Poll every 20 seconds
  const { data: gamesData, error, mutate } = useSWR(
    filter === 'all' ? 'games-live' : 'games-triggered',
    filter === 'all' ? games.getLive : games.getTriggered,
    { refreshInterval: 20000 }
  );

  const { data: perfData } = useSWR('performance', stats.getPerformance, {
    refreshInterval: 60000,
  });

  // Version marker for deployment tracking
  useEffect(() => {
    console.log('NCAA Betting Monitor v2.0 - Public Access - No Authentication');
  }, []);

  const liveGames = gamesData?.games || [];

  // Filter and sort games
  const sortedGames = [...liveGames]
    .filter((game) => {
      const reqPpm = parseFloat(game.required_ppm || 0);
      const curPpm = parseFloat(game.current_ppm || 0);

      // Apply Required PPM filters
      if (reqPpm < minRequiredPpm || reqPpm > maxRequiredPpm) return false;

      // Apply Current PPM filters (only if current_ppm exists)
      if (curPpm > 0 && (curPpm < minCurrentPpm || curPpm > maxCurrentPpm)) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'confidence') {
        return parseFloat(b.confidence_score || 0) - parseFloat(a.confidence_score || 0);
      }
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">NCAA Basketball Monitor</h1>
              <p className="text-sm text-gray-400">Real-time betting intelligence</p>
            </div>

            <div className="flex gap-4 items-center">
              {/* Performance Stats */}
              {perfData && (
                <div className="text-right">
                  <div className="text-xs text-gray-400">Win Rate</div>
                  <div className="text-lg font-bold text-green-400">
                    {(perfData.win_rate ?? 0).toFixed(1)}%
                  </div>
                </div>
              )}

              <a
                href="/admin"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
              >
                Admin
              </a>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="mt-4 flex gap-2 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('live')}
              className={clsx(
                'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'live'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              )}
            >
              Live Games
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={clsx(
                'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'trends'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              )}
            >
              Trends & Analysis
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={clsx(
                'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              )}
            >
              Completed Games
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={clsx(
                'px-6 py-3 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'comparison'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              )}
            >
              All Games Comparison
            </button>
          </div>

          {/* Filters (only show for Live Games tab) */}
          {activeTab === 'live' && (
            <div className="mt-4 flex gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('triggered')}
                  className={clsx(
                    'px-4 py-2 rounded font-medium text-sm',
                    filter === 'triggered'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  )}
                >
                  Triggered Only
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={clsx(
                    'px-4 py-2 rounded font-medium text-sm',
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  )}
                >
                  All Games
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('confidence')}
                  className={clsx(
                    'px-4 py-2 rounded font-medium text-sm',
                    sortBy === 'confidence'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  )}
                >
                  Sort by Confidence
                </button>
                <button
                  onClick={() => setSortBy('time')}
                  className={clsx(
                    'px-4 py-2 rounded font-medium text-sm',
                    sortBy === 'time'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  )}
                >
                  Sort by Time
                </button>
              </div>

              {/* PPM Filters */}
              <div className="flex gap-4 items-center">
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-400">Required PPM:</span>
                  <input
                    type="number"
                    value={minRequiredPpm}
                    onChange={(e) => setMinRequiredPpm(parseFloat(e.target.value) || 0)}
                    step="0.5"
                    min="0"
                    max="10"
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    placeholder="Min"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    value={maxRequiredPpm}
                    onChange={(e) => setMaxRequiredPpm(parseFloat(e.target.value) || 10)}
                    step="0.5"
                    min="0"
                    max="10"
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    placeholder="Max"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-400">Current PPM:</span>
                  <input
                    type="number"
                    value={minCurrentPpm}
                    onChange={(e) => setMinCurrentPpm(parseFloat(e.target.value) || 0)}
                    step="0.5"
                    min="0"
                    max="10"
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    placeholder="Min"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    value={maxCurrentPpm}
                    onChange={(e) => setMaxCurrentPpm(parseFloat(e.target.value) || 10)}
                    step="0.5"
                    min="0"
                    max="10"
                    className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    placeholder="Max"
                  />
                </div>

                <button
                  onClick={() => {
                    setMinRequiredPpm(0);
                    setMaxRequiredPpm(10);
                    setMinCurrentPpm(0);
                    setMaxCurrentPpm(10);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium text-gray-300"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'live' ? (
          <>
            {/* Live Game Count */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {filter === 'triggered' ? 'Active Opportunities' : 'Live Games'} ({liveGames.length})
              </h2>

              <button
                onClick={() => mutate()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
              >
                Refresh
              </button>
            </div>

            {/* Games Grid */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded p-4 text-red-400">
                Error loading games. Please try again.
              </div>
            )}

            {!error && liveGames.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <p className="text-gray-400 text-lg">
                  {filter === 'triggered'
                    ? 'No triggered games at the moment. Check back soon!'
                    : 'No live games right now.'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedGames.map((game, idx) => (
                <GameCard key={`${game.game_id}-${idx}`} game={game} />
              ))}
            </div>
          </>
        ) : activeTab === 'trends' ? (
          <TrendsView liveGames={liveGames} />
        ) : activeTab === 'analysis' ? (
          <CompletedGamesAnalysis />
        ) : (
          <AllGamesComparison />
        )}

        {/* Performance Summary (only on Live tab) */}
        {activeTab === 'live' && perfData && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Performance Summary</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400">Total Bets</div>
                <div className="text-2xl font-bold">{perfData.total_bets}</div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Win Rate</div>
                <div className="text-2xl font-bold text-green-400">
                  {(perfData.win_rate ?? 0).toFixed(1)}%
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Unit Profit</div>
                <div className={clsx('text-2xl font-bold', (perfData.total_unit_profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {(perfData.total_unit_profit ?? 0) >= 0 ? '+' : ''}{(perfData.total_unit_profit ?? 0).toFixed(2)}u
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">ROI</div>
                <div className={clsx('text-2xl font-bold', (perfData.roi ?? 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {(perfData.roi ?? 0) >= 0 ? '+' : ''}{(perfData.roi ?? 0).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* By Confidence Tier */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Performance by Confidence Tier</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(perfData.by_confidence || {}).map(([tier, data]: [string, any]) => (
                  <div key={tier} className="bg-gray-900/50 rounded p-3">
                    <div className="text-xs text-gray-400 mb-1">{tier}</div>
                    <div className="text-sm">
                      <span className="font-bold">{data.bets}</span> bets
                    </div>
                    <div className="text-sm">
                      <span className="font-bold text-green-400">{data.win_rate?.toFixed(0)}%</span> win rate
                    </div>
                    <div className="text-sm">
                      <span className={clsx('font-bold', (data.profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {(data.profit ?? 0) >= 0 ? '+' : ''}{(data.profit ?? 0).toFixed(1)}u
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

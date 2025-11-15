'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { games, stats, auth } from '@/lib/api';
import GameCard from '@/components/GameCard';
import TrendsView from '@/components/TrendsView';
import CompletedGamesAnalysis from '@/components/CompletedGamesAnalysis';
import AllGamesComparison from '@/components/AllGamesComparison';
import GameDetailModal from '@/components/GameDetailModal';
import { useWebSocket } from '@/hooks/useWebSocket';
import clsx from 'clsx';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'live' | 'trends' | 'analysis' | 'comparison'>('live');
  const [filter, setFilter] = useState<'all' | 'triggered'>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'time' | 'required_ppm' | 'current_ppm' | 'ppm_difference'>('confidence');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minRequiredPpm, setMinRequiredPpm] = useState<number>(0);
  const [maxRequiredPpm, setMaxRequiredPpm] = useState<number>(10);
  const [minCurrentPpm, setMinCurrentPpm] = useState<number>(0);
  const [maxCurrentPpm, setMaxCurrentPpm] = useState<number>(10);
  const [selectedGameForModal, setSelectedGameForModal] = useState<any>(null);
  const [flashAlert, setFlashAlert] = useState(false);

  // WebSocket connection for real-time game updates
  const {
    games: wsGames,
    isConnected,
    lastUpdate,
    connectionCount,
    error: wsError,
    reconnect
  } = useWebSocket();

  const { data: perfData } = useSWR('performance', stats.getPerformance, {
    refreshInterval: 60000,
  });

  // Authentication check - redirect to login if no token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Request notification permission on mount
  useEffect(() => {
    console.log('NCAA Betting Monitor v3.0 - Real-time WebSocket Edition');

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Browser notifications enabled');
        }
      });
    }
  }, []);

  // Flash effect when high-confidence games arrive
  useEffect(() => {
    const hasHighConfidence = wsGames.some(game =>
      game.confidence_score >= 75 && game.trigger_flag
    );

    if (hasHighConfidence) {
      setFlashAlert(true);
      setTimeout(() => setFlashAlert(false), 1000);
    }
  }, [wsGames]);

  const liveGames = wsGames || [];

  // Filter and sort games
  const sortedGames = [...liveGames]
    .filter((game) => {
      const reqPpm = typeof game.required_ppm === 'number' ? game.required_ppm : parseFloat(game.required_ppm || '0');
      const curPpm = typeof game.current_ppm === 'number' ? game.current_ppm : parseFloat(game.current_ppm || '0');

      // Apply Required PPM filters
      if (reqPpm < minRequiredPpm || reqPpm > maxRequiredPpm) return false;

      // Apply Current PPM filters (only if current_ppm exists)
      if (curPpm > 0 && (curPpm < minCurrentPpm || curPpm > maxCurrentPpm)) return false;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'confidence':
          comparison = (typeof b.confidence_score === 'number' ? b.confidence_score : parseFloat(b.confidence_score || '0')) -
                      (typeof a.confidence_score === 'number' ? a.confidence_score : parseFloat(a.confidence_score || '0'));
          break;
        case 'time':
          comparison = (b.timestamp || '').localeCompare(a.timestamp || '');
          break;
        case 'required_ppm':
          comparison = (typeof b.required_ppm === 'number' ? b.required_ppm : parseFloat(b.required_ppm || '0')) -
                      (typeof a.required_ppm === 'number' ? a.required_ppm : parseFloat(a.required_ppm || '0'));
          break;
        case 'current_ppm':
          comparison = (typeof b.current_ppm === 'number' ? b.current_ppm : parseFloat(b.current_ppm || '0')) -
                      (typeof a.current_ppm === 'number' ? a.current_ppm : parseFloat(a.current_ppm || '0'));
          break;
        case 'ppm_difference':
          comparison = (typeof b.ppm_difference === 'number' ? b.ppm_difference : parseFloat(b.ppm_difference || '0')) -
                      (typeof a.ppm_difference === 'number' ? a.ppm_difference : parseFloat(a.ppm_difference || '0'));
          break;
        default:
          comparison = 0;
      }

      // Apply sort direction (desc is default, asc reverses)
      return sortDirection === 'asc' ? -comparison : comparison;
    });

  return (
    <div className={clsx('min-h-screen bg-gray-900 transition-all duration-300', flashAlert && 'ring-4 ring-yellow-500')}>
      {/* WebSocket Connection Status Bar */}
      <div className={clsx(
        'w-full py-2.5 px-4 text-center text-sm font-semibold transition-all duration-300 shadow-elevation-2',
        flashAlert && 'animate-glow',
        isConnected
          ? 'bg-gradient-to-r from-brand-teal-600 to-brand-teal-500 text-white'
          : 'bg-gradient-to-r from-brand-orange-600 to-brand-orange-500 text-white'
      )}>
        {isConnected ? (
          <div className="flex items-center justify-center gap-3">
            <span className="inline-block w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-glow-teal"></span>
            <span className="font-bold">LIVE</span>
            <span className="opacity-90">• {connectionCount} connection{connectionCount !== 1 ? 's' : ''}</span>
            {lastUpdate && <span className="text-xs opacity-75">• Updated: {lastUpdate.toLocaleTimeString()}</span>}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <span className="inline-block w-2.5 h-2.5 bg-white rounded-full"></span>
            <span className="font-bold">DISCONNECTED</span>
            <button
              onClick={reconnect}
              className="ml-3 px-4 py-1 bg-white text-brand-orange-600 rounded-lg text-xs font-bold hover:bg-deep-slate-100 shadow-elevation-1 transition-all"
            >
              Reconnect
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="bg-gradient-header border-b border-brand-purple-700/30 shadow-elevation-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">NCAA Basketball Monitor</h1>
              <p className="text-sm text-brand-purple-200">Real-time betting intelligence</p>
            </div>

            <div className="flex gap-5 items-center">
              {/* Performance Stats */}
              {perfData && (
                <div className="text-right glass-card px-4 py-2 rounded-lg">
                  <div className="text-xs text-deep-slate-400 mb-1">Win Rate</div>
                  <div className="text-xl font-bold text-gradient-purple-orange">
                    {(perfData.win_rate ?? 0).toFixed(1)}%
                  </div>
                </div>
              )}

              <a
                href="/admin"
                className="btn-secondary text-sm"
              >
                Admin
              </a>

              <button
                onClick={() => auth.logout()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="mt-5 flex gap-2 border-b border-brand-purple-700/30">
            <button
              onClick={() => setActiveTab('live')}
              className={clsx(
                activeTab === 'live' ? 'tab-modern-active' : 'tab-modern'
              )}
            >
              Live Games
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={clsx(
                activeTab === 'trends' ? 'tab-modern-active' : 'tab-modern'
              )}
            >
              Trends & Analysis
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={clsx(
                activeTab === 'analysis' ? 'tab-modern-active' : 'tab-modern'
              )}
            >
              Completed Games
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={clsx(
                activeTab === 'comparison' ? 'tab-modern-active' : 'tab-modern'
              )}
            >
              All Games Comparison
            </button>
          </div>

          {/* Filters (only show for Live Games tab) */}
          {activeTab === 'live' && (
            <div className="mt-5 flex gap-4 flex-wrap">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('triggered')}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-elevation-1',
                    filter === 'triggered'
                      ? 'bg-gradient-to-r from-brand-teal-600 to-brand-teal-500 text-white shadow-elevation-2'
                      : 'glass-card text-deep-slate-300 hover:bg-deep-slate-700/70'
                  )}
                >
                  Triggered Only
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-elevation-1',
                    filter === 'all'
                      ? 'bg-gradient-to-r from-brand-teal-600 to-brand-teal-500 text-white shadow-elevation-2'
                      : 'glass-card text-deep-slate-300 hover:bg-deep-slate-700/70'
                  )}
                >
                  All Games
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('confidence')}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-elevation-1',
                    sortBy === 'confidence'
                      ? 'bg-gradient-to-r from-brand-purple-600 to-brand-purple-500 text-white shadow-elevation-2'
                      : 'glass-card text-deep-slate-300 hover:bg-deep-slate-700/70'
                  )}
                >
                  Confidence
                </button>
                <button
                  onClick={() => setSortBy('time')}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-elevation-1',
                    sortBy === 'time'
                      ? 'bg-gradient-to-r from-brand-purple-600 to-brand-purple-500 text-white shadow-elevation-2'
                      : 'glass-card text-deep-slate-300 hover:bg-deep-slate-700/70'
                  )}
                >
                  Time
                </button>
              </div>

              {/* PPM Sort Options */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('required_ppm')}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-elevation-1',
                    sortBy === 'required_ppm'
                      ? 'bg-gradient-to-r from-brand-orange-600 to-brand-orange-500 text-white shadow-elevation-2'
                      : 'glass-card text-deep-slate-300 hover:bg-deep-slate-700/70'
                  )}
                >
                  Required PPM
                </button>
                <button
                  onClick={() => setSortBy('current_ppm')}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-elevation-1',
                    sortBy === 'current_ppm'
                      ? 'bg-gradient-to-r from-brand-orange-600 to-brand-orange-500 text-white shadow-elevation-2'
                      : 'glass-card text-deep-slate-300 hover:bg-deep-slate-700/70'
                  )}
                >
                  Current PPM
                </button>
                <button
                  onClick={() => setSortBy('ppm_difference')}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-elevation-1',
                    sortBy === 'ppm_difference'
                      ? 'bg-gradient-to-r from-brand-orange-600 to-brand-orange-500 text-white shadow-elevation-2'
                      : 'glass-card text-deep-slate-300 hover:bg-deep-slate-700/70'
                  )}
                >
                  PPM Diff
                </button>
              </div>

              {/* Sort Direction Toggle */}
              <button
                onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                className="px-4 py-2 glass-card hover:bg-deep-slate-700/70 rounded-lg font-semibold text-sm text-deep-slate-300 flex items-center gap-2 transition-all shadow-elevation-1"
                title={`Currently sorting ${sortDirection === 'desc' ? 'high to low' : 'low to high'}`}
              >
                {sortDirection === 'desc' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    High → Low
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Low → High
                  </>
                )}
              </button>

              {/* PPM Filters */}
              <div className="flex gap-4 items-center">
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-deep-slate-400 font-medium">Required PPM:</span>
                  <input
                    type="number"
                    value={minRequiredPpm}
                    onChange={(e) => setMinRequiredPpm(parseFloat(e.target.value) || 0)}
                    step="0.5"
                    min="0"
                    max="10"
                    className="input-modern w-20 text-sm"
                    placeholder="Min"
                  />
                  <span className="text-deep-slate-600">-</span>
                  <input
                    type="number"
                    value={maxRequiredPpm}
                    onChange={(e) => setMaxRequiredPpm(parseFloat(e.target.value) || 10)}
                    step="0.5"
                    min="0"
                    max="10"
                    className="input-modern w-20 text-sm"
                    placeholder="Max"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-sm text-deep-slate-400 font-medium">Current PPM:</span>
                  <input
                    type="number"
                    value={minCurrentPpm}
                    onChange={(e) => setMinCurrentPpm(parseFloat(e.target.value) || 0)}
                    step="0.5"
                    min="0"
                    max="10"
                    className="input-modern w-20 text-sm"
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
              <div>
                <h2 className="text-xl font-bold">
                  {filter === 'triggered' ? 'Active Opportunities' : 'Live Games'} ({sortedGames.length})
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Sorted by: <span className="text-yellow-400 font-medium">
                    {sortBy === 'confidence' ? 'Confidence' :
                     sortBy === 'time' ? 'Time' :
                     sortBy === 'required_ppm' ? 'Required PPM' :
                     sortBy === 'current_ppm' ? 'Current PPM' :
                     sortBy === 'ppm_difference' ? 'PPM Difference' : sortBy}
                  </span>
                  {' '}
                  ({sortDirection === 'desc' ? 'High → Low' : 'Low → High'})
                </p>
              </div>

              <div className="flex gap-3 items-center">
                {lastUpdate && (
                  <span className="text-sm text-gray-400">
                    Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={reconnect}
                  disabled={isConnected}
                  className={clsx(
                    'px-4 py-2 rounded text-sm font-medium transition-colors',
                    isConnected
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  )}
                >
                  {isConnected ? 'Connected' : 'Reconnect'}
                </button>
              </div>
            </div>

            {/* WebSocket Error */}
            {wsError && (
              <div className="mb-4 bg-red-900/20 border border-red-500 rounded p-4 text-red-400">
                <p className="font-semibold">WebSocket Error</p>
                <p className="text-sm mt-1">{wsError}</p>
                <button
                  onClick={reconnect}
                  className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-medium"
                >
                  Try Reconnecting
                </button>
              </div>
            )}

            {!wsError && liveGames.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <p className="text-gray-400 text-lg">
                  {!isConnected
                    ? 'Connecting to real-time updates...'
                    : filter === 'triggered'
                    ? 'No triggered games at the moment. Check back soon!'
                    : 'No live games right now. Waiting for games to start...'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedGames.map((game, idx) => (
                <GameCard
                  key={`${game.game_id}-${idx}`}
                  game={game}
                  onClick={() => setSelectedGameForModal(game)}
                />
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

      {/* Game Detail Modal */}
      {selectedGameForModal && (
        <GameDetailModal
          gameId={selectedGameForModal.game_id}
          gameTitle={`${selectedGameForModal.away_team} @ ${selectedGameForModal.home_team}`}
          onClose={() => setSelectedGameForModal(null)}
        />
      )}
    </div>
  );
}

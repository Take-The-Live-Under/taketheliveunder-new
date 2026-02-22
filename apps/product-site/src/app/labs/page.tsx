'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Game } from '@/types/game';
import MatrixRain from '@/components/MatrixRain';
import AsciiLogo from '@/components/AsciiLogo';
import RadarView from '@/components/RadarView';
import HeatMap from '@/components/HeatMap';
import StatsTerminal from '@/components/StatsTerminal';
import AlertHistory from '@/components/AlertHistory';
import DailyBriefing from '@/components/DailyBriefing';
import SystemLog from '@/components/SystemLog';
import Scanlines from '@/components/Scanlines';

type LabTab = 'radar' | 'heatmap' | 'stats' | 'alerts' | 'briefing' | 'ascii' | 'matrix';

export default function LabsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LabTab>('radar');
  const [hackerMode, setHackerMode] = useState(false);
  const [scanlines, setScanlines] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchGames = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/games');
      if (response.ok) {
        const data = await response.json();
        setGames(data.games || []);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 15000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const tabs: { id: LabTab; label: string; icon: string }[] = [
    { id: 'radar', label: 'RADAR', icon: '◎' },
    { id: 'heatmap', label: 'HEAT', icon: '▦' },
    { id: 'stats', label: 'STATS', icon: '▤' },
    { id: 'alerts', label: 'ALERTS', icon: '⚡' },
    { id: 'briefing', label: 'BRIEF', icon: '▶' },
    { id: 'ascii', label: 'ASCII', icon: '▣' },
    { id: 'matrix', label: 'MATRIX', icon: '▥' },
  ];

  const liveCount = games.filter(g => g.status === 'in').length;
  const triggeredCount = games.filter(g => g.triggerType !== null).length;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-green-400 font-mono relative">
      {/* CRT Scanlines Effect */}
      <Scanlines active={scanlines} />

      {/* Matrix Rain Background (when enabled or on matrix tab) */}
      <MatrixRain active={hackerMode || activeTab === 'matrix'} />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-green-900/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-green-700 hover:text-green-400 transition-colors">
                ← BACK
              </Link>
              <div className="w-px h-4 bg-green-900"></div>
              <span className="text-lg font-bold text-green-400">TTLU_LABS</span>
              <span className="text-green-700 text-xs">v0.1.0-beta</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Live indicator */}
              {liveCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <span className="text-xs text-green-500">{liveCount} LIVE</span>
                </div>
              )}
              {triggeredCount > 0 && (
                <span className="text-xs text-yellow-400">{triggeredCount} TRIGGERED</span>
              )}
              {/* Scanlines Toggle */}
              <button
                onClick={() => setScanlines(!scanlines)}
                className={`px-2 py-1 text-xs border transition-colors ${
                  scanlines
                    ? 'border-green-500 text-green-400 bg-green-900/30'
                    : 'border-green-900 text-green-700 hover:border-green-700'
                }`}
              >
                {scanlines ? '◉ CRT' : '○ CRT'}
              </button>
              {/* Hacker Mode Toggle */}
              <button
                onClick={() => setHackerMode(!hackerMode)}
                className={`px-2 py-1 text-xs border transition-colors ${
                  hackerMode
                    ? 'border-green-500 text-green-400 bg-green-900/30'
                    : 'border-green-900 text-green-700 hover:border-green-700'
                }`}
              >
                {hackerMode ? '◉ HACKER' : '○ HACKER'}
              </button>
              {isRefreshing && (
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-black'
                    : 'text-green-600 hover:text-green-400 hover:bg-green-900/20'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-32 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-green-600 text-sm">LOADING_SYSTEMS...</div>
            </div>
          </div>
        ) : (
          <>
            {/* Radar View */}
            {activeTab === 'radar' && (
              <div className="animate-fade-in">
                <div className="text-xs text-green-700 mb-4">// TRIGGER_PROXIMITY_RADAR</div>
                <RadarView games={games} />
                <div className="mt-4 text-xs text-green-700 text-center">
                  Games closer to center = closer to triggering
                </div>
              </div>
            )}

            {/* Heat Map */}
            {activeTab === 'heatmap' && (
              <div className="animate-fade-in">
                <HeatMap games={games} />
              </div>
            )}

            {/* Stats Terminal */}
            {activeTab === 'stats' && (
              <div className="animate-fade-in">
                <StatsTerminal games={games} />
              </div>
            )}

            {/* Alert History */}
            {activeTab === 'alerts' && (
              <div className="animate-fade-in">
                <AlertHistory games={games} />
              </div>
            )}

            {/* Daily Briefing */}
            {activeTab === 'briefing' && (
              <div className="animate-fade-in">
                <DailyBriefing games={games} />
              </div>
            )}

            {/* ASCII Logo */}
            {activeTab === 'ascii' && (
              <div className="animate-fade-in py-8">
                <AsciiLogo animate={true} size="large" />
                <div className="mt-8 text-center">
                  <button
                    onClick={() => {
                      // Force re-render to replay animation
                      setActiveTab('stats');
                      setTimeout(() => setActiveTab('ascii'), 100);
                    }}
                    className="px-4 py-2 border border-green-700 text-green-500 hover:bg-green-900/30 transition-colors text-sm"
                  >
                    REPLAY_ANIMATION
                  </button>
                </div>
              </div>
            )}

            {/* Matrix Mode */}
            {activeTab === 'matrix' && (
              <div className="animate-fade-in text-center py-12">
                <div className="text-6xl mb-4">🐇</div>
                <div className="text-xl text-green-400 mb-2">Follow the white rabbit...</div>
                <div className="text-green-700 text-sm mb-8">
                  Matrix rain effect is now active in the background
                </div>
                <div className="inline-block border border-green-700 p-6 bg-black/50">
                  <div className="text-green-500 text-sm mb-4 typewriter" style={{ width: '280px' }}>
                    Wake up, Neo... The Matrix has you.
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="text-2xl font-bold text-green-400">{games.length}</div>
                      <div className="text-green-700">TOTAL</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-400">{triggeredCount}</div>
                      <div className="text-green-700">TRIGGERS</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">{liveCount}</div>
                      <div className="text-green-700">LIVE</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* System Log */}
      <SystemLog games={games} isScanning={!loading} />
    </main>
  );
}

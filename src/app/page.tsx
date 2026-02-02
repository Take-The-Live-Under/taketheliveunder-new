'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import GameCard from '@/components/GameCard';
import SkeletonCard from '@/components/SkeletonCard';
import LandingPage from '@/components/LandingPage';
import ProjectedWinners from '@/components/ProjectedWinners';
import HowItWorksModal from '@/components/HowItWorksModal';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import TrustFooter from '@/components/TrustFooter';
import GameDetailModal from '@/components/GameDetailModal';
import SystemLog from '@/components/SystemLog';
import AsciiLogo from '@/components/AsciiLogo';
import SearchingCode from '@/components/SearchingCode';
import TriggerAnnouncement from '@/components/TriggerAnnouncement';
import { Game } from '@/types/game';
import { usePageView, useAnalytics } from '@/hooks/useAnalytics';

type SubTab = 'under' | 'over' | 'live' | 'upcoming' | 'picks';

export default function Home() {
  // Access check - must be at top with other hooks
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('under');
  const [searchQuery, setSearchQuery] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastFetchRef = useRef<number>(0);

  // Analytics tracking
  usePageView('home');
  const { trackTabChange, trackDashboardAccess } = useAnalytics();

  // Check localStorage for access on client side - only runs on client
  useEffect(() => {
    // Small delay to ensure we're fully client-side
    const timer = setTimeout(() => {
      try {
        const access = localStorage.getItem('ttlu_access');
        setHasAccess(!!access);
      } catch (e) {
        // localStorage not available, default to no access
        setHasAccess(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchGames = useCallback(async (isRetry = false, showRefresh = false) => {
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) return;
    lastFetchRef.current = now;

    if (isRetry) setRetrying(true);
    if (showRefresh) setIsRefreshing(true);

    try {
      const response = await fetch('/api/games');
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      const newGames = data.games || [];

      // Merge games to avoid complete re-render: update existing games in place
      setGames(prevGames => {
        if (prevGames.length === 0) return newGames;

        // Create a map of new games by ID for quick lookup
        const newGamesMap = new Map(newGames.map((g: Game) => [g.id, g]));
        const prevGamesMap = new Map(prevGames.map(g => [g.id, g]));

        // Check if the game set has changed (additions/removals)
        const sameGameSet =
          newGames.length === prevGames.length &&
          newGames.every((g: Game) => prevGamesMap.has(g.id));

        if (sameGameSet) {
          // Same games - update in place preserving order
          return prevGames.map(prevGame => {
            const newGame = newGamesMap.get(prevGame.id);
            if (!newGame) return prevGame;

            // Only return new object if data actually changed
            const hasChanged = JSON.stringify(prevGame) !== JSON.stringify(newGame);
            return hasChanged ? newGame : prevGame;
          });
        }

        // Game set changed - return new array but preserve relative ordering of existing games
        const existingGamesUpdated = prevGames
          .filter(g => newGamesMap.has(g.id))
          .map(g => newGamesMap.get(g.id)!);

        // Add any new games at the end
        const newGameIds = new Set(newGames.map((g: Game) => g.id));
        const existingIds = new Set(prevGames.map(g => g.id));
        const addedGames = newGames.filter((g: Game) => !existingIds.has(g.id));

        return [...existingGamesUpdated, ...addedGames];
      });

      setLastUpdated(data.timestamp);
      setError(null);
      setRetrying(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (!isRetry) {
        setTimeout(() => fetchGames(true), 5000);
      }
    } finally {
      setLoading(false);
      setRetrying(false);
      setIsRefreshing(false);
      // Mark initial load complete after first successful fetch
      if (isInitialLoad) {
        setTimeout(() => setIsInitialLoad(false), 500);
      }
    }
  }, [isInitialLoad]);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(() => fetchGames(false, true), 15000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  // Filter games based on tab and search
  const filteredGames = games.filter((game) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !game.homeTeam.toLowerCase().includes(query) &&
        !game.awayTeam.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    if (subTab === 'under') {
      // GOLDEN tab shows ALL triggers: under, tripleDipper, and over
      return game.triggerType !== null;
    } else if (subTab === 'over') {
      return game.overTriggeredFlag;
    } else if (subTab === 'live') {
      return game.status === 'in';
    } else if (subTab === 'upcoming') {
      return game.status === 'pre';
    }

    return true;
  });

  // Sort by start time for stability - games won't jump around during refreshes
  const sortedGames = useMemo(() => {
    return [...filteredGames].sort((a, b) => {
      // Primary sort: start time (stable, never changes)
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // Tiebreaker: game ID for absolute stability
      return a.id.localeCompare(b.id);
    });
  }, [filteredGames]);

  // Count all triggered games (under, tripleDipper, and over)
  const underCount = games.filter((g) => g.triggerType === 'under').length;
  const tripleDipperCount = games.filter((g) => g.triggerType === 'tripleDipper').length;
  const overCount = games.filter((g) => g.triggerType === 'over').length;
  const goldenCount = underCount + tripleDipperCount + overCount;  // All triggers combined
  const liveCount = games.filter((g) => g.status === 'in').length;
  const upcomingCount = games.filter((g) => g.status === 'pre').length;

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-green-500 font-mono text-sm animate-pulse">LOADING_TERMINAL...</div>
      </div>
    );
  }

  // Show landing page if no access
  if (!hasAccess) {
    return (
      <LandingPage onAccess={(email) => {
        localStorage.setItem('ttlu_access', email);
        localStorage.setItem('ttlu_email', email);
        setHasAccess(true);
      }} />
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-green-400 font-mono">
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
      )}

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-green-900/50">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {/* Logo Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-bold tracking-tight text-green-400">TTLU_TERMINAL</span>
              <span className="text-green-700 text-xs">v2.1.0</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://discord.gg/CZTNW7JD"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1 text-xs border border-green-700 text-green-500 hover:bg-green-900/30 transition-colors tap-target"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                ALERTS
              </a>
              <a
                href="/brief"
                className="text-xs text-green-600 hover:text-green-400 transition-colors font-medium px-3 py-2 block"
              >
                BRIEF
              </a>
              <a
                href="/labs"
                className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors font-medium px-3 py-2 block"
              >
                LABS
              </a>
              <a
                href="/research"
                className="text-xs text-green-600 hover:text-green-400 transition-colors font-medium px-3 py-2 block"
              >
                RESEARCH
              </a>
              <button
                onClick={() => setShowHowItWorks(true)}
                className="text-xs text-green-600 hover:text-green-400 transition-colors tap-target px-2 py-1"
              >
                INFO
              </button>
              {isRefreshing && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
              )}
            </div>
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-1 border border-green-900/50 p-1">
            <button
              onClick={() => { setSubTab('under'); trackTabChange('under'); }}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 tap-target ${
                subTab === 'under'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:text-green-400 hover:bg-green-900/20'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {goldenCount > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75"></span>
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${subTab === 'under' ? 'bg-black' : 'bg-green-500'}`}></span>
                  </span>
                )}
                TRIGGERS {goldenCount > 0 && <span className="opacity-80">({goldenCount})</span>}
              </span>
            </button>
            <button
              onClick={() => { setSubTab('live'); trackTabChange('live'); }}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 tap-target ${
                subTab === 'live'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:text-green-400 hover:bg-green-900/20'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {liveCount > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75"></span>
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${subTab === 'live' ? 'bg-black' : 'bg-green-500'}`}></span>
                  </span>
                )}
                LIVE {liveCount > 0 && <span className="opacity-80">({liveCount})</span>}
              </span>
            </button>
            <button
              onClick={() => { setSubTab('upcoming'); trackTabChange('upcoming'); }}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 tap-target ${
                subTab === 'upcoming'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:text-green-400 hover:bg-green-900/20'
              }`}
            >
              SOON {upcomingCount > 0 && `(${upcomingCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section - Show trigger stats when triggers are active */}
      {subTab === 'under' && goldenCount > 0 && !loading && (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-2">
          <div className="border border-green-500/30 bg-black/50 p-4 terminal-glow-box">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                </span>
                <span className="text-green-400 font-bold">{goldenCount} ACTIVE_TRIGGER{goldenCount > 1 ? 'S' : ''}</span>
              </div>
              <div className="flex gap-4 text-xs">
                {overCount > 0 && <span className="text-orange-400">🔥 {overCount} OVER</span>}
                {tripleDipperCount > 0 && <span className="text-yellow-400">🏆 {tripleDipperCount} TRIPLE</span>}
                {underCount > 0 && <span className="text-green-400">✓ {underCount} UNDER</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Search */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="SEARCH_TEAMS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-green-900 bg-black/50 pl-12 pr-4 py-3.5 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none text-base transition-all tap-target font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-green-700 hover:text-green-400 tap-target"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Trigger Announcement - Typing animation for active triggers */}
        {goldenCount > 0 && (
          <div className="mb-4">
            <TriggerAnnouncement games={games} />
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 border border-red-900 bg-red-900/20 p-4 flex items-center gap-3 animate-fade-in">
            <div className="flex-shrink-0">
              {retrying ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent"></div>
              ) : (
                <span className="text-red-400 font-mono text-sm">ERROR:</span>
              )}
            </div>
            <div>
              <p className="text-sm font-mono text-red-400">CONNECTION_FAILED</p>
              <p className="text-xs text-red-600 font-mono">// Retrying...</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm mb-4 font-mono">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
              <span>SCANNING_LIVE_GAMES...</span>
            </div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty States - Terminal Style */}
        {!loading && !error && subTab !== 'picks' && sortedGames.length === 0 && (
          <div className="animate-fade-in">
            {subTab === 'under' ? (
              <>
                {/* ASCII Logo with Searching Animation */}
                <div className="border border-green-900 bg-black/30 p-6 md:p-8 text-center terminal-glow-box mb-6">
                  <AsciiLogo animate={true} size="large" />

                  {/* Searching Code Animation */}
                  <div className="mt-6 text-left max-w-lg mx-auto">
                    <SearchingCode liveCount={liveCount} isSearching={true} />
                  </div>

                  <button
                    onClick={() => setSubTab('live')}
                    className="mt-6 px-6 py-2.5 bg-green-900/50 border border-green-700 hover:bg-green-900 text-sm text-green-400 font-medium transition-colors tap-target font-mono"
                  >
                    VIEW_LIVE_GAMES →
                  </button>
                </div>
              </>
            ) : subTab === 'live' ? (
              <div className="border border-green-900 bg-black/30 p-8 text-center terminal-glow-box">
                <div className="text-green-600 text-xs mb-4 font-mono">// STATUS: STANDBY</div>
                <p className="text-lg font-bold text-green-400 mb-2 font-mono">
                  NO_LIVE_GAMES
                </p>
                <p className="text-sm text-green-700 max-w-sm mx-auto font-mono">
                  Check back during NCAA game times for live action and real-time edges.
                </p>
              </div>
            ) : (
              <div className="border border-green-900 bg-black/30 p-8 text-center terminal-glow-box">
                <div className="text-green-600 text-xs mb-4 font-mono">// STATUS: QUEUED</div>
                <p className="text-lg font-bold text-green-400 mb-2 font-mono">
                  NO_UPCOMING_GAMES
                </p>
                <p className="text-sm text-green-700 max-w-sm mx-auto font-mono">
                  Check back later for today&apos;s upcoming matchups.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Picks Tab */}
        {subTab === 'picks' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-green-900/50 border border-green-700 px-2 py-1 text-xs font-medium text-green-400 font-mono">
                KENPOM
              </span>
              <span className="text-sm text-green-700 font-mono">// TODAY&apos;S PROJECTIONS</span>
            </div>
            <ProjectedWinners />
          </div>
        )}

        {/* Games List */}
        {!loading && subTab !== 'picks' && sortedGames.length > 0 && (
          <div className={`space-y-3 ${isInitialLoad ? 'cards-initial-load' : ''}`}>
            {subTab === 'upcoming' && sortedGames.every(g => g.isTomorrow) && (
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-900/50 border border-green-700 px-2 py-1 text-xs font-medium text-green-400 font-mono">
                  TOMORROW
                </span>
                <span className="text-sm text-green-700 font-mono">// No more games today</span>
              </div>
            )}
            {sortedGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onClick={() => setSelectedGame(game)}
              />
            ))}
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && !loading && (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-green-800 timestamp-update font-mono">
            <span className="text-green-600">//</span>
            <span>LAST_SYNC: {new Date(lastUpdated).toLocaleTimeString()}</span>
            <span className="text-green-900">|</span>
            <span>POLL_INTERVAL: 15s</span>
          </div>
        )}
      </div>

      {/* Trust Footer - with bottom padding for SystemLog */}
      <div className="pb-systemlog">
        <TrustFooter />
      </div>

      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          game={games.find(g => g.id === selectedGame.id) || selectedGame}
          isOpen={!!selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {/* System Log - Terminal Style Scanner */}
      <SystemLog games={games} isScanning={!loading && games.some(g => g.status === 'in')} />
    </main>
  );
}

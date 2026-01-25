'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import GameCard from '@/components/GameCard';
import SkeletonCard from '@/components/SkeletonCard';
import LandingPage from '@/components/LandingPage';
import ProjectedWinners from '@/components/ProjectedWinners';
import HowItWorksModal from '@/components/HowItWorksModal';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import TrustFooter from '@/components/TrustFooter';
import { Game } from '@/types/game';
import { usePageView, useAnalytics } from '@/hooks/useAnalytics';

type SubTab = 'under' | 'over' | 'live' | 'upcoming' | 'picks';

const ACCESS_KEY = 'ttlu_access';

export default function Home() {
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
  const lastFetchRef = useRef<number>(0);

  // Analytics tracking
  usePageView('home');
  const { trackTabChange, trackDashboardAccess } = useAnalytics();

  // Check access on mount
  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_KEY);
    setHasAccess(stored === 'true');
  }, []);

  // Handle access grant
  const handleAccess = () => {
    localStorage.setItem(ACCESS_KEY, 'true');
    setHasAccess(true);
    setShowOnboarding(true);
    trackDashboardAccess();
  };

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
      setGames(data.games || []);
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
    }
  }, []);

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
      return game.triggeredFlag;
    } else if (subTab === 'over') {
      return game.overTriggeredFlag;
    } else if (subTab === 'live') {
      return game.status === 'in';
    } else if (subTab === 'upcoming') {
      return game.status === 'pre';
    }

    return true;
  });

  // Sort games
  const sortedGames = [...filteredGames].sort((a, b) => {
    if (subTab === 'under') {
      const aPPM = a.requiredPPM ?? 0;
      const bPPM = b.requiredPPM ?? 0;
      return bPPM - aPPM;
    }

    if (subTab === 'over') {
      const aDiff = Math.abs((a.requiredPPM ?? 0) - (a.currentPPM ?? 0));
      const bDiff = Math.abs((b.requiredPPM ?? 0) - (b.currentPPM ?? 0));
      return aDiff - bDiff;
    }

    if (subTab === 'live') {
      const aPPM = a.requiredPPM ?? 0;
      const bPPM = b.requiredPPM ?? 0;
      return bPPM - aPPM;
    }

    if (subTab === 'upcoming') {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }

    return 0;
  });

  const underCount = games.filter((g) => g.triggeredFlag).length;
  const liveCount = games.filter((g) => g.status === 'in').length;
  const upcomingCount = games.filter((g) => g.status === 'pre').length;

  // Show loading while checking access
  if (hasAccess === null) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  // Show landing page if no access
  if (!hasAccess) {
    return <LandingPage onAccess={handleAccess} />;
  }

  return (
    <main className="min-h-screen bg-slate-900">
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
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {/* Logo Row */}
          <div className="flex items-center justify-between mb-4">
            <Image
              src="/logo.png"
              alt="TakeTheLiveUnder"
              width={180}
              height={72}
              className="h-14 w-auto"
              priority
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHowItWorks(true)}
                className="text-xs text-slate-400 hover:text-orange-400 transition-colors tap-target"
              >
                How it works
              </button>
              {isRefreshing && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
              )}
            </div>
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
            <button
              onClick={() => { setSubTab('under'); trackTabChange('under'); }}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 tap-target ${
                subTab === 'under'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {underCount > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                  </span>
                )}
                Golden {underCount > 0 && <span className="opacity-80">({underCount})</span>}
              </span>
            </button>
            <button
              onClick={() => { setSubTab('live'); trackTabChange('live'); }}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 tap-target ${
                subTab === 'live'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {liveCount > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                  </span>
                )}
                Live {liveCount > 0 && <span className="opacity-80">({liveCount})</span>}
              </span>
            </button>
            <button
              onClick={() => { setSubTab('upcoming'); trackTabChange('upcoming'); }}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 tap-target ${
                subTab === 'upcoming'
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Soon {upcomingCount > 0 && `(${upcomingCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section - Only show on Golden Zone tab when no triggers */}
      {subTab === 'under' && sortedGames.length === 0 && !loading && (
        <div className="mx-auto max-w-2xl px-4 pt-8 pb-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Golden Zone Model
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              Statistically validated Under triggers with <span className="text-yellow-400 font-semibold">69.7% win rate</span> and <span className="text-green-400 font-semibold">33.1% ROI</span>.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Search */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-12 pr-4 py-3.5 text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-base transition-all tap-target"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 tap-target"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/50 bg-red-900/20 p-4 flex items-center gap-3 animate-fade-in">
            <div className="flex-shrink-0">
              {retrying ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent"></div>
              ) : (
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-red-400">Connection issue</p>
              <p className="text-xs text-red-400/70">Retrying automatically...</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
              <span>Finding live NCAA games...</span>
            </div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty States - Improved UX */}
        {!loading && !error && subTab !== 'picks' && sortedGames.length === 0 && (
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-800/50 to-slate-800/20 p-8 text-center animate-fade-in">
            {subTab === 'under' ? (
              <>
                <div className="text-4xl mb-4">🏆</div>
                <p className="text-lg font-semibold text-slate-200 mb-2">
                  No Golden Zone triggers right now
                </p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Golden Zone: Under triggers with PPM diff 1.0-1.5 and 5+ min remaining.
                  <span className="block mt-1 text-yellow-500/80 font-medium">69.7% win rate • 33.1% ROI</span>
                </p>
                <button
                  onClick={() => setSubTab('live')}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm text-slate-200 font-medium transition-colors tap-target"
                >
                  View all live games
                </button>
              </>
            ) : subTab === 'live' ? (
              <>
                <div className="text-4xl mb-4">🏀</div>
                <p className="text-lg font-semibold text-slate-200 mb-2">
                  No live games right now
                </p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Check back during NCAA game times for live action and real-time edges.
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">📅</div>
                <p className="text-lg font-semibold text-slate-200 mb-2">
                  No upcoming games scheduled
                </p>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Check back later for today&apos;s upcoming matchups.
                </p>
              </>
            )}
          </div>
        )}

        {/* Picks Tab */}
        {subTab === 'picks' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="rounded bg-purple-500/20 border border-purple-500/30 px-2 py-1 text-xs font-medium text-purple-400">
                KenPom
              </span>
              <span className="text-sm text-slate-400">Today&apos;s projected winners & totals</span>
            </div>
            <ProjectedWinners />
          </div>
        )}

        {/* Games List */}
        {!loading && subTab !== 'picks' && sortedGames.length > 0 && (
          <div className="space-y-4">
            {subTab === 'upcoming' && sortedGames.every(g => g.isTomorrow) && (
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-purple-500/20 border border-purple-500/30 px-2 py-1 text-xs font-medium text-purple-400">
                  Tomorrow
                </span>
                <span className="text-sm text-slate-500">No more games today</span>
              </div>
            )}
            {sortedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && !loading && (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 timestamp-update">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>
            <span className="text-slate-600">•</span>
            <span>Auto-refreshes every 15s</span>
          </div>
        )}
      </div>

      {/* Trust Footer */}
      <TrustFooter />
    </main>
  );
}

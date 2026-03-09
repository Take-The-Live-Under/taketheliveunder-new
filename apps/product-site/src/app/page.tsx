"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import GameCard from "@/components/GameCard";
import SkeletonCard from "@/components/SkeletonCard";
import LandingPage from "@/components/LandingPage";
import ProjectedWinners from "@/components/ProjectedWinners";
import HowItWorksModal from "@/components/HowItWorksModal";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import TrustFooter from "@/components/TrustFooter";
import GameDetailModal from "@/components/GameDetailModal";
import SystemLog from "@/components/SystemLog";
import AsciiLogo from "@/components/AsciiLogo";
import SearchingCode from "@/components/SearchingCode";
import TriggerAnnouncement from "@/components/TriggerAnnouncement";
import UpcomingGameCard from "@/components/UpcomingGameCard";
import UpcomingGameDetailModal from "@/components/UpcomingGameDetailModal";
import { Navbar } from "@/components/Navbar";
import { Game } from "@/types/game";
import { GamePrediction } from "@/app/api/predictions/route";
import { usePageView, useAnalytics } from "@/hooks/useAnalytics";

type SubTab = "under" | "over" | "live" | "upcoming" | "picks";

export default function Home() {
  // Access check - must be at top with other hooks
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("under");
  const [searchQuery, setSearchQuery] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastFetchRef = useRef<number>(0);

  // KenPom predictions for upcoming games
  const [predictions, setPredictions] = useState<GamePrediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] =
    useState<GamePrediction | null>(null);

  // Analytics tracking
  usePageView("home");
  const { trackTabChange, trackDashboardAccess } = useAnalytics();

  // Check localStorage for access on client side - only runs on client
  useEffect(() => {
    // Small delay to ensure we're fully client-side
    const timer = setTimeout(() => {
      try {
        const access = localStorage.getItem("ttlu_access");
        setHasAccess(!!access);
      } catch (e) {
        // localStorage not available, default to no access
        setHasAccess(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchGames = useCallback(
    async (isRetry = false, showRefresh = false) => {
      const now = Date.now();
      if (now - lastFetchRef.current < 1000) return;
      lastFetchRef.current = now;

      if (isRetry) setRetrying(true);
      if (showRefresh) setIsRefreshing(true);

      try {
        const response = await fetch("/api/games");
        if (!response.ok) {
          throw new Error("Failed to fetch games");
        }
        const data = await response.json();
        const newGames = data.games || [];

        // Merge games to avoid complete re-render: update existing games in place
        setGames((prevGames) => {
          if (prevGames.length === 0) return newGames;

          // Create a map of new games by ID for quick lookup
          const newGamesMap = new Map(newGames.map((g: Game) => [g.id, g]));
          const prevGamesMap = new Map(prevGames.map((g) => [g.id, g]));

          // Check if the game set has changed (additions/removals)
          const sameGameSet =
            newGames.length === prevGames.length &&
            newGames.every((g: Game) => prevGamesMap.has(g.id));

          if (sameGameSet) {
            // Same games - update in place preserving order
            return prevGames.map((prevGame) => {
              const newGame = newGamesMap.get(prevGame.id);
              if (!newGame) return prevGame;

              // Only return new object if data actually changed
              const hasChanged =
                JSON.stringify(prevGame) !== JSON.stringify(newGame);
              return hasChanged ? newGame : prevGame;
            });
          }

          // Game set changed - return new array but preserve relative ordering of existing games
          const existingGamesUpdated = prevGames
            .filter((g) => newGamesMap.has(g.id))
            .map((g) => newGamesMap.get(g.id)!);

          // Add any new games at the end
          const newGameIds = new Set(newGames.map((g: Game) => g.id));
          const existingIds = new Set(prevGames.map((g) => g.id));
          const addedGames = newGames.filter(
            (g: Game) => !existingIds.has(g.id),
          );

          return [...existingGamesUpdated, ...addedGames];
        });

        setLastUpdated(data.timestamp);
        setError(null);
        setRetrying(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
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
    },
    [isInitialLoad],
  );

  useEffect(() => {
    fetchGames();
    const interval = setInterval(() => fetchGames(false, true), 15000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  // Fetch KenPom predictions when upcoming tab is selected
  useEffect(() => {
    if (
      subTab === "upcoming" &&
      predictions.length === 0 &&
      !predictionsLoading
    ) {
      setPredictionsLoading(true);
      setPredictionsError(null);
      fetch("/api/predictions")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch predictions");
          return res.json();
        })
        .then((data) => {
          setPredictions(data.predictions || []);
        })
        .catch((err) => {
          console.error("Predictions error:", err);
          setPredictionsError(err.message);
        })
        .finally(() => {
          setPredictionsLoading(false);
        });
    }
  }, [subTab, predictions.length, predictionsLoading]);

  // Filter predictions based on search
  const filteredPredictions = predictions.filter((pred) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pred.homeTeam.toLowerCase().includes(query) ||
      pred.awayTeam.toLowerCase().includes(query)
    );
  });

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

    if (subTab === "under") {
      // GOLDEN tab shows ALL triggers: under, tripleDipper, and over
      return game.triggerType !== null;
    } else if (subTab === "over") {
      return game.overTriggeredFlag;
    } else if (subTab === "live") {
      return game.status === "in";
    } else if (subTab === "upcoming") {
      return game.status === "pre";
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
  const underCount = games.filter((g) => g.triggerType === "under").length;
  const tripleDipperCount = games.filter(
    (g) => g.triggerType === "tripleDipper",
  ).length;
  const overCount = games.filter((g) => g.triggerType === "over").length;
  const goldenCount = underCount + tripleDipperCount + overCount; // All triggers combined
  const liveCount = games.filter((g) => g.status === "in").length;
  const upcomingCount = games.filter((g) => g.status === "pre").length;

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#00ffff] font-mono text-sm animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  // Show landing page if no access
  if (!hasAccess) {
    return (
      <LandingPage
        onAccess={(email) => {
          localStorage.setItem("ttlu_access", email);
          localStorage.setItem("ttlu_email", email);
          setHasAccess(true);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
      )}

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      {/* Navbar */}
      <Navbar
        showHowItWorks
        onHowItWorksClick={() => setShowHowItWorks(true)}
        isRefreshing={isRefreshing}
      />

      {/* Tab Bar */}
      <div className="mx-auto max-w-2xl px-4 pb-3">
        <div
          className="flex gap-1 rounded-xl border border-neutral-800 p-1"
          style={{ background: "rgba(23,23,23,0.6)" }}
        >
          <button
            onClick={() => {
              setSubTab("under");
              trackTabChange("under");
            }}
            className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 tap-target ${
              subTab === "under"
                ? "bg-[#00ffff]/10 border border-[#00ffff]/40 text-[#00ffff]"
                : "text-neutral-500 hover:text-white hover:bg-neutral-800/50"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              {goldenCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75"></span>
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${subTab === "under" ? "bg-[#00ffff]" : "bg-neutral-500"}`}
                  ></span>
                </span>
              )}
              Triggers{" "}
              {goldenCount > 0 && (
                <span className="opacity-70">({goldenCount})</span>
              )}
            </span>
          </button>
          <button
            onClick={() => {
              setSubTab("live");
              trackTabChange("live");
            }}
            className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 tap-target ${
              subTab === "live"
                ? "bg-[#00ffff]/10 border border-[#00ffff]/40 text-[#00ffff]"
                : "text-neutral-500 hover:text-white hover:bg-neutral-800/50"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              {liveCount > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75"></span>
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${subTab === "live" ? "bg-[#00ffff]" : "bg-neutral-500"}`}
                  ></span>
                </span>
              )}
              Live{" "}
              {liveCount > 0 && (
                <span className="opacity-70">({liveCount})</span>
              )}
            </span>
          </button>
          <button
            onClick={() => {
              setSubTab("upcoming");
              trackTabChange("upcoming");
            }}
            className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 tap-target ${
              subTab === "upcoming"
                ? "bg-[#00ffff]/10 border border-[#00ffff]/40 text-[#00ffff]"
                : "text-neutral-500 hover:text-white hover:bg-neutral-800/50"
            }`}
          >
            Soon {upcomingCount > 0 && `(${upcomingCount})`}
          </button>
        </div>
      </div>

      {/* Hero Section - Show trigger stats when triggers are active */}
      {subTab === "under" && goldenCount > 0 && !loading && (
        <div className="mx-auto max-w-2xl px-4 pt-4 pb-2">
          <div
            className="rounded-xl border border-[#00ffff]/30 p-4"
            style={{
              background: "rgba(0,255,255,0.05)",
              boxShadow: "0 0 20px rgba(0,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00ffff]"></span>
                </span>
                <span className="text-white font-semibold font-mono">
                  {goldenCount} Active Trigger{goldenCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                {overCount > 0 && (
                  <span className="text-[#ff6b00]">🔥 {overCount} Over</span>
                )}
                {tripleDipperCount > 0 && (
                  <span className="text-yellow-400">
                    🏆 {tripleDipperCount} Triple
                  </span>
                )}
                {underCount > 0 && (
                  <span className="text-[#00ffff]">✓ {underCount} Under</span>
                )}
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
            <svg
              className="h-4 w-4 text-neutral-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:border-[#00ffff]/50 focus:outline-none focus:ring-1 focus:ring-[#00ffff]/20 text-sm transition-all tap-target backdrop-blur-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-600 hover:text-white tap-target"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
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
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-900/20 p-4 flex items-center gap-3 animate-fade-in">
            <div className="flex-shrink-0">
              {retrying ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent"></div>
              ) : (
                <span className="text-red-400 font-mono text-sm">!</span>
              )}
            </div>
            <div>
              <p className="text-sm text-red-400">Connection failed</p>
              <p className="text-xs text-red-600 font-mono">Retrying...</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm mb-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent"></div>
              <span className="font-mono">Scanning live games...</span>
            </div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty States */}
        {!loading &&
          !error &&
          subTab !== "picks" &&
          subTab !== "upcoming" &&
          sortedGames.length === 0 && (
            <div className="animate-fade-in">
              {subTab === "under" ? (
                <>
                  {/* ASCII Logo with Searching Animation */}
                  <div className="rounded-xl border border-neutral-800 p-6 md:p-8 text-center glass-card mb-6">
                    <AsciiLogo animate={true} size="large" />

                    {/* Searching Code Animation */}
                    <div className="mt-6 text-left max-w-lg mx-auto">
                      <SearchingCode liveCount={liveCount} isSearching={true} />
                    </div>

                    <button
                      onClick={() => setSubTab("live")}
                      className="mt-6 px-6 py-2.5 rounded-full border border-[#00ffff]/40 text-sm text-[#00ffff] font-medium transition-all tap-target hover:bg-[#00ffff]/10"
                    >
                      View live games →
                    </button>
                  </div>
                </>
              ) : subTab === "live" ? (
                <div className="rounded-xl border border-neutral-800 p-8 text-center glass-card">
                  <div className="text-neutral-600 text-xs mb-4 font-mono">
                    // STATUS: STANDBY
                  </div>
                  <p className="text-lg font-semibold text-white mb-2">
                    No live games
                  </p>
                  <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                    Check back during NCAA game times for live action and
                    real-time edges.
                  </p>
                </div>
              ) : null}
            </div>
          )}

        {/* Empty state for upcoming tab */}
        {subTab === "upcoming" &&
          !predictionsLoading &&
          filteredPredictions.length === 0 &&
          !predictionsError && (
            <div className="rounded-xl border border-neutral-800 p-8 text-center glass-card animate-fade-in">
              <div className="text-neutral-600 text-xs mb-4 font-mono">
                // STATUS: QUEUED
              </div>
              <p className="text-lg font-semibold text-white mb-2">
                No upcoming games
              </p>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                Check back later for today&apos;s KenPom projections.
              </p>
            </div>
          )}

        {/* Picks Tab */}
        {subTab === "picks" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="rounded-lg bg-[#00ffff]/10 border border-[#00ffff]/30 px-2 py-1 text-xs font-medium text-[#00ffff] font-mono">
                KENPOM
              </span>
              <span className="text-sm text-neutral-500 font-mono">
                // Today&apos;s Projections
              </span>
            </div>
            <ProjectedWinners />
          </div>
        )}

        {/* Upcoming Games with KenPom Data */}
        {subTab === "upcoming" &&
          !predictionsLoading &&
          filteredPredictions.length > 0 && (
            <div
              className={`space-y-3 ${isInitialLoad ? "cards-initial-load" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-lg bg-[#00ffff]/10 border border-[#00ffff]/30 px-2 py-1 text-xs font-medium text-[#00ffff] font-mono">
                  KENPOM
                </span>
                <span className="text-sm text-neutral-500 font-mono">
                  // Pre-game projections
                </span>
              </div>
              {filteredPredictions.map((pred) => (
                <UpcomingGameCard
                  key={pred.gameId}
                  prediction={pred}
                  onClick={() => setSelectedPrediction(pred)}
                />
              ))}
            </div>
          )}

        {/* Upcoming loading state */}
        {subTab === "upcoming" && predictionsLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm mb-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent"></div>
              <span className="font-mono">Loading KenPom data...</span>
            </div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Upcoming error state */}
        {subTab === "upcoming" && predictionsError && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4 text-center">
            <p className="text-yellow-400 text-sm font-mono">
              KenPom data unavailable
            </p>
            <p className="text-yellow-700 text-xs mt-1 font-mono">
              Showing basic game info instead
            </p>
          </div>
        )}

        {/* Games List (non-upcoming tabs) */}
        {!loading &&
          subTab !== "picks" &&
          subTab !== "upcoming" &&
          sortedGames.length > 0 && (
            <div
              className={`space-y-3 ${isInitialLoad ? "cards-initial-load" : ""}`}
            >
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
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-700 timestamp-update font-mono">
            <span className="text-neutral-600">//</span>
            <span>Last sync: {new Date(lastUpdated).toLocaleTimeString()}</span>
            <span className="text-neutral-800">|</span>
            <span>Poll: 15s</span>
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
          game={games.find((g) => g.id === selectedGame.id) || selectedGame}
          isOpen={!!selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {/* Upcoming Game Detail Modal */}
      {selectedPrediction && (
        <UpcomingGameDetailModal
          prediction={selectedPrediction}
          isOpen={!!selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
        />
      )}

      {/* System Log - Terminal Style Scanner */}
      <SystemLog
        games={games}
        isScanning={!loading && games.some((g) => g.status === "in")}
      />
    </main>
  );
}

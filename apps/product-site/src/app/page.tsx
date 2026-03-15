"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import TriggerSettingsPanel from "@/components/TriggerSettingsPanel";
import { Navbar } from "@/components/Navbar";
import { Game } from "@/types/game";
import { GamePrediction } from "@/app/api/predictions/route";
import { usePageView, useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useTriggerSettings } from "@/hooks/useTriggerSettings";
import { getTriggerTypeWithSettings } from "@/lib/calculations";

type SubTab = "under" | "over" | "live" | "upcoming" | "picks";

// Re-evaluate trigger type for a game using custom settings
function requalifyGame(game: Game, settings: ReturnType<typeof useTriggerSettings>["settings"]): Game {
  if (game.status !== "in") return game;
  const newTriggerType = getTriggerTypeWithSettings(
    game.status,
    game.minutesRemainingReg,
    game.currentPPM,
    game.requiredPPM,
    game.isOvertime,
    Math.abs((game.homeScore ?? 0) - (game.awayScore ?? 0)),
    settings,
  );
  return {
    ...game,
    triggerType: newTriggerType,
    triggeredFlag: newTriggerType === "under" || newTriggerType === "tripleDipper",
    overTriggeredFlag: newTriggerType === "over",
  };
}

export default function Home() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { settings, updateSetting, resetSettings } = useTriggerSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  // Pin state — persisted to localStorage
  const [pinnedGames, setPinnedGames] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("ttlu_pinned");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Filter state
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showTriggeredOnly, setShowTriggeredOnly] = useState(false);

  // KenPom predictions for upcoming games
  const [predictions, setPredictions] = useState<GamePrediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] =
    useState<GamePrediction | null>(null);

  // Analytics tracking
  usePageView("home");
  const { trackTabChange, trackDashboardAccess } = useAnalytics();

  const togglePin = useCallback((gameId: string) => {
    setPinnedGames((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      try {
        localStorage.setItem("ttlu_pinned", JSON.stringify([...next]));
      } catch {}
      return next;
    });
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

          const newGamesMap = new Map(newGames.map((g: Game) => [g.id, g]));
          const prevGamesMap = new Map(prevGames.map((g) => [g.id, g]));

          const sameGameSet =
            newGames.length === prevGames.length &&
            newGames.every((g: Game) => prevGamesMap.has(g.id));

          if (sameGameSet) {
            return prevGames.map((prevGame) => {
              const newGame = newGamesMap.get(prevGame.id);
              if (!newGame) return prevGame;
              const hasChanged =
                JSON.stringify(prevGame) !== JSON.stringify(newGame);
              return hasChanged ? newGame : prevGame;
            });
          }

          const existingGamesUpdated = prevGames
            .filter((g) => newGamesMap.has(g.id))
            .map((g) => newGamesMap.get(g.id)!);

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

  // Apply custom trigger settings to all live games
  const requalifiedGames = useMemo(() => {
    return games.map((g) => requalifyGame(g, settings));
  }, [games, settings]);

  // Filter predictions based on search, sorted by game time
  const sortedPredictions = useMemo(() => {
    const filtered = predictions.filter((pred) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        pred.homeTeam.toLowerCase().includes(query) ||
        pred.awayTeam.toLowerCase().includes(query)
      );
    });
    return [...filtered].sort((a, b) => {
      const tA = new Date(a.gameTime ?? "").getTime() || 0;
      const tB = new Date(b.gameTime ?? "").getTime() || 0;
      return tA - tB;
    });
  }, [predictions, searchQuery]);

  // Filter games based on tab, search, and active filters
  const filteredGames = useMemo(() => {
    return requalifiedGames.filter((game) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !game.homeTeam.toLowerCase().includes(query) &&
          !game.awayTeam.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (showPinnedOnly && !pinnedGames.has(game.id)) return false;

      if (subTab === "under") {
        return game.triggerType !== null;
      } else if (subTab === "over") {
        return game.overTriggeredFlag;
      } else if (subTab === "live") {
        if (showTriggeredOnly && game.triggerType === null) return false;
        return game.status === "in";
      } else if (subTab === "upcoming") {
        return game.status === "pre";
      }

      return true;
    });
  }, [requalifiedGames, searchQuery, subTab, showPinnedOnly, showTriggeredOnly, pinnedGames]);

  // Sort: pinned first, then by start time, then by ID for stability
  const sortedGames = useMemo(() => {
    return [...filteredGames].sort((a, b) => {
      const aPinned = pinnedGames.has(a.id) ? 1 : 0;
      const bPinned = pinnedGames.has(b.id) ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;

      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      if (timeA !== timeB) return timeA - timeB;

      return a.id.localeCompare(b.id);
    });
  }, [filteredGames, pinnedGames]);

  const underCount = requalifiedGames.filter((g) => g.triggerType === "under").length;
  const tripleDipperCount = requalifiedGames.filter(
    (g) => g.triggerType === "tripleDipper",
  ).length;
  const overCount = requalifiedGames.filter((g) => g.triggerType === "over").length;
  const goldenCount = underCount + tripleDipperCount + overCount;
  const liveCount = requalifiedGames.filter((g) => g.status === "in").length;
  const upcomingCount = requalifiedGames.filter((g) => g.status === "pre").length;
  const hasPinnedGames = pinnedGames.size > 0;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#00ffff] font-mono text-sm animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LandingPage
        onAccess={() => {}}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {showOnboarding && (
        <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
      )}

      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      <Navbar
        showHowItWorks
        onHowItWorksClick={() => setShowHowItWorks(true)}
        isRefreshing={isRefreshing}
      />

      {/* Tab Bar + Settings Gear */}
      <div className="mx-auto max-w-7xl px-4 pb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 gap-1 rounded-xl border border-neutral-800 p-1"
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

          {/* Settings gear button */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            title="Trigger settings"
            className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border transition-all duration-200 tap-target ${
              showSettings
                ? "bg-[#00ffff]/10 border-[#00ffff]/40 text-[#00ffff]"
                : "border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600"
            }`}
            style={{ background: showSettings ? undefined : "rgba(23,23,23,0.6)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Trigger Settings Panel */}
        {showSettings && (
          <div className="mt-2">
            <TriggerSettingsPanel
              settings={settings}
              onUpdate={updateSetting}
              onReset={resetSettings}
            />
          </div>
        )}
      </div>

      {/* Hero Section */}
      {subTab === "under" && goldenCount > 0 && !loading && (
        <div className="mx-auto max-w-7xl px-4 pt-4 pb-2">
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
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Search */}
        <div className="mb-4 relative">
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

        {/* Filter chips — shown contextually */}
        {(hasPinnedGames || subTab === "live") && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-wide">
              Filter:
            </span>
            {hasPinnedGames && (
              <button
                onClick={() => setShowPinnedOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono transition-all tap-target ${
                  showPinnedOnly
                    ? "bg-[#00ffff]/10 border-[#00ffff]/40 text-[#00ffff]"
                    : "border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
                }`}
              >
                <svg className="h-3 w-3" fill={showPinnedOnly ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Pinned only
              </button>
            )}
            {subTab === "live" && (
              <button
                onClick={() => setShowTriggeredOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono transition-all tap-target ${
                  showTriggeredOnly
                    ? "bg-[#00ffff]/10 border-[#00ffff]/40 text-[#00ffff]"
                    : "border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${showTriggeredOnly ? "bg-[#00ffff]" : "bg-neutral-600"}`}></span>
                </span>
                Triggered only
              </button>
            )}
            {(showPinnedOnly || showTriggeredOnly) && (
              <button
                onClick={() => { setShowPinnedOnly(false); setShowTriggeredOnly(false); }}
                className="px-2.5 py-1 rounded-full border border-neutral-800 text-xs font-mono text-neutral-600 hover:text-neutral-400 transition-all tap-target"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Trigger Announcement */}
        {goldenCount > 0 && (
          <div className="mb-4">
            <TriggerAnnouncement games={requalifiedGames} />
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
                  <div className="rounded-xl border border-neutral-800 p-6 md:p-8 text-center glass-card mb-6">
                    <AsciiLogo animate={true} size="large" />
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
          sortedPredictions.length === 0 &&
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
          sortedPredictions.length > 0 && (
            <div className={isInitialLoad ? "cards-initial-load" : ""}>
              <div className="flex items-center gap-2 mb-4">
                <span className="rounded-lg bg-[#00ffff]/10 border border-[#00ffff]/30 px-2 py-1 text-xs font-medium text-[#00ffff] font-mono">
                  KENPOM
                </span>
                <span className="text-sm text-neutral-500 font-mono">
                  // Pre-game projections
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sortedPredictions.map((pred) => (
                  <UpcomingGameCard
                    key={pred.gameId}
                    prediction={pred}
                    onClick={() => setSelectedPrediction(pred)}
                  />
                ))}
              </div>
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
            <div className={isInitialLoad ? "cards-initial-load" : ""}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sortedGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    isPinned={pinnedGames.has(game.id)}
                    onPin={togglePin}
                    onClick={() => setSelectedGame(game)}
                  />
                ))}
              </div>
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

      <div className="pb-systemlog">
        <TrustFooter />
      </div>

      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          game={requalifiedGames.find((g) => g.id === selectedGame.id) || selectedGame}
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

      <SystemLog
        games={requalifiedGames}
        isScanning={!loading && requalifiedGames.some((g) => g.status === "in")}
      />
    </main>
  );
}

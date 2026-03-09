"use client";

import { useState, useEffect, useCallback } from "react";
import { Game } from "@/types/game";
import { Matchup, TeamStats } from "@/types/team";
import GameDetailModal from "@/components/GameDetailModal";
import { Navbar } from "@/components/Navbar";

export default function BriefPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // Fetch both games and matchups in parallel
      const [gamesRes, matchupsRes] = await Promise.all([
        fetch("/api/games"),
        fetch("/api/matchups"),
      ]);

      if (gamesRes.ok) {
        const data = await gamesRes.json();
        setGames(data.games || []);
      }

      if (matchupsRes.ok) {
        const data = await matchupsRes.json();
        setMatchups(data.matchups || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Typing animation for sections
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      setVisibleSections((prev) => {
        if (prev >= 6) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [loading]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const upcomingGames = games.filter((g) => g.status === "pre");
  const liveGames = games.filter((g) => g.status === "in");
  const triggeredGames = games.filter((g) => g.triggerType !== null);

  // Get matchup data for a game
  const getMatchup = (gameId: string): Matchup | undefined => {
    return matchups.find((m) => m.gameId === gameId);
  };

  // High O/U lines (potential trigger candidates)
  const highOUGames = upcomingGames
    .filter((g) => g.ouLine !== null && g.ouLine >= 150)
    .sort((a, b) => (b.ouLine ?? 0) - (a.ouLine ?? 0))
    .slice(0, 8);

  // Low O/U lines
  const lowOUGames = upcomingGames
    .filter((g) => g.ouLine !== null && g.ouLine <= 140)
    .sort((a, b) => (a.ouLine ?? 0) - (b.ouLine ?? 0))
    .slice(0, 8);

  // Games closest to triggering (live games sorted by PPM gap)
  const closeToTrigger = liveGames
    .filter((g) => g.currentPPM !== null && g.requiredPPM !== null)
    .map((g) => ({
      ...g,
      ppmGap: Math.abs((g.currentPPM ?? 0) - (g.requiredPPM ?? 0)),
    }))
    .sort((a, b) => a.ppmGap - b.ppmGap)
    .slice(0, 5);

  // Format stat value
  const formatStat = (value: number | null, decimals: number = 1): string => {
    if (value === null) return "—";
    return value.toFixed(decimals);
  };

  // Stat comparison row
  const StatRow = ({
    label,
    away,
    home,
    higherIsBetter = true,
  }: {
    label: string;
    away: number | null;
    home: number | null;
    higherIsBetter?: boolean;
  }) => {
    const awayBetter =
      away !== null &&
      home !== null &&
      (higherIsBetter ? away > home : away < home);
    const homeBetter =
      away !== null &&
      home !== null &&
      (higherIsBetter ? home > away : home < away);

    return (
      <div className="flex items-center justify-between text-[10px] py-0.5">
        <span
          className={`w-16 text-right font-mono ${awayBetter ? "text-[#00ffff] font-bold" : "text-neutral-500"}`}
        >
          {formatStat(away)}
        </span>
        <span className="text-neutral-700 flex-1 text-center font-mono">
          {label}
        </span>
        <span
          className={`w-16 text-left font-mono ${homeBetter ? "text-[#00ffff] font-bold" : "text-neutral-500"}`}
        >
          {formatStat(home)}
        </span>
      </div>
    );
  };

  // Team stats panel
  const TeamStatsPanel = ({ matchup }: { matchup: Matchup }) => {
    const { homeStats, awayStats } = matchup;

    if (!homeStats && !awayStats) {
      return (
        <div className="text-[10px] text-neutral-600 text-center py-2 font-mono">
          // TEAM_STATS_UNAVAILABLE
        </div>
      );
    }

    return (
      <div className="border-t border-neutral-800/50 pt-2 mt-2">
        <div className="flex justify-between text-[10px] text-neutral-400 mb-2 px-2 font-mono">
          <span>{matchup.awayTeam.split(" ").slice(-1)[0]}</span>
          <span className="text-neutral-700">TEAM_STATS</span>
          <span>{matchup.homeTeam.split(" ").slice(-1)[0]}</span>
        </div>

        <div className="space-y-0.5 px-2">
          <StatRow
            label="PACE"
            away={awayStats?.pace ?? null}
            home={homeStats?.pace ?? null}
          />
          <StatRow
            label="OFF_EFF"
            away={awayStats?.off_efficiency ?? null}
            home={homeStats?.off_efficiency ?? null}
          />
          <StatRow
            label="DEF_EFF"
            away={awayStats?.def_efficiency ?? null}
            home={homeStats?.def_efficiency ?? null}
            higherIsBetter={false}
          />
          <StatRow
            label="PPG"
            away={awayStats?.avg_ppg ?? null}
            home={homeStats?.avg_ppg ?? null}
          />
          <StatRow
            label="3P_RATE"
            away={awayStats?.three_p_rate ?? null}
            home={homeStats?.three_p_rate ?? null}
          />
          <StatRow
            label="FT_RATE"
            away={awayStats?.ft_rate ?? null}
            home={homeStats?.ft_rate ?? null}
          />
        </div>

        {/* Pace Analysis */}
        {awayStats?.pace && homeStats?.pace && (
          <div className="mt-2 px-2 py-1.5 rounded bg-neutral-900/50 border border-neutral-800/50">
            <div className="text-[10px] text-[#00ffff] mb-1 font-mono">
              // PACE_ANALYSIS
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              {(() => {
                const avgPace = (awayStats.pace + homeStats.pace) / 2;
                const paceLabel =
                  avgPace >= 72 ? "FAST" : avgPace >= 68 ? "AVERAGE" : "SLOW";
                return (
                  <>
                    Combined Pace:{" "}
                    <span
                      className={
                        avgPace >= 72
                          ? "text-[#ff6b00]"
                          : avgPace >= 68
                            ? "text-yellow-400"
                            : "text-[#00ffff]"
                      }
                    >
                      {avgPace.toFixed(1)}
                    </span>
                    <span className="text-neutral-700 ml-2">({paceLabel})</span>
                    <div className="text-neutral-600 mt-0.5">
                      Expected tempo favors: {avgPace >= 70 ? "OVER" : "UNDER"}{" "}
                      plays
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  const GameRow = ({
    game,
    highlight,
    showStats = false,
  }: {
    game: Game;
    highlight?: string;
    showStats?: boolean;
  }) => {
    const matchup = getMatchup(game.id);
    const isExpanded = expandedGame === game.id;

    return (
      <div
        className={`bg-neutral-900/30 border border-neutral-800/50 rounded-lg ${
          game.triggerType ? "border-l-2 border-l-[#00ffff]" : ""
        }`}
      >
        <button
          onClick={() => {
            if (showStats && game.status === "pre") {
              setExpandedGame(isExpanded ? null : game.id);
            } else {
              setSelectedGame(game);
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-neutral-800/30 transition-all text-left"
        >
          <div className="flex-1">
            <span className="text-white">{game.awayTeam}</span>
            <span className="text-neutral-600 mx-1">@</span>
            <span className="text-white">{game.homeTeam}</span>
            {game.status === "in" && (
              <span className="ml-2 text-[10px] text-neutral-500 font-mono">
                ({game.awayScore}-{game.homeScore})
              </span>
            )}
            {game.status === "pre" && (
              <span className="ml-2 text-[10px] text-neutral-600 font-mono">
                {new Date(game.startTime).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {highlight && (
              <span
                className={`font-bold font-mono ${
                  highlight === "high"
                    ? "text-[#ff6b00]"
                    : highlight === "low"
                      ? "text-[#00ffff]"
                      : "text-yellow-400"
                }`}
              >
                {game.ouLine?.toFixed(1)}
              </span>
            )}
            {game.triggerType && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded font-mono ${
                  game.triggerType === "over"
                    ? "bg-[#ff6b00]/20 border border-[#ff6b00]/40 text-[#ff6b00]"
                    : game.triggerType === "tripleDipper"
                      ? "bg-yellow-900/30 border border-yellow-700/40 text-yellow-400"
                      : "bg-[#00ffff]/10 border border-[#00ffff]/40 text-[#00ffff]"
                }`}
              >
                {game.triggerType === "over"
                  ? "OVER"
                  : game.triggerType === "tripleDipper"
                    ? "TRIPLE"
                    : "UNDER"}
              </span>
            )}
            {showStats && game.status === "pre" ? (
              <span className="text-neutral-600">{isExpanded ? "▼" : "▶"}</span>
            ) : (
              <span className="text-neutral-600">→</span>
            )}
          </div>
        </button>

        {/* Expanded stats panel */}
        {isExpanded && matchup && (
          <div className="px-3 pb-3">
            <TeamStatsPanel matchup={matchup} />
            <button
              onClick={() => setSelectedGame(game)}
              className="mt-2 w-full text-[10px] text-[#00ffff]/70 hover:text-[#00ffff] py-1 border border-neutral-800 hover:border-[#00ffff]/30 transition-colors rounded font-mono"
            >
              VIEW_FULL_DETAILS →
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <Navbar isRefreshing={isRefreshing} />

      {/* Content — max-w-7xl, two-column on lg+ */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#00ffff] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-neutral-500 text-sm font-mono">
                Loading briefing...
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* ── LEFT SIDEBAR (sticky on desktop) ── */}
            <div className="w-full lg:w-72 xl:w-80 lg:sticky lg:top-24 flex-shrink-0 space-y-4">
              {/* Overview Stats */}
              {visibleSections >= 1 && (
                <div className="animate-fade-in">
                  <div className="text-[#00ffff] text-xs mb-3 font-mono">
                    {">"} SITUATION_OVERVIEW
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-neutral-800 p-4 glass-card text-center">
                      <div className="text-3xl font-bold text-white font-mono">
                        {games.length}
                      </div>
                      <div className="text-[10px] text-neutral-600 font-mono mt-1">
                        TOTAL
                      </div>
                    </div>
                    <div className="rounded-xl border border-neutral-800 p-4 glass-card text-center">
                      <div className="text-3xl font-bold text-[#00ffff] font-mono">
                        {liveGames.length}
                      </div>
                      <div className="text-[10px] text-neutral-600 font-mono mt-1">
                        LIVE
                      </div>
                    </div>
                    <div className="rounded-xl border border-neutral-800 p-4 glass-card text-center">
                      <div className="text-3xl font-bold text-yellow-400 font-mono">
                        {triggeredGames.length}
                      </div>
                      <div className="text-[10px] text-neutral-600 font-mono mt-1">
                        TRIGGERS
                      </div>
                    </div>
                    <div className="rounded-xl border border-neutral-800 p-4 glass-card text-center">
                      <div className="text-3xl font-bold text-white font-mono">
                        {upcomingGames.length}
                      </div>
                      <div className="text-[10px] text-neutral-600 font-mono mt-1">
                        UPCOMING
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trigger Parameters — sidebar on desktop */}
              {visibleSections >= 6 && (
                <div className="animate-fade-in hidden lg:block">
                  <div className="text-[#00ffff] text-xs mb-3 font-mono">
                    {">"} TRIGGER_PARAMETERS
                  </div>
                  <div className="rounded-xl border border-neutral-800 glass-card p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-[#ff6b00] text-lg">▸</span>
                      <div>
                        <div className="text-[#ff6b00] font-bold text-xs font-mono">
                          OVER_SIGNAL
                        </div>
                        <div className="text-neutral-500 text-[10px] font-mono mt-0.5">
                          Game minute 20-30, PPM gap ≥ +0.3
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-yellow-400 text-lg">▸</span>
                      <div>
                        <div className="text-yellow-400 font-bold text-xs font-mono">
                          TRIPLE_DIPPER
                        </div>
                        <div className="text-neutral-500 text-[10px] font-mono mt-0.5">
                          Required PPM ≥ 4.5, PPM gap ≤ -1.0
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[#00ffff] text-lg">▸</span>
                      <div>
                        <div className="text-[#00ffff] font-bold text-xs font-mono">
                          GOLDEN_ZONE
                        </div>
                        <div className="text-neutral-500 text-[10px] font-mono mt-0.5">
                          PPM difference in sweet spot 1.0-1.5
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-neutral-800/50 text-center">
                      <div className="text-white text-xs font-bold">
                        Good Hunting, Operator
                      </div>
                      <div className="text-neutral-700 text-[10px] mt-1 font-mono">
                        // END_BRIEFING
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Date label */}
              <div className="text-[10px] text-neutral-800 font-mono px-1 hidden lg:block">
                {dateStr}
              </div>
            </div>

            {/* ── RIGHT PANEL: game lists ── */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Active Triggers */}
              {visibleSections >= 2 && triggeredGames.length > 0 && (
                <div className="animate-fade-in">
                  <div className="text-[#00ffff] text-xs mb-3 font-mono">
                    {">"} ACTIVE_TRIGGERS
                  </div>
                  <div
                    className="rounded-xl border border-[#00ffff]/30 p-1 space-y-1"
                    style={{ background: "rgba(0,255,255,0.04)" }}
                  >
                    {triggeredGames.map((game) => (
                      <GameRow key={game.id} game={game} />
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] text-neutral-700 px-1 font-mono">
                    // Tap any game for full analysis
                  </div>
                </div>
              )}

              {/* Close to Triggering */}
              {visibleSections >= 3 && closeToTrigger.length > 0 && (
                <div className="animate-fade-in">
                  <div className="text-[#00ffff] text-xs mb-3 font-mono">
                    {">"} APPROACHING_TRIGGER
                  </div>
                  <div className="space-y-1">
                    {closeToTrigger.map((game) => (
                      <div key={game.id} className="relative">
                        <GameRow game={game} />
                        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-yellow-500 font-mono">
                          GAP: {game.ppmGap.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High O/U Watch */}
              {visibleSections >= 4 && highOUGames.length > 0 && (
                <div className="animate-fade-in">
                  <div className="text-[#00ffff] text-xs mb-3 font-mono">
                    {">"} HIGH_OU_TARGETS{" "}
                    <span className="text-[#ff6b00]">(Watch for OVER)</span>
                    <span className="text-neutral-700 ml-2">
                      // tap to expand stats
                    </span>
                  </div>
                  <div className="space-y-1">
                    {highOUGames.map((game) => (
                      <GameRow
                        key={game.id}
                        game={game}
                        highlight="high"
                        showStats={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Low O/U Watch */}
              {visibleSections >= 5 && lowOUGames.length > 0 && (
                <div className="animate-fade-in">
                  <div className="text-[#00ffff] text-xs mb-3 font-mono">
                    {">"} LOW_OU_TARGETS{" "}
                    <span className="text-[#00ffff]/80">(Watch for UNDER)</span>
                    <span className="text-neutral-700 ml-2">
                      // tap to expand stats
                    </span>
                  </div>
                  <div className="space-y-1">
                    {lowOUGames.map((game) => (
                      <GameRow
                        key={game.id}
                        game={game}
                        highlight="low"
                        showStats={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Trigger Parameters — mobile only (desktop has it in left sidebar) */}
              {visibleSections >= 6 && (
                <div className="animate-fade-in lg:hidden">
                  <div className="text-[#00ffff] text-xs mb-3 font-mono">
                    {">"} TRIGGER_PARAMETERS
                  </div>
                  <div className="rounded-xl border border-neutral-800 glass-card p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-[#ff6b00] text-lg">▸</span>
                      <div>
                        <div className="text-[#ff6b00] font-bold text-sm font-mono">
                          OVER_SIGNAL
                        </div>
                        <div className="text-neutral-500 text-xs font-mono">
                          Game minute 20-30, PPM gap ≥ +0.3
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-yellow-400 text-lg">▸</span>
                      <div>
                        <div className="text-yellow-400 font-bold text-sm font-mono">
                          TRIPLE_DIPPER
                        </div>
                        <div className="text-neutral-500 text-xs font-mono">
                          Required PPM ≥ 4.5, PPM gap ≤ -1.0
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[#00ffff] text-lg">▸</span>
                      <div>
                        <div className="text-[#00ffff] font-bold text-sm font-mono">
                          GOLDEN_ZONE
                        </div>
                        <div className="text-neutral-500 text-xs font-mono">
                          PPM difference in sweet spot 1.0-1.5
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-neutral-800/50 text-center">
                      <div className="text-white text-sm font-bold">
                        Good Hunting, Operator
                      </div>
                      <div className="text-neutral-700 text-[10px] mt-1 font-mono">
                        // END_BRIEFING
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state when no game sections visible yet */}
              {visibleSections >= 2 &&
                triggeredGames.length === 0 &&
                closeToTrigger.length === 0 &&
                highOUGames.length === 0 &&
                lowOUGames.length === 0 && (
                  <div className="text-center py-16 rounded-xl border border-neutral-800 glass-card">
                    <div className="text-neutral-700 text-xs font-mono mb-2">
                      // STATUS: STANDBY
                    </div>
                    <p className="text-white font-semibold">
                      No active signals
                    </p>
                    <p className="text-neutral-500 text-sm mt-1">
                      Check back during game windows
                    </p>
                  </div>
                )}
            </div>
            {/* end right panel */}
          </div>
        )}
      </div>

      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          game={games.find((g) => g.id === selectedGame.id) || selectedGame}
          isOpen={!!selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </main>
  );
}

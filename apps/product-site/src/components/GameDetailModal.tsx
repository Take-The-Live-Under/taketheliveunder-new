"use client";

import { useEffect, useState, useCallback } from "react";
import { Game } from "@/types/game";
import GameCharts from "./GameCharts";
import GameSplitsTab from "./GameSplitsTab";
import PlayByPlayTab from "./PlayByPlayTab";

interface GameDetailModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
}

interface Official {
  name: string;
  foulsPerGame: number | null;
  style: string | null;
  homeBias: number | null;
}

interface TeamStats {
  teamId: string;
  teamName: string;
  abbreviation: string;
  isHome: boolean;
  stats: {
    fouls: number;
    technicalFouls: number;
    fieldGoals: string;
    fieldGoalPct: number;
    threePointers: string;
    threePointPct: number;
    freeThrows: string;
    freeThrowPct: number;
    rebounds: number;
    offRebounds: number;
    defRebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    pointsInPaint: number;
    fastBreakPoints: number;
    largestLead: number;
  };
  bonusStatus: {
    inBonus: boolean;
    inDoubleBonus: boolean;
    label: string;
  };
}

interface TopPlayer {
  name: string;
  jersey: string;
  points: number;
  rebounds: number;
  assists: number;
  fouls: number;
}

interface PpmSplit {
  split: string;
  homePPM: number | null;
  awayPPM: number | null;
  totalPPM: number | null;
  homePoints: number;
  awayPoints: number;
  complete: boolean;
}

interface LinePoint {
  minute: number;
  line: number;
  timestamp: string;
}

interface GameDetails {
  gameId: string;
  status: string;
  period: number;
  clock: string;
  venue: string | null;
  attendance: number | null;
  officials: Official[];
  crewAvgFouls: number | null;
  crewStyle: string | null;
  teamStats: TeamStats[];
  topPlayers: Array<{
    teamName: string;
    players: TopPlayer[];
  }>;
  ppmSplits?: PpmSplit[];
  lineMovement?: LinePoint[];
}

export default function GameDetailModal({
  game,
  isOpen,
  onClose,
}: GameDetailModalProps) {
  const [details, setDetails] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "charts" | "splits" | "plays" | "stats" | "players" | "refs"
  >("charts");

  const fetchDetails = useCallback(async () => {
    if (!isOpen || !game.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/game-details?gameId=${game.id}`);
      if (!response.ok) throw new Error("Failed to fetch game details");
      const data = await response.json();
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [isOpen, game.id]);

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 30000);
    return () => clearInterval(interval);
  }, [fetchDetails]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const awayTeam = details?.teamStats?.find((t) => !t.isHome);
  const homeTeam = details?.teamStats?.find((t) => t.isHome);

  const tabClass = (tab: string) =>
    `flex-1 py-2 px-3 text-xs font-medium transition-all rounded-lg ${
      activeTab === tab
        ? "bg-[#00ffff] text-black font-bold"
        : "text-neutral-500 hover:text-white hover:bg-neutral-800/50"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center font-mono">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal — bottom sheet mobile, wide side-panel on lg+ */}
      <div
        className="relative w-full max-w-5xl max-h-[90vh] lg:max-h-[85vh] rounded-t-2xl lg:rounded-2xl border border-neutral-800 animate-slide-up overflow-hidden flex flex-col lg:flex-row"
        style={{
          background: "rgba(10,10,10,0.97)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* LEFT PANEL: header + nav */}
        <div className="flex-shrink-0 lg:w-72 lg:border-r border-neutral-800 flex flex-col">
          {/* Status bar + close */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              {game.status === "in" && (
                <span
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#00ffff]/40"
                  style={{ background: "rgba(0,255,255,0.08)" }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ffff]"></span>
                  </span>
                  <span className="text-xs font-medium text-[#00ffff]">
                    LIVE
                  </span>
                </span>
              )}
              {game.status === "pre" && (
                <span className="px-2 py-0.5 rounded border border-neutral-700 text-xs text-neutral-400">
                  UPCOMING
                </span>
              )}
              {game.status === "post" && (
                <span className="px-2 py-0.5 rounded border border-neutral-700 text-xs text-neutral-400">
                  FINAL
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-600 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
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
          </div>

          {/* Score Display */}
          <div className="p-4 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <p className="text-xs text-neutral-600 mb-1">{game.awayTeam}</p>
                <p className="text-2xl font-bold text-white font-mono">
                  {game.awayScore}
                </p>
                {awayTeam?.bonusStatus.label && (
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded border ${
                      awayTeam.bonusStatus.inDoubleBonus
                        ? "border-red-700 text-red-400"
                        : "border-yellow-700 text-yellow-400"
                    }`}
                  >
                    {awayTeam.bonusStatus.label}
                  </span>
                )}
              </div>
              <div className="px-4">
                <p className="text-neutral-700 text-xs">@</p>
                {game.status === "in" && (
                  <p className="text-[10px] text-[#00ffff]/70 mt-1 font-mono">
                    {details?.period === 1
                      ? "H1"
                      : details?.period === 2
                        ? "H2"
                        : `OT${(details?.period || 3) - 2}`}{" "}
                    {details?.clock}
                  </p>
                )}
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-neutral-600 mb-1">{game.homeTeam}</p>
                <p className="text-2xl font-bold text-white font-mono">
                  {game.homeScore}
                </p>
                {homeTeam?.bonusStatus.label && (
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded border ${
                      homeTeam.bonusStatus.inDoubleBonus
                        ? "border-red-700 text-red-400"
                        : "border-yellow-700 text-yellow-400"
                    }`}
                  >
                    {homeTeam.bonusStatus.label}
                  </span>
                )}
              </div>
            </div>

            {/* O/U Line */}
            {game.ouLine && (
              <div className="mt-3 pt-3 border-t border-neutral-800/50 flex items-center justify-center gap-4 text-xs font-mono">
                <span className="text-neutral-600">
                  O/U: <span className="text-[#00ffff]">{game.ouLine}</span>
                </span>
                <span className="text-neutral-600">
                  TOTAL: <span className="text-white">{game.liveTotal}</span>
                </span>
                {game.requiredPPM && game.currentPPM && (
                  <span
                    className={`${
                      game.requiredPPM - game.currentPPM > 1
                        ? "text-yellow-400"
                        : game.requiredPPM - game.currentPPM < -0.5
                          ? "text-[#00ffff]"
                          : "text-neutral-500"
                    }`}
                  >
                    EDGE: {(game.requiredPPM - game.currentPPM).toFixed(2)}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* end score section */}

          {/* Tab Navigation — horizontal on mobile, vertical on desktop */}
          <div className="p-3 border-b lg:border-b-0 border-neutral-800">
            <div className="flex lg:flex-col gap-1">
              {(["charts", "splits", "plays", "stats", "players", "refs"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 lg:flex-none py-2 px-3 text-xs font-medium rounded-lg transition-all text-center lg:text-left ${
                    activeTab === tab
                      ? "bg-[#00ffff] text-black font-bold"
                      : "text-neutral-500 hover:text-white hover:bg-neutral-800/50"
                  }`}
                >
                  {
                    {
                      charts: "CHARTS",
                      splits: "SPLITS",
                      plays: (
                        <span className="flex items-center justify-center lg:justify-start gap-1">
                          PLAYS
                          {game.status === "in" && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00ffff]" />
                            </span>
                          )}
                        </span>
                      ),
                      stats: "STATS",
                      players: "PLAYERS",
                      refs: "REFS",
                    }[tab]
                  }
                </button>
              ))}
            </div>
          </div>
          <div className="hidden lg:block flex-1" />
        </div>

        {/* RIGHT PANEL: scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading && !details && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-400 text-xs">// ERROR: {error}</p>
              <button
                onClick={fetchDetails}
                className="mt-4 px-4 py-2 rounded-lg border border-neutral-700 text-neutral-400 text-xs hover:border-[#00ffff]/40 hover:text-[#00ffff] transition-colors"
              >
                RETRY
              </button>
            </div>
          )}

          {activeTab === "charts" && (
            <GameCharts
              gameId={game.id}
              currentOULine={game.ouLine}
              game={game}
            />
          )}

          {/* Splits Tab */}
          {activeTab === "splits" && (
            details ? (
              <GameSplitsTab
                homeTeamName={game.homeTeam}
                awayTeamName={game.awayTeam}
                ppmSplits={details.ppmSplits ?? []}
                lineMovement={details.lineMovement ?? []}
                currentPeriod={details.period}
                status={details.status}
              />
            ) : (
              <div className="p-8 text-center text-neutral-600 font-mono text-xs">
                {loading ? "Loading split data..." : "No data available"}
              </div>
            )
          )}

          {/* Plays Tab */}
          {activeTab === "plays" && (
            <PlayByPlayTab
              gameId={game.id}
              isLive={game.status === "in"}
            />
          )}

          {details && !loading && (
            <>
              {/* Stats Tab */}
              {activeTab === "stats" && (
                <div className="space-y-3">
                  <div
                    className="rounded-xl border border-neutral-800 p-4"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <h3 className="text-xs font-semibold text-[#00ffff] mb-3">
                      // TEAM_FOULS
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-xl font-bold text-white font-mono">
                          {awayTeam?.stats.fouls || 0}
                        </p>
                        <p className="text-[10px] text-neutral-600">
                          {awayTeam?.abbreviation}
                        </p>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-neutral-700">vs</span>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-white font-mono">
                          {homeTeam?.stats.fouls || 0}
                        </p>
                        <p className="text-[10px] text-neutral-600">
                          {homeTeam?.abbreviation}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl border border-neutral-800 p-4"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <h3 className="text-xs font-semibold text-[#00ffff] mb-3">
                      // SHOOTING
                    </h3>
                    <div className="space-y-3">
                      <StatRow
                        label="FG"
                        away={awayTeam?.stats.fieldGoals || "0-0"}
                        home={homeTeam?.stats.fieldGoals || "0-0"}
                        awayPct={awayTeam?.stats.fieldGoalPct || 0}
                        homePct={homeTeam?.stats.fieldGoalPct || 0}
                      />
                      <StatRow
                        label="3PT"
                        away={awayTeam?.stats.threePointers || "0-0"}
                        home={homeTeam?.stats.threePointers || "0-0"}
                        awayPct={awayTeam?.stats.threePointPct || 0}
                        homePct={homeTeam?.stats.threePointPct || 0}
                      />
                      <StatRow
                        label="FT"
                        away={awayTeam?.stats.freeThrows || "0-0"}
                        home={homeTeam?.stats.freeThrows || "0-0"}
                        awayPct={awayTeam?.stats.freeThrowPct || 0}
                        homePct={homeTeam?.stats.freeThrowPct || 0}
                      />
                    </div>
                  </div>

                  <div
                    className="rounded-xl border border-neutral-800 p-4"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <h3 className="text-xs font-semibold text-[#00ffff] mb-3">
                      // GAME_STATS
                    </h3>
                    <div className="space-y-2">
                      <SimpleStatRow
                        label="REB"
                        away={awayTeam?.stats.rebounds || 0}
                        home={homeTeam?.stats.rebounds || 0}
                      />
                      <SimpleStatRow
                        label="AST"
                        away={awayTeam?.stats.assists || 0}
                        home={homeTeam?.stats.assists || 0}
                      />
                      <SimpleStatRow
                        label="TOV"
                        away={awayTeam?.stats.turnovers || 0}
                        home={homeTeam?.stats.turnovers || 0}
                        inverted
                      />
                      <SimpleStatRow
                        label="STL"
                        away={awayTeam?.stats.steals || 0}
                        home={homeTeam?.stats.steals || 0}
                      />
                      <SimpleStatRow
                        label="BLK"
                        away={awayTeam?.stats.blocks || 0}
                        home={homeTeam?.stats.blocks || 0}
                      />
                      <SimpleStatRow
                        label="PAINT"
                        away={awayTeam?.stats.pointsInPaint || 0}
                        home={homeTeam?.stats.pointsInPaint || 0}
                      />
                      <SimpleStatRow
                        label="FSTBRK"
                        away={awayTeam?.stats.fastBreakPoints || 0}
                        home={homeTeam?.stats.fastBreakPoints || 0}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Players Tab */}
              {activeTab === "players" && (
                <div className="space-y-3">
                  {details.topPlayers.map((team, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-neutral-800 p-4"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                      <h3 className="text-xs font-semibold text-[#00ffff] mb-3">
                        // {team.teamName.toUpperCase().replace(/ /g, "_")}
                      </h3>
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-2 text-[10px] text-neutral-600 pb-2 border-b border-neutral-800">
                          <span className="col-span-2">PLAYER</span>
                          <span className="text-center">PTS</span>
                          <span className="text-center">REB</span>
                          <span className="text-center">PF</span>
                        </div>
                        {team.players.map((player, pIdx) => (
                          <div
                            key={pIdx}
                            className="grid grid-cols-5 gap-2 text-xs"
                          >
                            <span className="col-span-2 text-neutral-300 truncate">
                              {player.jersey && (
                                <span className="text-neutral-700 mr-1">
                                  #{player.jersey}
                                </span>
                              )}
                              {player.name}
                            </span>
                            <span className="text-center text-white font-medium font-mono">
                              {player.points}
                            </span>
                            <span className="text-center text-neutral-500 font-mono">
                              {player.rebounds}
                            </span>
                            <span
                              className={`text-center font-mono ${player.fouls >= 4 ? "text-red-400 font-medium" : "text-neutral-500"}`}
                            >
                              {player.fouls}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Referees Tab */}
              {activeTab === "refs" && (
                <div className="space-y-3">
                  {details.crewAvgFouls !== null && (
                    <div
                      className="rounded-xl border border-neutral-800 p-4"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                      <h3 className="text-xs font-semibold text-[#00ffff] mb-3">
                        // CREW_AVG
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-bold text-white font-mono">
                            {details.crewAvgFouls.toFixed(1)}
                            <span className="text-xs text-neutral-600 ml-1">
                              fouls/game
                            </span>
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded border ${
                            details.crewStyle === "Tight"
                              ? "border-red-700 text-red-400"
                              : details.crewStyle === "Loose"
                                ? "border-[#00ffff]/40 text-[#00ffff]"
                                : "border-neutral-700 text-neutral-500"
                          }`}
                        >
                          {details.crewStyle || "UNKNOWN"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div
                    className="rounded-xl border border-neutral-800 p-4"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <h3 className="text-xs font-semibold text-[#00ffff] mb-3">
                      // OFFICIALS
                    </h3>
                    <div className="space-y-3">
                      {details.officials.length === 0 && (
                        <p className="text-xs text-neutral-600">
                          No referee data available
                        </p>
                      )}
                      {details.officials.map((ref, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b border-neutral-800/50 last:border-0"
                        >
                          <div>
                            <p className="text-xs text-white">{ref.name}</p>
                            {ref.foulsPerGame !== null && (
                              <p className="text-[10px] text-neutral-600">
                                {ref.foulsPerGame.toFixed(1)} fouls/game
                                {ref.homeBias !== null &&
                                  ref.homeBias !== 0 && (
                                    <span
                                      className={
                                        ref.homeBias > 0
                                          ? "text-yellow-500"
                                          : "text-[#00ffff]/70"
                                      }
                                    >
                                      {" "}
                                      | {ref.homeBias > 0 ? "+" : ""}
                                      {ref.homeBias.toFixed(1)} HOME_BIAS
                                    </span>
                                  )}
                              </p>
                            )}
                          </div>
                          {ref.style && (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-medium rounded border ${
                                ref.style === "Tight"
                                  ? "border-red-700 text-red-400"
                                  : ref.style === "Loose"
                                    ? "border-[#00ffff]/40 text-[#00ffff]"
                                    : "border-neutral-700 text-neutral-500"
                              }`}
                            >
                              {ref.style.toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {details.venue && (
                    <div
                      className="rounded-xl border border-neutral-800 p-4"
                      style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                      <h3 className="text-xs font-semibold text-[#00ffff] mb-2">
                        // VENUE
                      </h3>
                      <p className="text-xs text-neutral-300">
                        {details.venue}
                      </p>
                      {details.attendance && (
                        <p className="text-[10px] text-neutral-600 mt-1">
                          ATTENDANCE: {details.attendance.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  away,
  home,
  awayPct,
  homePct,
}: {
  label: string;
  away: string;
  home: string;
  awayPct: number;
  homePct: number;
}) {
  const awayBetter = awayPct > homePct;
  const homeBetter = homePct > awayPct;

  return (
    <div className="grid grid-cols-3 items-center">
      <div className="text-right">
        <span
          className={`text-xs font-mono ${awayBetter ? "text-[#00ffff] font-medium" : "text-neutral-500"}`}
        >
          {away}
        </span>
        <span className="text-[10px] text-neutral-700 ml-1">({awayPct}%)</span>
      </div>
      <div className="text-center text-[10px] text-neutral-600">{label}</div>
      <div className="text-left">
        <span
          className={`text-xs font-mono ${homeBetter ? "text-[#00ffff] font-medium" : "text-neutral-500"}`}
        >
          {home}
        </span>
        <span className="text-[10px] text-neutral-700 ml-1">({homePct}%)</span>
      </div>
    </div>
  );
}

function SimpleStatRow({
  label,
  away,
  home,
  inverted = false,
}: {
  label: string;
  away: number;
  home: number;
  inverted?: boolean;
}) {
  const awayBetter = inverted ? away < home : away > home;
  const homeBetter = inverted ? home < away : home > away;

  return (
    <div className="grid grid-cols-3 items-center py-1">
      <div className="text-right">
        <span
          className={`text-xs font-mono ${awayBetter ? "text-[#00ffff] font-medium" : "text-neutral-500"}`}
        >
          {away}
        </span>
      </div>
      <div className="text-center text-[10px] text-neutral-600">{label}</div>
      <div className="text-left">
        <span
          className={`text-xs font-mono ${homeBetter ? "text-[#00ffff] font-medium" : "text-neutral-500"}`}
        >
          {home}
        </span>
      </div>
    </div>
  );
}

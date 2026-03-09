"use client";

import { useEffect, useState } from "react";
import { GamePrediction } from "@/app/api/predictions/route";
import { getTeamBadge } from "@/lib/teamFilters";

interface UpcomingGameDetailModalProps {
  prediction: GamePrediction;
  isOpen: boolean;
  onClose: () => void;
}

interface KenPomTeamStats {
  teamName: string;
  rank: number | null;
  adjEM: number | null;
  adjO: number | null;
  adjORank: number | null;
  adjD: number | null;
  adjDRank: number | null;
  adjT: number | null;
  adjTRank: number | null;
  luck: number | null;
  luckRank: number | null;
  sosEM: number | null;
  sosRank: number | null;
  ncSosEM: number | null;
  offEfg: number | null;
  offTO: number | null;
  offOR: number | null;
  offFTR: number | null;
  defEfg: number | null;
  defTO: number | null;
  defOR: number | null;
  defFTR: number | null;
  wins: number | null;
  losses: number | null;
  confWins: number | null;
  confLosses: number | null;
  conference: string | null;
}

function formatGameTime(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function formatGameDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

// Reusable section card
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-neutral-800 p-4"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <h3 className="text-xs font-semibold text-[#00ffff] mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function UpcomingGameDetailModal({
  prediction,
  isOpen,
  onClose,
}: UpcomingGameDetailModalProps) {
  const [homeStats, setHomeStats] = useState<KenPomTeamStats | null>(null);
  const [awayStats, setAwayStats] = useState<KenPomTeamStats | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    homeTeam,
    awayTeam,
    homeRank,
    awayRank,
    kenpomHomeScore,
    kenpomAwayScore,
    kenpomTotal,
    kenpomWinProb,
    kenpomTempo,
    vegasLine,
    lineDiff,
    gameTime,
    confidence,
  } = prediction;

  const homeBadge = getTeamBadge(homeTeam);
  const awayBadge = getTeamBadge(awayTeam);

  useEffect(() => {
    if (!isOpen) return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [homeRes, awayRes] = await Promise.all([
          fetch(`/api/kenpom-team?team=${encodeURIComponent(homeTeam)}`),
          fetch(`/api/kenpom-team?team=${encodeURIComponent(awayTeam)}`),
        ]);
        if (homeRes.ok) {
          const data = await homeRes.json();
          if (!data.error) setHomeStats(data);
        }
        if (awayRes.ok) {
          const data = await awayRes.json();
          if (!data.error) setAwayStats(data);
        }
      } catch (err) {
        console.error("Error fetching KenPom stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isOpen, homeTeam, awayTeam]);

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

  const favorsUnder = lineDiff !== null && lineDiff > 0;
  const favorsOver = lineDiff !== null && lineDiff < 0;
  const lineDiffAbs = lineDiff !== null ? Math.abs(lineDiff) : null;

  const badgeClass = (badge: ReturnType<typeof getTeamBadge>) => {
    if (!badge) return "";
    if (badge.color === "red")
      return "border-red-700 text-red-400 bg-red-900/20";
    if (badge.color === "orange")
      return "border-[#ff6b00]/40 text-[#ff6b00] bg-[#ff6b00]/10";
    if (badge.color === "blue")
      return "border-[#00ffff]/40 text-[#00ffff] bg-[#00ffff]/10";
    return "border-neutral-700 text-neutral-400 bg-neutral-900/50";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center font-mono">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — bottom sheet on mobile, wide side-panel on desktop */}
      <div
        className="relative w-full max-w-5xl max-h-[90vh] lg:max-h-[85vh] rounded-t-2xl lg:rounded-2xl border border-neutral-800 animate-slide-up overflow-hidden flex flex-col lg:flex-row"
        style={{
          background: "rgba(10,10,10,0.97)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* LEFT PANEL — fixed matchup header */}
        <div className="flex-shrink-0 lg:w-72 lg:border-r border-neutral-800 flex flex-col">
          {/* Status bar */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded border border-neutral-700 text-xs text-neutral-400">
                UPCOMING
              </span>
              <span className="text-xs text-neutral-600 font-mono">
                {formatGameDate(gameTime)}
              </span>
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

          {/* Teams + Projected Scores */}
          <div className="p-4 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              {/* Away */}
              <div className="flex-1 text-center">
                {awayRank && awayRank <= 50 && (
                  <p className="text-[10px] text-yellow-500 font-bold mb-0.5">
                    #{awayRank}
                  </p>
                )}
                <p className="text-xs text-neutral-500 mb-1">{awayTeam}</p>
                {awayBadge && (
                  <span
                    className={`inline-block mb-1 px-1.5 py-0.5 text-[10px] font-bold rounded border ${badgeClass(awayBadge)}`}
                  >
                    {awayBadge.text}
                  </span>
                )}
                <p className="text-3xl font-bold text-white font-mono">
                  {kenpomAwayScore.toFixed(0)}
                </p>
                <p className="text-[10px] text-neutral-700">PROJECTED</p>
              </div>
              {/* Center */}
              <div className="px-3 text-center">
                <p className="text-neutral-700 text-xs">@</p>
                <p className="text-sm font-bold text-neutral-500 mt-2 font-mono">
                  {kenpomTempo.toFixed(0)}
                </p>
                <p className="text-[10px] text-neutral-700">TEMPO</p>
              </div>
              {/* Home */}
              <div className="flex-1 text-center">
                {homeRank && homeRank <= 50 && (
                  <p className="text-[10px] text-yellow-500 font-bold mb-0.5">
                    #{homeRank}
                  </p>
                )}
                <p className="text-xs text-neutral-500 mb-1">{homeTeam}</p>
                {homeBadge && (
                  <span
                    className={`inline-block mb-1 px-1.5 py-0.5 text-[10px] font-bold rounded border ${badgeClass(homeBadge)}`}
                  >
                    {homeBadge.text}
                  </span>
                )}
                <p className="text-3xl font-bold text-white font-mono">
                  {kenpomHomeScore.toFixed(0)}
                </p>
                <p className="text-[10px] text-neutral-700">PROJECTED</p>
              </div>
            </div>
            <p className="text-center text-[10px] text-neutral-600 font-mono mt-3">
              {formatGameTime(gameTime)} ET
            </p>
          </div>

          {/* KenPom Signal card */}
          {lineDiffAbs !== null && lineDiffAbs >= 3 && (
            <div
              className={`mx-4 mt-3 p-3 rounded-xl border ${favorsUnder ? "border-[#00ffff]/40" : "border-[#ff6b00]/40"}`}
              style={{
                background: favorsUnder
                  ? "rgba(0,255,255,0.05)"
                  : "rgba(255,107,0,0.05)",
              }}
            >
              <p
                className={`text-xs font-bold ${favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]"}`}
              >
                {favorsUnder ? "❄️ KENPOM UNDER" : "🔥 KENPOM OVER"}
              </p>
              <p
                className={`text-2xl font-bold font-mono mt-1 ${favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]"}`}
              >
                {lineDiffAbs.toFixed(1)} pts
              </p>
              <p className="text-[10px] text-neutral-600 mt-1">
                edge over Vegas
              </p>
            </div>
          )}

          {/* Quick stats grid */}
          <div className="mx-4 my-3 grid grid-cols-3 gap-2">
            <div
              className="text-center p-2 rounded-lg border border-neutral-800"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p className="text-[10px] text-neutral-600 mb-0.5">KENPOM</p>
              <p className="text-sm font-bold text-[#00ffff] font-mono">
                {kenpomTotal.toFixed(1)}
              </p>
            </div>
            <div
              className="text-center p-2 rounded-lg border border-neutral-800"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p className="text-[10px] text-neutral-600 mb-0.5">VEGAS</p>
              <p className="text-sm font-bold text-white font-mono">
                {vegasLine !== null ? vegasLine.toFixed(1) : "—"}
              </p>
            </div>
            <div
              className="text-center p-2 rounded-lg border border-neutral-800"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <p className="text-[10px] text-neutral-600 mb-0.5">EDGE</p>
              <p
                className={`text-sm font-bold font-mono ${
                  lineDiffAbs && lineDiffAbs >= 3
                    ? favorsUnder
                      ? "text-[#00ffff]"
                      : "text-[#ff6b00]"
                    : "text-neutral-400"
                }`}
              >
                {lineDiff !== null ? (
                  <>
                    {favorsUnder ? "↓" : favorsOver ? "↑" : ""}
                    {lineDiffAbs?.toFixed(1)}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>

          <div className="flex-1" />
        </div>

        {/* RIGHT PANEL: scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {/* KenPom Signal banner — mobile only (desktop has it in left panel) */}
          {lineDiffAbs !== null && lineDiffAbs >= 3 && (
            <div
              className={`lg:hidden p-4 rounded-xl border ${
                favorsUnder ? "border-[#00ffff]/40" : "border-[#ff6b00]/40"
              }`}
              style={{
                background: favorsUnder
                  ? "rgba(0,255,255,0.05)"
                  : "rgba(255,107,0,0.05)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-bold ${favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]"}`}
                >
                  {favorsUnder
                    ? "❄️ KENPOM FAVORS UNDER"
                    : "🔥 KENPOM FAVORS OVER"}
                </span>
                <span
                  className={`text-lg font-bold ${favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]"}`}
                >
                  {lineDiffAbs.toFixed(1)} pts
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                KenPom projects {kenpomTotal.toFixed(1)} total points
                {vegasLine && `, Vegas line is ${vegasLine.toFixed(1)}`}
              </p>
            </div>
          )}

          {/* Total Comparison — mobile only (desktop has it in left panel) */}
          <div className="lg:hidden">
            <SectionCard title="// TOTAL_COMPARISON">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-neutral-600 mb-1">KENPOM</p>
                  <p className="text-xl font-bold text-[#00ffff] font-mono">
                    {kenpomTotal.toFixed(1)}
                  </p>
                </div>
                <div className="text-center border-x border-neutral-800">
                  <p className="text-[10px] text-neutral-600 mb-1">VEGAS</p>
                  <p className="text-xl font-bold text-white font-mono">
                    {vegasLine !== null ? vegasLine.toFixed(1) : "—"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-neutral-600 mb-1">EDGE</p>
                  <p
                    className={`text-xl font-bold font-mono ${
                      lineDiffAbs && lineDiffAbs >= 3
                        ? favorsUnder
                          ? "text-[#00ffff]"
                          : "text-[#ff6b00]"
                        : "text-neutral-400"
                    }`}
                  >
                    {lineDiff !== null ? (
                      <>
                        {favorsUnder ? "↓" : favorsOver ? "↑" : ""}
                        {lineDiffAbs?.toFixed(1)}
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
          {/* end lg:hidden total comparison */}

          {/* Win Probability */}
          <SectionCard title="// WIN_PROBABILITY">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
              <span>{awayTeam.split(" ").pop()}</span>
              <span
                className={`font-bold text-[10px] ${confidence === "HIGH" ? "text-[#00ffff]" : "text-neutral-600"}`}
              >
                {confidence} CONFIDENCE
              </span>
              <span>{homeTeam.split(" ").pop()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-white w-12 font-mono">
                {(100 - kenpomWinProb).toFixed(0)}%
              </span>
              <div
                className="flex-1 h-2 rounded-full overflow-hidden flex"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${100 - kenpomWinProb}%`,
                    background: "rgba(0,255,255,0.4)",
                  }}
                />
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${kenpomWinProb}%`, background: "#00ffff" }}
                />
              </div>
              <span className="text-base font-bold text-white w-12 text-right font-mono">
                {kenpomWinProb.toFixed(0)}%
              </span>
            </div>
          </SectionCard>

          {/* KenPom Ratings */}
          {(homeStats || awayStats || loading) && (
            <SectionCard title="// KENPOM_RATINGS">
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
                </div>
              )}
              {!loading && (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-2 text-[10px] text-neutral-600 pb-2 border-b border-neutral-800">
                    <span className="col-span-2">TEAM</span>
                    <span className="text-center">RK</span>
                    <span className="text-center">OFF</span>
                    <span className="text-center">DEF</span>
                    <span className="text-center">TEMPO</span>
                  </div>
                  {/* Away */}
                  <div className="grid grid-cols-6 gap-2 text-xs py-1">
                    <div className="col-span-2 truncate">
                      <span className="text-neutral-300">{awayTeam}</span>
                      {awayStats?.wins !== null && (
                        <span className="text-neutral-700 ml-1 text-[10px]">
                          ({awayStats?.wins}-{awayStats?.losses})
                        </span>
                      )}
                    </div>
                    <span className="text-center text-yellow-500 font-bold">
                      {awayStats?.rank || "—"}
                    </span>
                    <span className="text-center text-[#00ffff] font-mono">
                      {awayStats?.adjO?.toFixed(1) || "—"}
                      {awayStats?.adjORank && (
                        <span className="text-[9px] text-neutral-700">
                          {" "}
                          #{awayStats.adjORank}
                        </span>
                      )}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.adjD?.toFixed(1) || "—"}
                      {awayStats?.adjDRank && (
                        <span className="text-[9px] text-neutral-700">
                          {" "}
                          #{awayStats.adjDRank}
                        </span>
                      )}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.adjT?.toFixed(1) || "—"}
                    </span>
                  </div>
                  {/* Home */}
                  <div className="grid grid-cols-6 gap-2 text-xs py-1 border-t border-neutral-800/50">
                    <div className="col-span-2 truncate">
                      <span className="text-neutral-300">{homeTeam}</span>
                      {homeStats?.wins !== null && (
                        <span className="text-neutral-700 ml-1 text-[10px]">
                          ({homeStats?.wins}-{homeStats?.losses})
                        </span>
                      )}
                    </div>
                    <span className="text-center text-yellow-500 font-bold">
                      {homeStats?.rank || "—"}
                    </span>
                    <span className="text-center text-[#00ffff] font-mono">
                      {homeStats?.adjO?.toFixed(1) || "—"}
                      {homeStats?.adjORank && (
                        <span className="text-[9px] text-neutral-700">
                          {" "}
                          #{homeStats.adjORank}
                        </span>
                      )}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.adjD?.toFixed(1) || "—"}
                      {homeStats?.adjDRank && (
                        <span className="text-[9px] text-neutral-700">
                          {" "}
                          #{homeStats.adjDRank}
                        </span>
                      )}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.adjT?.toFixed(1) || "—"}
                    </span>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Four Factors */}
          {!loading && (homeStats || awayStats) && (
            <SectionCard title="// FOUR_FACTORS">
              <div className="space-y-4">
                {/* Offense */}
                <div>
                  <p className="text-[10px] text-neutral-500 mb-2">OFFENSE</p>
                  <div className="grid grid-cols-5 gap-2 text-[10px] text-neutral-600 pb-1 border-b border-neutral-800">
                    <span>TEAM</span>
                    <span className="text-center">eFG%</span>
                    <span className="text-center">TO%</span>
                    <span className="text-center">OR%</span>
                    <span className="text-center">FTR</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs py-1">
                    <span className="text-neutral-400 truncate">
                      {awayTeam.split(" ").pop()}
                    </span>
                    <span className="text-center text-[#00ffff] font-mono">
                      {awayStats?.offEfg?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.offTO?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.offOR?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.offFTR?.toFixed(1) || "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs py-1">
                    <span className="text-neutral-400 truncate">
                      {homeTeam.split(" ").pop()}
                    </span>
                    <span className="text-center text-[#00ffff] font-mono">
                      {homeStats?.offEfg?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.offTO?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.offOR?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.offFTR?.toFixed(1) || "—"}
                    </span>
                  </div>
                </div>

                {/* Defense */}
                <div>
                  <p className="text-[10px] text-neutral-500 mb-2">
                    DEFENSE (opp values)
                  </p>
                  <div className="grid grid-cols-5 gap-2 text-[10px] text-neutral-600 pb-1 border-b border-neutral-800">
                    <span>TEAM</span>
                    <span className="text-center">eFG%</span>
                    <span className="text-center">TO%</span>
                    <span className="text-center">OR%</span>
                    <span className="text-center">FTR</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs py-1">
                    <span className="text-neutral-400 truncate">
                      {awayTeam.split(" ").pop()}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.defEfg?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.defTO?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.defOR?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {awayStats?.defFTR?.toFixed(1) || "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs py-1">
                    <span className="text-neutral-400 truncate">
                      {homeTeam.split(" ").pop()}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.defEfg?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.defTO?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.defOR?.toFixed(1) || "—"}
                    </span>
                    <span className="text-center text-neutral-400 font-mono">
                      {homeStats?.defFTR?.toFixed(1) || "—"}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-700">
                  eFG% = Effective FG% | TO% = Turnover Rate | OR% = Off Rebound
                  Rate | FTR = FT Rate
                </p>
              </div>
            </SectionCard>
          )}

          {/* Luck & Schedule Strength */}
          {!loading && (homeStats || awayStats) && (
            <SectionCard title="// LUCK_AND_SCHEDULE">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: awayTeam.split(" ").pop()!, stats: awayStats },
                  { label: homeTeam.split(" ").pop()!, stats: homeStats },
                ].map(({ label, stats }) => (
                  <div key={label} className="space-y-2">
                    <p className="text-xs text-white font-medium">{label}</p>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Luck:</span>
                        <span
                          className={`font-medium ${
                            (stats?.luck ?? 0) > 0.03
                              ? "text-[#00ffff]"
                              : (stats?.luck ?? 0) < -0.03
                                ? "text-red-400"
                                : "text-neutral-400"
                          }`}
                        >
                          {stats?.luck != null
                            ? (stats.luck > 0 ? "+" : "") +
                              stats.luck.toFixed(3)
                            : "—"}
                          {stats?.luckRank && (
                            <span className="text-neutral-700">
                              {" "}
                              #{stats.luckRank}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">SoS:</span>
                        <span className="text-neutral-400 font-mono">
                          {stats?.sosEM != null
                            ? (stats.sosEM > 0 ? "+" : "") +
                              stats.sosEM.toFixed(2)
                            : "—"}
                          {stats?.sosRank && (
                            <span className="text-neutral-700">
                              {" "}
                              #{stats.sosRank}
                            </span>
                          )}
                        </span>
                      </div>
                      {stats?.conference && (
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Conf:</span>
                          <span className="text-neutral-400">
                            {stats.conference}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-neutral-700 pt-3">
                Luck = record vs expected | SoS = Strength of Schedule
                (efficiency margin)
              </p>
            </SectionCard>
          )}

          {/* Game Factors */}
          <SectionCard title="// GAME_FACTORS">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-neutral-600 mb-1">
                  PROJECTED TEMPO
                </p>
                <p className="text-sm font-medium text-[#00ffff] font-mono">
                  {kenpomTempo.toFixed(1)}{" "}
                  <span className="text-neutral-600 text-[10px]">poss</span>
                </p>
                <p className="text-[10px] text-neutral-600 mt-0.5">
                  {kenpomTempo >= 72
                    ? "FAST"
                    : kenpomTempo >= 68
                      ? "AVERAGE"
                      : "SLOW"}{" "}
                  pace game
                </p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-600 mb-1">
                  PROJECTED MARGIN
                </p>
                <p className="text-sm font-medium text-white font-mono">
                  {Math.abs(kenpomHomeScore - kenpomAwayScore).toFixed(1)}{" "}
                  <span className="text-neutral-600 text-[10px]">pts</span>
                </p>
                <p className="text-[10px] text-neutral-600 mt-0.5">
                  {kenpomHomeScore > kenpomAwayScore ? homeTeam : awayTeam}{" "}
                  favored
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Betting Insight */}
          {lineDiff !== null && vegasLine !== null && (
            <SectionCard title="// BETTING_INSIGHT">
              <p className="text-xs text-neutral-500 leading-relaxed">
                {lineDiffAbs && lineDiffAbs >= 5 ? (
                  <>
                    <span
                      className={
                        favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]"
                      }
                    >
                      Strong edge detected.
                    </span>{" "}
                    KenPom projects {kenpomTotal.toFixed(1)} total,{" "}
                    {lineDiffAbs.toFixed(1)} points{" "}
                    {favorsUnder ? "below" : "above"} the Vegas line of{" "}
                    {vegasLine.toFixed(1)}. Consider the{" "}
                    {favorsUnder ? "UNDER" : "OVER"} if line movement confirms.
                  </>
                ) : lineDiffAbs && lineDiffAbs >= 3 ? (
                  <>
                    <span
                      className={
                        favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]"
                      }
                    >
                      Moderate edge detected.
                    </span>{" "}
                    KenPom projects {kenpomTotal.toFixed(1)} total,{" "}
                    {lineDiffAbs.toFixed(1)} points{" "}
                    {favorsUnder ? "below" : "above"} the Vegas line. Monitor
                    for line movement.
                  </>
                ) : (
                  <>
                    No significant edge. KenPom and Vegas are within{" "}
                    {lineDiffAbs?.toFixed(1) || 0} points. Look for other
                    factors before betting.
                  </>
                )}
              </p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

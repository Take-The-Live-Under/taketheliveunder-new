"use client";

import {
  TeamStats,
  COMPARISON_METRICS,
  ComparisonMetric,
  CrewStats,
} from "@/types/team";
import { useEffect, useCallback } from "react";

interface ComparisonModalProps {
  homeTeam: string;
  awayTeam: string;
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
  homeScore: number;
  awayScore: number;
  ouLine: number | null;
  crewStats?: CrewStats;
  onClose: () => void;
}

function formatValue(value: number | null, metric: ComparisonMetric): string {
  if (value === null || isNaN(value)) return "—";
  const decimals = metric.decimals ?? 1;
  switch (metric.format) {
    case "percent":
      return `${value.toFixed(decimals)}%`;
    case "decimal":
      return value.toFixed(decimals);
    case "ratio":
      return value.toFixed(decimals);
    case "rank":
      return `#${Math.round(value)}`;
    case "number":
      return Math.round(value).toString();
    default:
      return value.toFixed(decimals);
  }
}

function getComparisonClass(
  homeValue: number | null,
  awayValue: number | null,
  higherIsBetter: boolean,
  side: "home" | "away",
): string {
  if (homeValue === null || awayValue === null) return "text-neutral-500";
  const homeWins = higherIsBetter
    ? homeValue > awayValue
    : homeValue < awayValue;
  const awayWins = higherIsBetter
    ? awayValue > homeValue
    : awayValue < homeValue;
  if (side === "home" && homeWins) return "text-[#00ffff] font-semibold";
  if (side === "away" && awayWins) return "text-[#00ffff] font-semibold";
  if (side === "home" && awayWins) return "text-red-400";
  if (side === "away" && homeWins) return "text-red-400";
  return "text-neutral-400";
}

const METRIC_GROUPS = [
  { title: "Tempo & Scoring", keys: ["pace", "avg_ppg", "avg_ppm"] },
  {
    title: "Efficiency",
    keys: ["off_efficiency", "def_efficiency", "efficiency_margin"],
  },
  {
    title: "Shooting",
    keys: [
      "efg_pct",
      "ts_pct",
      "fg_pct",
      "three_p_pct",
      "three_p_rate",
      "two_p_pct",
      "ft_pct",
    ],
  },
  { title: "Rebounding", keys: ["oreb_pct", "dreb_pct"] },
  {
    title: "Ball Control",
    keys: ["to_rate", "ast_to_ratio", "assists_per_game"],
  },
  { title: "Defense", keys: ["steals_per_game", "blocks_per_game"] },
  { title: "Ranking", keys: ["espn_rank"] },
];

function getCrewStyleColor(style: string): string {
  switch (style) {
    case "Tight":
      return "text-red-400 bg-red-500/10 border border-red-700/50";
    case "Loose":
      return "text-[#00ffff] bg-[#00ffff]/10 border border-[#00ffff]/40";
    default:
      return "text-yellow-400 bg-yellow-500/10 border border-yellow-700/50";
  }
}

export default function ComparisonModal({
  homeTeam,
  awayTeam,
  homeStats,
  awayStats,
  homeScore,
  awayScore,
  ouLine,
  crewStats,
  onClose,
}: ComparisonModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [handleKeyDown]);

  const renderMetricRow = (metric: ComparisonMetric) => {
    const homeValue = homeStats?.[metric.key] as number | null;
    const awayValue = awayStats?.[metric.key] as number | null;
    if (homeValue === null && awayValue === null) return null;

    return (
      <div
        key={metric.key}
        className="grid grid-cols-3 py-2 border-b border-neutral-800/40 hover:bg-neutral-800/20 transition-colors font-mono"
      >
        <div
          className={`text-right pr-3 text-sm ${getComparisonClass(homeValue, awayValue, metric.higherIsBetter, "away")}`}
        >
          {formatValue(awayValue, metric)}
        </div>
        <div className="text-center">
          <div className="text-xs text-neutral-400 font-medium">
            {metric.label}
          </div>
          <div className="text-[10px] text-neutral-600">
            {metric.description}
          </div>
        </div>
        <div
          className={`text-left pl-3 text-sm ${getComparisonClass(homeValue, awayValue, metric.higherIsBetter, "home")}`}
        >
          {formatValue(homeValue, metric)}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl"
        style={{
          background: "rgba(10,10,10,0.97)",
          backdropFilter: "blur(20px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 border-b border-neutral-800 px-4 py-3 flex items-center justify-between"
          style={{ background: "rgba(10,10,10,0.97)" }}
        >
          <h2 className="text-sm font-bold text-white font-mono">
            // MATCHUP_COMPARISON
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-600 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-800/50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(90vh-56px)]">
          {/* Team Headers */}
          <div
            className="sticky top-0 border-b border-neutral-800"
            style={{ background: "rgba(15,15,15,0.98)" }}
          >
            <div className="grid grid-cols-3 px-4 py-3 font-mono">
              <div className="text-center">
                <div className="text-xs font-semibold text-neutral-300 truncate">
                  {awayTeam}
                </div>
                <div className="text-2xl font-bold text-white">{awayScore}</div>
                {awayStats?.espn_rank && (
                  <div className="text-[10px] text-neutral-600">
                    #{awayStats.espn_rank}
                  </div>
                )}
              </div>
              <div className="text-center flex flex-col items-center justify-center">
                <span className="text-[10px] text-neutral-600 uppercase tracking-wide">
                  O/U
                </span>
                <span className="text-lg font-semibold text-yellow-400">
                  {ouLine !== null ? ouLine.toFixed(1) : "—"}
                </span>
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-neutral-300 truncate">
                  {homeTeam}
                </div>
                <div className="text-2xl font-bold text-white">{homeScore}</div>
                {homeStats?.espn_rank && (
                  <div className="text-[10px] text-neutral-600">
                    #{homeStats.espn_rank}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 py-2">
            {!homeStats && !awayStats ? (
              <div className="text-center py-8 text-neutral-600 font-mono text-sm">
                No team statistics available
              </div>
            ) : (
              <div className="space-y-4">
                {METRIC_GROUPS.map((group) => {
                  const groupMetrics = COMPARISON_METRICS.filter((m) =>
                    group.keys.includes(m.key as string),
                  );
                  const hasData = groupMetrics.some((metric) => {
                    const homeVal = homeStats?.[metric.key];
                    const awayVal = awayStats?.[metric.key];
                    return homeVal !== null || awayVal !== null;
                  });
                  if (!hasData) return null;
                  return (
                    <div key={group.title}>
                      <div className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-2 mt-3 font-mono">
                        // {group.title.toUpperCase().replace(/ /g, "_")}
                      </div>
                      {groupMetrics.map((metric) => renderMetricRow(metric))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Referee Crew */}
          {crewStats && crewStats.foundRefs > 0 && (
            <div className="px-4 py-3 border-t border-neutral-800">
              <div className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-3 font-mono">
                // REFEREE_CREW
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${getCrewStyleColor(crewStats.crewStyle)}`}
                  >
                    {crewStats.crewStyle}
                  </span>
                  <span className="text-xs text-neutral-600 font-mono">
                    {crewStats.foundRefs}/{crewStats.referees.length} refs found
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div
                  className="rounded-xl border border-neutral-800 p-3"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="text-[10px] text-neutral-600 font-mono mb-1">
                    AVG FOULS/GAME
                  </div>
                  <div
                    className={`text-lg font-bold font-mono ${
                      crewStats.avgFoulsPerGame &&
                      crewStats.avgFoulsPerGame >= 40
                        ? "text-red-400"
                        : crewStats.avgFoulsPerGame &&
                            crewStats.avgFoulsPerGame <= 32
                          ? "text-[#00ffff]"
                          : "text-yellow-400"
                    }`}
                  >
                    {crewStats.avgFoulsPerGame ?? "—"}
                  </div>
                </div>
                <div
                  className="rounded-xl border border-neutral-800 p-3"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="text-[10px] text-neutral-600 font-mono mb-1">
                    HOME BIAS
                  </div>
                  <div
                    className={`text-lg font-bold font-mono ${
                      crewStats.avgHomeBias && crewStats.avgHomeBias > 0
                        ? "text-[#00ffff]"
                        : crewStats.avgHomeBias && crewStats.avgHomeBias < 0
                          ? "text-[#ff6b00]"
                          : "text-neutral-400"
                    }`}
                  >
                    {crewStats.avgHomeBias !== null
                      ? (crewStats.avgHomeBias > 0 ? "+" : "") +
                        crewStats.avgHomeBias.toFixed(1)
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {crewStats.refDetails.map((ref) => (
                  <div
                    key={ref.name}
                    className="flex items-center justify-between text-xs py-2 border-b border-neutral-800/50 font-mono"
                  >
                    <span className="text-neutral-300">{ref.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-600">
                        {ref.total_fouls_per_game.toFixed(1)} F/G
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${getCrewStyleColor(ref.ref_style)}`}
                      >
                        {ref.ref_style}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-neutral-700 mt-2 font-mono">
                Tight = more fouls (40+), Loose = fewer fouls (32-)
              </div>
            </div>
          )}

          {/* Legend */}
          <div
            className="px-4 py-3 border-t border-neutral-800"
            style={{ background: "rgba(255,255,255,0.01)" }}
          >
            <div className="flex items-center justify-center gap-6 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00ffff]" />
                <span className="text-neutral-500">Advantage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-neutral-500">Disadvantage</span>
              </div>
            </div>
            {(homeStats?.games_played || awayStats?.games_played) && (
              <div className="text-center text-[10px] text-neutral-700 mt-2 font-mono">
                Based on {homeStats?.games_played || awayStats?.games_played}{" "}
                games played
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

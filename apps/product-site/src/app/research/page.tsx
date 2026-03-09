"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";

interface Team {
  id: string;
  name: string;
  rank: number;
}

interface Classification {
  id: string;
  label: string;
  description: string;
  color: "green" | "yellow" | "red" | "blue" | "purple";
}

interface TeamStats {
  team_id: string;
  team_name: string;
  games_played: number;
  record: string;
  pace: number;
  off_efficiency: number;
  def_efficiency: number;
  fg_pct: number;
  three_p_rate: number;
  three_p_pct: number;
  ft_pct: number;
  oreb_pct: number;
  dreb_pct: number;
  to_rate: number;
  efg_pct: number;
  ts_pct: number;
  avg_ppm: number;
  avg_ppg: number;
  assists_per_game: number;
  steals_per_game: number;
  blocks_per_game: number;
  fouls_per_game: number;
  ast_to_ratio: number;
  espn_rank: number;
}

interface TeamAnalysis {
  team: TeamStats;
  percentiles: Record<string, number>;
  classifications: Classification[];
  insights: string[];
  leagueAverages: Record<string, number>;
}

type ViewMode = "single" | "compare";

interface MetricConfig {
  key: keyof TeamStats;
  label: string;
  description: string;
  format: "percent" | "decimal" | "number";
  higherIsBetter: boolean;
  category: string;
}

const METRICS: MetricConfig[] = [
  {
    key: "avg_ppg",
    label: "PPG",
    description: "Points per game",
    format: "decimal",
    higherIsBetter: true,
    category: "SCORING",
  },
  {
    key: "avg_ppm",
    label: "PPM",
    description: "Points per minute",
    format: "decimal",
    higherIsBetter: true,
    category: "SCORING",
  },
  {
    key: "pace",
    label: "PACE",
    description: "Possessions per game",
    format: "decimal",
    higherIsBetter: true,
    category: "TEMPO",
  },
  {
    key: "off_efficiency",
    label: "OFF_EFF",
    description: "Pts per 100 poss",
    format: "decimal",
    higherIsBetter: true,
    category: "EFFICIENCY",
  },
  {
    key: "fg_pct",
    label: "FG%",
    description: "Field Goal %",
    format: "percent",
    higherIsBetter: true,
    category: "SHOOTING",
  },
  {
    key: "efg_pct",
    label: "eFG%",
    description: "Effective FG%",
    format: "percent",
    higherIsBetter: true,
    category: "SHOOTING",
  },
  {
    key: "ts_pct",
    label: "TS%",
    description: "True Shooting %",
    format: "percent",
    higherIsBetter: true,
    category: "SHOOTING",
  },
  {
    key: "three_p_pct",
    label: "3P%",
    description: "3-Point %",
    format: "percent",
    higherIsBetter: true,
    category: "SHOOTING",
  },
  {
    key: "three_p_rate",
    label: "3P_RATE",
    description: "3PA / FGA",
    format: "percent",
    higherIsBetter: true,
    category: "SHOOTING",
  },
  {
    key: "ft_pct",
    label: "FT%",
    description: "Free Throw %",
    format: "percent",
    higherIsBetter: true,
    category: "SHOOTING",
  },
  {
    key: "oreb_pct",
    label: "OREB%",
    description: "Off Reb Rate",
    format: "percent",
    higherIsBetter: true,
    category: "REBOUNDING",
  },
  {
    key: "dreb_pct",
    label: "DREB%",
    description: "Def Reb Rate",
    format: "percent",
    higherIsBetter: true,
    category: "REBOUNDING",
  },
  {
    key: "assists_per_game",
    label: "APG",
    description: "Assists/game",
    format: "decimal",
    higherIsBetter: true,
    category: "PLAYMAKING",
  },
  {
    key: "ast_to_ratio",
    label: "AST/TO",
    description: "Assist:TO Ratio",
    format: "decimal",
    higherIsBetter: true,
    category: "PLAYMAKING",
  },
  {
    key: "to_rate",
    label: "TO/G",
    description: "Turnovers/game",
    format: "decimal",
    higherIsBetter: false,
    category: "PLAYMAKING",
  },
  {
    key: "steals_per_game",
    label: "SPG",
    description: "Steals/game",
    format: "decimal",
    higherIsBetter: true,
    category: "DEFENSE",
  },
  {
    key: "blocks_per_game",
    label: "BPG",
    description: "Blocks/game",
    format: "decimal",
    higherIsBetter: true,
    category: "DEFENSE",
  },
  {
    key: "fouls_per_game",
    label: "FOULS",
    description: "Fouls/game",
    format: "decimal",
    higherIsBetter: false,
    category: "DISCIPLINE",
  },
];

const CATEGORIES = [
  "SCORING",
  "TEMPO",
  "EFFICIENCY",
  "SHOOTING",
  "REBOUNDING",
  "PLAYMAKING",
  "DEFENSE",
  "DISCIPLINE",
];

function formatValue(value: number, format: MetricConfig["format"]): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  switch (format) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "decimal":
      return value.toFixed(1);
    case "number":
    default:
      return value.toFixed(0);
  }
}

function getPercentileLabel(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "Elite", color: "text-[#00ffff]" };
  if (pct >= 60) return { label: "Good", color: "text-[#00ffff]/70" };
  if (pct >= 40) return { label: "Average", color: "text-neutral-400" };
  if (pct >= 20) return { label: "Below Avg", color: "text-yellow-500" };
  return { label: "Poor", color: "text-red-400" };
}

function getClassificationColor(color: Classification["color"]): string {
  switch (color) {
    case "green":
      return "border-[#00ffff]/40 text-[#00ffff] bg-[#00ffff]/5";
    case "yellow":
      return "border-yellow-500/40 text-yellow-400 bg-yellow-500/5";
    case "red":
      return "border-red-500/40 text-red-400 bg-red-500/5";
    case "blue":
      return "border-[#00ffff]/40 text-[#00ffff] bg-[#00ffff]/5";
    case "purple":
      return "border-[#b026ff]/40 text-[#b026ff] bg-[#b026ff]/5";
    default:
      return "border-neutral-700 text-neutral-400 bg-neutral-800/30";
  }
}

export default function ResearchPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("single");

  // Single team mode
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Compare mode
  const [team1Search, setTeam1Search] = useState("");
  const [team2Search, setTeam2Search] = useState("");
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [analysis1, setAnalysis1] = useState<TeamAnalysis | null>(null);
  const [analysis2, setAnalysis2] = useState<TeamAnalysis | null>(null);
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);
  const [comparing, setComparing] = useState(false);

  // Inline comparison (add second team from single view)
  const [compareTeam, setCompareTeam] = useState<Team | null>(null);
  const [compareAnalysis, setCompareAnalysis] = useState<TeamAnalysis | null>(
    null,
  );
  const [compareSearch, setCompareSearch] = useState("");
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);
  const [showCompareInput, setShowCompareInput] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch("/api/teams");
        const data = await res.json();
        setTeams(data.teams || []);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, []);

  const fetchAnalysis = useCallback(async (team: Team) => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const teamParam = team.id && team.id !== team.name ? team.id : team.name;
      const res = await fetch(
        `/api/teams/analysis?team=${encodeURIComponent(teamParam)}`,
      );
      const data = await res.json();
      if (data.team) setAnalysis(data);
    } catch (error) {
      console.error("Error fetching analysis:", error);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const fetchComparison = useCallback(async () => {
    if (!team1 || !team2) return;
    setComparing(true);
    setAnalysis1(null);
    setAnalysis2(null);
    try {
      const team1Param =
        team1.id && team1.id !== team1.name ? team1.id : team1.name;
      const team2Param =
        team2.id && team2.id !== team2.name ? team2.id : team2.name;
      const [res1, res2] = await Promise.all([
        fetch(`/api/teams/analysis?team=${encodeURIComponent(team1Param)}`),
        fetch(`/api/teams/analysis?team=${encodeURIComponent(team2Param)}`),
      ]);
      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
      if (data1.team) setAnalysis1(data1);
      if (data2.team) setAnalysis2(data2);
    } catch (error) {
      console.error("Error fetching comparison:", error);
    } finally {
      setComparing(false);
    }
  }, [team1, team2]);

  const fetchCompareAnalysis = useCallback(async (team: Team) => {
    setLoadingCompare(true);
    setCompareAnalysis(null);
    try {
      const teamParam = team.id && team.id !== team.name ? team.id : team.name;
      const res = await fetch(
        `/api/teams/analysis?team=${encodeURIComponent(teamParam)}`,
      );
      const data = await res.json();
      if (data.team) setCompareAnalysis(data);
    } catch (error) {
      console.error("Error fetching compare analysis:", error);
    } finally {
      setLoadingCompare(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeam && viewMode === "single") fetchAnalysis(selectedTeam);
  }, [selectedTeam, fetchAnalysis, viewMode]);

  useEffect(() => {
    if (compareTeam && viewMode === "single") fetchCompareAnalysis(compareTeam);
  }, [compareTeam, fetchCompareAnalysis, viewMode]);

  useEffect(() => {
    if (team1 && team2 && viewMode === "compare") fetchComparison();
  }, [team1, team2, fetchComparison, viewMode]);

  const filteredTeams = teams
    .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 15);
  const filteredTeams1 = teams
    .filter((t) => t.name.toLowerCase().includes(team1Search.toLowerCase()))
    .slice(0, 10);
  const filteredTeams2 = teams
    .filter((t) => t.name.toLowerCase().includes(team2Search.toLowerCase()))
    .slice(0, 10);
  const filteredCompareTeams = teams
    .filter((t) => t.name.toLowerCase().includes(compareSearch.toLowerCase()))
    .filter((t) => t.id !== selectedTeam?.id)
    .slice(0, 10);

  const selectTeam = (team: Team) => {
    setSelectedTeam(team);
    setSearchQuery("");
    setShowDropdown(false);
  };
  const clearTeam = () => {
    setSelectedTeam(null);
    setAnalysis(null);
    setSearchQuery("");
    setCompareTeam(null);
    setCompareAnalysis(null);
    setShowCompareInput(false);
    setCompareSearch("");
  };
  const clearCompareTeam = () => {
    setCompareTeam(null);
    setCompareAnalysis(null);
    setCompareSearch("");
    setShowCompareInput(false);
  };
  const selectCompareTeam = (team: Team) => {
    setCompareTeam(team);
    setCompareSearch("");
    setShowCompareDropdown(false);
  };
  const switchMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "single") {
      setTeam1(null);
      setTeam2(null);
      setAnalysis1(null);
      setAnalysis2(null);
    } else {
      setSelectedTeam(null);
      setAnalysis(null);
    }
  };

  // Shared input style
  const inputCls =
    "w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:border-[#00ffff]/50 focus:outline-none backdrop-blur-sm font-mono transition-colors";
  const dropdownCls =
    "absolute z-20 w-full mt-1 rounded-xl border border-neutral-800 bg-neutral-900/95 backdrop-blur-md max-h-72 overflow-y-auto shadow-xl";

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* ═══════════════════════════════════
            COMPARE MODE — full width, wider container
            ═══════════════════════════════════ */}
        {viewMode === "compare" && (
          <div className="space-y-6">
            {/* Header + mode toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <div>
                <div className="text-neutral-600 text-xs font-mono mb-1">// TEAM_ANALYSIS</div>
                <h1 className="text-2xl font-bold text-white">Head-to-Head</h1>
                <p className="text-neutral-500 text-sm mt-0.5">Compare two teams side by side</p>
              </div>
              <div
                className="inline-flex items-center gap-1 rounded-xl border border-neutral-800 p-1 self-start sm:self-auto"
                style={{ background: "rgba(23,23,23,0.6)" }}
              >
                {(["single", "compare"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => switchMode(mode)}
                    className={`px-5 py-2 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all duration-200 ${
                      viewMode === mode
                        ? "bg-[#00ffff] text-black shadow-[0_0_12px_rgba(0,255,255,0.3)]"
                        : "text-neutral-500 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    {mode === "single" ? "SINGLE" : "COMPARE"}
                  </button>
                ))}
              </div>
            </div>

            {/* Two team selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs text-neutral-600 font-mono mb-2">// TEAM_1</label>
                <div className="relative">
                  <input type="text" placeholder="Search team..." value={team1 ? team1.name : team1Search}
                    onChange={(e) => { setTeam1Search(e.target.value); setTeam1(null); setShowDropdown1(true); }}
                    onFocus={() => setShowDropdown1(true)} className={inputCls}
                  />
                  {team1 && (
                    <button onClick={() => { setTeam1(null); setAnalysis1(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                {showDropdown1 && !team1 && team1Search && (
                  <div className={dropdownCls}>
                    {filteredTeams1.map((t) => (
                      <button key={t.id} onClick={() => { setTeam1(t); setTeam1Search(""); setShowDropdown1(false); }}
                        className="w-full px-4 py-2.5 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-800/60 flex items-center justify-between border-b border-neutral-800/50 last:border-0 transition-colors"
                      >
                        <span>{t.name}</span>
                        {t.rank && t.rank < 26 && <span className="text-yellow-400 font-mono font-bold">#{t.rank}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-xs text-neutral-600 font-mono mb-2">// TEAM_2</label>
                <div className="relative">
                  <input type="text" placeholder="Search team..." value={team2 ? team2.name : team2Search}
                    onChange={(e) => { setTeam2Search(e.target.value); setTeam2(null); setShowDropdown2(true); }}
                    onFocus={() => setShowDropdown2(true)} className={inputCls}
                  />
                  {team2 && (
                    <button onClick={() => { setTeam2(null); setAnalysis2(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                {showDropdown2 && !team2 && team2Search && (
                  <div className={dropdownCls}>
                    {filteredTeams2.map((t) => (
                      <button key={t.id} onClick={() => { setTeam2(t); setTeam2Search(""); setShowDropdown2(false); }}
                        className="w-full px-4 py-2.5 text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-800/60 flex items-center justify-between border-b border-neutral-800/50 last:border-0 transition-colors"
                      >
                        <span>{t.name}</span>
                        {t.rank && t.rank < 26 && <span className="text-yellow-400 font-mono font-bold">#{t.rank}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {comparing && (
              <div className="text-center py-16 rounded-xl border border-neutral-800 glass-panel">
                <div className="flex items-center justify-center gap-2 text-neutral-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
                  <span className="text-xs font-mono">COMPARING_TEAMS...</span>
                </div>
              </div>
            )}

            {analysis1 && analysis2 && !comparing && (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2 rounded-xl border border-neutral-800 glass-panel p-4">
                  <div className="col-span-3 text-center">
                    <h3 className="text-lg font-bold text-white">{analysis1.team.team_name}</h3>
                    <p className="text-xs text-neutral-500 font-mono mt-0.5">
                      {analysis1.team.espn_rank < 26 && <span className="text-yellow-400">#{analysis1.team.espn_rank} · </span>}
                      {analysis1.team.record}
                    </p>
                    {analysis1.classifications.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-2">
                        {analysis1.classifications.slice(0, 3).map((c) => (
                          <span key={c.id} className={`px-1.5 py-0.5 text-[10px] rounded border font-mono ${getClassificationColor(c.color)}`}>{c.label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-lg font-bold text-neutral-600 font-mono">VS</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <h3 className="text-lg font-bold text-white">{analysis2.team.team_name}</h3>
                    <p className="text-xs text-neutral-500 font-mono mt-0.5">
                      {analysis2.team.espn_rank < 26 && <span className="text-yellow-400">#{analysis2.team.espn_rank} · </span>}
                      {analysis2.team.record}
                    </p>
                    {analysis2.classifications.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-2">
                        {analysis2.classifications.slice(0, 3).map((c) => (
                          <span key={c.id} className={`px-1.5 py-0.5 text-[10px] rounded border font-mono ${getClassificationColor(c.color)}`}>{c.label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {CATEGORIES.map((category) => {
                  const categoryMetrics = METRICS.filter((m) => m.category === category);
                  if (categoryMetrics.length === 0) return null;
                  return (
                    <div key={category} className="rounded-xl border border-neutral-800 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-neutral-800" style={{ background: "rgba(23,23,23,0.8)" }}>
                        <h3 className="text-[10px] font-bold text-neutral-500 font-mono tracking-widest">// {category}</h3>
                      </div>
                      <div className="divide-y divide-neutral-800/60">
                        {categoryMetrics.map((metric) => {
                          const val1 = analysis1.team[metric.key] as number;
                          const val2 = analysis2.team[metric.key] as number;
                          const pct1 = analysis1.percentiles[metric.key] || 50;
                          const pct2 = analysis2.percentiles[metric.key] || 50;
                          const team1Better = metric.higherIsBetter ? val1 > val2 : val1 < val2;
                          const team2Better = metric.higherIsBetter ? val2 > val1 : val2 < val1;
                          const isDraw = val1 === val2;
                          return (
                            <div key={metric.key} className="grid grid-cols-7 gap-2 px-4 py-3 items-center">
                              <div className="col-span-3 flex items-center justify-between">
                                <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden mr-2">
                                  <div className="h-full rounded-full transition-all duration-500 float-right" style={{ width: `${Math.min(100, Math.max(0, pct1))}%`, background: "linear-gradient(to left, rgba(0,255,255,0.4), #00ffff)" }} />
                                </div>
                                <span className={`text-sm font-bold tabular-nums font-mono ${isDraw ? "text-neutral-500" : team1Better ? "text-white" : "text-neutral-600"}`}>
                                  {team1Better && !isDraw && <span className="text-yellow-400 mr-1">›</span>}
                                  {formatValue(val1, metric.format)}
                                </span>
                              </div>
                              <div className="col-span-1 text-center">
                                <p className="text-xs font-medium text-[#00ffff]/70 font-mono">{metric.label}</p>
                                <p className="text-[9px] text-neutral-700 hidden md:block">{metric.description}</p>
                              </div>
                              <div className="col-span-3 flex items-center justify-between">
                                <span className={`text-sm font-bold tabular-nums font-mono ${isDraw ? "text-neutral-500" : team2Better ? "text-white" : "text-neutral-600"}`}>
                                  {formatValue(val2, metric.format)}
                                  {team2Better && !isDraw && <span className="text-yellow-400 ml-1">‹</span>}
                                </span>
                                <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden ml-2">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pct2))}%`, background: "linear-gradient(to right, rgba(0,255,255,0.4), #00ffff)" }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-center gap-6 text-[10px] text-neutral-700 font-mono pt-2">
                  <span className="flex items-center gap-1"><span className="text-yellow-400">›</span> ADVANTAGE</span>
                  <span>Bars show league percentile</span>
                </div>
              </div>
            )}

            {(!team1 || !team2) && !comparing && (
              <div className="text-center py-16 rounded-xl border border-neutral-800 glass-panel">
                <div className="text-neutral-700 text-xs font-mono mb-3">// AWAITING_INPUT</div>
                <p className="text-lg font-semibold text-white mb-1">Select Two Teams</p>
                <p className="text-sm text-neutral-500">Search and select teams above to compare their stats</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════
            SINGLE MODE — two-column on lg+
            ═══════════════════════════════════ */}
        {viewMode === "single" && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* ── LEFT SIDEBAR ── */}
            <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-24 space-y-4">

              {/* Title + mode toggle */}
              <div>
                <div className="text-neutral-600 text-xs font-mono mb-1">// TEAM_ANALYSIS</div>
                <h1 className="text-2xl font-bold text-white mb-1">Team Profile</h1>
                <p className="text-neutral-500 text-sm mb-4">Statistical deep-dive for any NCAA team</p>
                <div className="inline-flex items-center gap-1 rounded-xl border border-neutral-800 p-1" style={{ background: "rgba(23,23,23,0.6)" }}>
                  {(["single", "compare"] as ViewMode[]).map((mode) => (
                    <button key={mode} onClick={() => switchMode(mode)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all duration-200 ${
                        viewMode === mode ? "bg-[#00ffff] text-black shadow-[0_0_12px_rgba(0,255,255,0.3)]" : "text-neutral-500 hover:text-white hover:bg-neutral-800"
                      }`}
                    >
                      {mode === "single" ? "SINGLE" : "COMPARE"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <label className="block text-xs text-neutral-600 font-mono mb-2">// SELECT_TEAM</label>
                <div className="relative">
                  <input type="text" placeholder="Search team..."
                    value={selectedTeam ? selectedTeam.name : searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedTeam(null); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)} className={inputCls}
                  />
                  {selectedTeam && (
                    <button onClick={clearTeam} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                {showDropdown && !selectedTeam && searchQuery && (
                  <div className={dropdownCls}>
                    {filteredTeams.map((t) => (
                      <button key={t.id} onClick={() => selectTeam(t)}
                        className="w-full px-4 py-3 text-left text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/60 flex items-center justify-between border-b border-neutral-800/50 last:border-0 transition-colors"
                      >
                        <span>{t.name}</span>
                        {t.rank && t.rank < 26 && <span className="text-yellow-400 text-xs font-mono font-bold">#{t.rank}</span>}
                      </button>
                    ))}
                    {filteredTeams.length === 0 && <div className="px-4 py-3 text-xs text-neutral-600 font-mono">NO_TEAMS_FOUND</div>}
                  </div>
                )}
              </div>

              {/* Analyzing state */}
              {analyzing && (
                <div className="text-center py-8 rounded-xl border border-neutral-800 glass-panel">
                  <div className="flex items-center justify-center gap-2 text-neutral-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
                    <span className="text-xs font-mono">ANALYZING...</span>
                  </div>
                </div>
              )}

              {/* Team info card */}
              {analysis && !analyzing && (
                <div className="rounded-xl border border-neutral-800 p-5 glass-panel space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-white leading-tight">{analysis.team.team_name}</h2>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">
                          {analysis.team.espn_rank && analysis.team.espn_rank < 26 && (
                            <span className="text-yellow-400 font-medium">#{analysis.team.espn_rank} · </span>
                          )}
                          {analysis.team.record || `${analysis.team.games_played} games`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white font-mono tabular-nums">{analysis.team.avg_ppg}</div>
                        <div className="text-[10px] text-neutral-600 font-mono">PPG</div>
                      </div>
                    </div>

                    {analysis.classifications.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] text-neutral-600 font-mono mb-1.5">// CLASSIFICATIONS</div>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.classifications.map((c) => (
                            <span key={c.id} className={`px-2 py-0.5 text-[10px] font-medium rounded-lg border font-mono ${getClassificationColor(c.color)}`} title={c.description}>{c.label}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.insights.length > 0 && (
                      <div>
                        <div className="text-[10px] text-neutral-600 font-mono mb-1.5">// KEY_INSIGHTS</div>
                        <ul className="space-y-1">
                          {analysis.insights.map((insight, i) => (
                            <li key={i} className="text-[11px] text-neutral-400 flex items-start gap-1.5">
                              <span className="text-[#00ffff]/50 mt-0.5 flex-shrink-0">›</span>{insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Compare section */}
                  {compareAnalysis && (
                    <div className="pt-3 border-t border-neutral-800">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[10px] text-neutral-600 font-mono mb-0.5">vs.</div>
                          <h3 className="text-sm font-bold text-white">{compareAnalysis.team.team_name}</h3>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            {compareAnalysis.team.espn_rank < 26 && <span className="text-yellow-400">#{compareAnalysis.team.espn_rank} · </span>}
                            {compareAnalysis.team.record}
                          </p>
                        </div>
                        <button onClick={clearCompareTeam} className="text-neutral-700 hover:text-red-400 transition-colors mt-1" title="Remove">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {!compareAnalysis && !showCompareInput && !loadingCompare && (
                    <button onClick={() => setShowCompareInput(true)}
                      className="w-full rounded-xl border border-dashed border-neutral-700 py-2 text-neutral-500 hover:border-[#00ffff]/40 hover:text-[#00ffff] hover:bg-[#00ffff]/5 transition-all text-xs font-medium"
                    >
                      + Compare with another team
                    </button>
                  )}

                  {showCompareInput && !compareTeam && (
                    <div className="relative">
                      <label className="block text-[10px] text-neutral-600 font-mono mb-1.5">// SELECT_TEAM_TO_COMPARE</label>
                      <div className="relative">
                        <input type="text" placeholder="Search team..." value={compareSearch}
                          onChange={(e) => { setCompareSearch(e.target.value); setShowCompareDropdown(true); }}
                          onFocus={() => setShowCompareDropdown(true)} autoFocus className={inputCls}
                        />
                        <button onClick={() => setShowCompareInput(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {showCompareDropdown && compareSearch && (
                        <div className={dropdownCls}>
                          {filteredCompareTeams.map((t) => (
                            <button key={t.id} onClick={() => selectCompareTeam(t)}
                              className="w-full px-4 py-3 text-left text-sm text-neutral-300 hover:text-white hover:bg-neutral-800/60 flex items-center justify-between border-b border-neutral-800/50 last:border-0 transition-colors"
                            >
                              <span>{t.name}</span>
                              {t.rank && t.rank < 26 && <span className="text-yellow-400 text-xs font-mono font-bold">#{t.rank}</span>}
                            </button>
                          ))}
                          {filteredCompareTeams.length === 0 && <div className="px-4 py-3 text-xs text-neutral-600 font-mono">NO_TEAMS_FOUND</div>}
                        </div>
                      )}
                    </div>
                  )}

                  {loadingCompare && (
                    <div className="flex items-center justify-center gap-2 py-4 text-neutral-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
                      <span className="text-xs font-mono">LOADING...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!selectedTeam && !analyzing && (
                <div className="text-center py-12 rounded-xl border border-neutral-800 glass-panel">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 text-neutral-500">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
                      <span className="text-xs font-mono">LOADING_TEAMS...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-neutral-700 text-xs font-mono mb-2">// AWAITING_INPUT</div>
                      <p className="text-sm font-semibold text-white">Select a Team</p>
                      <p className="text-xs text-neutral-500 mt-1 px-4">Search above to load a full statistical profile</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL: stats ── */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Placeholder when no team selected */}
              {!selectedTeam && !analyzing && (
                <div className="hidden lg:flex items-center justify-center h-64 rounded-xl border border-neutral-800/50 border-dashed">
                  <p className="text-neutral-700 text-sm font-mono">// Select a team to see stats</p>
                </div>
              )}

              {/* Single team stats */}
              {analysis && !compareAnalysis && !analyzing && (
                <>
                  {CATEGORIES.map((category) => {
                    const categoryMetrics = METRICS.filter((m) => m.category === category);
                    if (categoryMetrics.length === 0) return null;
                    return (
                      <div key={category} className="rounded-xl border border-neutral-800 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-neutral-800" style={{ background: "rgba(23,23,23,0.8)" }}>
                          <h3 className="text-[10px] font-bold text-neutral-500 font-mono tracking-widest">// {category}</h3>
                        </div>
                        <div className="divide-y divide-neutral-800/60">
                          {categoryMetrics.map((metric) => {
                            const value = analysis.team[metric.key] as number;
                            const percentile = analysis.percentiles[metric.key] || 50;
                            const { label: pctLabel, color: pctColor } = getPercentileLabel(
                              metric.higherIsBetter ? percentile : 100 - percentile
                            );
                            const leagueAvg = analysis.leagueAverages[metric.key];
                            return (
                              <div key={metric.key} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="text-sm font-medium text-white font-mono">{metric.label}</span>
                                    <span className="text-xs text-neutral-600 ml-2">{metric.description}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-bold text-white font-mono tabular-nums">{formatValue(value, metric.format)}</span>
                                    {leagueAvg !== undefined && (
                                      <span className="text-xs text-neutral-600 ml-2">avg {formatValue(leagueAvg, metric.format)}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, percentile))}%`, background: "linear-gradient(to right, rgba(0,255,255,0.4), #00ffff)" }} />
                                  </div>
                                  <span className={`text-xs font-medium w-24 text-right font-mono ${pctColor}`}>
                                    {pctLabel} ({Math.round(percentile)}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-center text-[10px] text-neutral-700 font-mono pt-2">
                    Percentile bars show rank among all NCAA teams
                  </div>
                </>
              )}

              {/* Inline compare stats */}
              {analysis && compareAnalysis && !analyzing && !loadingCompare && (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 rounded-xl border border-neutral-800 glass-panel p-4">
                    <div className="col-span-3 text-center">
                      <h3 className="text-base font-bold text-white">{analysis.team.team_name}</h3>
                      <p className="text-xs text-neutral-500 font-mono mt-0.5">
                        {analysis.team.espn_rank < 26 && <span className="text-yellow-400">#{analysis.team.espn_rank} · </span>}
                        {analysis.team.record}
                      </p>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <span className="text-lg font-bold text-neutral-600 font-mono">VS</span>
                    </div>
                    <div className="col-span-3 text-center">
                      <h3 className="text-base font-bold text-white">{compareAnalysis.team.team_name}</h3>
                      <p className="text-xs text-neutral-500 font-mono mt-0.5">
                        {compareAnalysis.team.espn_rank < 26 && <span className="text-yellow-400">#{compareAnalysis.team.espn_rank} · </span>}
                        {compareAnalysis.team.record}
                      </p>
                    </div>
                  </div>

                  {CATEGORIES.map((category) => {
                    const categoryMetrics = METRICS.filter((m) => m.category === category);
                    if (categoryMetrics.length === 0) return null;
                    return (
                      <div key={category} className="rounded-xl border border-neutral-800 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-neutral-800" style={{ background: "rgba(23,23,23,0.8)" }}>
                          <h3 className="text-[10px] font-bold text-neutral-500 font-mono tracking-widest">// {category}</h3>
                        </div>
                        <div className="divide-y divide-neutral-800/60">
                          {categoryMetrics.map((metric) => {
                            const val1 = analysis.team[metric.key] as number;
                            const val2 = compareAnalysis.team[metric.key] as number;
                            const pct1 = analysis.percentiles[metric.key] || 50;
                            const pct2 = compareAnalysis.percentiles[metric.key] || 50;
                            const team1Better = metric.higherIsBetter ? val1 > val2 : val1 < val2;
                            const team2Better = metric.higherIsBetter ? val2 > val1 : val2 < val1;
                            const isDraw = val1 === val2;
                            return (
                              <div key={metric.key} className="grid grid-cols-7 gap-2 px-4 py-3 items-center">
                                <div className="col-span-3 flex items-center justify-between">
                                  <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden mr-2">
                                    <div className="h-full rounded-full transition-all duration-500 float-right" style={{ width: `${Math.min(100, Math.max(0, pct1))}%`, background: "linear-gradient(to left, rgba(0,255,255,0.4), #00ffff)" }} />
                                  </div>
                                  <span className={`text-sm font-bold tabular-nums font-mono ${isDraw ? "text-neutral-500" : team1Better ? "text-white" : "text-neutral-600"}`}>
                                    {team1Better && !isDraw && <span className="text-yellow-400 mr-1">›</span>}
                                    {formatValue(val1, metric.format)}
                                  </span>
                                </div>
                                <div className="col-span-1 text-center">
                                  <p className="text-xs font-medium text-[#00ffff]/70 font-mono">{metric.label}</p>
                                  <p className="text-[9px] text-neutral-700 hidden md:block">{metric.description}</p>
                                </div>
                                <div className="col-span-3 flex items-center justify-between">
                                  <span className={`text-sm font-bold tabular-nums font-mono ${isDraw ? "text-neutral-500" : team2Better ? "text-white" : "text-neutral-600"}`}>
                                    {formatValue(val2, metric.format)}
                                    {team2Better && !isDraw && <span className="text-yellow-400 ml-1">‹</span>}
                                  </span>
                                  <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden ml-2">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pct2))}%`, background: "linear-gradient(to right, rgba(0,255,255,0.4), #00ffff)" }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-center gap-6 text-[10px] text-neutral-700 font-mono pt-2">
                    <span className="flex items-center gap-1"><span className="text-yellow-400">›</span> ADVANTAGE</span>
                    <span>Bars show league percentile</span>
                  </div>

                  <button onClick={clearCompareTeam} className="w-full rounded-xl border border-neutral-800 py-3 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400 transition-all text-xs font-mono">
                    ← BACK_TO_SINGLE_TEAM_VIEW
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800/50 py-6 mt-12">
        <div className="text-center text-neutral-800 text-[10px] font-mono">
          TTLU · RESEARCH_MODULE
        </div>
      </div>
    </main>
  );
}

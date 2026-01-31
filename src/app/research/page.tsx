'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  rank: number;
}

interface Classification {
  id: string;
  label: string;
  description: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
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

type ViewMode = 'single' | 'compare';

interface MetricConfig {
  key: keyof TeamStats;
  label: string;
  description: string;
  format: 'percent' | 'decimal' | 'number';
  higherIsBetter: boolean;
  category: string;
}

const METRICS: MetricConfig[] = [
  { key: 'avg_ppg', label: 'PPG', description: 'Points per game', format: 'decimal', higherIsBetter: true, category: 'SCORING' },
  { key: 'avg_ppm', label: 'PPM', description: 'Points per minute', format: 'decimal', higherIsBetter: true, category: 'SCORING' },
  { key: 'pace', label: 'PACE', description: 'Possessions per game', format: 'decimal', higherIsBetter: true, category: 'TEMPO' },
  { key: 'off_efficiency', label: 'OFF_EFF', description: 'Pts per 100 poss', format: 'decimal', higherIsBetter: true, category: 'EFFICIENCY' },
  { key: 'fg_pct', label: 'FG%', description: 'Field Goal %', format: 'percent', higherIsBetter: true, category: 'SHOOTING' },
  { key: 'efg_pct', label: 'eFG%', description: 'Effective FG%', format: 'percent', higherIsBetter: true, category: 'SHOOTING' },
  { key: 'ts_pct', label: 'TS%', description: 'True Shooting %', format: 'percent', higherIsBetter: true, category: 'SHOOTING' },
  { key: 'three_p_pct', label: '3P%', description: '3-Point %', format: 'percent', higherIsBetter: true, category: 'SHOOTING' },
  { key: 'three_p_rate', label: '3P_RATE', description: '3PA / FGA', format: 'percent', higherIsBetter: true, category: 'SHOOTING' },
  { key: 'ft_pct', label: 'FT%', description: 'Free Throw %', format: 'percent', higherIsBetter: true, category: 'SHOOTING' },
  { key: 'oreb_pct', label: 'OREB%', description: 'Off Reb Rate', format: 'percent', higherIsBetter: true, category: 'REBOUNDING' },
  { key: 'dreb_pct', label: 'DREB%', description: 'Def Reb Rate', format: 'percent', higherIsBetter: true, category: 'REBOUNDING' },
  { key: 'assists_per_game', label: 'APG', description: 'Assists/game', format: 'decimal', higherIsBetter: true, category: 'PLAYMAKING' },
  { key: 'ast_to_ratio', label: 'AST/TO', description: 'Assist:TO Ratio', format: 'decimal', higherIsBetter: true, category: 'PLAYMAKING' },
  { key: 'to_rate', label: 'TO/G', description: 'Turnovers/game', format: 'decimal', higherIsBetter: false, category: 'PLAYMAKING' },
  { key: 'steals_per_game', label: 'SPG', description: 'Steals/game', format: 'decimal', higherIsBetter: true, category: 'DEFENSE' },
  { key: 'blocks_per_game', label: 'BPG', description: 'Blocks/game', format: 'decimal', higherIsBetter: true, category: 'DEFENSE' },
  { key: 'fouls_per_game', label: 'FOULS', description: 'Fouls/game', format: 'decimal', higherIsBetter: false, category: 'DISCIPLINE' },
];

const CATEGORIES = ['SCORING', 'TEMPO', 'EFFICIENCY', 'SHOOTING', 'REBOUNDING', 'PLAYMAKING', 'DEFENSE', 'DISCIPLINE'];

function formatValue(value: number, format: MetricConfig['format']): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'decimal':
      return value.toFixed(1);
    case 'number':
    default:
      return value.toFixed(0);
  }
}

function getPercentileLabel(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: 'Elite', color: 'text-green-400' };
  if (pct >= 60) return { label: 'Good', color: 'text-green-500' };
  if (pct >= 40) return { label: 'Average', color: 'text-green-600' };
  if (pct >= 20) return { label: 'Below Avg', color: 'text-yellow-500' };
  return { label: 'Poor', color: 'text-red-400' };
}

function getClassificationColor(color: Classification['color']): string {
  switch (color) {
    case 'green': return 'border-green-500 text-green-400 bg-green-500/10';
    case 'yellow': return 'border-yellow-500 text-yellow-400 bg-yellow-500/10';
    case 'red': return 'border-red-500 text-red-400 bg-red-500/10';
    case 'blue': return 'border-blue-500 text-blue-400 bg-blue-500/10';
    case 'purple': return 'border-purple-500 text-purple-400 bg-purple-500/10';
    default: return 'border-green-700 text-green-500 bg-green-700/10';
  }
}

export default function ResearchPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  // Single team mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Compare mode
  const [team1Search, setTeam1Search] = useState('');
  const [team2Search, setTeam2Search] = useState('');
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [analysis1, setAnalysis1] = useState<TeamAnalysis | null>(null);
  const [analysis2, setAnalysis2] = useState<TeamAnalysis | null>(null);
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);
  const [comparing, setComparing] = useState(false);

  // Inline comparison (add second team from single view)
  const [compareTeam, setCompareTeam] = useState<Team | null>(null);
  const [compareAnalysis, setCompareAnalysis] = useState<TeamAnalysis | null>(null);
  const [compareSearch, setCompareSearch] = useState('');
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);
  const [showCompareInput, setShowCompareInput] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Fetch team list
  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch('/api/teams');
        const data = await res.json();
        setTeams(data.teams || []);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, []);

  // Fetch analysis for single team
  const fetchAnalysis = useCallback(async (team: Team) => {
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const teamParam = team.id && team.id !== team.name ? team.id : team.name;
      const res = await fetch(`/api/teams/analysis?team=${encodeURIComponent(teamParam)}`);
      const data = await res.json();

      if (data.team) {
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  // Fetch comparison analysis for both teams
  const fetchComparison = useCallback(async () => {
    if (!team1 || !team2) return;

    setComparing(true);
    setAnalysis1(null);
    setAnalysis2(null);

    try {
      const team1Param = team1.id && team1.id !== team1.name ? team1.id : team1.name;
      const team2Param = team2.id && team2.id !== team2.name ? team2.id : team2.name;

      const [res1, res2] = await Promise.all([
        fetch(`/api/teams/analysis?team=${encodeURIComponent(team1Param)}`),
        fetch(`/api/teams/analysis?team=${encodeURIComponent(team2Param)}`)
      ]);

      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);

      if (data1.team) setAnalysis1(data1);
      if (data2.team) setAnalysis2(data2);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    } finally {
      setComparing(false);
    }
  }, [team1, team2]);

  // Fetch analysis for comparison team (inline compare)
  const fetchCompareAnalysis = useCallback(async (team: Team) => {
    setLoadingCompare(true);
    setCompareAnalysis(null);

    try {
      const teamParam = team.id && team.id !== team.name ? team.id : team.name;
      const res = await fetch(`/api/teams/analysis?team=${encodeURIComponent(teamParam)}`);
      const data = await res.json();

      if (data.team) {
        setCompareAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching compare analysis:', error);
    } finally {
      setLoadingCompare(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeam && viewMode === 'single') {
      fetchAnalysis(selectedTeam);
    }
  }, [selectedTeam, fetchAnalysis, viewMode]);

  useEffect(() => {
    if (compareTeam && viewMode === 'single') {
      fetchCompareAnalysis(compareTeam);
    }
  }, [compareTeam, fetchCompareAnalysis, viewMode]);

  useEffect(() => {
    if (team1 && team2 && viewMode === 'compare') {
      fetchComparison();
    }
  }, [team1, team2, fetchComparison, viewMode]);

  const filteredTeams = teams
    .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 15);

  const filteredTeams1 = teams
    .filter(t => t.name.toLowerCase().includes(team1Search.toLowerCase()))
    .slice(0, 10);

  const filteredTeams2 = teams
    .filter(t => t.name.toLowerCase().includes(team2Search.toLowerCase()))
    .slice(0, 10);

  const filteredCompareTeams = teams
    .filter(t => t.name.toLowerCase().includes(compareSearch.toLowerCase()))
    .filter(t => t.id !== selectedTeam?.id) // Exclude currently selected team
    .slice(0, 10);

  const selectTeam = (team: Team) => {
    setSelectedTeam(team);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const clearTeam = () => {
    setSelectedTeam(null);
    setAnalysis(null);
    setSearchQuery('');
    // Also clear compare state
    setCompareTeam(null);
    setCompareAnalysis(null);
    setShowCompareInput(false);
    setCompareSearch('');
  };

  const clearCompareTeam = () => {
    setCompareTeam(null);
    setCompareAnalysis(null);
    setCompareSearch('');
    setShowCompareInput(false);
  };

  const selectCompareTeam = (team: Team) => {
    setCompareTeam(team);
    setCompareSearch('');
    setShowCompareDropdown(false);
  };

  const switchMode = (mode: ViewMode) => {
    setViewMode(mode);
    // Clear states when switching
    if (mode === 'single') {
      setTeam1(null);
      setTeam2(null);
      setAnalysis1(null);
      setAnalysis2(null);
    } else {
      setSelectedTeam(null);
      setAnalysis(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-green-400 font-mono">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-green-900/50">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-bold tracking-tight text-green-400">TTLU_TERMINAL</span>
              <span className="text-green-700 text-xs">v2.1.0</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xs text-green-600 hover:text-green-400 transition-colors">
                LIVE
              </Link>
              <span className="text-xs font-medium text-green-400 border-b border-green-500">RESEARCH</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="text-green-600 text-xs mb-2">// TEAM_ANALYSIS</div>
          <h1 className="text-2xl font-bold text-green-400 mb-2">
            {viewMode === 'single' ? 'TEAM_PROFILE' : 'HEAD_TO_HEAD'}
          </h1>
          <p className="text-green-700 text-sm">
            {viewMode === 'single'
              ? "Deep dive into any NCAA team's statistical profile"
              : "Compare two teams side by side"}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex border border-green-900">
            <button
              onClick={() => switchMode('single')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                viewMode === 'single'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:bg-green-900/30'
              }`}
            >
              SINGLE_TEAM
            </button>
            <button
              onClick={() => switchMode('compare')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                viewMode === 'compare'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:bg-green-900/30'
              }`}
            >
              COMPARE
            </button>
          </div>
        </div>

        {/* Single Team Search */}
        {viewMode === 'single' && (
          <div className="mb-8 relative">
            <label className="block text-xs text-green-600 mb-2">// SELECT_TEAM</label>
            <div className="relative">
              <input
                type="text"
                placeholder="SEARCH_TEAM..."
                value={selectedTeam ? selectedTeam.name : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedTeam(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full border border-green-900 bg-black px-4 py-3 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none text-sm"
              />
              {selectedTeam && (
                <button
                  onClick={clearTeam}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 hover:text-green-400"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {showDropdown && !selectedTeam && searchQuery && (
              <div className="absolute z-10 w-full mt-1 bg-black border border-green-900 max-h-80 overflow-y-auto">
                {filteredTeams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTeam(t)}
                    className="w-full px-4 py-3 text-left text-sm text-green-400 hover:bg-green-900/30 flex items-center justify-between border-b border-green-900/30"
                  >
                    <span>{t.name}</span>
                    {t.rank && t.rank < 26 && (
                      <span className="text-yellow-500 text-xs">#{t.rank}</span>
                    )}
                  </button>
                ))}
                {filteredTeams.length === 0 && (
                  <div className="px-4 py-3 text-xs text-green-700">NO_TEAMS_FOUND</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Compare Mode - Two Team Selectors */}
        {viewMode === 'compare' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Team 1 */}
            <div className="relative">
              <label className="block text-xs text-green-600 mb-2">// TEAM_1</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH..."
                  value={team1 ? team1.name : team1Search}
                  onChange={(e) => {
                    setTeam1Search(e.target.value);
                    setTeam1(null);
                    setShowDropdown1(true);
                  }}
                  onFocus={() => setShowDropdown1(true)}
                  className="w-full border border-green-900 bg-black px-4 py-3 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none text-sm"
                />
                {team1 && (
                  <button
                    onClick={() => { setTeam1(null); setAnalysis1(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 hover:text-green-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {showDropdown1 && !team1 && team1Search && (
                <div className="absolute z-10 w-full mt-1 bg-black border border-green-900 max-h-60 overflow-y-auto">
                  {filteredTeams1.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTeam1(t); setTeam1Search(''); setShowDropdown1(false); }}
                      className="w-full px-4 py-2 text-left text-xs text-green-400 hover:bg-green-900/30 flex items-center justify-between"
                    >
                      <span>{t.name}</span>
                      {t.rank && t.rank < 26 && <span className="text-yellow-500">#{t.rank}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Team 2 */}
            <div className="relative">
              <label className="block text-xs text-green-600 mb-2">// TEAM_2</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH..."
                  value={team2 ? team2.name : team2Search}
                  onChange={(e) => {
                    setTeam2Search(e.target.value);
                    setTeam2(null);
                    setShowDropdown2(true);
                  }}
                  onFocus={() => setShowDropdown2(true)}
                  className="w-full border border-green-900 bg-black px-4 py-3 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none text-sm"
                />
                {team2 && (
                  <button
                    onClick={() => { setTeam2(null); setAnalysis2(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 hover:text-green-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {showDropdown2 && !team2 && team2Search && (
                <div className="absolute z-10 w-full mt-1 bg-black border border-green-900 max-h-60 overflow-y-auto">
                  {filteredTeams2.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTeam2(t); setTeam2Search(''); setShowDropdown2(false); }}
                      className="w-full px-4 py-2 text-left text-xs text-green-400 hover:bg-green-900/30 flex items-center justify-between"
                    >
                      <span>{t.name}</span>
                      {t.rank && t.rank < 26 && <span className="text-yellow-500">#{t.rank}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analyzing && (
          <div className="text-center py-12 border border-green-900 bg-green-900/10">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
              <span className="text-xs">ANALYZING_TEAM...</span>
            </div>
          </div>
        )}

        {analysis && !analyzing && !compareAnalysis && (
          <div className="space-y-6">
            {/* Team Header */}
            <div className="border border-green-900 bg-green-900/20 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-green-400">{analysis.team.team_name}</h2>
                  <p className="text-sm text-green-600">
                    {analysis.team.espn_rank && analysis.team.espn_rank < 26 && (
                      <span className="text-yellow-400 font-medium">#{analysis.team.espn_rank} </span>
                    )}
                    {analysis.team.record || `${analysis.team.games_played} games played`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">{analysis.team.avg_ppg}</div>
                  <div className="text-xs text-green-700">PPG</div>
                </div>
              </div>

              {/* Classifications */}
              {analysis.classifications.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-green-700 mb-2">// CLASSIFICATIONS</div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.classifications.map((c) => (
                      <span
                        key={c.id}
                        className={`px-2 py-1 text-xs font-medium border ${getClassificationColor(c.color)}`}
                        title={c.description}
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {analysis.insights.length > 0 && (
                <div>
                  <div className="text-xs text-green-700 mb-2">// KEY_INSIGHTS</div>
                  <ul className="space-y-1">
                    {analysis.insights.map((insight, i) => (
                      <li key={i} className="text-xs text-green-500 flex items-start gap-2">
                        <span className="text-green-700">-</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Compare With Button - At Top */}
            {!showCompareInput && (
              <button
                onClick={() => setShowCompareInput(true)}
                className="w-full border border-dashed border-green-700 py-3 text-green-600 hover:border-green-500 hover:text-green-400 hover:bg-green-900/20 transition-all text-sm font-medium"
              >
                + COMPARE_WITH_ANOTHER_TEAM
              </button>
            )}

            {/* Compare Team Search Input */}
            {showCompareInput && !compareTeam && (
              <div className="relative">
                <label className="block text-xs text-green-600 mb-2">// SELECT_TEAM_TO_COMPARE</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SEARCH_TEAM..."
                    value={compareSearch}
                    onChange={(e) => {
                      setCompareSearch(e.target.value);
                      setShowCompareDropdown(true);
                    }}
                    onFocus={() => setShowCompareDropdown(true)}
                    autoFocus
                    className="w-full border border-green-700 bg-black px-4 py-3 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none text-sm"
                  />
                  <button
                    onClick={() => setShowCompareInput(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-green-700 hover:text-green-400"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {showCompareDropdown && compareSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-black border border-green-900 max-h-60 overflow-y-auto">
                    {filteredCompareTeams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectCompareTeam(t)}
                        className="w-full px-4 py-3 text-left text-sm text-green-400 hover:bg-green-900/30 flex items-center justify-between border-b border-green-900/30"
                      >
                        <span>{t.name}</span>
                        {t.rank && t.rank < 26 && (
                          <span className="text-yellow-500 text-xs">#{t.rank}</span>
                        )}
                      </button>
                    ))}
                    {filteredCompareTeams.length === 0 && (
                      <div className="px-4 py-3 text-xs text-green-700">NO_TEAMS_FOUND</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Loading Compare Team */}
            {loadingCompare && (
              <div className="text-center py-8 border border-green-900 bg-green-900/10">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
                  <span className="text-xs">LOADING_COMPARISON...</span>
                </div>
              </div>
            )}

            {/* Detailed Stats by Category */}
            {CATEGORIES.map((category) => {
              const categoryMetrics = METRICS.filter(m => m.category === category);
              if (categoryMetrics.length === 0) return null;

              return (
                <div key={category} className="border border-green-900 overflow-hidden">
                  <div className="bg-green-900/30 px-4 py-2 border-b border-green-900">
                    <h3 className="text-xs font-semibold text-green-400">// {category}</h3>
                  </div>
                  <div className="divide-y divide-green-900/50">
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
                              <span className="text-sm font-medium text-green-400">{metric.label}</span>
                              <span className="text-xs text-green-700 ml-2">{metric.description}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-green-300">{formatValue(value, metric.format)}</span>
                              {leagueAvg !== undefined && (
                                <span className="text-xs text-green-700 ml-2">
                                  (Avg: {formatValue(leagueAvg, metric.format)})
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Percentile Bar */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-green-900/50 overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, percentile))}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-20 text-right ${pctColor}`}>
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

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-[10px] text-green-700 pt-2">
              <span>Percentile bars show rank among all NCAA teams</span>
            </div>
          </div>
        )}

        {/* Inline Comparison View (from single team mode) */}
        {analysis && compareAnalysis && viewMode === 'single' && !analyzing && !loadingCompare && (
          <div className="space-y-6">
            {/* Team Headers */}
            <div className="grid grid-cols-7 gap-2 border border-green-900 bg-green-900/20 p-4">
              <div className="col-span-3 text-center">
                <h3 className="text-lg font-bold text-green-400">{analysis.team.team_name}</h3>
                <p className="text-xs text-green-600">
                  {analysis.team.espn_rank < 26 && <span className="text-yellow-400">#{analysis.team.espn_rank} </span>}
                  {analysis.team.record}
                </p>
                {analysis.classifications.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {analysis.classifications.slice(0, 3).map(c => (
                      <span key={c.id} className={`px-1.5 py-0.5 text-[10px] border ${getClassificationColor(c.color)}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <span className="text-xl font-bold text-green-700">VS</span>
              </div>
              <div className="col-span-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-lg font-bold text-green-400">{compareAnalysis.team.team_name}</h3>
                  <button
                    onClick={clearCompareTeam}
                    className="text-green-700 hover:text-red-400 transition-colors"
                    title="Remove comparison"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-green-600">
                  {compareAnalysis.team.espn_rank < 26 && <span className="text-yellow-400">#{compareAnalysis.team.espn_rank} </span>}
                  {compareAnalysis.team.record}
                </p>
                {compareAnalysis.classifications.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {compareAnalysis.classifications.slice(0, 3).map(c => (
                      <span key={c.id} className={`px-1.5 py-0.5 text-[10px] border ${getClassificationColor(c.color)}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Comparison by Category */}
            {CATEGORIES.map((category) => {
              const categoryMetrics = METRICS.filter(m => m.category === category);
              if (categoryMetrics.length === 0) return null;

              return (
                <div key={category} className="border border-green-900 overflow-hidden">
                  <div className="bg-green-900/30 px-4 py-2 border-b border-green-900">
                    <h3 className="text-xs font-semibold text-green-400">// {category}</h3>
                  </div>
                  <div className="divide-y divide-green-900/50">
                    {categoryMetrics.map((metric) => {
                      const val1 = analysis.team[metric.key] as number;
                      const val2 = compareAnalysis.team[metric.key] as number;
                      const pct1 = analysis.percentiles[metric.key] || 50;
                      const pct2 = compareAnalysis.percentiles[metric.key] || 50;

                      // Determine who's better based on metric direction
                      const team1Better = metric.higherIsBetter ? val1 > val2 : val1 < val2;
                      const team2Better = metric.higherIsBetter ? val2 > val1 : val2 < val1;
                      const isDraw = val1 === val2;

                      return (
                        <div key={metric.key} className="grid grid-cols-7 gap-2 px-4 py-3 items-center">
                          {/* Team 1 Value */}
                          <div className="col-span-3 flex items-center justify-between">
                            <div className="flex-1 h-2 bg-green-900/50 overflow-hidden mr-2">
                              <div
                                className="h-full bg-green-500 transition-all duration-500 float-right"
                                style={{ width: `${Math.min(100, Math.max(0, pct1))}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold tabular-nums ${
                              isDraw ? 'text-green-600' : team1Better ? 'text-green-400' : 'text-green-700'
                            }`}>
                              {team1Better && !isDraw && <span className="text-yellow-400 mr-1">*</span>}
                              {formatValue(val1, metric.format)}
                            </span>
                          </div>

                          {/* Metric Label */}
                          <div className="col-span-1 text-center">
                            <p className="text-xs font-medium text-green-500">{metric.label}</p>
                            <p className="text-[9px] text-green-800 hidden md:block">{metric.description}</p>
                          </div>

                          {/* Team 2 Value */}
                          <div className="col-span-3 flex items-center justify-between">
                            <span className={`text-sm font-bold tabular-nums ${
                              isDraw ? 'text-green-600' : team2Better ? 'text-green-400' : 'text-green-700'
                            }`}>
                              {formatValue(val2, metric.format)}
                              {team2Better && !isDraw && <span className="text-yellow-400 ml-1">*</span>}
                            </span>
                            <div className="flex-1 h-2 bg-green-900/50 overflow-hidden ml-2">
                              <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, pct2))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-[10px] text-green-700 pt-2">
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">*</span> ADVANTAGE
              </span>
              <span>Bars show league percentile</span>
            </div>

            {/* Back to single view */}
            <div className="pt-2">
              <button
                onClick={clearCompareTeam}
                className="w-full border border-green-900 py-3 text-green-600 hover:border-green-700 hover:text-green-400 transition-all text-xs"
              >
                ← BACK_TO_SINGLE_TEAM_VIEW
              </button>
            </div>
          </div>
        )

        {/* Empty State - Single Mode */}
        {viewMode === 'single' && !selectedTeam && !analyzing && (
          <div className="text-center py-12 border border-green-900 bg-green-900/10">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
                <span className="text-xs">LOADING_TEAMS...</span>
              </div>
            ) : (
              <div className="text-green-700">
                <div className="text-green-600 text-xs mb-4">// AWAITING_INPUT</div>
                <p className="text-lg font-medium text-green-500 mb-1">SELECT_A_TEAM</p>
                <p className="text-xs">Search for any NCAA team to see their full statistical profile</p>
              </div>
            )}
          </div>
        )}

        {/* Comparison Loading */}
        {viewMode === 'compare' && comparing && (
          <div className="text-center py-12 border border-green-900 bg-green-900/10">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
              <span className="text-xs">COMPARING_TEAMS...</span>
            </div>
          </div>
        )}

        {/* Comparison Results */}
        {viewMode === 'compare' && analysis1 && analysis2 && !comparing && (
          <div className="space-y-6">
            {/* Team Headers */}
            <div className="grid grid-cols-7 gap-2 border border-green-900 bg-green-900/20 p-4">
              <div className="col-span-3 text-center">
                <h3 className="text-lg font-bold text-green-400">{analysis1.team.team_name}</h3>
                <p className="text-xs text-green-600">
                  {analysis1.team.espn_rank < 26 && <span className="text-yellow-400">#{analysis1.team.espn_rank} </span>}
                  {analysis1.team.record}
                </p>
                {analysis1.classifications.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {analysis1.classifications.slice(0, 3).map(c => (
                      <span key={c.id} className={`px-1.5 py-0.5 text-[10px] border ${getClassificationColor(c.color)}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <span className="text-xl font-bold text-green-700">VS</span>
              </div>
              <div className="col-span-3 text-center">
                <h3 className="text-lg font-bold text-green-400">{analysis2.team.team_name}</h3>
                <p className="text-xs text-green-600">
                  {analysis2.team.espn_rank < 26 && <span className="text-yellow-400">#{analysis2.team.espn_rank} </span>}
                  {analysis2.team.record}
                </p>
                {analysis2.classifications.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {analysis2.classifications.slice(0, 3).map(c => (
                      <span key={c.id} className={`px-1.5 py-0.5 text-[10px] border ${getClassificationColor(c.color)}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Comparison by Category */}
            {CATEGORIES.map((category) => {
              const categoryMetrics = METRICS.filter(m => m.category === category);
              if (categoryMetrics.length === 0) return null;

              return (
                <div key={category} className="border border-green-900 overflow-hidden">
                  <div className="bg-green-900/30 px-4 py-2 border-b border-green-900">
                    <h3 className="text-xs font-semibold text-green-400">// {category}</h3>
                  </div>
                  <div className="divide-y divide-green-900/50">
                    {categoryMetrics.map((metric) => {
                      const val1 = analysis1.team[metric.key] as number;
                      const val2 = analysis2.team[metric.key] as number;
                      const pct1 = analysis1.percentiles[metric.key] || 50;
                      const pct2 = analysis2.percentiles[metric.key] || 50;

                      // Determine who's better based on metric direction
                      const team1Better = metric.higherIsBetter ? val1 > val2 : val1 < val2;
                      const team2Better = metric.higherIsBetter ? val2 > val1 : val2 < val1;
                      const isDraw = val1 === val2;

                      return (
                        <div key={metric.key} className="grid grid-cols-7 gap-2 px-4 py-3 items-center">
                          {/* Team 1 Value */}
                          <div className="col-span-3 flex items-center justify-between">
                            <div className="flex-1 h-2 bg-green-900/50 overflow-hidden mr-2">
                              <div
                                className="h-full bg-green-500 transition-all duration-500 float-right"
                                style={{ width: `${Math.min(100, Math.max(0, pct1))}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold tabular-nums ${
                              isDraw ? 'text-green-600' : team1Better ? 'text-green-400' : 'text-green-700'
                            }`}>
                              {team1Better && !isDraw && <span className="text-yellow-400 mr-1">*</span>}
                              {formatValue(val1, metric.format)}
                            </span>
                          </div>

                          {/* Metric Label */}
                          <div className="col-span-1 text-center">
                            <p className="text-xs font-medium text-green-500">{metric.label}</p>
                            <p className="text-[9px] text-green-800 hidden md:block">{metric.description}</p>
                          </div>

                          {/* Team 2 Value */}
                          <div className="col-span-3 flex items-center justify-between">
                            <span className={`text-sm font-bold tabular-nums ${
                              isDraw ? 'text-green-600' : team2Better ? 'text-green-400' : 'text-green-700'
                            }`}>
                              {formatValue(val2, metric.format)}
                              {team2Better && !isDraw && <span className="text-yellow-400 ml-1">*</span>}
                            </span>
                            <div className="flex-1 h-2 bg-green-900/50 overflow-hidden ml-2">
                              <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, pct2))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-[10px] text-green-700 pt-2">
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">*</span> ADVANTAGE
              </span>
              <span>Bars show league percentile</span>
            </div>
          </div>
        )}

        {/* Empty State - Compare Mode */}
        {viewMode === 'compare' && (!team1 || !team2) && !comparing && (
          <div className="text-center py-12 border border-green-900 bg-green-900/10">
            <div className="text-green-700">
              <div className="text-green-600 text-xs mb-4">// AWAITING_INPUT</div>
              <p className="text-lg font-medium text-green-500 mb-1">SELECT_TWO_TEAMS</p>
              <p className="text-xs">Search and select teams above to compare their stats</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-green-900/50 py-6 mt-12">
        <div className="text-center text-green-800 text-[10px]">
          TTLU_TERMINAL v2.1.0 | RESEARCH_MODULE
        </div>
      </div>
    </main>
  );
}

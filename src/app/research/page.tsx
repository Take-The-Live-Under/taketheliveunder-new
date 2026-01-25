'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  rank: number;
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

interface MetricConfig {
  key: keyof TeamStats;
  label: string;
  description: string;
  format: 'percent' | 'decimal' | 'number' | 'rank';
  higherIsBetter: boolean;
  category: string;
}

const METRICS: MetricConfig[] = [
  // Tempo & Scoring
  { key: 'pace', label: 'Pace', description: 'Possessions per game', format: 'decimal', higherIsBetter: true, category: 'Tempo & Scoring' },
  { key: 'avg_ppg', label: 'PPG', description: 'Points per game', format: 'decimal', higherIsBetter: true, category: 'Tempo & Scoring' },
  { key: 'avg_ppm', label: 'PPM', description: 'Points per minute', format: 'decimal', higherIsBetter: true, category: 'Tempo & Scoring' },

  // Efficiency
  { key: 'off_efficiency', label: 'Off Eff', description: 'Points per 100 possessions', format: 'decimal', higherIsBetter: true, category: 'Efficiency' },

  // Shooting
  { key: 'fg_pct', label: 'FG%', description: 'Field Goal Percentage', format: 'percent', higherIsBetter: true, category: 'Shooting' },
  { key: 'efg_pct', label: 'eFG%', description: 'Effective FG% (accounts for 3s)', format: 'percent', higherIsBetter: true, category: 'Shooting' },
  { key: 'ts_pct', label: 'TS%', description: 'True Shooting %', format: 'percent', higherIsBetter: true, category: 'Shooting' },
  { key: 'three_p_pct', label: '3P%', description: '3-Point Percentage', format: 'percent', higherIsBetter: true, category: 'Shooting' },
  { key: 'three_p_rate', label: '3P Rate', description: '3PA / FGA', format: 'percent', higherIsBetter: true, category: 'Shooting' },
  { key: 'ft_pct', label: 'FT%', description: 'Free Throw Percentage', format: 'percent', higherIsBetter: true, category: 'Shooting' },

  // Rebounding
  { key: 'oreb_pct', label: 'OReb%', description: 'Offensive Rebound Rate', format: 'percent', higherIsBetter: true, category: 'Rebounding' },
  { key: 'dreb_pct', label: 'DReb%', description: 'Defensive Rebound Rate', format: 'percent', higherIsBetter: true, category: 'Rebounding' },

  // Ball Control
  { key: 'assists_per_game', label: 'APG', description: 'Assists per game', format: 'decimal', higherIsBetter: true, category: 'Ball Control' },
  { key: 'to_rate', label: 'TO/G', description: 'Turnovers per game', format: 'decimal', higherIsBetter: false, category: 'Ball Control' },
  { key: 'ast_to_ratio', label: 'AST/TO', description: 'Assist to Turnover Ratio', format: 'decimal', higherIsBetter: true, category: 'Ball Control' },

  // Defense
  { key: 'steals_per_game', label: 'SPG', description: 'Steals per game', format: 'decimal', higherIsBetter: true, category: 'Defense' },
  { key: 'blocks_per_game', label: 'BPG', description: 'Blocks per game', format: 'decimal', higherIsBetter: true, category: 'Defense' },
  { key: 'fouls_per_game', label: 'Fouls', description: 'Fouls per game', format: 'decimal', higherIsBetter: false, category: 'Defense' },

  // Rankings
  { key: 'espn_rank', label: 'AP Rank', description: 'AP Poll Ranking', format: 'rank', higherIsBetter: false, category: 'Rankings' },
];

const CATEGORIES = Array.from(new Set(METRICS.map(m => m.category)));

function formatValue(value: number, format: MetricConfig['format']): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'decimal':
      return value.toFixed(1);
    case 'rank':
      return `#${value}`;
    case 'number':
    default:
      return value.toFixed(0);
  }
}

export default function ResearchPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [team1Search, setTeam1Search] = useState('');
  const [team2Search, setTeam2Search] = useState('');
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [team1Stats, setTeam1Stats] = useState<TeamStats | null>(null);
  const [team2Stats, setTeam2Stats] = useState<TeamStats | null>(null);
  const [showTeam1Dropdown, setShowTeam1Dropdown] = useState(false);
  const [showTeam2Dropdown, setShowTeam2Dropdown] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(CATEGORIES));
  const [comparing, setComparing] = useState(false);

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

  // Fetch comparison stats when both teams selected
  const fetchComparison = useCallback(async () => {
    if (!team1 || !team2) return;

    setComparing(true);
    try {
      const res = await fetch(`/api/teams?team1=${encodeURIComponent(team1.name)}&team2=${encodeURIComponent(team2.name)}`);
      const data = await res.json();
      if (data.team1 && data.team2) {
        setTeam1Stats(data.team1);
        setTeam2Stats(data.team2);
      }
    } catch (error) {
      console.error('Error fetching comparison:', error);
    } finally {
      setComparing(false);
    }
  }, [team1, team2]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  // Filter teams based on search
  const filteredTeams1 = teams.filter(t =>
    t.name.toLowerCase().includes(team1Search.toLowerCase())
  ).slice(0, 10);

  const filteredTeams2 = teams.filter(t =>
    t.name.toLowerCase().includes(team2Search.toLowerCase())
  ).slice(0, 10);

  const toggleCategory = (category: string) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedCategories(newSet);
  };

  const visibleMetrics = METRICS.filter(m => selectedCategories.has(m.category));

  return (
    <main className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="TakeTheLiveUnder"
                width={140}
                height={56}
                className="h-10 w-auto"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Live Games
              </Link>
              <span className="text-sm font-medium text-orange-400">Research</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Team Research</h1>
          <p className="text-slate-400 text-sm">
            Compare any two NCAA teams head-to-head on KenPom & ESPN metrics
          </p>
        </div>

        {/* Team Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Team 1 Selector */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-400 mb-2">Team 1</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search teams..."
                value={team1 ? team1.name : team1Search}
                onChange={(e) => {
                  setTeam1Search(e.target.value);
                  setTeam1(null);
                  setShowTeam1Dropdown(true);
                }}
                onFocus={() => setShowTeam1Dropdown(true)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
              />
              {team1 && (
                <button
                  onClick={() => {
                    setTeam1(null);
                    setTeam1Search('');
                    setTeam1Stats(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {showTeam1Dropdown && !team1 && team1Search && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredTeams1.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTeam1(t);
                      setTeam1Search('');
                      setShowTeam1Dropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span>{t.name}</span>
                    {t.rank && t.rank < 100 && (
                      <span className="text-xs text-slate-500">#{t.rank}</span>
                    )}
                  </button>
                ))}
                {filteredTeams1.length === 0 && (
                  <div className="px-4 py-2 text-sm text-slate-500">No teams found</div>
                )}
              </div>
            )}
          </div>

          {/* Team 2 Selector */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-400 mb-2">Team 2</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search teams..."
                value={team2 ? team2.name : team2Search}
                onChange={(e) => {
                  setTeam2Search(e.target.value);
                  setTeam2(null);
                  setShowTeam2Dropdown(true);
                }}
                onFocus={() => setShowTeam2Dropdown(true)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
              />
              {team2 && (
                <button
                  onClick={() => {
                    setTeam2(null);
                    setTeam2Search('');
                    setTeam2Stats(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {showTeam2Dropdown && !team2 && team2Search && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredTeams2.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTeam2(t);
                      setTeam2Search('');
                      setShowTeam2Dropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span>{t.name}</span>
                    {t.rank && t.rank < 100 && (
                      <span className="text-xs text-slate-500">#{t.rank}</span>
                    )}
                  </button>
                ))}
                {filteredTeams2.length === 0 && (
                  <div className="px-4 py-2 text-sm text-slate-500">No teams found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">Stat Categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategories.has(cat)
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Results */}
        {team1Stats && team2Stats ? (
          <div className="space-y-4">
            {/* Team Headers */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{team1Stats.team_name}</p>
                <p className="text-sm text-slate-500">
                  {team1Stats.espn_rank && team1Stats.espn_rank < 26 ? (
                    <span className="text-orange-400 font-medium">#{team1Stats.espn_rank} </span>
                  ) : ''}
                  {team1Stats.record || `${team1Stats.games_played} games`}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-600">VS</span>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{team2Stats.team_name}</p>
                <p className="text-sm text-slate-500">
                  {team2Stats.espn_rank && team2Stats.espn_rank < 26 ? (
                    <span className="text-orange-400 font-medium">#{team2Stats.espn_rank} </span>
                  ) : ''}
                  {team2Stats.record || `${team2Stats.games_played} games`}
                </p>
              </div>
            </div>

            {/* Stats by Category */}
            {CATEGORIES.filter(cat => selectedCategories.has(cat)).map((category) => {
              const categoryMetrics = visibleMetrics.filter(m => m.category === category);
              if (categoryMetrics.length === 0) return null;

              return (
                <div key={category} className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                    <h3 className="text-sm font-semibold text-white">{category}</h3>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {categoryMetrics.map((metric) => {
                      const val1 = team1Stats[metric.key] as number;
                      const val2 = team2Stats[metric.key] as number;

                      const team1Better = metric.higherIsBetter ? val1 > val2 : val1 < val2;
                      const team2Better = metric.higherIsBetter ? val2 > val1 : val2 < val1;
                      const isDraw = val1 === val2;

                      return (
                        <div key={metric.key} className="grid grid-cols-3 gap-4 px-4 py-3">
                          <div className="text-right">
                            <span className={`text-sm font-medium ${
                              isDraw ? 'text-slate-300' :
                              team1Better ? 'text-green-400' : 'text-slate-400'
                            }`}>
                              {formatValue(val1, metric.format)}
                            </span>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-slate-300">{metric.label}</p>
                            <p className="text-xs text-slate-500">{metric.description}</p>
                          </div>
                          <div className="text-left">
                            <span className={`text-sm font-medium ${
                              isDraw ? 'text-slate-300' :
                              team2Better ? 'text-green-400' : 'text-slate-400'
                            }`}>
                              {formatValue(val2, metric.format)}
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
            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-500/30"></span>
                Advantage
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-700"></span>
                Neutral
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            {comparing ? (
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                <span>Loading comparison...</span>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                <span>Loading teams...</span>
              </div>
            ) : (
              <div className="text-slate-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg font-medium mb-1">Select two teams to compare</p>
                <p className="text-sm">Search and select teams above to see head-to-head stats</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

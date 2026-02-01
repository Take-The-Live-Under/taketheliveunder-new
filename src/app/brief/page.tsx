'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Game } from '@/types/game';
import { Matchup, TeamStats } from '@/types/team';
import GameDetailModal from '@/components/GameDetailModal';

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
        fetch('/api/games'),
        fetch('/api/matchups')
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
      console.error('Error fetching data:', error);
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
      setVisibleSections(prev => {
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
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const upcomingGames = games.filter(g => g.status === 'pre');
  const liveGames = games.filter(g => g.status === 'in');
  const triggeredGames = games.filter(g => g.triggerType !== null);

  // Get matchup data for a game
  const getMatchup = (gameId: string): Matchup | undefined => {
    return matchups.find(m => m.gameId === gameId);
  };

  // High O/U lines (potential trigger candidates)
  const highOUGames = upcomingGames
    .filter(g => g.ouLine !== null && g.ouLine >= 150)
    .sort((a, b) => (b.ouLine ?? 0) - (a.ouLine ?? 0))
    .slice(0, 8);

  // Low O/U lines
  const lowOUGames = upcomingGames
    .filter(g => g.ouLine !== null && g.ouLine <= 140)
    .sort((a, b) => (a.ouLine ?? 0) - (b.ouLine ?? 0))
    .slice(0, 8);

  // Games closest to triggering (live games sorted by PPM gap)
  const closeToTrigger = liveGames
    .filter(g => g.currentPPM !== null && g.requiredPPM !== null)
    .map(g => ({
      ...g,
      ppmGap: Math.abs((g.currentPPM ?? 0) - (g.requiredPPM ?? 0))
    }))
    .sort((a, b) => a.ppmGap - b.ppmGap)
    .slice(0, 5);

  // Format stat value
  const formatStat = (value: number | null, decimals: number = 1): string => {
    if (value === null) return '—';
    return value.toFixed(decimals);
  };

  // Stat comparison row
  const StatRow = ({ label, away, home, higherIsBetter = true }: {
    label: string;
    away: number | null;
    home: number | null;
    higherIsBetter?: boolean;
  }) => {
    const awayBetter = away !== null && home !== null &&
      (higherIsBetter ? away > home : away < home);
    const homeBetter = away !== null && home !== null &&
      (higherIsBetter ? home > away : home < away);

    return (
      <div className="flex items-center justify-between text-[10px] py-0.5">
        <span className={`w-16 text-right ${awayBetter ? 'text-green-400 font-bold' : 'text-green-600'}`}>
          {formatStat(away)}
        </span>
        <span className="text-green-700 flex-1 text-center">{label}</span>
        <span className={`w-16 text-left ${homeBetter ? 'text-green-400 font-bold' : 'text-green-600'}`}>
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
        <div className="text-[10px] text-green-700 text-center py-2">
          // TEAM_STATS_UNAVAILABLE
        </div>
      );
    }

    return (
      <div className="border-t border-green-900/50 pt-2 mt-2">
        <div className="flex justify-between text-[10px] text-green-500 mb-2 px-2">
          <span>{matchup.awayTeam.split(' ').slice(-1)[0]}</span>
          <span className="text-green-700">TEAM_STATS</span>
          <span>{matchup.homeTeam.split(' ').slice(-1)[0]}</span>
        </div>

        <div className="space-y-0.5 px-2">
          <StatRow label="PACE" away={awayStats?.pace ?? null} home={homeStats?.pace ?? null} />
          <StatRow label="OFF_EFF" away={awayStats?.off_efficiency ?? null} home={homeStats?.off_efficiency ?? null} />
          <StatRow label="DEF_EFF" away={awayStats?.def_efficiency ?? null} home={homeStats?.def_efficiency ?? null} higherIsBetter={false} />
          <StatRow label="PPG" away={awayStats?.avg_ppg ?? null} home={homeStats?.avg_ppg ?? null} />
          <StatRow label="3P_RATE" away={awayStats?.three_p_rate ?? null} home={homeStats?.three_p_rate ?? null} />
          <StatRow label="FT_RATE" away={awayStats?.ft_rate ?? null} home={homeStats?.ft_rate ?? null} />
        </div>

        {/* Pace Analysis */}
        {awayStats?.pace && homeStats?.pace && (
          <div className="mt-2 px-2 py-1.5 bg-black/30 border border-green-900/30">
            <div className="text-[10px] text-blue-400 mb-1">// PACE_ANALYSIS</div>
            <div className="text-[10px] text-green-500">
              {(() => {
                const avgPace = (awayStats.pace + homeStats.pace) / 2;
                const paceLabel = avgPace >= 72 ? 'FAST' : avgPace >= 68 ? 'AVERAGE' : 'SLOW';
                const expectedPts = avgPace * 1.1; // Rough estimate
                return (
                  <>
                    Combined Pace: <span className={avgPace >= 72 ? 'text-orange-400' : avgPace >= 68 ? 'text-yellow-400' : 'text-green-400'}>{avgPace.toFixed(1)}</span>
                    <span className="text-green-700 ml-2">({paceLabel})</span>
                    <div className="text-green-600 mt-0.5">
                      Expected tempo favors: {avgPace >= 70 ? 'OVER' : 'UNDER'} plays
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

  const GameRow = ({ game, highlight, showStats = false }: { game: Game; highlight?: string; showStats?: boolean }) => {
    const matchup = getMatchup(game.id);
    const isExpanded = expandedGame === game.id;

    return (
      <div className={`bg-black/30 border border-green-900/30 ${
        game.triggerType ? 'border-l-2 border-l-green-500' : ''
      }`}>
        <button
          onClick={() => {
            if (showStats && game.status === 'pre') {
              setExpandedGame(isExpanded ? null : game.id);
            } else {
              setSelectedGame(game);
            }
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-green-900/20 transition-all text-left"
        >
          <div className="flex-1">
            <span className="text-green-400">{game.awayTeam}</span>
            <span className="text-green-700 mx-1">@</span>
            <span className="text-green-400">{game.homeTeam}</span>
            {game.status === 'in' && (
              <span className="ml-2 text-[10px] text-green-600">
                ({game.awayScore}-{game.homeScore})
              </span>
            )}
            {game.status === 'pre' && (
              <span className="ml-2 text-[10px] text-green-700">
                {new Date(game.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {highlight && (
              <span className={`font-bold ${
                highlight === 'high' ? 'text-orange-400' :
                highlight === 'low' ? 'text-green-500' :
                'text-yellow-400'
              }`}>
                {game.ouLine?.toFixed(1)}
              </span>
            )}
            {game.triggerType && (
              <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                game.triggerType === 'over' ? 'bg-orange-900/50 text-orange-400' :
                game.triggerType === 'tripleDipper' ? 'bg-yellow-900/50 text-yellow-400' :
                'bg-green-900/50 text-green-400'
              }`}>
                {game.triggerType === 'over' ? 'OVER' :
                 game.triggerType === 'tripleDipper' ? 'TRIPLE' : 'UNDER'}
              </span>
            )}
            {showStats && game.status === 'pre' ? (
              <span className="text-green-700">{isExpanded ? '▼' : '▶'}</span>
            ) : (
              <span className="text-green-700">→</span>
            )}
          </div>
        </button>

        {/* Expanded stats panel */}
        {isExpanded && matchup && (
          <div className="px-3 pb-3">
            <TeamStatsPanel matchup={matchup} />
            <button
              onClick={() => setSelectedGame(game)}
              className="mt-2 w-full text-[10px] text-green-600 hover:text-green-400 py-1 border border-green-900/50 hover:border-green-700/50 transition-colors"
            >
              VIEW_FULL_DETAILS →
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-green-400 font-mono">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-green-900/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-green-700 hover:text-green-400 transition-colors">
                ← BACK
              </Link>
              <div className="w-px h-4 bg-green-900"></div>
              <span className="text-lg font-bold text-green-400">DAILY_BRIEF</span>
            </div>
            <div className="flex items-center gap-3">
              {isRefreshing && (
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              )}
              <span className="text-xs text-green-700">{dateStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-green-600 text-sm">LOADING_BRIEF...</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            {visibleSections >= 1 && (
              <div className="animate-fade-in">
                <div className="text-blue-400 text-xs mb-3">{'>'} SITUATION_OVERVIEW</div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="border border-green-900/50 p-3 bg-black/30 text-center">
                    <div className="text-2xl font-bold text-green-400">{games.length}</div>
                    <div className="text-[10px] text-green-700">TOTAL</div>
                  </div>
                  <div className="border border-green-900/50 p-3 bg-black/30 text-center">
                    <div className="text-2xl font-bold text-blue-400">{liveGames.length}</div>
                    <div className="text-[10px] text-green-700">LIVE</div>
                  </div>
                  <div className="border border-green-900/50 p-3 bg-black/30 text-center">
                    <div className="text-2xl font-bold text-yellow-400">{triggeredGames.length}</div>
                    <div className="text-[10px] text-green-700">TRIGGERS</div>
                  </div>
                  <div className="border border-green-900/50 p-3 bg-black/30 text-center">
                    <div className="text-2xl font-bold text-green-500">{upcomingGames.length}</div>
                    <div className="text-[10px] text-green-700">UPCOMING</div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Triggers */}
            {visibleSections >= 2 && triggeredGames.length > 0 && (
              <div className="animate-fade-in">
                <div className="text-blue-400 text-xs mb-3">{'>'} ACTIVE_TRIGGERS</div>
                <div className="border border-green-500/50 bg-green-900/10 p-1 space-y-1">
                  {triggeredGames.map(game => (
                    <GameRow key={game.id} game={game} />
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-green-700 px-1">
                  // Click any game for detailed analysis
                </div>
              </div>
            )}

            {/* Close to Triggering */}
            {visibleSections >= 3 && closeToTrigger.length > 0 && (
              <div className="animate-fade-in">
                <div className="text-blue-400 text-xs mb-3">{'>'} APPROACHING_TRIGGER</div>
                <div className="space-y-1">
                  {closeToTrigger.map(game => (
                    <div key={game.id} className="relative">
                      <GameRow game={game} />
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-yellow-500">
                        GAP: {game.ppmGap.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High O/U Watch - with stats */}
            {visibleSections >= 4 && highOUGames.length > 0 && (
              <div className="animate-fade-in">
                <div className="text-blue-400 text-xs mb-3">
                  {'>'} HIGH_OU_TARGETS <span className="text-orange-400">(Watch for OVER)</span>
                  <span className="text-green-700 ml-2">// tap to expand stats</span>
                </div>
                <div className="space-y-1">
                  {highOUGames.map(game => (
                    <GameRow key={game.id} game={game} highlight="high" showStats={true} />
                  ))}
                </div>
              </div>
            )}

            {/* Low O/U Watch - with stats */}
            {visibleSections >= 5 && lowOUGames.length > 0 && (
              <div className="animate-fade-in">
                <div className="text-blue-400 text-xs mb-3">
                  {'>'} LOW_OU_TARGETS <span className="text-green-400">(Watch for UNDER)</span>
                  <span className="text-green-700 ml-2">// tap to expand stats</span>
                </div>
                <div className="space-y-1">
                  {lowOUGames.map(game => (
                    <GameRow key={game.id} game={game} highlight="low" showStats={true} />
                  ))}
                </div>
              </div>
            )}

            {/* Trigger Parameters */}
            {visibleSections >= 6 && (
              <div className="animate-fade-in">
                <div className="text-blue-400 text-xs mb-3">{'>'} TRIGGER_PARAMETERS</div>
                <div className="border border-green-900/50 bg-black/30 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-orange-400 text-lg">▸</span>
                    <div>
                      <div className="text-orange-400 font-bold text-sm">OVER_SIGNAL</div>
                      <div className="text-green-600 text-xs">Game minute 20-30, PPM gap ≥ +0.3</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-400 text-lg">▸</span>
                    <div>
                      <div className="text-yellow-400 font-bold text-sm">TRIPLE_DIPPER</div>
                      <div className="text-green-600 text-xs">Required PPM ≥ 4.5, PPM gap ≤ -1.0</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 text-lg">▸</span>
                    <div>
                      <div className="text-green-400 font-bold text-sm">GOLDEN_ZONE</div>
                      <div className="text-green-600 text-xs">PPM difference in sweet spot 1.0-1.5</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-900/50 text-center">
                  <div className="text-green-400 text-sm font-bold">GOOD HUNTING, OPERATOR</div>
                  <div className="text-green-700 text-[10px] mt-1">// END_BRIEFING</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Game Detail Modal */}
      {selectedGame && (
        <GameDetailModal
          game={games.find(g => g.id === selectedGame.id) || selectedGame}
          isOpen={!!selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </main>
  );
}

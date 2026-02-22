'use client';

import { useEffect, useState, useCallback } from 'react';
import { Game } from '@/types/game';
import GameCharts from './GameCharts';

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
}

export default function GameDetailModal({ game, isOpen, onClose }: GameDetailModalProps) {
  const [details, setDetails] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'charts' | 'stats' | 'players' | 'refs'>('charts');

  const fetchDetails = useCallback(async () => {
    if (!isOpen || !game.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/game-details?gameId=${game.id}`);
      if (!response.ok) throw new Error('Failed to fetch game details');
      const data = await response.json();
      setDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [isOpen, game.id]);

  // Fetch on open and refresh every 30 seconds
  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 30000);
    return () => clearInterval(interval);
  }, [fetchDetails]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const awayTeam = details?.teamStats?.find(t => !t.isHome);
  const homeTeam = details?.teamStats?.find(t => t.isHome);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center font-mono">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-[#0a0a0a] border border-green-900 terminal-glow-box animate-slide-up overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-green-900 p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {game.status === 'in' && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 border border-green-700 bg-green-900/30">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <span className="text-xs font-medium text-green-400">LIVE</span>
                </span>
              )}
              {game.status === 'pre' && (
                <span className="px-2 py-0.5 border border-green-900 text-xs text-green-600">
                  UPCOMING
                </span>
              )}
              {game.status === 'post' && (
                <span className="px-2 py-0.5 border border-green-900 text-xs text-green-600">
                  FINAL
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-green-700 hover:text-green-400 hover:bg-green-900/30 transition-colors tap-target"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-xs text-green-700 mb-1">{game.awayTeam}</p>
              <p className="text-2xl font-bold text-green-400">{game.awayScore}</p>
              {awayTeam?.bonusStatus.label && (
                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium border ${
                  awayTeam.bonusStatus.inDoubleBonus
                    ? 'border-red-700 text-red-400'
                    : 'border-yellow-700 text-yellow-400'
                }`}>
                  {awayTeam.bonusStatus.label}
                </span>
              )}
            </div>
            <div className="px-4">
              <p className="text-green-800 text-xs">@</p>
              {game.status === 'in' && (
                <p className="text-[10px] text-green-600 mt-1">
                  {details?.period === 1 ? 'H1' : details?.period === 2 ? 'H2' : `OT${(details?.period || 3) - 2}`} {details?.clock}
                </p>
              )}
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-green-700 mb-1">{game.homeTeam}</p>
              <p className="text-2xl font-bold text-green-400">{game.homeScore}</p>
              {homeTeam?.bonusStatus.label && (
                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium border ${
                  homeTeam.bonusStatus.inDoubleBonus
                    ? 'border-red-700 text-red-400'
                    : 'border-yellow-700 text-yellow-400'
                }`}>
                  {homeTeam.bonusStatus.label}
                </span>
              )}
            </div>
          </div>

          {/* O/U Line */}
          {game.ouLine && (
            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
              <span className="text-green-700">O/U: <span className="text-green-400">{game.ouLine}</span></span>
              <span className="text-green-700">TOTAL: <span className="text-green-400">{game.liveTotal}</span></span>
              {game.requiredPPM && game.currentPPM && (
                <span className={`${
                  game.requiredPPM - game.currentPPM > 1 ? 'text-yellow-400' :
                  game.requiredPPM - game.currentPPM < -0.5 ? 'text-green-500' : 'text-green-600'
                }`}>
                  EDGE: {(game.requiredPPM - game.currentPPM).toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-4 border border-green-900 p-1">
            <button
              onClick={() => setActiveTab('charts')}
              className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
                activeTab === 'charts'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:text-green-400'
              }`}
            >
              CHARTS
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:text-green-400'
              }`}
            >
              STATS
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
                activeTab === 'players'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:text-green-400'
              }`}
            >
              PLAYERS
            </button>
            <button
              onClick={() => setActiveTab('refs')}
              className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
                activeTab === 'refs'
                  ? 'bg-green-500 text-black'
                  : 'text-green-600 hover:text-green-400'
              }`}
            >
              REFS
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && !details && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-400 text-xs">// ERROR: {error}</p>
              <button
                onClick={fetchDetails}
                className="mt-4 px-4 py-2 border border-green-700 text-green-400 text-xs hover:bg-green-900/30"
              >
                RETRY
              </button>
            </div>
          )}

          {/* Charts Tab - doesn't depend on details loading */}
          {activeTab === 'charts' && (
            <GameCharts gameId={game.id} currentOULine={game.ouLine} game={game} />
          )}

          {details && !loading && (
            <>
              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  {/* Fouls Section - Highlighted */}
                  <div className="bg-green-900/20 border border-green-900 p-4">
                    <h3 className="text-xs font-semibold text-green-400 mb-3">// TEAM_FOULS</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-400">{awayTeam?.stats.fouls || 0}</p>
                        <p className="text-[10px] text-green-700">{awayTeam?.abbreviation}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-green-800">vs</span>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-400">{homeTeam?.stats.fouls || 0}</p>
                        <p className="text-[10px] text-green-700">{homeTeam?.abbreviation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Shooting Stats */}
                  <div className="bg-green-900/20 border border-green-900 p-4">
                    <h3 className="text-xs font-semibold text-green-400 mb-3">// SHOOTING</h3>
                    <div className="space-y-3">
                      <StatRow
                        label="FG"
                        away={awayTeam?.stats.fieldGoals || '0-0'}
                        home={homeTeam?.stats.fieldGoals || '0-0'}
                        awayPct={awayTeam?.stats.fieldGoalPct || 0}
                        homePct={homeTeam?.stats.fieldGoalPct || 0}
                      />
                      <StatRow
                        label="3PT"
                        away={awayTeam?.stats.threePointers || '0-0'}
                        home={homeTeam?.stats.threePointers || '0-0'}
                        awayPct={awayTeam?.stats.threePointPct || 0}
                        homePct={homeTeam?.stats.threePointPct || 0}
                      />
                      <StatRow
                        label="FT"
                        away={awayTeam?.stats.freeThrows || '0-0'}
                        home={homeTeam?.stats.freeThrows || '0-0'}
                        awayPct={awayTeam?.stats.freeThrowPct || 0}
                        homePct={homeTeam?.stats.freeThrowPct || 0}
                      />
                    </div>
                  </div>

                  {/* Other Stats */}
                  <div className="bg-green-900/20 border border-green-900 p-4">
                    <h3 className="text-xs font-semibold text-green-400 mb-3">// GAME_STATS</h3>
                    <div className="space-y-2">
                      <SimpleStatRow label="REB" away={awayTeam?.stats.rebounds || 0} home={homeTeam?.stats.rebounds || 0} />
                      <SimpleStatRow label="AST" away={awayTeam?.stats.assists || 0} home={homeTeam?.stats.assists || 0} />
                      <SimpleStatRow label="TOV" away={awayTeam?.stats.turnovers || 0} home={homeTeam?.stats.turnovers || 0} inverted />
                      <SimpleStatRow label="STL" away={awayTeam?.stats.steals || 0} home={homeTeam?.stats.steals || 0} />
                      <SimpleStatRow label="BLK" away={awayTeam?.stats.blocks || 0} home={homeTeam?.stats.blocks || 0} />
                      <SimpleStatRow label="PAINT" away={awayTeam?.stats.pointsInPaint || 0} home={homeTeam?.stats.pointsInPaint || 0} />
                      <SimpleStatRow label="FSTBRK" away={awayTeam?.stats.fastBreakPoints || 0} home={homeTeam?.stats.fastBreakPoints || 0} />
                    </div>
                  </div>
                </div>
              )}

              {/* Players Tab */}
              {activeTab === 'players' && (
                <div className="space-y-4">
                  {details.topPlayers.map((team, idx) => (
                    <div key={idx} className="bg-green-900/20 border border-green-900 p-4">
                      <h3 className="text-xs font-semibold text-green-400 mb-3">// {team.teamName.toUpperCase().replace(/ /g, '_')}</h3>
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-2 text-[10px] text-green-700 pb-2 border-b border-green-900/50">
                          <span className="col-span-2">PLAYER</span>
                          <span className="text-center">PTS</span>
                          <span className="text-center">REB</span>
                          <span className="text-center">PF</span>
                        </div>
                        {team.players.map((player, pIdx) => (
                          <div key={pIdx} className="grid grid-cols-5 gap-2 text-xs">
                            <span className="col-span-2 text-green-500 truncate">
                              {player.jersey && <span className="text-green-800 mr-1">#{player.jersey}</span>}
                              {player.name}
                            </span>
                            <span className="text-center text-green-400 font-medium">{player.points}</span>
                            <span className="text-center text-green-600">{player.rebounds}</span>
                            <span className={`text-center ${player.fouls >= 4 ? 'text-red-400 font-medium' : 'text-green-600'}`}>
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
              {activeTab === 'refs' && (
                <div className="space-y-4">
                  {/* Crew Summary */}
                  {details.crewAvgFouls !== null && (
                    <div className="bg-green-900/20 border border-green-900 p-4">
                      <h3 className="text-xs font-semibold text-green-400 mb-3">// CREW_AVG</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-bold text-green-400">
                            {details.crewAvgFouls.toFixed(1)}
                            <span className="text-xs text-green-700 ml-1">fouls/game</span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium border ${
                          details.crewStyle === 'Tight'
                            ? 'border-red-700 text-red-400'
                            : details.crewStyle === 'Loose'
                            ? 'border-green-700 text-green-400'
                            : 'border-green-900 text-green-600'
                        }`}>
                          {details.crewStyle || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Individual Refs */}
                  <div className="bg-green-900/20 border border-green-900 p-4">
                    <h3 className="text-xs font-semibold text-green-400 mb-3">// OFFICIALS</h3>
                    <div className="space-y-3">
                      {details.officials.length === 0 && (
                        <p className="text-xs text-green-700">No referee data available</p>
                      )}
                      {details.officials.map((ref, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-green-900/50 last:border-0">
                          <div>
                            <p className="text-xs text-green-400">{ref.name}</p>
                            {ref.foulsPerGame !== null && (
                              <p className="text-[10px] text-green-700">
                                {ref.foulsPerGame.toFixed(1)} fouls/game
                                {ref.homeBias !== null && ref.homeBias !== 0 && (
                                  <span className={ref.homeBias > 0 ? 'text-yellow-500' : 'text-green-500'}>
                                    {' '}| {ref.homeBias > 0 ? '+' : ''}{ref.homeBias.toFixed(1)} HOME_BIAS
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          {ref.style && (
                            <span className={`px-2 py-0.5 text-[10px] font-medium border ${
                              ref.style === 'Tight'
                                ? 'border-red-700 text-red-400'
                                : ref.style === 'Loose'
                                ? 'border-green-700 text-green-400'
                                : 'border-green-900 text-green-600'
                            }`}>
                              {ref.style.toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Venue Info */}
                  {details.venue && (
                    <div className="bg-green-900/20 border border-green-900 p-4">
                      <h3 className="text-xs font-semibold text-green-400 mb-2">// VENUE</h3>
                      <p className="text-xs text-green-500">{details.venue}</p>
                      {details.attendance && (
                        <p className="text-[10px] text-green-700 mt-1">
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

// Helper components for stats display
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
        <span className={`text-xs ${awayBetter ? 'text-green-400 font-medium' : 'text-green-600'}`}>
          {away}
        </span>
        <span className="text-[10px] text-green-800 ml-1">({awayPct}%)</span>
      </div>
      <div className="text-center text-[10px] text-green-700">{label}</div>
      <div className="text-left">
        <span className={`text-xs ${homeBetter ? 'text-green-400 font-medium' : 'text-green-600'}`}>
          {home}
        </span>
        <span className="text-[10px] text-green-800 ml-1">({homePct}%)</span>
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
        <span className={`text-xs ${awayBetter ? 'text-green-400 font-medium' : 'text-green-600'}`}>
          {away}
        </span>
      </div>
      <div className="text-center text-[10px] text-green-700">{label}</div>
      <div className="text-left">
        <span className={`text-xs ${homeBetter ? 'text-green-400 font-medium' : 'text-green-600'}`}>
          {home}
        </span>
      </div>
    </div>
  );
}

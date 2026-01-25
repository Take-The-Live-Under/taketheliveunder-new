'use client';

import { useEffect, useState, useCallback } from 'react';
import { Game } from '@/types/game';

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
  const [activeTab, setActiveTab] = useState<'stats' | 'players' | 'refs'>('stats');

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 shadow-2xl animate-slide-up overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {game.status === 'in' && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                  </span>
                  <span className="text-xs font-medium text-red-400">LIVE</span>
                </span>
              )}
              {game.status === 'pre' && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-400">
                  Upcoming
                </span>
              )}
              {game.status === 'post' && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs text-slate-400">
                  Final
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors tap-target"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-sm text-slate-400 mb-1">{game.awayTeam}</p>
              <p className="text-3xl font-bold text-white">{game.awayScore}</p>
              {awayTeam?.bonusStatus.label && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                  awayTeam.bonusStatus.inDoubleBonus
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {awayTeam.bonusStatus.label}
                </span>
              )}
            </div>
            <div className="px-4">
              <p className="text-slate-500 text-sm">@</p>
              {game.status === 'in' && (
                <p className="text-xs text-slate-400 mt-1">
                  {details?.period === 1 ? '1st' : details?.period === 2 ? '2nd' : `OT${(details?.period || 3) - 2}`} {details?.clock}
                </p>
              )}
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm text-slate-400 mb-1">{game.homeTeam}</p>
              <p className="text-3xl font-bold text-white">{game.homeScore}</p>
              {homeTeam?.bonusStatus.label && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                  homeTeam.bonusStatus.inDoubleBonus
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {homeTeam.bonusStatus.label}
                </span>
              )}
            </div>
          </div>

          {/* O/U Line */}
          {game.ouLine && (
            <div className="mt-3 flex items-center justify-center gap-4 text-sm">
              <span className="text-slate-500">O/U: <span className="text-white">{game.ouLine}</span></span>
              <span className="text-slate-500">Live Total: <span className="text-white">{game.liveTotal}</span></span>
              {game.requiredPPM && game.currentPPM && (
                <span className={`${
                  game.requiredPPM - game.currentPPM > 1 ? 'text-green-400' :
                  game.requiredPPM - game.currentPPM < -0.5 ? 'text-blue-400' : 'text-slate-400'
                }`}>
                  Edge: {(game.requiredPPM - game.currentPPM).toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-4 bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'players'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Players
            </button>
            <button
              onClick={() => setActiveTab('refs')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'refs'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Referees
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && !details && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchDetails}
                className="mt-4 px-4 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600"
              >
                Retry
              </button>
            </div>
          )}

          {details && !loading && (
            <>
              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <div className="space-y-4">
                  {/* Fouls Section - Highlighted */}
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Team Fouls
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{awayTeam?.stats.fouls || 0}</p>
                        <p className="text-xs text-slate-400">{awayTeam?.abbreviation}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-slate-600">vs</span>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{homeTeam?.stats.fouls || 0}</p>
                        <p className="text-xs text-slate-400">{homeTeam?.abbreviation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Shooting Stats */}
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-sm font-semibold text-white mb-3">Shooting</h3>
                    <div className="space-y-3">
                      <StatRow
                        label="Field Goals"
                        away={awayTeam?.stats.fieldGoals || '0-0'}
                        home={homeTeam?.stats.fieldGoals || '0-0'}
                        awayPct={awayTeam?.stats.fieldGoalPct || 0}
                        homePct={homeTeam?.stats.fieldGoalPct || 0}
                      />
                      <StatRow
                        label="3-Pointers"
                        away={awayTeam?.stats.threePointers || '0-0'}
                        home={homeTeam?.stats.threePointers || '0-0'}
                        awayPct={awayTeam?.stats.threePointPct || 0}
                        homePct={homeTeam?.stats.threePointPct || 0}
                      />
                      <StatRow
                        label="Free Throws"
                        away={awayTeam?.stats.freeThrows || '0-0'}
                        home={homeTeam?.stats.freeThrows || '0-0'}
                        awayPct={awayTeam?.stats.freeThrowPct || 0}
                        homePct={homeTeam?.stats.freeThrowPct || 0}
                      />
                    </div>
                  </div>

                  {/* Other Stats */}
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-sm font-semibold text-white mb-3">Game Stats</h3>
                    <div className="space-y-2">
                      <SimpleStatRow label="Rebounds" away={awayTeam?.stats.rebounds || 0} home={homeTeam?.stats.rebounds || 0} />
                      <SimpleStatRow label="Assists" away={awayTeam?.stats.assists || 0} home={homeTeam?.stats.assists || 0} />
                      <SimpleStatRow label="Turnovers" away={awayTeam?.stats.turnovers || 0} home={homeTeam?.stats.turnovers || 0} inverted />
                      <SimpleStatRow label="Steals" away={awayTeam?.stats.steals || 0} home={homeTeam?.stats.steals || 0} />
                      <SimpleStatRow label="Blocks" away={awayTeam?.stats.blocks || 0} home={homeTeam?.stats.blocks || 0} />
                      <SimpleStatRow label="Pts in Paint" away={awayTeam?.stats.pointsInPaint || 0} home={homeTeam?.stats.pointsInPaint || 0} />
                      <SimpleStatRow label="Fast Break Pts" away={awayTeam?.stats.fastBreakPoints || 0} home={homeTeam?.stats.fastBreakPoints || 0} />
                    </div>
                  </div>
                </div>
              )}

              {/* Players Tab */}
              {activeTab === 'players' && (
                <div className="space-y-4">
                  {details.topPlayers.map((team, idx) => (
                    <div key={idx} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                      <h3 className="text-sm font-semibold text-white mb-3">{team.teamName}</h3>
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-2 text-xs text-slate-500 pb-2 border-b border-slate-700">
                          <span className="col-span-2">Player</span>
                          <span className="text-center">PTS</span>
                          <span className="text-center">REB</span>
                          <span className="text-center">PF</span>
                        </div>
                        {team.players.map((player, pIdx) => (
                          <div key={pIdx} className="grid grid-cols-5 gap-2 text-sm">
                            <span className="col-span-2 text-slate-300 truncate">
                              {player.jersey && <span className="text-slate-500 mr-1">#{player.jersey}</span>}
                              {player.name}
                            </span>
                            <span className="text-center text-white font-medium">{player.points}</span>
                            <span className="text-center text-slate-400">{player.rebounds}</span>
                            <span className={`text-center ${player.fouls >= 4 ? 'text-red-400 font-medium' : 'text-slate-400'}`}>
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
                    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                      <h3 className="text-sm font-semibold text-white mb-3">Crew Average</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {details.crewAvgFouls.toFixed(1)}
                            <span className="text-sm text-slate-400 ml-1">fouls/game</span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          details.crewStyle === 'Tight'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : details.crewStyle === 'Loose'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {details.crewStyle || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Individual Refs */}
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-sm font-semibold text-white mb-3">Officials</h3>
                    <div className="space-y-3">
                      {details.officials.length === 0 && (
                        <p className="text-sm text-slate-500">No referee data available</p>
                      )}
                      {details.officials.map((ref, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                          <div>
                            <p className="text-sm text-white">{ref.name}</p>
                            {ref.foulsPerGame !== null && (
                              <p className="text-xs text-slate-400">
                                {ref.foulsPerGame.toFixed(1)} fouls/game
                                {ref.homeBias !== null && ref.homeBias !== 0 && (
                                  <span className={ref.homeBias > 0 ? 'text-orange-400' : 'text-blue-400'}>
                                    {' '}• {ref.homeBias > 0 ? '+' : ''}{ref.homeBias.toFixed(1)} home bias
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                          {ref.style && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              ref.style === 'Tight'
                                ? 'bg-red-500/20 text-red-400'
                                : ref.style === 'Loose'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-slate-700 text-slate-400'
                            }`}>
                              {ref.style}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Venue Info */}
                  {details.venue && (
                    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                      <h3 className="text-sm font-semibold text-white mb-2">Venue</h3>
                      <p className="text-sm text-slate-300">{details.venue}</p>
                      {details.attendance && (
                        <p className="text-xs text-slate-500 mt-1">
                          Attendance: {details.attendance.toLocaleString()}
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
        <span className={`text-sm ${awayBetter ? 'text-green-400 font-medium' : 'text-slate-300'}`}>
          {away}
        </span>
        <span className="text-xs text-slate-500 ml-1">({awayPct}%)</span>
      </div>
      <div className="text-center text-xs text-slate-500">{label}</div>
      <div className="text-left">
        <span className={`text-sm ${homeBetter ? 'text-green-400 font-medium' : 'text-slate-300'}`}>
          {home}
        </span>
        <span className="text-xs text-slate-500 ml-1">({homePct}%)</span>
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
        <span className={`text-sm ${awayBetter ? 'text-green-400 font-medium' : 'text-slate-300'}`}>
          {away}
        </span>
      </div>
      <div className="text-center text-xs text-slate-500">{label}</div>
      <div className="text-left">
        <span className={`text-sm ${homeBetter ? 'text-green-400 font-medium' : 'text-slate-300'}`}>
          {home}
        </span>
      </div>
    </div>
  );
}

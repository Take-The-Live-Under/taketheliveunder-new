'use client';

import { useEffect, useState } from 'react';
import { GamePrediction } from '@/app/api/predictions/route';
import { getTeamBadge } from '@/lib/teamFilters';

interface UpcomingGameDetailModalProps {
  prediction: GamePrediction;
  isOpen: boolean;
  onClose: () => void;
}

interface TeamStats {
  teamName: string;
  rank: number | null;
  adjEM: number | null;
  adjO: number | null;
  adjD: number | null;
  adjT: number | null;
  luck: number | null;
  sos: number | null;
}

function formatGameTime(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

function formatGameDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}

export default function UpcomingGameDetailModal({ prediction, isOpen, onClose }: UpcomingGameDetailModalProps) {
  const [homeStats, setHomeStats] = useState<TeamStats | null>(null);
  const [awayStats, setAwayStats] = useState<TeamStats | null>(null);
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

  // Fetch team stats
  useEffect(() => {
    if (!isOpen) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const [homeRes, awayRes] = await Promise.all([
          fetch(`/api/team-stats?team=${encodeURIComponent(homeTeam)}`),
          fetch(`/api/team-stats?team=${encodeURIComponent(awayTeam)}`),
        ]);

        if (homeRes.ok) {
          const data = await homeRes.json();
          setHomeStats(data);
        }
        if (awayRes.ok) {
          const data = await awayRes.json();
          setAwayStats(data);
        }
      } catch (err) {
        console.error('Error fetching team stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, homeTeam, awayTeam]);

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

  const favorsUnder = lineDiff !== null && lineDiff > 0;
  const favorsOver = lineDiff !== null && lineDiff < 0;
  const lineDiffAbs = lineDiff !== null ? Math.abs(lineDiff) : null;

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
              <span className="px-2 py-0.5 border border-green-700 bg-green-900/30 text-xs text-green-400">
                UPCOMING
              </span>
              <span className="text-xs text-green-700">
                {formatGameDate(gameTime)} {formatGameTime(gameTime)} ET
              </span>
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

          {/* Teams and Projected Scores */}
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              {awayRank && awayRank <= 50 && (
                <p className="text-[10px] text-yellow-500 font-bold mb-0.5">#{awayRank}</p>
              )}
              <p className="text-xs text-green-700 mb-1">{awayTeam}</p>
              {awayBadge && (
                <span className={`inline-block mb-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                  awayBadge.color === 'red' ? 'border-red-700 text-red-400' :
                  awayBadge.color === 'orange' ? 'border-orange-700 text-orange-400' :
                  awayBadge.color === 'blue' ? 'border-blue-700 text-blue-400' :
                  'border-green-700 text-green-400'
                }`}>
                  {awayBadge.text}
                </span>
              )}
              <p className="text-2xl font-bold text-green-400">{kenpomAwayScore.toFixed(0)}</p>
              <p className="text-[10px] text-green-700">PROJECTED</p>
            </div>
            <div className="px-4 text-center">
              <p className="text-green-800 text-xs">@</p>
              <p className="text-[10px] text-green-600 mt-2">{kenpomTempo.toFixed(0)}</p>
              <p className="text-[10px] text-green-800">TEMPO</p>
            </div>
            <div className="flex-1 text-center">
              {homeRank && homeRank <= 50 && (
                <p className="text-[10px] text-yellow-500 font-bold mb-0.5">#{homeRank}</p>
              )}
              <p className="text-xs text-green-700 mb-1">{homeTeam}</p>
              {homeBadge && (
                <span className={`inline-block mb-1 px-1.5 py-0.5 text-[10px] font-bold border ${
                  homeBadge.color === 'red' ? 'border-red-700 text-red-400' :
                  homeBadge.color === 'orange' ? 'border-orange-700 text-orange-400' :
                  homeBadge.color === 'blue' ? 'border-blue-700 text-blue-400' :
                  'border-green-700 text-green-400'
                }`}>
                  {homeBadge.text}
                </span>
              )}
              <p className="text-2xl font-bold text-green-400">{kenpomHomeScore.toFixed(0)}</p>
              <p className="text-[10px] text-green-700">PROJECTED</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* KenPom Signal */}
          {lineDiffAbs !== null && lineDiffAbs >= 3 && (
            <div className={`p-4 border ${
              favorsUnder ? 'bg-blue-900/20 border-blue-800' : 'bg-orange-900/20 border-orange-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${favorsUnder ? 'text-blue-400' : 'text-orange-400'}`}>
                  {favorsUnder ? '❄️ KENPOM FAVORS UNDER' : '🔥 KENPOM FAVORS OVER'}
                </span>
                <span className={`text-lg font-bold ${favorsUnder ? 'text-blue-400' : 'text-orange-400'}`}>
                  {lineDiffAbs.toFixed(1)} pts
                </span>
              </div>
              <p className="text-xs text-green-600">
                KenPom projects {kenpomTotal.toFixed(1)} total points
                {vegasLine && `, Vegas line is ${vegasLine.toFixed(1)}`}
              </p>
            </div>
          )}

          {/* Total Comparison */}
          <div className="bg-green-900/20 border border-green-900 p-4">
            <h3 className="text-xs font-semibold text-green-400 mb-3">// TOTAL_COMPARISON</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[10px] text-green-700 mb-1">KENPOM</p>
                <p className="text-xl font-bold text-green-400">{kenpomTotal.toFixed(1)}</p>
              </div>
              <div className="text-center border-x border-green-900/50">
                <p className="text-[10px] text-green-700 mb-1">VEGAS</p>
                <p className="text-xl font-bold text-green-400">
                  {vegasLine !== null ? vegasLine.toFixed(1) : '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-green-700 mb-1">EDGE</p>
                <p className={`text-xl font-bold ${
                  lineDiffAbs && lineDiffAbs >= 3
                    ? favorsUnder ? 'text-blue-400' : 'text-orange-400'
                    : 'text-green-400'
                }`}>
                  {lineDiff !== null ? (
                    <>{favorsUnder ? '↓' : favorsOver ? '↑' : ''}{lineDiffAbs?.toFixed(1)}</>
                  ) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Win Probability */}
          <div className="bg-green-900/20 border border-green-900 p-4">
            <h3 className="text-xs font-semibold text-green-400 mb-3">// WIN_PROBABILITY</h3>
            <div className="flex items-center justify-between text-xs text-green-600 mb-2">
              <span>{awayTeam.split(' ').pop()}</span>
              <span className={`font-bold ${confidence === 'HIGH' ? 'text-green-400' : 'text-green-600'}`}>
                {confidence} CONFIDENCE
              </span>
              <span>{homeTeam.split(' ').pop()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-green-400 w-12">{(100 - kenpomWinProb).toFixed(0)}%</span>
              <div className="flex-1 h-3 bg-green-900/50 overflow-hidden flex">
                <div
                  className="h-full bg-green-600 transition-all duration-500"
                  style={{ width: `${100 - kenpomWinProb}%` }}
                />
                <div
                  className="h-full bg-green-400 transition-all duration-500"
                  style={{ width: `${kenpomWinProb}%` }}
                />
              </div>
              <span className="text-lg font-bold text-green-400 w-12 text-right">{kenpomWinProb.toFixed(0)}%</span>
            </div>
          </div>

          {/* KenPom Team Stats */}
          {(homeStats || awayStats || loading) && (
            <div className="bg-green-900/20 border border-green-900 p-4">
              <h3 className="text-xs font-semibold text-green-400 mb-3">// KENPOM_RATINGS</h3>

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
                </div>
              )}

              {!loading && (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-5 gap-2 text-[10px] text-green-700 pb-2 border-b border-green-900/50">
                    <span className="col-span-2">TEAM</span>
                    <span className="text-center">OFF</span>
                    <span className="text-center">DEF</span>
                    <span className="text-center">NET</span>
                  </div>

                  {/* Away Team */}
                  <div className="grid grid-cols-5 gap-2 text-xs py-1">
                    <span className="col-span-2 text-green-500 truncate">{awayTeam}</span>
                    <span className="text-center text-green-400">
                      {awayStats?.adjO?.toFixed(1) || '—'}
                    </span>
                    <span className="text-center text-green-400">
                      {awayStats?.adjD?.toFixed(1) || '—'}
                    </span>
                    <span className="text-center font-medium text-green-400">
                      {awayStats?.adjEM?.toFixed(1) || '—'}
                    </span>
                  </div>

                  {/* Home Team */}
                  <div className="grid grid-cols-5 gap-2 text-xs py-1 border-t border-green-900/30">
                    <span className="col-span-2 text-green-500 truncate">{homeTeam}</span>
                    <span className="text-center text-green-400">
                      {homeStats?.adjO?.toFixed(1) || '—'}
                    </span>
                    <span className="text-center text-green-400">
                      {homeStats?.adjD?.toFixed(1) || '—'}
                    </span>
                    <span className="text-center font-medium text-green-400">
                      {homeStats?.adjEM?.toFixed(1) || '—'}
                    </span>
                  </div>

                  <p className="text-[10px] text-green-800 pt-2">
                    OFF = Adj. Offensive Efficiency | DEF = Adj. Defensive Efficiency | NET = Adj. Efficiency Margin
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Game Factors */}
          <div className="bg-green-900/20 border border-green-900 p-4">
            <h3 className="text-xs font-semibold text-green-400 mb-3">// GAME_FACTORS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-green-700 mb-1">PROJECTED TEMPO</p>
                <p className="text-sm font-medium text-green-400">
                  {kenpomTempo.toFixed(1)} possessions
                </p>
                <p className="text-[10px] text-green-700 mt-0.5">
                  {kenpomTempo >= 72 ? 'FAST' : kenpomTempo >= 68 ? 'AVERAGE' : 'SLOW'} pace game
                </p>
              </div>
              <div>
                <p className="text-[10px] text-green-700 mb-1">PROJECTED MARGIN</p>
                <p className="text-sm font-medium text-green-400">
                  {Math.abs(kenpomHomeScore - kenpomAwayScore).toFixed(1)} pts
                </p>
                <p className="text-[10px] text-green-700 mt-0.5">
                  {kenpomHomeScore > kenpomAwayScore ? homeTeam : awayTeam} favored
                </p>
              </div>
            </div>
          </div>

          {/* Betting Insight */}
          {lineDiff !== null && vegasLine !== null && (
            <div className="bg-green-900/20 border border-green-900 p-4">
              <h3 className="text-xs font-semibold text-green-400 mb-3">// BETTING_INSIGHT</h3>
              <p className="text-xs text-green-600 leading-relaxed">
                {lineDiffAbs && lineDiffAbs >= 5 ? (
                  <>
                    <span className={favorsUnder ? 'text-blue-400' : 'text-orange-400'}>Strong edge detected.</span>{' '}
                    KenPom projects {kenpomTotal.toFixed(1)} total, {lineDiffAbs.toFixed(1)} points{' '}
                    {favorsUnder ? 'below' : 'above'} the Vegas line of {vegasLine.toFixed(1)}.
                    {' '}Consider the {favorsUnder ? 'UNDER' : 'OVER'} if line movement confirms.
                  </>
                ) : lineDiffAbs && lineDiffAbs >= 3 ? (
                  <>
                    <span className={favorsUnder ? 'text-blue-400' : 'text-orange-400'}>Moderate edge detected.</span>{' '}
                    KenPom projects {kenpomTotal.toFixed(1)} total, {lineDiffAbs.toFixed(1)} points{' '}
                    {favorsUnder ? 'below' : 'above'} the Vegas line. Monitor for line movement.
                  </>
                ) : (
                  <>
                    No significant edge. KenPom and Vegas are within {lineDiffAbs?.toFixed(1) || 0} points.
                    Look for other factors before betting.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

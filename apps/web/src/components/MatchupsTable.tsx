'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Matchup } from '@/types/team';
import ComparisonModal from './ComparisonModal';

interface MatchupsTableProps {
  initialGameId?: string | null;
}

function getStatusBadge(status: 'pre' | 'in' | 'post') {
  switch (status) {
    case 'in':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
          </span>
          LIVE
        </span>
      );
    case 'post':
      return (
        <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 text-xs font-medium">
          Final
        </span>
      );
    case 'pre':
    default:
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
          Upcoming
        </span>
      );
  }
}

export default function MatchupsTable({ initialGameId }: MatchupsTableProps) {
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatchup, setSelectedMatchup] = useState<Matchup | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const lastFetchRef = useRef<number>(0);

  const fetchMatchups = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) return;
    lastFetchRef.current = now;

    try {
      const response = await fetch('/api/matchups');
      if (!response.ok) throw new Error('Failed to fetch matchups');

      const data = await response.json();
      setMatchups(data.matchups || []);
      setError(null);

      // Auto-open modal if initialGameId is provided
      if (initialGameId && data.matchups) {
        const match = data.matchups.find((m: Matchup) => m.gameId === initialGameId);
        if (match) {
          setSelectedMatchup(match);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [initialGameId]);

  useEffect(() => {
    fetchMatchups();
    const interval = setInterval(fetchMatchups, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchMatchups]);

  // Handle deep link
  useEffect(() => {
    if (initialGameId && matchups.length > 0) {
      const match = matchups.find((m) => m.gameId === initialGameId);
      if (match && !selectedMatchup) {
        setSelectedMatchup(match);
      }
    }
  }, [initialGameId, matchups, selectedMatchup]);

  // Update URL when modal opens/closes
  const handleSelectMatchup = (matchup: Matchup) => {
    setSelectedMatchup(matchup);
    // Update URL without page reload
    window.history.pushState({}, '', `?tab=analysis&game=${matchup.gameId}`);
  };

  const handleCloseModal = () => {
    setSelectedMatchup(null);
    // Remove game from URL
    window.history.pushState({}, '', '?tab=analysis');
  };

  const filteredMatchups = matchups.filter((m) => {
    if (filter === 'live') return m.status === 'in';
    if (filter === 'upcoming') return m.status === 'pre';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-700 rounded"></div>
                <div className="h-4 w-28 bg-gray-700 rounded"></div>
              </div>
              <div className="h-8 w-16 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>Error loading matchups: {error}</p>
        <button
          onClick={() => fetchMatchups()}
          className="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          All ({matchups.length})
        </button>
        <button
          onClick={() => setFilter('live')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'live'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Live ({matchups.filter((m) => m.status === 'in').length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'upcoming'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Upcoming ({matchups.filter((m) => m.status === 'pre').length})
        </button>
      </div>

      {/* Matchups List */}
      {filteredMatchups.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No matchups found for this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatchups.map((matchup) => (
            <button
              key={matchup.gameId}
              onClick={() => handleSelectMatchup(matchup)}
              className="w-full text-left bg-gray-800 hover:bg-gray-750 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getStatusBadge(matchup.status)}
                    {matchup.ouLine && (
                      <span className="text-xs text-yellow-400">
                        O/U {matchup.ouLine.toFixed(1)}
                      </span>
                    )}
                    {matchup.crewStats && matchup.crewStats.foundRefs > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        matchup.crewStats.crewStyle === 'Tight'
                          ? 'bg-red-500/20 text-red-400'
                          : matchup.crewStats.crewStyle === 'Loose'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {matchup.crewStats.crewStyle} Crew
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-100 truncate">
                      {matchup.awayTeam}
                    </span>
                    {matchup.status !== 'pre' && (
                      <span className="text-sm font-bold text-white">
                        {matchup.awayScore}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-100 truncate">
                      {matchup.homeTeam}
                    </span>
                    {matchup.status !== 'pre' && (
                      <span className="text-sm font-bold text-white">
                        {matchup.homeScore}
                      </span>
                    )}
                  </div>
                  {matchup.status === 'pre' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(matchup.startTime).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4">
                  <span className="text-gray-500 group-hover:text-gray-300 transition-colors">
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Comparison Modal */}
      {selectedMatchup && (
        <ComparisonModal
          homeTeam={selectedMatchup.homeTeam}
          awayTeam={selectedMatchup.awayTeam}
          homeStats={selectedMatchup.homeStats}
          awayStats={selectedMatchup.awayStats}
          homeScore={selectedMatchup.homeScore}
          awayScore={selectedMatchup.awayScore}
          ouLine={selectedMatchup.ouLine}
          crewStats={selectedMatchup.crewStats}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

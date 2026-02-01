'use client';

import { useEffect, useState } from 'react';
import { LiveGame, fetchLiveGames, getMockLiveGames } from '@/lib/liveDataService';

interface LiveGameSelectorProps {
  onSelectGame: (game: LiveGame) => void;
  onUseMockData: () => void;
}

export default function LiveGameSelector({ onSelectGame, onUseMockData }: LiveGameSelectorProps) {
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useRealData, setUseRealData] = useState(true);

  useEffect(() => {
    async function loadGames() {
      setLoading(true);
      setError(null);

      try {
        if (useRealData) {
          const games = await fetchLiveGames();
          if (games.length > 0) {
            setLiveGames(games);
          } else {
            // Fallback to mock if no live games
            setLiveGames(getMockLiveGames());
            setError('No live games right now. Showing demo games.');
          }
        } else {
          setLiveGames(getMockLiveGames());
        }
      } catch (err) {
        console.error('Error loading games:', err);
        setLiveGames(getMockLiveGames());
        setError('Could not connect to live data. Showing demo games.');
      }

      setLoading(false);
    }

    loadGames();
  }, [useRealData]);

  const formatGameTime = (game: LiveGame) => {
    const mins = game.minutes_remaining;
    const secs = game.seconds_remaining;
    const period = game.period === 1 ? '1st' : game.period === 2 ? '2nd' : `OT${game.period - 2}`;
    return `${period} - ${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTeamShortName = (fullName: string) => {
    // Get last word (usually the mascot/nickname)
    return fullName.split(' ').pop() || fullName;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🏀</div>
        <h1 className="text-3xl font-bold text-white mb-2">Score Predictor</h1>
        <p className="text-gray-400">Select a live game to play</p>
      </div>

      {/* Data Source Toggle */}
      <div className="flex items-center gap-4 mb-6 bg-slate-800/50 rounded-lg p-2">
        <button
          onClick={() => setUseRealData(true)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            useRealData
              ? 'bg-green-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span className="mr-2">🔴</span> Live Data
        </button>
        <button
          onClick={() => setUseRealData(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            !useRealData
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span className="mr-2">🎮</span> Demo Mode
        </button>
      </div>

      {/* Error/Info Message */}
      {error && (
        <div className="mb-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading games...</span>
        </div>
      ) : (
        /* Game Cards */
        <div className="w-full max-w-lg space-y-3">
          {liveGames.map((game) => (
            <button
              key={game.game_id}
              onClick={() => onSelectGame(game)}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 rounded-xl p-4 border border-slate-600/50 transition-all hover:scale-[1.02] hover:shadow-lg text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-400 uppercase tracking-wider">
                    {game.is_live ? 'Live' : 'Demo'}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {formatGameTime(game)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{getTeamShortName(game.away_team)}</span>
                    <span className="text-2xl font-bold text-white">{game.away_score}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{getTeamShortName(game.home_team)}</span>
                    <span className="text-2xl font-bold text-white">{game.home_score}</span>
                  </div>
                </div>

                <div className="ml-4 pl-4 border-l border-slate-600">
                  <div className="text-center">
                    <div className="text-3xl font-black text-yellow-400">{game.total_points}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Total</div>
                  </div>
                </div>
              </div>

              {/* O/U Line and Confidence */}
              {(game.ou_line || game.confidence_score) && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-600/50">
                  {game.ou_line && (
                    <div className="text-xs">
                      <span className="text-gray-500">O/U Line: </span>
                      <span className="text-white font-medium">{game.ou_line}</span>
                    </div>
                  )}
                  {game.confidence_score && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      game.confidence_score >= 70 ? 'bg-green-500/20 text-green-400' :
                      game.confidence_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {game.confidence_score}% confidence
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}

          {liveGames.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No games available</p>
            </div>
          )}
        </div>
      )}

      {/* Use Duke vs UNC Demo */}
      <button
        onClick={onUseMockData}
        className="mt-6 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
      >
        <span className="mr-2">🎬</span>
        Use Duke vs UNC Replay
      </button>

      <p className="mt-4 text-xs text-gray-600 text-center max-w-sm">
        Live data connects to the Take the Live Under backend.
        Demo mode uses simulated game data.
      </p>
    </div>
  );
}

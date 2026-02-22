'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/game/Header';
import BonusBar from '@/components/game/BonusBar';
import LiveGameSelector from '@/components/game/LiveGameSelector';
import { LiveGame, fetchGameById, convertToPlayByPlay } from '@/lib/liveDataService';

// Lazy load heavy components
const Grid = dynamic(() => import('@/components/game/Grid'), {
  loading: () => <div className="flex-1 flex items-center justify-center text-gray-500">Loading game...</div>,
  ssr: false,
});
const ResultsModal = dynamic(() => import('@/components/game/ResultsModal'), {
  ssr: false,
});

import {
  GAME_DURATION,
  STARTING_FUEL,
  PICK_COST,
  BONUS_DURATION,
  Tile,
  Pick,
  generateGridTiles,
  generateBonusEvent,
  getNextBonusTriggerTime,
  settleGame,
  calculateLiveBoost,
} from '@/lib/gameEngine';
import { getScoreAtTime, GAME_INFO } from '@/lib/playByPlayData';

type GameMode = 'select' | 'live' | 'replay';

export default function GamePage() {
  // Game mode
  const [gameMode, setGameMode] = useState<GameMode>('select');
  const [selectedLiveGame, setSelectedLiveGame] = useState<LiveGame | null>(null);

  // Game state
  const [clock, setClock] = useState(GAME_DURATION);
  const [currentScore, setCurrentScore] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [lastPlay, setLastPlay] = useState('');
  const [fuel, setFuel] = useState(STARTING_FUEL);
  const [streak, setStreak] = useState(0);
  const [tiles, setTiles] = useState<Map<number, Tile>>(new Map());
  const [selectedScores, setSelectedScores] = useState<Set<number>>(new Set());
  const [picks, setPicks] = useState<Pick[]>([]);

  // Bonus state
  const [bonusActive, setBonusActive] = useState(false);
  const [bonusMultiplier, setBonusMultiplier] = useState(0);
  const [bonusTimeRemaining, setBonusTimeRemaining] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [nextBonusTrigger, setNextBonusTrigger] = useState(getNextBonusTriggerTime());

  // Game over state
  const [gameOver, setGameOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [settledPicks, setSettledPicks] = useState<Pick[]>([]);
  const [totalPayout, setTotalPayout] = useState(0);
  const [hasHit, setHasHit] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Game info
  const [gameInfo, setGameInfo] = useState({
    home: GAME_INFO.home,
    away: GAME_INFO.away,
    ouLine: null as number | null,
  });

  // Refs for intervals
  const bonusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bonusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const liveUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Handle live game selection
  const handleSelectLiveGame = (game: LiveGame) => {
    setSelectedLiveGame(game);
    setGameMode('live');
    setGameInfo({
      home: game.home_team,
      away: game.away_team,
      ouLine: game.ou_line || null,
    });
    // Set initial scores from live game
    setHomeScore(game.home_score);
    setAwayScore(game.away_score);
    setCurrentScore(game.total_points);
    // Calculate time remaining (scaled to 5-minute game)
    const converted = convertToPlayByPlay(game);
    setClock(converted.timeRemaining);
    setTiles(generateGridTiles(game.total_points, converted.timeRemaining));
  };

  // Handle mock/replay data
  const handleUseMockData = () => {
    setGameMode('replay');
    setGameInfo({
      home: GAME_INFO.home,
      away: GAME_INFO.away,
      ouLine: null,
    });
    setClock(GAME_DURATION);
    setCurrentScore(0);
    setHomeScore(0);
    setAwayScore(0);
    setTiles(generateGridTiles(0, GAME_DURATION));
  };

  // Initialize tiles
  useEffect(() => {
    setTiles(generateGridTiles(0, GAME_DURATION));
  }, []);

  // Live data polling (when in live mode)
  useEffect(() => {
    if (gameMode !== 'live' || !gameStarted || gameOver || !selectedLiveGame) return;

    const pollLiveData = async () => {
      try {
        const updatedGame = await fetchGameById(selectedLiveGame.game_id);
        if (updatedGame) {
          setHomeScore(updatedGame.home_score);
          setAwayScore(updatedGame.away_score);
          setCurrentScore(updatedGame.total_points);

          // Update tiles if needed
          setTiles(prevTiles => {
            const maxScore = Math.max(...Array.from(prevTiles.keys()));
            if (updatedGame.total_points + 15 > maxScore) {
              return generateGridTiles(updatedGame.total_points, clock);
            }
            return prevTiles;
          });

          // Check if game completed
          if (updatedGame.completed) {
            setGameOver(true);
          }
        }
      } catch (error) {
        console.error('Error polling live data:', error);
      }
    };

    // Poll every 5 seconds
    liveUpdateRef.current = setInterval(pollLiveData, 5000);

    return () => {
      if (liveUpdateRef.current) clearInterval(liveUpdateRef.current);
    };
  }, [gameMode, gameStarted, gameOver, selectedLiveGame, clock]);

  // Update live boosts periodically
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setTiles(prevTiles => {
        const newTiles = new Map(prevTiles);
        newTiles.forEach((tile, score) => {
          tile.liveBoost = calculateLiveBoost(score, currentScore, clock);
        });
        return newTiles;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentScore, clock, gameStarted, gameOver]);

  // Game clock countdown using requestAnimationFrame
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    let lastTime = performance.now();
    let animationId: number;

    const tick = (currentTime: number) => {
      const elapsed = currentTime - lastTime;

      if (elapsed >= 1000) {
        lastTime = currentTime - (elapsed % 1000);
        setClock(prev => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameStarted, gameOver]);

  // Score updates from play-by-play data (replay mode only)
  useEffect(() => {
    if (gameMode !== 'replay' || !gameStarted || gameOver) return;

    const updateScore = () => {
      const scoreData = getScoreAtTime(clock);
      setHomeScore(scoreData.home);
      setAwayScore(scoreData.away);
      setCurrentScore(scoreData.total);
      setLastPlay(scoreData.lastPlay);

      // Extend tiles if needed
      setTiles(prevTiles => {
        const maxScore = Math.max(...Array.from(prevTiles.keys()));
        if (scoreData.total + 15 > maxScore) {
          return generateGridTiles(scoreData.total, clock);
        }
        return prevTiles;
      });
    };

    updateScore();
  }, [gameMode, gameStarted, gameOver, clock]);

  // Bonus trigger
  useEffect(() => {
    if (!gameStarted || gameOver || bonusActive) return;

    bonusIntervalRef.current = setTimeout(() => {
      setIsSpinning(true);

      setTimeout(() => {
        setIsSpinning(false);
        const bonus = generateBonusEvent();
        setBonusActive(true);
        setBonusMultiplier(bonus.multiplier);
        setBonusTimeRemaining(BONUS_DURATION);

        const startTime = Date.now();
        bonusTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = BONUS_DURATION - elapsed;

          if (remaining <= 0) {
            setBonusActive(false);
            setBonusMultiplier(0);
            setBonusTimeRemaining(0);
            setNextBonusTrigger(getNextBonusTriggerTime());
            if (bonusTimerRef.current) clearInterval(bonusTimerRef.current);
          } else {
            setBonusTimeRemaining(remaining);
          }
        }, 100);
      }, 1200);
    }, nextBonusTrigger);

    return () => {
      if (bonusIntervalRef.current) clearTimeout(bonusIntervalRef.current);
      if (bonusTimerRef.current) clearInterval(bonusTimerRef.current);
    };
  }, [gameStarted, gameOver, bonusActive, nextBonusTrigger]);

  // Settle game when time runs out
  useEffect(() => {
    if (gameOver && !showResults) {
      // Clear all intervals
      if (bonusIntervalRef.current) clearTimeout(bonusIntervalRef.current);
      if (bonusTimerRef.current) clearInterval(bonusTimerRef.current);
      if (liveUpdateRef.current) clearInterval(liveUpdateRef.current);

      const { settledPicks: settled, totalPayout: payout, hasHit: hit } = settleGame(picks, currentScore);

      setSettledPicks(settled);
      setTotalPayout(payout);
      setHasHit(hit);
      setFuel(prev => prev + payout);

      if (hit) {
        setStreak(prev => prev + 1);
      } else if (picks.length > 0) {
        setStreak(0);
      }

      setTimeout(() => setShowResults(true), 500);
    }
  }, [gameOver, showResults, picks, currentScore]);

  // Handle tile selection
  const handleSelectTile = useCallback((score: number) => {
    if (gameOver) return;

    setSelectedScores(prev => {
      const newSet = new Set(prev);

      if (newSet.has(score)) {
        newSet.delete(score);
        setFuel(f => f + PICK_COST);
        setPicks(p => p.filter(pick => pick.score !== score));
      } else {
        if (fuel >= PICK_COST) {
          newSet.add(score);
          setFuel(f => f - PICK_COST);

          const tile = tiles.get(score);
          if (tile) {
            const currentBonus = bonusActive ? bonusMultiplier : 0;
            const totalMultiplier = tile.baseMultiplier + tile.liveBoost + currentBonus;

            setPicks(p => [...p, {
              score,
              baseMultiplier: tile.baseMultiplier,
              bonusAtPick: currentBonus,
              totalMultiplier,
            }]);
          }
        }
      }

      return newSet;
    });
  }, [gameOver, fuel, tiles, bonusActive, bonusMultiplier]);

  // Start game
  const handleStartGame = () => {
    setGameStarted(true);
  };

  // Play again
  const handlePlayAgain = () => {
    // Go back to selection
    setGameMode('select');
    setSelectedLiveGame(null);
    setClock(GAME_DURATION);
    setCurrentScore(0);
    setHomeScore(0);
    setAwayScore(0);
    setLastPlay('');
    setFuel(STARTING_FUEL);
    setTiles(generateGridTiles(0, GAME_DURATION));
    setSelectedScores(new Set());
    setPicks([]);
    setBonusActive(false);
    setBonusMultiplier(0);
    setBonusTimeRemaining(0);
    setIsSpinning(false);
    setNextBonusTrigger(getNextBonusTriggerTime());
    setGameOver(false);
    setShowResults(false);
    setSettledPicks([]);
    setTotalPayout(0);
    setHasHit(false);
    setGameStarted(false);
  };

  const canAffordPick = fuel >= PICK_COST;

  // Game Selection Screen
  if (gameMode === 'select') {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 overflow-auto">
        <LiveGameSelector
          onSelectGame={handleSelectLiveGame}
          onUseMockData={handleUseMockData}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 overflow-hidden">
      {/* Arena background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-orange-900/30 to-transparent" />
        <div className="absolute top-0 left-1/4 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 border-t-2 border-l-2 border-r-2 border-orange-500/20 rounded-t-full" />
      </div>

      <div className="relative z-10 h-full flex flex-col max-w-2xl mx-auto px-4 py-4">
        {/* Start Screen */}
        {!gameStarted && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative mb-6">
              <div className="text-8xl animate-bounce" style={{ animationDuration: '1s' }}>🏀</div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/30 rounded-full blur-md animate-pulse" />
            </div>

            <h1 className="text-4xl font-bold text-white mb-2 text-center">Score Predictor</h1>
            <p className="text-gray-400 text-center mb-4 max-w-xs">
              {gameMode === 'live' ? 'Playing with LIVE data!' : 'Playing Duke vs UNC replay'}
            </p>

            {/* Game card */}
            <div className="w-full max-w-sm bg-gradient-to-b from-slate-800/80 to-slate-900/80 rounded-2xl p-6 mb-6 border border-slate-700/50 shadow-xl">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full animate-pulse ${gameMode === 'live' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <span className={`text-xs uppercase tracking-wider font-medium ${gameMode === 'live' ? 'text-red-400' : 'text-blue-400'}`}>
                  {gameMode === 'live' ? 'Live Game' : 'Replay Mode'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{gameInfo.away.split(' ').pop()}</div>
                  <div className="text-2xl font-black text-white">{awayScore}</div>
                </div>
                <div className="text-gray-500 text-lg">vs</div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{gameInfo.home.split(' ').pop()}</div>
                  <div className="text-2xl font-black text-white">{homeScore}</div>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-block bg-yellow-500/20 rounded-lg px-4 py-2">
                  <div className="text-3xl font-bold text-yellow-400">{currentScore}</div>
                  <div className="text-xs text-yellow-500/70">Combined Score</div>
                </div>
              </div>

              {gameInfo.ouLine && (
                <div className="mt-3 text-center text-sm text-gray-400">
                  O/U Line: <span className="text-white font-medium">{gameInfo.ouLine}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleStartGame}
              type="button"
              className="relative z-20 w-full max-w-sm py-5 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 hover:from-yellow-400 hover:via-amber-400 hover:to-yellow-400 text-black font-bold text-2xl rounded-2xl transition-all transform hover:scale-105 shadow-2xl shadow-yellow-500/30 cursor-pointer active:scale-95"
            >
              <span className="flex items-center justify-center gap-3">
                🚀 Start Game
              </span>
            </button>

            <button
              onClick={() => setGameMode('select')}
              className="mt-4 text-gray-500 hover:text-white transition-colors"
            >
              ← Choose Different Game
            </button>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span>⏱️</span> 5 min round
              </span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span className="flex items-center gap-1">
                <span>⚡</span> {fuel.toLocaleString()} fuel
              </span>
            </div>
          </div>
        )}

        {/* Game Screen */}
        {gameStarted && (
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
              <Header
                clock={clock}
                fuel={fuel}
                streak={streak}
                currentScore={currentScore}
                homeTeam={gameInfo.home.split(' ').pop() || gameInfo.home}
                awayTeam={gameInfo.away.split(' ').pop() || gameInfo.away}
              />
            </div>

            {/* Live scoreboard + play-by-play ticker */}
            <div className="flex-shrink-0 flex items-center justify-between bg-slate-800/70 rounded-lg px-3 py-2 mb-2">
              <div className="flex items-center gap-3">
                <span className="text-blue-400 font-bold">{gameInfo.away.split(' ').pop()} {awayScore}</span>
                <span className="text-gray-500">-</span>
                <span className="text-cyan-400 font-bold">{gameInfo.home.split(' ').pop()} {homeScore}</span>
              </div>
              <div className="flex-1 mx-4 text-center">
                {gameMode === 'live' ? (
                  <span className="text-green-400 text-sm flex items-center justify-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="text-yellow-400 text-sm animate-pulse">{lastPlay}</span>
                )}
              </div>
              <div className="text-white font-mono font-bold">
                {currentScore} pts
              </div>
            </div>

            <div className="flex-shrink-0 my-2">
              <BonusBar
                isActive={bonusActive}
                multiplier={bonusMultiplier}
                timeRemaining={bonusTimeRemaining}
                isSpinning={isSpinning}
              />
            </div>

            <div className="flex-1 min-h-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
              <Grid
                tiles={tiles}
                currentScore={currentScore}
                selectedScores={selectedScores}
                bonusActive={bonusActive}
                bonusMultiplier={bonusMultiplier}
                onSelectTile={handleSelectTile}
                canAffordPick={canAffordPick}
                timeRemaining={clock}
              />
            </div>

            <div className="flex-shrink-0 mt-2 flex items-center justify-between bg-gradient-to-r from-slate-800/80 via-slate-800/90 to-slate-800/80 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 text-sm">✓</span>
                </div>
                <span className="text-white font-bold">x{streak}</span>
                {streak >= 3 && <span className="animate-pulse">🔥</span>}
              </div>

              <div className="text-center flex-1">
                <div className="text-lg font-bold text-white">{selectedScores.size} picks</div>
                <div className="text-xs text-gray-400">{selectedScores.size * PICK_COST} fuel wagered</div>
              </div>

              <div className="flex items-center gap-1 bg-yellow-500/20 rounded-lg px-3 py-1.5">
                <span className="text-xl">⚡</span>
                <span className="text-yellow-400 font-bold text-lg">{fuel.toLocaleString()}</span>
              </div>
            </div>

            {!canAffordPick && selectedScores.size === 0 && (
              <div className="flex-shrink-0 mt-2 text-center text-red-400 text-sm bg-red-500/10 rounded-lg py-2">
                Not enough fuel! Need {PICK_COST} per pick
              </div>
            )}
          </div>
        )}

        <ResultsModal
          isOpen={showResults}
          finalScore={currentScore}
          picks={settledPicks}
          totalPayout={totalPayout}
          newFuel={fuel}
          streak={streak}
          hasHit={hasHit}
          onPlayAgain={handlePlayAgain}
        />
      </div>

      <style jsx global>{`
        @keyframes spin-slot {
          0% { transform: translateY(0); }
          100% { transform: translateY(-100%); }
        }
        .animate-spin-slot {
          animation: spin-slot 0.1s linear infinite;
        }
      `}</style>
    </div>
  );
}

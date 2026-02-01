'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  americanToImpliedProbability,
  calculatePayout,
  calculateParlay,
  calculateEV,
  calculateEVPercent,
  calculateEdge,
  kellyBetSize,
  formatOdds,
  formatProbability,
  calculateVig,
  ParlayLeg,
} from '@/lib/betting-math';

interface GameOdds {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  bookmaker: string;
  spreadLine: number | null;
  spreadHomeOdds: number | null;
  spreadAwayOdds: number | null;
  totalLine: number | null;
  totalOverOdds: number | null;
  totalUnderOdds: number | null;
  moneylineHome: number | null;
  moneylineAway: number | null;
}

interface BetSlipItem {
  id: string;
  gameId: string;
  game: GameOdds;
  betType: 'spread_home' | 'spread_away' | 'moneyline_home' | 'moneyline_away' | 'over' | 'under';
  odds: number;
  line?: number;
  description: string;
  shortDesc: string;
  impliedProbability: number;
  estimatedTrueProbability: number;
}

interface PlacedBet {
  id: string;
  legs: BetSlipItem[];
  isParlay: boolean;
  combinedOdds: number;
  wager: number;
  potentialWin: number;
  ev: number;
  placedAt: string;
  status: 'pending' | 'won' | 'lost' | 'push';
  cashOutValue?: number;
}

interface UserStats {
  level: number;
  xp: number;
  xpToNext: number;
  totalBets: number;
  biggestWin: number;
  currentStreak: number;
  bestStreak: number;
  achievements: string[];
}

const INITIAL_BALANCE = 1000;
const ACHIEVEMENTS = {
  first_bet: { name: 'First Blood', desc: 'Place your first bet', icon: '🎯' },
  first_win: { name: 'Winner Winner', desc: 'Win your first bet', icon: '🏆' },
  parlay_win: { name: 'Parlay King', desc: 'Win a parlay', icon: '👑' },
  big_win: { name: 'High Roller', desc: 'Win $500+ on a single bet', icon: '💰' },
  streak_3: { name: 'Hot Hand', desc: 'Win 3 bets in a row', icon: '🔥' },
  streak_5: { name: 'On Fire', desc: 'Win 5 bets in a row', icon: '🌟' },
  hundred_bets: { name: 'Veteran', desc: 'Place 100 bets', icon: '🎖️' },
  profitable: { name: 'In The Green', desc: 'Reach $1500 balance', icon: '📈' },
  ev_hunter: { name: 'Sharp', desc: 'Place 10 +EV bets', icon: '🧠' },
};

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function SimulatorPage() {
  const [games, setGames] = useState<GameOdds[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [wagerAmount, setWagerAmount] = useState(10);
  const [activeTab, setActiveTab] = useState<'nba' | 'ncaab'>('nba');
  const [showHistory, setShowHistory] = useState(false);
  const [showEVGuide, setShowEVGuide] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [betMode, setBetMode] = useState<'singles' | 'parlay'>('singles');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'total' | 'spread'>('time');
  const [quickBetAmount, setQuickBetAmount] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    level: 1, xp: 0, xpToNext: 100, totalBets: 0, biggestWin: 0,
    currentStreak: 0, bestStreak: 0, achievements: []
  });
  const [oddsFormat, setOddsFormat] = useState<'american' | 'decimal'>('american');
  const [sessionTime, setSessionTime] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => setSessionTime(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data
  useEffect(() => {
    fetch('/api/odds-data')
      .then((res) => res.json())
      .then((data) => {
        setGames(data.games || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load saved state
    const saved = localStorage.getItem('simulator_state_v3');
    if (saved) {
      const state = JSON.parse(saved);
      setBalance(state.balance || INITIAL_BALANCE);
      setPlacedBets(state.placedBets || []);
      setUserStats(state.userStats || userStats);
      setFavorites(state.favorites || []);
    }
  }, []);

  // Save state
  useEffect(() => {
    localStorage.setItem('simulator_state_v3', JSON.stringify({
      balance, placedBets, userStats, favorites
    }));
  }, [balance, placedBets, userStats, favorites]);

  // Show notification
  const showNotif = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Award XP and check achievements
  const awardXP = useCallback((amount: number, checkAchievements?: () => string[]) => {
    setUserStats(prev => {
      let newXP = prev.xp + amount;
      let newLevel = prev.level;
      let newXPToNext = prev.xpToNext;

      while (newXP >= newXPToNext) {
        newXP -= newXPToNext;
        newLevel++;
        newXPToNext = Math.floor(newXPToNext * 1.5);
        showNotif(`Level Up! You're now level ${newLevel}`, 'success');
      }

      const newAchievements = checkAchievements ? checkAchievements() : [];
      const unlockedNew = newAchievements.filter(a => !prev.achievements.includes(a));
      unlockedNew.forEach(a => {
        const ach = ACHIEVEMENTS[a as keyof typeof ACHIEVEMENTS];
        if (ach) showNotif(`${ach.icon} Achievement: ${ach.name}`, 'success');
      });

      return {
        ...prev,
        xp: newXP,
        level: newLevel,
        xpToNext: newXPToNext,
        achievements: Array.from(new Set([...prev.achievements, ...newAchievements]))
      };
    });
  }, [showNotif]);

  const addToBetSlip = useCallback((
    game: GameOdds,
    betType: BetSlipItem['betType'],
    odds: number,
    line?: number
  ) => {
    const betId = `${game.id}-${betType}`;

    if (betSlip.find((b) => b.id === betId)) {
      setBetSlip((prev) => prev.filter((b) => b.id !== betId));
      return;
    }

    // Check for conflicts
    const conflictingBetTypes: Record<string, string[]> = {
      'spread_home': ['spread_away'],
      'spread_away': ['spread_home'],
      'moneyline_home': ['moneyline_away'],
      'moneyline_away': ['moneyline_home'],
      'over': ['under'],
      'under': ['over'],
    };

    const conflicts = conflictingBetTypes[betType] || [];
    const existingConflict = betSlip.find(
      (b) => b.gameId === game.id && conflicts.includes(b.betType)
    );

    if (existingConflict) {
      setBetSlip((prev) => prev.filter((b) => b.id !== existingConflict.id));
    }

    let description = '';
    let shortDesc = '';
    switch (betType) {
      case 'spread_home':
        description = `${game.homeTeam} ${-line! >= 0 ? '+' : ''}${-line!}`;
        shortDesc = `${game.homeTeam.split(' ').pop()} ${-line! >= 0 ? '+' : ''}${-line!}`;
        break;
      case 'spread_away':
        description = `${game.awayTeam} +${line}`;
        shortDesc = `${game.awayTeam.split(' ').pop()} +${line}`;
        break;
      case 'moneyline_home':
        description = `${game.homeTeam} ML`;
        shortDesc = `${game.homeTeam.split(' ').pop()} ML`;
        break;
      case 'moneyline_away':
        description = `${game.awayTeam} ML`;
        shortDesc = `${game.awayTeam.split(' ').pop()} ML`;
        break;
      case 'over':
        description = `Over ${line}`;
        shortDesc = `O ${line}`;
        break;
      case 'under':
        description = `Under ${line}`;
        shortDesc = `U ${line}`;
        break;
    }

    const impliedProb = americanToImpliedProbability(odds);
    const estimatedTrue = impliedProb * 0.96;

    const newBet: BetSlipItem = {
      id: betId,
      gameId: game.id,
      game,
      betType,
      odds,
      line,
      description,
      shortDesc,
      impliedProbability: impliedProb,
      estimatedTrueProbability: estimatedTrue,
    };

    setBetSlip((prev) => [...prev, newBet]);

    // Haptic-like feedback
    if (navigator.vibrate) navigator.vibrate(10);
  }, [betSlip]);

  const removeBet = (betId: string) => {
    setBetSlip((prev) => prev.filter((b) => b.id !== betId));
  };

  const updateTrueProbability = (betId: string, newProb: number) => {
    setBetSlip((prev) =>
      prev.map((bet) =>
        bet.id === betId ? { ...bet, estimatedTrueProbability: newProb } : bet
      )
    );
  };

  // Parlay calculations
  const parlayLegs: ParlayLeg[] = betSlip.map((b) => ({
    american: b.odds,
    description: b.description,
    trueProbability: b.estimatedTrueProbability,
  }));
  const parlayResult = calculateParlay(parlayLegs, wagerAmount);

  // Singles calculations
  const singlesTotal = betSlip.reduce((sum, bet) => sum + calculatePayout(bet.odds, wagerAmount), 0);
  const singlesTotalWager = betSlip.length * wagerAmount;
  const singlesEV = betSlip.reduce((sum, bet) =>
    sum + calculateEV(bet.odds, wagerAmount, bet.estimatedTrueProbability), 0);

  const placeBets = () => {
    const isParlay = betMode === 'parlay';
    const totalWager = isParlay ? wagerAmount : singlesTotalWager;

    if (isParlay && betSlip.length < 2) {
      showNotif('Parlay requires at least 2 legs', 'error');
      return;
    }
    if (totalWager > balance) {
      showNotif('Insufficient balance!', 'error');
      return;
    }

    const evPositive = isParlay
      ? (parlayResult.ev || 0) > 0
      : singlesEV > 0;

    if (isParlay) {
      const newBet: PlacedBet = {
        id: `parlay-${Date.now()}`,
        legs: [...betSlip],
        isParlay: true,
        combinedOdds: parlayResult.combinedAmericanOdds,
        wager: wagerAmount,
        potentialWin: parlayResult.payout,
        ev: parlayResult.ev || 0,
        placedAt: new Date().toISOString(),
        status: 'pending',
        cashOutValue: wagerAmount * 0.7,
      };
      setPlacedBets((prev) => [newBet, ...prev]);
      setBalance((prev) => prev - wagerAmount);
      showNotif(`Parlay placed! ${betSlip.length} legs at ${formatOdds(parlayResult.combinedAmericanOdds)}`, 'success');
    } else {
      const newBets: PlacedBet[] = betSlip.map((bet) => ({
        id: `single-${bet.id}-${Date.now()}`,
        legs: [bet],
        isParlay: false,
        combinedOdds: bet.odds,
        wager: wagerAmount,
        potentialWin: calculatePayout(bet.odds, wagerAmount),
        ev: calculateEV(bet.odds, wagerAmount, bet.estimatedTrueProbability),
        placedAt: new Date().toISOString(),
        status: 'pending',
        cashOutValue: wagerAmount * 0.85,
      }));
      setPlacedBets((prev) => [...newBets, ...prev]);
      setBalance((prev) => prev - singlesTotalWager);
      showNotif(`${betSlip.length} bet${betSlip.length > 1 ? 's' : ''} placed!`, 'success');
    }

    // Award XP
    const xpGain = isParlay ? betSlip.length * 15 : betSlip.length * 10;
    awardXP(xpGain, () => {
      const achievements: string[] = [];
      const newTotal = userStats.totalBets + (isParlay ? 1 : betSlip.length);
      if (newTotal === 1) achievements.push('first_bet');
      if (newTotal >= 100) achievements.push('hundred_bets');
      if (evPositive) {
        const evBets = placedBets.filter(b => b.ev > 0).length + (evPositive ? 1 : 0);
        if (evBets >= 10) achievements.push('ev_hunter');
      }
      return achievements;
    });

    setUserStats(prev => ({ ...prev, totalBets: prev.totalBets + (isParlay ? 1 : betSlip.length) }));
    setBetSlip([]);
    setQuickBetAmount(null);
  };

  const cashOut = (betId: string) => {
    const bet = placedBets.find(b => b.id === betId);
    if (!bet || bet.status !== 'pending' || !bet.cashOutValue) return;

    setBalance(prev => prev + bet.cashOutValue!);
    setPlacedBets(prev => prev.filter(b => b.id !== betId));
    showNotif(`Cashed out $${bet.cashOutValue.toFixed(2)}`, 'info');
  };

  const settleBet = (betId: string) => {
    setPlacedBets((prev) =>
      prev.map((bet) => {
        if (bet.id !== betId || bet.status !== 'pending') return bet;

        let won = true;
        for (const leg of bet.legs) {
          if (Math.random() > leg.estimatedTrueProbability) {
            won = false;
            break;
          }
        }

        const status = won ? 'won' : 'lost';
        const winAmount = bet.wager + bet.potentialWin;

        if (won) {
          setBalance((b) => b + winAmount);
          showNotif(`Won $${bet.potentialWin.toFixed(2)}!`, 'success');

          // Check achievements
          awardXP(won ? 25 : 5, () => {
            const achievements: string[] = [];
            if (userStats.achievements.length === 0 || !userStats.achievements.includes('first_win')) {
              achievements.push('first_win');
            }
            if (bet.isParlay) achievements.push('parlay_win');
            if (bet.potentialWin >= 500) achievements.push('big_win');

            const newStreak = userStats.currentStreak + 1;
            if (newStreak >= 3) achievements.push('streak_3');
            if (newStreak >= 5) achievements.push('streak_5');

            return achievements;
          });

          setUserStats(prev => ({
            ...prev,
            currentStreak: prev.currentStreak + 1,
            bestStreak: Math.max(prev.bestStreak, prev.currentStreak + 1),
            biggestWin: Math.max(prev.biggestWin, bet.potentialWin),
          }));
        } else {
          setUserStats(prev => ({ ...prev, currentStreak: 0 }));
        }

        // Check profitable achievement
        if (balance + (won ? winAmount : 0) >= 1500) {
          awardXP(0, () => ['profitable']);
        }

        return { ...bet, status };
      })
    );
  };

  const settleAllBets = () => {
    placedBets.filter(b => b.status === 'pending').forEach(bet => settleBet(bet.id));
  };

  const toggleFavorite = (gameId: string) => {
    setFavorites(prev =>
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  const resetAccount = () => {
    if (confirm('Reset all data? This cannot be undone.')) {
      setBalance(INITIAL_BALANCE);
      setPlacedBets([]);
      setBetSlip([]);
      setUserStats({ level: 1, xp: 0, xpToNext: 100, totalBets: 0, biggestWin: 0, currentStreak: 0, bestStreak: 0, achievements: [] });
      setFavorites([]);
      localStorage.removeItem('simulator_state_v3');
      showNotif('Account reset', 'info');
    }
  };

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let filtered = games.filter((g) =>
      activeTab === 'nba' ? g.sport === 'NBA' : g.sport === 'NCAA Men\'s Basketball'
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.homeTeam.toLowerCase().includes(q) || g.awayTeam.toLowerCase().includes(q)
      );
    }

    // Sort favorites first, then by selected criteria
    filtered.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? -1 : 0;
      const bFav = favorites.includes(b.id) ? -1 : 0;
      if (aFav !== bFav) return aFav - bFav;

      switch (sortBy) {
        case 'total':
          return (b.totalLine || 0) - (a.totalLine || 0);
        case 'spread':
          return Math.abs(a.spreadLine || 0) - Math.abs(b.spreadLine || 0);
        default:
          return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime();
      }
    });

    return filtered;
  }, [games, activeTab, searchQuery, sortBy, favorites]);

  // Stats calculations
  const stats = useMemo(() => ({
    totalBets: placedBets.length,
    wins: placedBets.filter((b) => b.status === 'won').length,
    losses: placedBets.filter((b) => b.status === 'lost').length,
    pending: placedBets.filter((b) => b.status === 'pending').length,
    totalWagered: placedBets.reduce((sum, b) => sum + b.wager, 0),
    totalWon: placedBets.filter((b) => b.status === 'won').reduce((sum, b) => sum + b.wager + b.potentialWin, 0),
    parlays: placedBets.filter((b) => b.isParlay).length,
    parlayWins: placedBets.filter((b) => b.isParlay && b.status === 'won').length,
    roi: placedBets.length > 0
      ? ((placedBets.filter(b => b.status === 'won').reduce((s, b) => s + b.potentialWin, 0) -
          placedBets.filter(b => b.status === 'lost').reduce((s, b) => s + b.wager, 0)) /
          Math.max(1, placedBets.reduce((s, b) => s + b.wager, 0)) * 100)
      : 0,
  }), [placedBets]);

  const kellyBet = betSlip.length === 1
    ? kellyBetSize(balance, betSlip[0].odds, betSlip[0].estimatedTrueProbability, 0.25)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-lg">Loading odds...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-600' :
          notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {notification.type === 'success' && <span>✓</span>}
          {notification.type === 'error' && <span>✕</span>}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#161b22] border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center font-bold">
                  $
                </div>
                <span className="text-lg font-bold">PaperBets</span>
              </div>

              {/* Level Badge */}
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-sm hover:opacity-90 transition"
              >
                <span>Lvl {userStats.level}</span>
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all"
                    style={{ width: `${(userStats.xp / userStats.xpToNext) * 100}%` }}
                  />
                </div>
              </button>

              {/* Streak */}
              {userStats.currentStreak > 0 && (
                <div className="flex items-center gap-1 text-orange-400 text-sm">
                  <span>🔥</span>
                  <span>{userStats.currentStreak} streak</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Session Timer */}
              <div className="text-xs text-gray-500">
                Session: {Math.floor(sessionTime / 60)}:{(sessionTime % 60).toString().padStart(2, '0')}
              </div>

              {/* Balance */}
              <div className="text-right">
                <div className="text-xs text-gray-400">Balance</div>
                <div className={`text-xl font-bold ${balance >= INITIAL_BALANCE ? 'text-green-400' : 'text-red-400'}`}>
                  ${balance.toFixed(2)}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEVGuide(true)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                  title="EV Guide"
                >
                  📊
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm relative"
                  title="Bet History"
                >
                  📋
                  {stats.pending > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-[10px] flex items-center justify-center">
                      {stats.pending}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Controls Bar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Sport Tabs */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('nba')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === 'nba' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  NBA
                </button>
                <button
                  onClick={() => setActiveTab('ncaab')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === 'ncaab' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  NCAAB
                </button>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pl-8 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-green-500"
                />
                <span className="absolute left-2.5 top-2.5 text-gray-500">🔍</span>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'time' | 'total' | 'spread')}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              >
                <option value="time">Sort: Time</option>
                <option value="total">Sort: Highest Total</option>
                <option value="spread">Sort: Closest Spread</option>
              </select>

              {/* Odds Format */}
              <button
                onClick={() => setOddsFormat(f => f === 'american' ? 'decimal' : 'american')}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700"
              >
                {oddsFormat === 'american' ? 'US' : 'DEC'}
              </button>

              <div className="text-sm text-gray-500">
                {filteredGames.length} games
              </div>
            </div>

            {/* Games List */}
            <div className="space-y-2">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  betSlip={betSlip}
                  onAddBet={addToBetSlip}
                  oddsFormat={oddsFormat}
                  isFavorite={favorites.includes(game.id)}
                  onToggleFavorite={() => toggleFavorite(game.id)}
                />
              ))}

              {filteredGames.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery ? 'No games match your search' : 'No games available'}
                </div>
              )}
            </div>
          </div>

          {/* Bet Slip Sidebar */}
          <div className="w-[380px] flex-shrink-0">
            <div className="bg-[#161b22] rounded-lg sticky top-16 border border-gray-800">
              {/* Bet Mode Toggle */}
              <div className="p-2 border-b border-gray-800 flex gap-1">
                <button
                  onClick={() => setBetMode('singles')}
                  className={`flex-1 py-2 rounded font-medium text-sm transition ${
                    betMode === 'singles' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Straight
                </button>
                <button
                  onClick={() => setBetMode('parlay')}
                  className={`flex-1 py-2 rounded font-medium text-sm transition ${
                    betMode === 'parlay' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Parlay
                </button>
              </div>

              {/* Slip Header */}
              <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                <div>
                  <span className="font-bold">
                    {betMode === 'parlay' ? 'Parlay' : 'Bet Slip'}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {betSlip.length} selection{betSlip.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {betSlip.length > 0 && (
                  <button
                    onClick={() => setBetSlip([])}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {betSlip.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">📝</div>
                  <div className="text-gray-400">Click odds to add selections</div>
                </div>
              ) : (
                <>
                  {/* Bet Legs */}
                  <div className="max-h-64 overflow-y-auto">
                    {betSlip.map((bet) => (
                      <BetSlipCard
                        key={bet.id}
                        bet={bet}
                        onRemove={() => removeBet(bet.id)}
                        onUpdateProbability={(prob) => updateTrueProbability(bet.id, prob)}
                        showSlider={betMode === 'parlay'}
                        oddsFormat={oddsFormat}
                      />
                    ))}
                  </div>

                  {/* Parlay Odds Summary */}
                  {betMode === 'parlay' && betSlip.length >= 2 && (
                    <div className="mx-3 mb-2 p-2 bg-purple-900/30 rounded-lg border border-purple-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-purple-300">Parlay Odds</span>
                        <span className="text-lg font-bold text-purple-400">
                          {formatOdds(parlayResult.combinedAmericanOdds)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Win Prob: {formatProbability(parlayResult.impliedProbability)}</span>
                        <span className="text-yellow-500">Vig: {parlayResult.vigPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}

                  {/* Wager Section */}
                  <div className="p-3 border-t border-gray-800">
                    {/* Quick Amounts */}
                    <div className="flex gap-1 mb-3">
                      {[5, 10, 25, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => { setWagerAmount(amt); setQuickBetAmount(amt); }}
                          className={`flex-1 py-1.5 rounded text-xs font-medium transition ${
                            wagerAmount === amt
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                      <button
                        onClick={() => setWagerAmount(Math.floor(balance))}
                        className="flex-1 py-1.5 rounded text-xs font-medium bg-gray-800 text-yellow-400 hover:bg-gray-700"
                        title="All in"
                      >
                        MAX
                      </button>
                    </div>

                    {/* Wager Input */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-gray-400 text-sm">Wager</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={wagerAmount}
                          onChange={(e) => setWagerAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full px-3 py-2 pl-7 bg-gray-800 border border-gray-700 rounded-lg text-right font-medium focus:outline-none focus:border-green-500"
                        />
                      </div>
                    </div>

                    {/* Kelly Suggestion */}
                    {betSlip.length === 1 && kellyBet > 1 && (
                      <button
                        onClick={() => setWagerAmount(Math.round(kellyBet))}
                        className="w-full mb-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 rounded-lg text-xs text-blue-300 transition"
                      >
                        Kelly suggests: ${kellyBet.toFixed(0)} (quarter Kelly)
                      </button>
                    )}

                    {/* Payout Summary */}
                    <div className="space-y-1 mb-3 text-sm">
                      {betMode === 'parlay' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Wager</span>
                            <span>${wagerAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">To Win</span>
                            <span className="text-green-400 font-medium">${parlayResult.payout.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Payout</span>
                            <span className="font-bold">${parlayResult.totalReturn.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-gray-800">
                            <span className="text-gray-400">EV</span>
                            <span className={parlayResult.ev && parlayResult.ev > 0 ? 'text-green-400' : 'text-red-400'}>
                              {parlayResult.ev ? (parlayResult.ev >= 0 ? '+' : '') + `$${parlayResult.ev.toFixed(2)}` : '-'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Wager ({betSlip.length})</span>
                            <span>${singlesTotalWager.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Max Payout</span>
                            <span className="text-green-400 font-medium">${(singlesTotalWager + singlesTotal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-gray-800">
                            <span className="text-gray-400">Combined EV</span>
                            <span className={singlesEV > 0 ? 'text-green-400' : 'text-red-400'}>
                              {singlesEV >= 0 ? '+' : ''}${singlesEV.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Place Bet Button */}
                    <button
                      onClick={placeBets}
                      disabled={
                        (betMode === 'parlay' && betSlip.length < 2) ||
                        (betMode === 'parlay' ? wagerAmount : singlesTotalWager) > balance ||
                        wagerAmount <= 0
                      }
                      className={`w-full py-3 rounded-lg font-bold text-lg transition ${
                        (betMode === 'parlay' && betSlip.length < 2) ||
                        (betMode === 'parlay' ? wagerAmount : singlesTotalWager) > balance ||
                        wagerAmount <= 0
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : betMode === 'parlay'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white'
                          : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'
                      }`}
                    >
                      {wagerAmount > balance || singlesTotalWager > balance
                        ? 'Insufficient Balance'
                        : betMode === 'parlay'
                        ? betSlip.length < 2
                          ? 'Add 2+ Selections'
                          : `Place Parlay - Win $${parlayResult.payout.toFixed(2)}`
                        : `Place ${betSlip.length} Bet${betSlip.length > 1 ? 's' : ''}`}
                    </button>
                  </div>
                </>
              )}

              {/* Add Funds */}
              <div className="p-3 border-t border-gray-800 bg-gray-900/50">
                <div className="flex gap-2">
                  {[100, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => { setBalance((b) => b + amt); showNotif(`Added $${amt}`, 'info'); }}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition"
                    >
                      +${amt}
                    </button>
                  ))}
                  <button
                    onClick={resetAccount}
                    className="px-3 py-2 text-red-400 hover:text-red-300 text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showHistory && (
        <BetHistoryModal
          placedBets={placedBets}
          stats={stats}
          onClose={() => setShowHistory(false)}
          onSettle={settleBet}
          onSettleAll={settleAllBets}
          onCashOut={cashOut}
          oddsFormat={oddsFormat}
        />
      )}

      {showEVGuide && <EVGuideModal onClose={() => setShowEVGuide(false)} />}

      {showProfile && (
        <ProfileModal
          userStats={userStats}
          balance={balance}
          stats={stats}
          onClose={() => setShowProfile(false)}
        />
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

function BetSlipCard({
  bet,
  onRemove,
  onUpdateProbability,
  showSlider,
  oddsFormat,
}: {
  bet: BetSlipItem;
  onRemove: () => void;
  onUpdateProbability: (prob: number) => void;
  showSlider: boolean;
  oddsFormat: 'american' | 'decimal';
}) {
  const ev = calculateEVPercent(bet.odds, bet.estimatedTrueProbability);
  const displayOdds = oddsFormat === 'american'
    ? formatOdds(bet.odds)
    : (bet.odds > 0 ? (bet.odds / 100 + 1) : (100 / Math.abs(bet.odds) + 1)).toFixed(2);

  return (
    <div className="p-3 border-b border-gray-800 hover:bg-gray-800/50 transition">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{bet.description}</div>
          <div className="text-xs text-gray-500 truncate">
            {bet.game.awayTeam} @ {bet.game.homeTeam}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${ev > 0 ? 'text-green-400' : 'text-white'}`}>
            {displayOdds}
          </span>
          <button onClick={onRemove} className="text-gray-500 hover:text-red-400 transition">✕</button>
        </div>
      </div>

      {/* EV Badge */}
      <div className="flex gap-2 mt-2 text-xs">
        <span className={`px-1.5 py-0.5 rounded ${ev > 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          EV: {ev >= 0 ? '+' : ''}{ev.toFixed(1)}%
        </span>
        <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
          {formatProbability(bet.impliedProbability)}
        </span>
      </div>

      {/* Probability Slider */}
      {showSlider && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Your prob estimate</span>
            <span className="text-blue-400">{formatProbability(bet.estimatedTrueProbability)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.01"
            value={bet.estimatedTrueProbability}
            onChange={(e) => onUpdateProbability(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}
    </div>
  );
}

function GameCard({
  game,
  betSlip,
  onAddBet,
  oddsFormat,
  isFavorite,
  onToggleFavorite,
}: {
  game: GameOdds;
  betSlip: BetSlipItem[];
  onAddBet: (game: GameOdds, betType: BetSlipItem['betType'], odds: number, line?: number) => void;
  oddsFormat: 'american' | 'decimal';
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const isSelected = (betType: BetSlipItem['betType']) =>
    betSlip.some((b) => b.id === `${game.id}-${betType}`);

  const hasConflict = (betType: BetSlipItem['betType']) => {
    const conflicts: Record<string, string[]> = {
      'spread_home': ['spread_away'], 'spread_away': ['spread_home'],
      'moneyline_home': ['moneyline_away'], 'moneyline_away': ['moneyline_home'],
      'over': ['under'], 'under': ['over'],
    };
    return betSlip.some((b) => b.gameId === game.id && conflicts[betType]?.includes(b.betType));
  };

  const displayOdds = (odds: number) => {
    if (oddsFormat === 'decimal') {
      return (odds > 0 ? (odds / 100 + 1) : (100 / Math.abs(odds) + 1)).toFixed(2);
    }
    return formatOdds(odds);
  };

  const OddsButton = ({
    odds,
    sublabel,
    betType,
    line,
  }: {
    odds: number | null;
    sublabel?: string;
    betType: BetSlipItem['betType'];
    line?: number;
  }) => {
    if (odds === null) return <div className="flex-1 h-12 bg-gray-800/30 rounded" />;

    const selected = isSelected(betType);
    const conflicted = hasConflict(betType);

    return (
      <button
        onClick={() => onAddBet(game, betType, odds, line)}
        className={`flex-1 h-12 rounded flex flex-col items-center justify-center transition relative ${
          selected
            ? 'bg-green-600 text-white ring-1 ring-green-400'
            : conflicted
            ? 'bg-gray-800/30 text-gray-600 hover:bg-gray-800 hover:text-white'
            : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
      >
        {sublabel && <span className="text-[10px] text-gray-400">{sublabel}</span>}
        <span className="font-semibold text-sm">{displayOdds(odds)}</span>
      </button>
    );
  };

  return (
    <div className={`bg-[#161b22] rounded-lg overflow-hidden border ${isFavorite ? 'border-yellow-600' : 'border-gray-800'} hover:border-gray-700 transition`}>
      {/* Header */}
      <div className="px-3 py-2 flex justify-between items-center text-xs border-b border-gray-800">
        <div className="flex items-center gap-2">
          <button onClick={onToggleFavorite} className={`transition ${isFavorite ? 'text-yellow-500' : 'text-gray-600 hover:text-yellow-500'}`}>
            {isFavorite ? '★' : '☆'}
          </button>
          <span className="text-gray-400">{formatDate(game.commenceTime)}</span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-400">{formatTime(game.commenceTime)}</span>
        </div>
        <span className="text-gray-600">{game.bookmaker}</span>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="grid grid-cols-[1fr,70px,70px,70px] gap-2 items-center text-xs mb-2">
          <div></div>
          <div className="text-center text-gray-500">SPREAD</div>
          <div className="text-center text-gray-500">TOTAL</div>
          <div className="text-center text-gray-500">ML</div>
        </div>

        {/* Away Team */}
        <div className="grid grid-cols-[1fr,70px,70px,70px] gap-2 items-center mb-2">
          <div className="font-medium text-sm truncate pr-2">{game.awayTeam}</div>
          <OddsButton
            odds={game.spreadAwayOdds}
            sublabel={game.spreadLine ? `+${game.spreadLine}` : undefined}
            betType="spread_away"
            line={game.spreadLine || undefined}
          />
          <OddsButton
            odds={game.totalOverOdds}
            sublabel={game.totalLine ? `O${game.totalLine}` : undefined}
            betType="over"
            line={game.totalLine || undefined}
          />
          <OddsButton
            odds={game.moneylineAway}
            betType="moneyline_away"
          />
        </div>

        {/* Home Team */}
        <div className="grid grid-cols-[1fr,70px,70px,70px] gap-2 items-center">
          <div className="font-medium text-sm truncate pr-2">{game.homeTeam}</div>
          <OddsButton
            odds={game.spreadHomeOdds}
            sublabel={game.spreadLine ? `-${game.spreadLine}` : undefined}
            betType="spread_home"
            line={game.spreadLine || undefined}
          />
          <OddsButton
            odds={game.totalUnderOdds}
            sublabel={game.totalLine ? `U${game.totalLine}` : undefined}
            betType="under"
            line={game.totalLine || undefined}
          />
          <OddsButton
            odds={game.moneylineHome}
            betType="moneyline_home"
          />
        </div>
      </div>
    </div>
  );
}

function BetHistoryModal({
  placedBets,
  stats,
  onClose,
  onSettle,
  onSettleAll,
  onCashOut,
  oddsFormat,
}: {
  placedBets: PlacedBet[];
  stats: { totalBets: number; wins: number; losses: number; pending: number; totalWagered: number; totalWon: number; parlays: number; parlayWins: number; roi: number };
  onClose: () => void;
  onSettle: (id: string) => void;
  onSettleAll: () => void;
  onCashOut: (id: string) => void;
  oddsFormat: 'american' | 'decimal';
}) {
  const [tab, setTab] = useState<'pending' | 'settled'>('pending');
  const netPL = stats.totalWon - stats.totalWagered;
  const winRate = stats.totalBets > stats.pending ? ((stats.wins / (stats.totalBets - stats.pending)) * 100).toFixed(1) : '0';

  const filteredBets = tab === 'pending'
    ? placedBets.filter(b => b.status === 'pending')
    : placedBets.filter(b => b.status !== 'pending');

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-gray-800">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">My Bets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>

        {/* Stats */}
        <div className="p-4 bg-[#0d1117] grid grid-cols-5 gap-4 border-b border-gray-800">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalBets}</div>
            <div className="text-xs text-gray-500">Total Bets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
            <div className="text-xs text-gray-500">{winRate}% Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
            <div className="text-xs text-gray-500">Losses</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${netPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netPL >= 0 ? '+' : ''}${netPL.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">Net P/L</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">ROI</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setTab('pending')}
            className={`flex-1 py-3 text-sm font-medium transition ${tab === 'pending' ? 'text-white border-b-2 border-green-500' : 'text-gray-500'}`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setTab('settled')}
            className={`flex-1 py-3 text-sm font-medium transition ${tab === 'settled' ? 'text-white border-b-2 border-green-500' : 'text-gray-500'}`}
          >
            Settled ({stats.totalBets - stats.pending})
          </button>
        </div>

        {tab === 'pending' && stats.pending > 0 && (
          <div className="p-3 border-b border-gray-800 bg-[#0d1117]">
            <button onClick={onSettleAll} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium">
              Simulate All ({stats.pending})
            </button>
          </div>
        )}

        {/* Bets List */}
        <div className="overflow-y-auto max-h-[45vh]">
          {filteredBets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No {tab} bets</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredBets.map((bet) => (
                <div key={bet.id} className="p-4 hover:bg-gray-800/30">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded ${bet.isParlay ? 'bg-purple-900 text-purple-300' : 'bg-gray-800 text-gray-400'}`}>
                        {bet.isParlay ? `${bet.legs.length}-Leg Parlay` : 'Straight'}
                      </span>
                      {bet.status !== 'pending' && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          bet.status === 'won' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                        }`}>
                          {bet.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatOdds(bet.combinedOdds)}</div>
                      <div className="text-xs text-gray-500">{new Date(bet.placedAt).toLocaleString()}</div>
                    </div>
                  </div>

                  {bet.legs.map((leg, i) => (
                    <div key={i} className="text-sm text-gray-300 ml-2">
                      • {leg.description} <span className="text-gray-500">({leg.game.awayTeam} @ {leg.game.homeTeam})</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-800">
                    <div className="text-sm">
                      <span className="text-gray-500">Wager:</span> ${bet.wager.toFixed(2)}
                      <span className="mx-2 text-gray-700">|</span>
                      <span className="text-gray-500">To Win:</span>{' '}
                      <span className="text-green-400">${bet.potentialWin.toFixed(2)}</span>
                    </div>
                    {bet.status === 'pending' && (
                      <div className="flex gap-2">
                        {bet.cashOutValue && (
                          <button
                            onClick={() => onCashOut(bet.id)}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs font-medium"
                          >
                            Cash Out ${bet.cashOutValue.toFixed(2)}
                          </button>
                        )}
                        <button
                          onClick={() => onSettle(bet.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium"
                        >
                          Settle
                        </button>
                      </div>
                    )}
                    {bet.status === 'won' && (
                      <span className="text-green-400 font-medium">+${bet.potentialWin.toFixed(2)}</span>
                    )}
                    {bet.status === 'lost' && (
                      <span className="text-red-400 font-medium">-${bet.wager.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileModal({
  userStats,
  balance,
  stats,
  onClose,
}: {
  userStats: UserStats;
  balance: number;
  stats: { totalBets: number; wins: number; losses: number; roi: number };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-md overflow-hidden border border-gray-800">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>

        <div className="p-6">
          {/* Level Progress */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mb-3">
              {userStats.level}
            </div>
            <div className="text-lg font-bold">Level {userStats.level}</div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all"
                style={{ width: `${(userStats.xp / userStats.xpToNext) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{userStats.xp} / {userStats.xpToNext} XP</div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.totalBets}</div>
              <div className="text-xs text-gray-500">Total Bets</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.wins}</div>
              <div className="text-xs text-gray-500">Wins</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-400">{userStats.bestStreak}</div>
              <div className="text-xs text-gray-500">Best Streak</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">${userStats.biggestWin.toFixed(0)}</div>
              <div className="text-xs text-gray-500">Biggest Win</div>
            </div>
          </div>

          {/* Achievements */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Achievements ({userStats.achievements.length}/{Object.keys(ACHIEVEMENTS).length})</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ACHIEVEMENTS).map(([key, ach]) => {
                const unlocked = userStats.achievements.includes(key);
                return (
                  <div
                    key={key}
                    className={`p-2 rounded-lg text-center ${unlocked ? 'bg-gray-800' : 'bg-gray-800/30'}`}
                    title={ach.desc}
                  >
                    <div className={`text-2xl ${unlocked ? '' : 'grayscale opacity-30'}`}>{ach.icon}</div>
                    <div className={`text-[10px] mt-1 ${unlocked ? 'text-gray-300' : 'text-gray-600'}`}>{ach.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EVGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-800">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-[#161b22]">
          <h2 className="text-xl font-bold">Betting Math Guide</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] text-sm">
          <section>
            <h3 className="text-lg font-bold text-green-400 mb-2">Expected Value (EV)</h3>
            <p className="text-gray-400 mb-3">The average profit/loss per bet over time. +EV = profitable long-term.</p>
            <div className="bg-[#0d1117] p-4 rounded-lg font-mono text-xs">
              <div className="text-green-400">EV = (Win% × Profit) - (Loss% × Wager)</div>
              <div className="mt-2 text-gray-500">
                Example: $100 at +150, 45% to win<br/>
                = (0.45 × $150) - (0.55 × $100) = <span className="text-green-400">+$12.50</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-blue-400 mb-2">Implied Probability</h3>
            <div className="bg-[#0d1117] p-4 rounded-lg font-mono text-xs">
              <div className="text-blue-400">Negative: |odds| ÷ (|odds| + 100)</div>
              <div className="text-blue-400">Positive: 100 ÷ (odds + 100)</div>
              <div className="mt-2 text-gray-500">
                -150 → 60% | +200 → 33.3%
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-purple-400 mb-2">Parlay Math</h3>
            <div className="bg-[#0d1117] p-4 rounded-lg font-mono text-xs">
              <div className="text-purple-400">Combined Odds = Decimal₁ × Decimal₂ × ...</div>
              <div className="mt-2 text-gray-500">
                2-leg at -110 each: 1.91 × 1.91 = 3.65 → <span className="text-green-400">+265</span>
              </div>
              <div className="mt-2 text-red-400">
                ⚠️ Vig compounds: 2-leg ~9% | 3-leg ~13% | 4-leg ~17%
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-cyan-400 mb-2">Kelly Criterion</h3>
            <div className="bg-[#0d1117] p-4 rounded-lg font-mono text-xs">
              <div className="text-cyan-400">Bet% = (b×p - q) ÷ b</div>
              <div className="mt-2 text-gray-500">
                b = decimal odds - 1 | p = win prob | q = 1-p
              </div>
              <div className="mt-2 text-yellow-400">💡 Use Quarter Kelly (÷4) to reduce variance</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

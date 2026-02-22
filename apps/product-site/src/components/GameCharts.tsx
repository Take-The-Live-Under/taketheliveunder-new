'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Game } from '@/types/game';

interface ChartDataPoint {
  time: number; // timestamp
  elapsedMinutes: number;
  gameTime: string;
  period: number;
  clock: string;
  homeScore: number;
  awayScore: number;
  liveTotal: number;
  ouLine: number | null;
  requiredPPM: number | null;
  currentPPM: number | null;
  projectedTotal: number | null;
  isUnderTriggered: boolean;
}

interface GameChartsProps {
  gameId: string;
  currentOULine: number | null;
  game: Game; // Pass the full game object for real-time updates
}

// Custom tooltip for terminal style
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-black border border-green-700 p-3 font-mono text-xs">
      <div className="text-green-600 mb-2">// {data.period === 1 ? 'H1' : 'H2'} {data.clock}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-green-700">SCORE:</span>
          <span className="text-green-400">{data.liveTotal}</span>
        </div>
        {data.currentPPM !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-green-700">CUR_PPM:</span>
            <span className="text-green-400">{data.currentPPM?.toFixed(2)}</span>
          </div>
        )}
        {data.requiredPPM !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-green-700">REQ_PPM:</span>
            <span className="text-yellow-400">{data.requiredPPM?.toFixed(2)}</span>
          </div>
        )}
        {data.ouLine !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-green-700">O/U:</span>
            <span className="text-green-400">{data.ouLine}</span>
          </div>
        )}
        {data.isUnderTriggered && (
          <div className="text-yellow-400 mt-1">GOLDEN_ZONE_ACTIVE</div>
        )}
      </div>
    </div>
  );
}

// Custom tooltip for totals chart
function TotalsTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-black border border-green-700 p-3 font-mono text-xs">
      <div className="text-green-600 mb-2">// {data.period === 1 ? 'H1' : 'H2'} {data.clock}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-green-700">LIVE_TOTAL:</span>
          <span className="text-green-400">{data.liveTotal}</span>
        </div>
        {data.ouLine !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-green-700">O/U_LINE:</span>
            <span className="text-yellow-400">{data.ouLine}</span>
          </div>
        )}
        {data.projectedTotal !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-green-700">PROJECTED:</span>
            <span className={data.projectedTotal < (data.ouLine || 999) ? 'text-green-400' : 'text-red-400'}>
              {data.projectedTotal?.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameCharts({ gameId, currentOULine, game }: GameChartsProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [supabaseData, setSupabaseData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [useRealtime, setUseRealtime] = useState(false);
  const lastUpdateRef = useRef<string>('');

  // Try to fetch historical data from Supabase
  const fetchSnapshots = useCallback(async () => {
    try {
      const response = await fetch(`/api/game-snapshots?gameId=${gameId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();

      if (result.timeline && result.timeline.length > 0) {
        // Transform Supabase data
        const transformed = result.timeline.map((d: any) => {
          const totalMinutes = 40;
          const elapsedMinutes = totalMinutes - d.minutesRemaining;
          let projectedTotal: number | null = null;
          if (d.currentPPM !== null && d.minutesRemaining > 0) {
            projectedTotal = d.liveTotal + (d.currentPPM * d.minutesRemaining);
          }
          return {
            time: new Date(d.time).getTime(),
            elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
            gameTime: `${Math.floor(elapsedMinutes)}'`,
            period: d.period,
            clock: d.clock,
            homeScore: d.homeScore,
            awayScore: d.awayScore,
            liveTotal: d.liveTotal,
            ouLine: d.ouLine,
            requiredPPM: d.requiredPPM,
            currentPPM: d.currentPPM,
            projectedTotal,
            isUnderTriggered: d.isUnderTriggered,
          };
        });
        setSupabaseData(transformed);
        setChartData(transformed);
        setUseRealtime(false);
      } else {
        // No Supabase data, use real-time collection
        setUseRealtime(true);
      }
    } catch {
      // Supabase not available, use real-time collection
      setUseRealtime(true);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Add current game state to real-time data
  const addRealtimeDataPoint = useCallback(() => {
    if (!game || game.status !== 'in') return;

    const updateKey = `${game.liveTotal}-${game.clock}-${game.period}`;
    if (updateKey === lastUpdateRef.current) return;
    lastUpdateRef.current = updateKey;

    const totalMinutes = 40;
    const elapsedMinutes = totalMinutes - game.minutesRemainingReg;

    let projectedTotal: number | null = null;
    if (game.currentPPM !== null && game.minutesRemainingReg > 0) {
      projectedTotal = game.liveTotal + (game.currentPPM * game.minutesRemainingReg);
    }

    const newPoint: ChartDataPoint = {
      time: Date.now(),
      elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
      gameTime: `${Math.floor(elapsedMinutes)}'`,
      period: game.period,
      clock: game.clock,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      liveTotal: game.liveTotal,
      ouLine: game.ouLine,
      requiredPPM: game.requiredPPM,
      currentPPM: game.currentPPM,
      projectedTotal,
      isUnderTriggered: game.triggeredFlag,
    };

    setChartData(prev => {
      // Avoid duplicates
      const lastPoint = prev[prev.length - 1];
      if (lastPoint && lastPoint.liveTotal === newPoint.liveTotal &&
          lastPoint.clock === newPoint.clock) {
        return prev;
      }
      return [...prev, newPoint];
    });
  }, [game]);

  // Initial fetch
  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // Real-time data collection
  useEffect(() => {
    if (useRealtime && game.status === 'in') {
      addRealtimeDataPoint();
      const interval = setInterval(addRealtimeDataPoint, 15000); // Every 15 seconds
      return () => clearInterval(interval);
    }
  }, [useRealtime, game, addRealtimeDataPoint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
        <span className="ml-2 text-green-700 text-xs">LOADING_CHART_DATA...</span>
      </div>
    );
  }

  // For non-live games with no data
  if (chartData.length === 0 && game.status !== 'in') {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-xs mb-2">// GAME_NOT_LIVE</div>
        <p className="text-green-700 text-xs">Charts available during live games</p>
      </div>
    );
  }

  // For live games collecting data
  if (chartData.length < 2) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-xs mb-2">// COLLECTING_DATA</div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
          <span className="text-green-500 text-xs">LIVE_TRACKING_ACTIVE</span>
        </div>
        <p className="text-green-700 text-xs">Charts will appear as data accumulates</p>
        <p className="text-green-800 text-[10px] mt-2">Data points: {chartData.length}</p>

        {/* Show current stats while waiting */}
        {game.status === 'in' && (
          <div className="mt-6 border border-green-900 bg-green-900/20 p-4 text-left">
            <div className="text-green-600 text-xs mb-3">// CURRENT_METRICS</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-green-700">SCORE: </span>
                <span className="text-green-400">{game.liveTotal}</span>
              </div>
              <div>
                <span className="text-green-700">O/U: </span>
                <span className="text-green-400">{game.ouLine || '—'}</span>
              </div>
              <div>
                <span className="text-green-700">CUR_PPM: </span>
                <span className="text-green-400">{game.currentPPM?.toFixed(2) || '—'}</span>
              </div>
              <div>
                <span className="text-green-700">REQ_PPM: </span>
                <span className="text-yellow-400">{game.requiredPPM?.toFixed(2) || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Get Y-axis domains with safety checks
  const ppmValues = chartData.flatMap(d => [d.currentPPM, d.requiredPPM]).filter((v): v is number => v !== null);
  const ppmMin = ppmValues.length > 0 ? Math.floor(Math.min(...ppmValues) - 0.5) : 0;
  const ppmMax = ppmValues.length > 0 ? Math.ceil(Math.max(...ppmValues) + 0.5) : 10;

  const totalValues = chartData.flatMap(d => [d.liveTotal, d.ouLine, d.projectedTotal]).filter((v): v is number => v !== null);
  const totalMin = totalValues.length > 0 ? Math.floor(Math.min(...totalValues) * 0.9) : 0;
  const totalMax = totalValues.length > 0 ? Math.ceil(Math.max(...totalValues) * 1.1) : 200;

  return (
    <div className="space-y-6">
      {/* Real-time indicator */}
      {useRealtime && (
        <div className="flex items-center gap-2 text-[10px] text-green-600 border-b border-green-900/50 pb-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          <span>LIVE_TRACKING | {chartData.length} DATA_POINTS</span>
        </div>
      )}

      {/* Pace Chart */}
      <div className="bg-green-900/20 border border-green-900 p-4">
        <h3 className="text-xs font-semibold text-green-400 mb-4">// PACE_ANALYSIS</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
              <XAxis
                dataKey="elapsedMinutes"
                stroke="#166534"
                tick={{ fill: '#166534', fontSize: 10 }}
                tickFormatter={(v) => `${v}'`}
              />
              <YAxis
                domain={[ppmMin, ppmMax]}
                stroke="#166534"
                tick={{ fill: '#166534', fontSize: 10 }}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', color: '#166534' }}
                formatter={(value) => <span className="text-green-600">{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="currentPPM"
                name="CUR_PPM"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 2, fill: '#22c55e' }}
                activeDot={{ r: 4, fill: '#22c55e' }}
              />
              <Line
                type="monotone"
                dataKey="requiredPPM"
                name="REQ_PPM"
                stroke="#eab308"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 2, fill: '#eab308' }}
                activeDot={{ r: 4, fill: '#eab308' }}
              />
              {/* Reference line at 4.5 PPM threshold */}
              <ReferenceLine y={4.5} stroke="#ef4444" strokeDasharray="3 3" />
              {chartData.length > 5 && (
                <Brush
                  dataKey="elapsedMinutes"
                  height={20}
                  stroke="#166534"
                  fill="#0a0a0a"
                  tickFormatter={(v) => `${v}'`}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-green-700">
          <span>// DRAG_TO_ZOOM</span>
          <span className="text-red-400">--- 4.5 TRIGGER</span>
        </div>
      </div>

      {/* Totals Chart */}
      <div className="bg-green-900/20 border border-green-900 p-4">
        <h3 className="text-xs font-semibold text-green-400 mb-4">// TOTAL_MOVEMENT</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#14532d" />
              <XAxis
                dataKey="elapsedMinutes"
                stroke="#166534"
                tick={{ fill: '#166534', fontSize: 10 }}
                tickFormatter={(v) => `${v}'`}
              />
              <YAxis
                domain={[totalMin, totalMax]}
                stroke="#166534"
                tick={{ fill: '#166534', fontSize: 10 }}
              />
              <Tooltip content={<TotalsTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', color: '#166534' }}
                formatter={(value) => <span className="text-green-600">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="liveTotal"
                name="LIVE_TOTAL"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ r: 2, fill: '#22c55e' }}
                activeDot={{ r: 4, fill: '#22c55e' }}
              />
              <Line
                type="monotone"
                dataKey="projectedTotal"
                name="PROJECTED"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
              {/* O/U Line reference */}
              {currentOULine && (
                <ReferenceLine
                  y={currentOULine}
                  stroke="#eab308"
                  strokeWidth={2}
                  label={{
                    value: `O/U ${currentOULine}`,
                    position: 'right',
                    fill: '#eab308',
                    fontSize: 10
                  }}
                />
              )}
              {chartData.length > 5 && (
                <Brush
                  dataKey="elapsedMinutes"
                  height={20}
                  stroke="#166534"
                  fill="#0a0a0a"
                  tickFormatter={(v) => `${v}'`}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-green-700">
          <span>// DRAG_TO_ZOOM</span>
          <span className="text-yellow-400">--- O/U_LINE</span>
        </div>
      </div>
    </div>
  );
}

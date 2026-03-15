"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "recharts";
import { Game } from "@/types/game";

interface ChartDataPoint {
  time: number;
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
  game: Game;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div
      className="rounded-xl border border-neutral-700 p-3 font-mono text-xs"
      style={{
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="text-[#00ffff]/60 mb-2">
        // {data.period === 1 ? "H1" : "H2"} {data.clock}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">SCORE:</span>
          <span className="text-white font-bold">{data.liveTotal}</span>
        </div>
        {data.currentPPM !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">CUR_PPM:</span>
            <span className="text-[#00ffff]">
              {data.currentPPM?.toFixed(2)}
            </span>
          </div>
        )}
        {data.requiredPPM !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">REQ_PPM:</span>
            <span className="text-yellow-400">
              {data.requiredPPM?.toFixed(2)}
            </span>
          </div>
        )}
        {data.ouLine !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">O/U:</span>
            <span className="text-neutral-300">{data.ouLine}</span>
          </div>
        )}
        {data.isUnderTriggered && (
          <div className="text-yellow-400 mt-1">GOLDEN_ZONE_ACTIVE</div>
        )}
      </div>
    </div>
  );
}

function TotalsTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div
      className="rounded-xl border border-neutral-700 p-3 font-mono text-xs"
      style={{
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="text-[#00ffff]/60 mb-2">
        // {data.period === 1 ? "H1" : "H2"} {data.clock}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-600">LIVE_TOTAL:</span>
          <span className="text-white font-bold">{data.liveTotal}</span>
        </div>
        {data.ouLine !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">O/U_LINE:</span>
            <span className="text-yellow-400">{data.ouLine}</span>
          </div>
        )}
        {data.projectedTotal !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">PROJECTED:</span>
            <span
              className={
                data.projectedTotal < (data.ouLine || 999)
                  ? "text-[#00ffff]"
                  : "text-[#ff6b00]"
              }
            >
              {data.projectedTotal?.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameCharts({
  gameId,
  currentOULine,
  game,
}: GameChartsProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [dbData, setDbData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [useRealtime, setUseRealtime] = useState(false);
  const lastUpdateRef = useRef<string>("");

  const fetchSnapshots = useCallback(async () => {
    try {
      const response = await fetch(`/api/game-snapshots?gameId=${gameId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      if (result.timeline && result.timeline.length > 0) {
        const transformed = result.timeline.map((d: any) => {
          const totalMinutes = 40;
          const elapsedMinutes = totalMinutes - d.minutesRemaining;
          let projectedTotal: number | null = null;
          if (d.currentPPM !== null && d.minutesRemaining > 0)
            projectedTotal = d.liveTotal + d.currentPPM * d.minutesRemaining;
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
        setDbData(transformed);
        setChartData(transformed);
        setUseRealtime(false);
      } else {
        setUseRealtime(true);
      }
    } catch {
      setUseRealtime(true);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const addRealtimeDataPoint = useCallback(() => {
    if (!game || game.status !== "in") return;
    const updateKey = `${game.liveTotal}-${game.clock}-${game.period}`;
    if (updateKey === lastUpdateRef.current) return;
    lastUpdateRef.current = updateKey;
    const totalMinutes = 40;
    const elapsedMinutes = totalMinutes - game.minutesRemainingReg;
    let projectedTotal: number | null = null;
    if (game.currentPPM !== null && game.minutesRemainingReg > 0)
      projectedTotal =
        game.liveTotal + game.currentPPM * game.minutesRemainingReg;
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
    setChartData((prev) => {
      const lastPoint = prev[prev.length - 1];
      if (
        lastPoint &&
        lastPoint.liveTotal === newPoint.liveTotal &&
        lastPoint.clock === newPoint.clock
      )
        return prev;
      return [...prev, newPoint];
    });
  }, [game]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);
  useEffect(() => {
    if (useRealtime && game.status === "in") {
      addRealtimeDataPoint();
      const interval = setInterval(addRealtimeDataPoint, 15000);
      return () => clearInterval(interval);
    }
  }, [useRealtime, game, addRealtimeDataPoint]);

  const axisStyle = { fill: "#525252", fontSize: 10 };
  const gridColor = "#262626";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
        <span className="text-neutral-600 text-xs font-mono">
          LOADING_CHART_DATA...
        </span>
      </div>
    );
  }

  if (chartData.length === 0 && game.status !== "in") {
    return (
      <div className="text-center py-8">
        <div className="text-[#00ffff]/60 text-xs mb-2 font-mono">
          // GAME_NOT_LIVE
        </div>
        <p className="text-neutral-600 text-xs">
          Charts available during live games
        </p>
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="text-center py-8">
        <div className="text-[#00ffff]/60 text-xs mb-2 font-mono">
          // COLLECTING_DATA
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
          <span className="text-[#00ffff] text-xs font-mono">
            LIVE_TRACKING_ACTIVE
          </span>
        </div>
        <p className="text-neutral-600 text-xs">
          Charts will appear as data accumulates
        </p>
        <p className="text-neutral-700 text-[10px] mt-2 font-mono">
          Data points: {chartData.length}
        </p>
        {game.status === "in" && (
          <div
            className="mt-6 rounded-xl border border-neutral-800 p-4 text-left"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="text-[#00ffff]/60 text-xs mb-3 font-mono">
              // CURRENT_METRICS
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-neutral-600">SCORE: </span>
                <span className="text-white">{game.liveTotal}</span>
              </div>
              <div>
                <span className="text-neutral-600">O/U: </span>
                <span className="text-[#00ffff]">{game.ouLine || "—"}</span>
              </div>
              <div>
                <span className="text-neutral-600">CUR_PPM: </span>
                <span className="text-[#00ffff]">
                  {game.currentPPM?.toFixed(2) || "—"}
                </span>
              </div>
              <div>
                <span className="text-neutral-600">REQ_PPM: </span>
                <span className="text-yellow-400">
                  {game.requiredPPM?.toFixed(2) || "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const ppmValues = chartData
    .flatMap((d) => [d.currentPPM, d.requiredPPM])
    .filter((v): v is number => v !== null);
  const ppmMin =
    ppmValues.length > 0 ? Math.floor(Math.min(...ppmValues) - 0.5) : 0;
  const ppmMax =
    ppmValues.length > 0 ? Math.ceil(Math.max(...ppmValues) + 0.5) : 10;
  const totalValues = chartData
    .flatMap((d) => [d.liveTotal, d.ouLine, d.projectedTotal])
    .filter((v): v is number => v !== null);
  const totalMin =
    totalValues.length > 0 ? Math.floor(Math.min(...totalValues) * 0.9) : 0;
  const totalMax =
    totalValues.length > 0 ? Math.ceil(Math.max(...totalValues) * 1.1) : 200;

  const ChartCard = ({
    title,
    children,
    note,
  }: {
    title: string;
    children: React.ReactNode;
    note?: React.ReactNode;
  }) => (
    <div
      className="rounded-xl border border-neutral-800 p-4"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <h3 className="text-xs font-semibold text-[#00ffff] mb-4 font-mono">
        {title}
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
      {note && (
        <div className="flex items-center justify-center gap-4 mt-2">
          {note}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {useRealtime && (
        <div className="flex items-center gap-2 text-[10px] text-neutral-600 border-b border-neutral-800 pb-2 font-mono">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ffff]" />
          </span>
          <span>LIVE_TRACKING | {chartData.length} DATA_POINTS</span>
        </div>
      )}

      <ChartCard
        title="// PACE_ANALYSIS"
        note={
          <>
            <span className="text-[10px] text-neutral-700 font-mono">
              // DRAG_TO_ZOOM
            </span>
            <span className="text-[10px] text-red-500 font-mono">
              --- 4.5 TRIGGER
            </span>
          </>
        }
      >
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="elapsedMinutes"
            stroke="#404040"
            tick={axisStyle}
            tickFormatter={(v) => `${v}'`}
          />
          <YAxis
            domain={[ppmMin, ppmMax]}
            stroke="#404040"
            tick={axisStyle}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }}
            formatter={(v) => <span style={{ color: "#525252" }}>{v}</span>}
          />
          <Line
            type="monotone"
            dataKey="currentPPM"
            name="CUR_PPM"
            stroke="#00ffff"
            strokeWidth={2}
            dot={{ r: 2, fill: "#00ffff" }}
            activeDot={{ r: 4, fill: "#00ffff" }}
          />
          <Line
            type="monotone"
            dataKey="requiredPPM"
            name="REQ_PPM"
            stroke="#eab308"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 2, fill: "#eab308" }}
            activeDot={{ r: 4, fill: "#eab308" }}
          />
          <ReferenceLine y={4.5} stroke="#ef4444" strokeDasharray="3 3" />
          {chartData.length > 5 && (
            <Brush
              dataKey="elapsedMinutes"
              height={20}
              stroke="#404040"
              fill="#0a0a0a"
              tickFormatter={(v) => `${v}'`}
            />
          )}
        </LineChart>
      </ChartCard>

      <ChartCard
        title="// OU_LINE_MOVEMENT"
        note={
          <>
            <span className="text-[10px] text-neutral-700 font-mono">
              // LINE_OVER_GAME_TIME
            </span>
            <span className="text-[10px] text-yellow-500 font-mono">
              ── O/U_LINE
            </span>
          </>
        }
      >
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="elapsedMinutes"
            stroke="#404040"
            tick={axisStyle}
            tickFormatter={(v) => `${v}'`}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="#404040"
            tick={axisStyle}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              return (
                <div
                  className="rounded-xl border border-neutral-700 p-3 font-mono text-xs"
                  style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)" }}
                >
                  <div className="text-[#00ffff]/60 mb-2">
                    // {d.period === 1 ? "H1" : "H2"} {d.clock}
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-600">O/U_LINE:</span>
                    <span className="text-yellow-400">{d.ouLine?.toFixed(1) ?? "—"}</span>
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="stepAfter"
            dataKey="ouLine"
            name="O/U_LINE"
            stroke="#eab308"
            strokeWidth={2}
            dot={{ r: 2, fill: "#eab308" }}
            activeDot={{ r: 4, fill: "#eab308" }}
            connectNulls
          />
          {chartData.length > 5 && (
            <Brush
              dataKey="elapsedMinutes"
              height={20}
              stroke="#404040"
              fill="#0a0a0a"
              tickFormatter={(v) => `${v}'`}
            />
          )}
        </LineChart>
      </ChartCard>

      <ChartCard
        title="// TOTAL_MOVEMENT"
        note={
          <>
            <span className="text-[10px] text-neutral-700 font-mono">
              // DRAG_TO_ZOOM
            </span>
            <span className="text-[10px] text-yellow-500 font-mono">
              --- O/U_LINE
            </span>
          </>
        }
      >
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="elapsedMinutes"
            stroke="#404040"
            tick={axisStyle}
            tickFormatter={(v) => `${v}'`}
          />
          <YAxis
            domain={[totalMin, totalMax]}
            stroke="#404040"
            tick={axisStyle}
          />
          <Tooltip content={<TotalsTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }}
            formatter={(v) => <span style={{ color: "#525252" }}>{v}</span>}
          />
          <Area
            type="monotone"
            dataKey="liveTotal"
            name="LIVE_TOTAL"
            stroke="#00ffff"
            fill="#00ffff"
            fillOpacity={0.08}
            strokeWidth={2}
            dot={{ r: 2, fill: "#00ffff" }}
            activeDot={{ r: 4, fill: "#00ffff" }}
          />
          <Line
            type="monotone"
            dataKey="projectedTotal"
            name="PROJECTED"
            stroke="#ff6b00"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={false}
            activeDot={{ r: 4, fill: "#ff6b00" }}
          />
          {currentOULine && (
            <ReferenceLine
              y={currentOULine}
              stroke="#eab308"
              strokeWidth={2}
              label={{
                value: `O/U ${currentOULine}`,
                position: "right",
                fill: "#eab308",
                fontSize: 10,
              }}
            />
          )}
          {chartData.length > 5 && (
            <Brush
              dataKey="elapsedMinutes"
              height={20}
              stroke="#404040"
              fill="#0a0a0a"
              tickFormatter={(v) => `${v}'`}
            />
          )}
        </AreaChart>
      </ChartCard>
    </div>
  );
}

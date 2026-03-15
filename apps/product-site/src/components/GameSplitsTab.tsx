"use client";

import { useEffect, useRef } from "react";

interface PpmSplit {
  split: string;
  homePPM: number | null;
  awayPPM: number | null;
  totalPPM: number | null;
  homePoints: number;
  awayPoints: number;
  complete: boolean;
  live: boolean;
}

interface LinePoint {
  minute: number;
  line: number;
  timestamp: string;
}

interface GameSplitsTabProps {
  homeTeamName: string;
  awayTeamName: string;
  ppmSplits: PpmSplit[];
  lineMovement: LinePoint[];
  currentPeriod: number;
  status: string;
}

function ppmColor(ppm: number | null): string {
  if (ppm === null) return "text-neutral-600";
  if (ppm >= 4.5) return "text-[#ff6b00]";
  if (ppm >= 3.8) return "text-[#00ffff]";
  return "text-neutral-400";
}

function LineMovementChart({ data }: { data: LinePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padL = 44;
    const padR = 12;
    const padT = 12;
    const padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    const lines = data.map((d) => d.line);
    const minLine = Math.min(...lines) - 1;
    const maxLine = Math.max(...lines) + 1;
    const lineRange = maxLine - minLine || 1;

    const minutes = data.map((d) => d.minute);
    const minMin = Math.min(...minutes, 0);
    const maxMin = Math.max(...minutes, 40);
    const minRange = maxMin - minMin || 40;

    function toX(min: number) {
      return padL + ((min - minMin) / minRange) * chartW;
    }
    function toY(line: number) {
      return padT + chartH - ((line - minLine) / lineRange) * chartH;
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
    }

    // X-axis labels (game minutes)
    ctx.fillStyle = "rgba(120,120,120,0.8)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    for (const label of [0, 10, 20, 30, 40]) {
      ctx.fillText(String(label), toX(label), H - 6);
    }

    // Y-axis labels
    ctx.textAlign = "right";
    const ySteps = 3;
    for (let i = 0; i <= ySteps; i++) {
      const val = minLine + (i / ySteps) * lineRange;
      ctx.fillText(val.toFixed(1), padL - 4, toY(val) + 3);
    }

    // Opening line reference (dashed)
    if (data.length > 0) {
      const openLine = data[0].line;
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, toY(openLine));
      ctx.lineTo(padL + chartW, toY(openLine));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Line path
    const gradient = ctx.createLinearGradient(padL, padT, padL + chartW, padT);
    gradient.addColorStop(0, "#00ffff");
    gradient.addColorStop(1, "#0088aa");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toX(point.minute);
      const y = toY(point.line);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots at each data point
    ctx.fillStyle = "#00ffff";
    for (const point of data) {
      ctx.beginPath();
      ctx.arc(toX(point.minute), toY(point.line), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Halftime line
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(toX(20), padT);
    ctx.lineTo(toX(20), padT + chartH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(180,180,180,0.4)";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HT", toX(20), padT + 8);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 rounded-lg border border-neutral-800 bg-neutral-900/40">
        <p className="text-xs text-neutral-600 font-mono">// No line data recorded yet</p>
      </div>
    );
  }

  const firstLine = data[0]?.line ?? null;
  const lastLine = data[data.length - 1]?.line ?? null;
  const movement = firstLine !== null && lastLine !== null ? lastLine - firstLine : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-neutral-600">// O/U LINE OVER TIME</span>
        {movement !== null && (
          <span className={movement > 0 ? "text-[#ff6b00]" : movement < 0 ? "text-[#00ffff]" : "text-neutral-500"}>
            {movement > 0 ? "+" : ""}{movement.toFixed(1)} from open
          </span>
        )}
      </div>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: 140, display: "block" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-neutral-700 font-mono">
        <span>Open: {firstLine?.toFixed(1) ?? "—"}</span>
        <span>Current: {lastLine?.toFixed(1) ?? "—"}</span>
      </div>
    </div>
  );
}

export default function GameSplitsTab({
  homeTeamName,
  awayTeamName,
  ppmSplits,
  lineMovement,
  currentPeriod,
  status,
}: GameSplitsTabProps) {
  const homeShort = homeTeamName.split(" ").pop() ?? homeTeamName;
  const awayShort = awayTeamName.split(" ").pop() ?? awayTeamName;

  const hasSplitData = ppmSplits.some((s) => s.complete);

  return (
    <div className="space-y-6 p-4">
      {/* PPM Splits Table */}
      <div>
        <div className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mb-3">
          // PPM by 10-min split
        </div>
        {!hasSplitData && status === "pre" ? (
          <div className="rounded-lg border border-neutral-800 p-4 text-center">
            <p className="text-xs text-neutral-600 font-mono">Game hasn&apos;t started yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-800 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 bg-neutral-900/60 border-b border-neutral-800 px-3 py-2">
              <span className="text-[10px] text-neutral-600 font-mono uppercase">Split</span>
              <span className="text-[10px] text-neutral-600 font-mono uppercase text-center">{awayShort}</span>
              <span className="text-[10px] text-neutral-600 font-mono uppercase text-center">{homeShort}</span>
              <span className="text-[10px] text-neutral-600 font-mono uppercase text-right">Total</span>
            </div>

            {ppmSplits.map((split, i) => {
              const showData = split.complete || split.live;
              return (
                <div
                  key={split.split}
                  className={`grid grid-cols-4 px-3 py-2.5 ${i < ppmSplits.length - 1 ? "border-b border-neutral-800/50" : ""} ${!showData ? "opacity-40" : ""} ${split.live ? "bg-[#00ffff]/[0.03]" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-neutral-400">{split.split}</span>
                    {split.live && (
                      <span className="text-[9px] font-mono text-[#00ffff] animate-pulse">live</span>
                    )}
                  </div>
                  <div className="text-center">
                    {showData ? (
                      <div>
                        <div className={`text-sm font-bold font-mono tabular-nums ${ppmColor(split.awayPPM)} ${split.live ? "opacity-80" : ""}`}>
                          {split.live && <span className="text-[10px] text-neutral-600">~</span>}{split.awayPPM?.toFixed(2) ?? "—"}
                        </div>
                        <div className="text-[10px] text-neutral-700 font-mono">{split.awayPoints}pts</div>
                      </div>
                    ) : (
                      <span className="text-neutral-700 font-mono text-sm">—</span>
                    )}
                  </div>
                  <div className="text-center">
                    {showData ? (
                      <div>
                        <div className={`text-sm font-bold font-mono tabular-nums ${ppmColor(split.homePPM)} ${split.live ? "opacity-80" : ""}`}>
                          {split.live && <span className="text-[10px] text-neutral-600">~</span>}{split.homePPM?.toFixed(2) ?? "—"}
                        </div>
                        <div className="text-[10px] text-neutral-700 font-mono">{split.homePoints}pts</div>
                      </div>
                    ) : (
                      <span className="text-neutral-700 font-mono text-sm">—</span>
                    )}
                  </div>
                  <div className="text-right">
                    {showData ? (
                      <div>
                        <div className={`text-sm font-bold font-mono tabular-nums ${ppmColor(split.totalPPM)} ${split.live ? "opacity-80" : ""}`}>
                          {split.live && <span className="text-[10px] text-neutral-600">~</span>}{split.totalPPM?.toFixed(2) ?? "—"}
                        </div>
                        <div className="text-[10px] text-neutral-700 font-mono">
                          {split.homePoints + split.awayPoints}pts
                        </div>
                      </div>
                    ) : (
                      <span className="text-neutral-700 font-mono text-sm">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-2 flex gap-4 text-[10px] font-mono text-neutral-700">
          <span className="text-[#ff6b00]">■ ≥ 4.5 PPM hot</span>
          <span className="text-[#00ffff]">■ 3.8–4.5 PPM</span>
          <span className="text-neutral-600">■ &lt; 3.8 PPM cold</span>
        </div>
      </div>

      {/* Line Movement Chart */}
      <div>
        <div className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest mb-3">
          // O/U line movement
        </div>
        <LineMovementChart data={lineMovement} />
      </div>
    </div>
  );
}

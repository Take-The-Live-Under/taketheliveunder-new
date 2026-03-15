"use client";

interface StatBarProps {
  label: string;
  valueA: number;
  valueB: number;
  nameA: string;
  nameB: string;
  higherIsBetter?: boolean; // false for defensive stats where lower = better
  format?: (v: number) => string;
  colorA?: string;
  colorB?: string;
}

export function StatComparisonBar({
  label,
  valueA,
  valueB,
  nameA,
  nameB,
  higherIsBetter = true,
  format = (v) => v.toFixed(1),
  colorA = '#00ffff',
  colorB = '#ff6b00',
}: StatBarProps) {
  const total = valueA + valueB;
  const pctA = total > 0 ? (valueA / total) * 100 : 50;
  const pctB = 100 - pctA;
  const winnerA = higherIsBetter ? valueA > valueB : valueA < valueB;
  const winnerB = higherIsBetter ? valueB > valueA : valueB < valueA;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className={`tabular-nums font-bold ${winnerA ? `text-[${colorA}]` : 'text-neutral-500'}`} style={{ color: winnerA ? colorA : undefined }}>
          {format(valueA)}
        </span>
        <span className="text-neutral-600 text-[9px] tracking-widest uppercase">{label}</span>
        <span className={`tabular-nums font-bold ${winnerB ? `text-[${colorB}]` : 'text-neutral-500'}`} style={{ color: winnerB ? colorB : undefined }}>
          {format(valueB)}
        </span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-neutral-900">
        <div
          className="h-full rounded-l-full transition-all duration-700"
          style={{ width: `${pctA}%`, background: colorA, opacity: winnerA ? 1 : 0.35 }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-700"
          style={{ width: `${pctB}%`, background: colorB, opacity: winnerB ? 1 : 0.35 }}
        />
      </div>
    </div>
  );
}

interface StatBarGroupProps {
  nameA: string;
  nameB: string;
  colorA?: string;
  colorB?: string;
  stats: {
    label: string;
    valueA: number;
    valueB: number;
    higherIsBetter?: boolean;
    format?: (v: number) => string;
  }[];
}

export function StatBarGroup({ nameA, nameB, colorA = '#00ffff', colorB = '#ff6b00', stats }: StatBarGroupProps) {
  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center justify-between text-[9px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: colorA }} />
          <span style={{ color: colorA }}>{nameA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: colorB }}>{nameB}</span>
          <div className="w-2 h-2 rounded-full" style={{ background: colorB }} />
        </div>
      </div>
      {stats.map(s => (
        <StatComparisonBar
          key={s.label}
          label={s.label}
          valueA={s.valueA}
          valueB={s.valueB}
          nameA={nameA}
          nameB={nameB}
          higherIsBetter={s.higherIsBetter}
          format={s.format}
          colorA={colorA}
          colorB={colorB}
        />
      ))}
    </div>
  );
}

// ─── Pace Meter ──────────────────────────────────────────────────────────────

interface PaceMeterProps {
  pace: number; // 58–80 typical range
  label?: string;
}

export function PaceMeter({ pace, label }: PaceMeterProps) {
  const MIN = 60;
  const MAX = 78;
  const pct = Math.max(0, Math.min(100, ((pace - MIN) / (MAX - MIN)) * 100));
  const color = pace > 72 ? '#ff6b00' : pace > 68 ? '#eab308' : '#00ffff';
  const paceLabel = pace > 72 ? 'FAST' : pace > 68 ? 'MODERATE' : 'SLOW';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-neutral-600 tracking-widest">{label ?? 'PACE'}</span>
        <span className="font-bold tabular-nums" style={{ color }}>{pace.toFixed(1)}</span>
      </div>
      {/* Track */}
      <div className="relative h-3 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #00ffff, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
        {/* Zone markers */}
        <div className="absolute inset-y-0 w-px bg-neutral-700" style={{ left: '33%' }} />
        <div className="absolute inset-y-0 w-px bg-neutral-700" style={{ left: '66%' }} />
      </div>
      <div className="flex justify-between text-[8px] font-mono text-neutral-700">
        <span>SLOW</span>
        <span style={{ color }}>{paceLabel}</span>
        <span>FAST</span>
      </div>
    </div>
  );
}

// ─── Confidence Gauge ────────────────────────────────────────────────────────

interface ConfidenceGaugeProps {
  score: number; // 0–100
}

export function ConfidenceGauge({ score }: ConfidenceGaugeProps) {
  const color = score >= 70 ? '#00ffff' : score >= 45 ? '#eab308' : '#ef4444';
  const label = score >= 70 ? 'HIGH CONFIDENCE' : score >= 45 ? 'MODERATE' : 'LOW — HIGH VARIANCE';

  // Arc SVG gauge
  const radius = 36;
  const circumference = Math.PI * radius; // half circle
  const strokePct = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase">Confidence</div>
      <div className="relative w-24 h-12 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full h-full" style={{ overflow: 'visible' }}>
          {/* Background arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#262626"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 125.6} 125.6`}
            style={{ filter: `drop-shadow(0 0 4px ${color}80)`, transition: 'stroke-dasharray 1s ease' }}
          />
          {/* Center value */}
          <text x="50" y="46" textAnchor="middle" className="font-mono font-bold" fontSize="14" fill={color}>
            {score}
          </text>
        </svg>
      </div>
      <div className="text-[9px] font-mono font-bold tracking-wider" style={{ color }}>{label}</div>
    </div>
  );
}

// ─── Over/Under Lean Bar ─────────────────────────────────────────────────────

interface OverUnderLeanProps {
  lean: number; // -100 (strong under) to +100 (strong over)
  projectedTotal: number;
  line?: number;
}

export function OverUnderLean({ lean, projectedTotal, line }: OverUnderLeanProps) {
  const isOver = lean > 0;
  const absLean = Math.abs(lean);
  const color = isOver ? '#ff6b00' : '#00ffff';
  const label = absLean >= 70 ? (isOver ? 'STRONG OVER' : 'STRONG UNDER')
    : absLean >= 35 ? (isOver ? 'LEAN OVER' : 'LEAN UNDER')
    : 'PUSH ZONE';

  // Bar position: lean maps -100→0%, 0→50%, +100→100%
  const markerPct = ((lean + 100) / 200) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-[#00ffff]">UNDER</span>
        <span className="text-neutral-600 text-[9px]">{line ? `O/U ${line}` : 'PROJECTED'}</span>
        <span className="text-[#ff6b00]">OVER</span>
      </div>
      {/* Track */}
      <div className="relative h-4 rounded-full bg-neutral-900 border border-neutral-800">
        {/* Center line */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-700" />
        {/* Fill from center */}
        {isOver ? (
          <div
            className="absolute inset-y-1 rounded-full transition-all duration-700"
            style={{
              left: '50%',
              width: `${absLean / 2}%`,
              background: '#ff6b00',
              boxShadow: '0 0 8px #ff6b0060',
            }}
          />
        ) : (
          <div
            className="absolute inset-y-1 rounded-full transition-all duration-700"
            style={{
              right: '50%',
              width: `${absLean / 2}%`,
              background: '#00ffff',
              boxShadow: '0 0 8px #00ffff60',
            }}
          />
        )}
        {/* Marker */}
        <div
          className="absolute top-0 w-1 h-full rounded-full transition-all duration-700"
          style={{
            left: `calc(${markerPct}% - 2px)`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-3 text-[10px] font-mono">
        <span className="font-bold" style={{ color }}>{label}</span>
        <span className="text-neutral-700">·</span>
        <span className="text-neutral-500">PROJ <span className="text-white font-bold">{projectedTotal.toFixed(1)}</span></span>
      </div>
    </div>
  );
}

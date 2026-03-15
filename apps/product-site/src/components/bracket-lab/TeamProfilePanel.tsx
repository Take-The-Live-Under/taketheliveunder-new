"use client";

import { BracketTeam } from './mockData';

interface TeamProfilePanelProps {
  team: BracketTeam;
  side: 'left' | 'right';
  winProb: number;
  projectedScore: number;
}

function FormPip({ result }: { result: 'W' | 'L' }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold font-mono ${
        result === 'W'
          ? 'bg-[#00ffff]/10 border border-[#00ffff]/40 text-[#00ffff]'
          : 'bg-red-950/40 border border-red-900/40 text-red-500'
      }`}
    >
      {result}
    </span>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/50 last:border-0">
      <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wide">{label}</span>
      <span className={`text-xs font-mono font-bold tabular-nums ${highlight ? 'text-[#00ffff]' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

export default function TeamProfilePanel({ team, side, winProb, projectedScore }: TeamProfilePanelProps) {
  const isLeft = side === 'left';
  const winColor = winProb >= 55 ? '#00ffff' : winProb <= 45 ? '#ff6b00' : '#a3a3a3';

  return (
    <div
      className={`rounded-xl border overflow-hidden flex flex-col ${
        winProb >= 55
          ? 'border-[#00ffff]/30 shadow-[0_0_20px_rgba(0,255,255,0.08)]'
          : 'border-neutral-800'
      }`}
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Team Header */}
      <div
        className={`p-4 border-b border-neutral-800 ${isLeft ? '' : 'text-right'}`}
        style={{
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div className={`flex items-center gap-3 ${isLeft ? '' : 'flex-row-reverse'}`}>
          {/* Logo */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border border-neutral-800 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {team.logoPlaceholder}
          </div>
          <div className={isLeft ? '' : 'text-right'}>
            <div className="flex items-center gap-2" style={{ justifyContent: isLeft ? 'flex-start' : 'flex-end' }}>
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold font-mono bg-neutral-800 border border-neutral-700 text-neutral-400"
              >
                {team.seed}
              </span>
              <span className="text-[10px] font-mono text-neutral-500">{team.conference}</span>
            </div>
            <h3 className="text-base font-bold font-mono text-white mt-0.5">{team.shortName}</h3>
            <p className="text-[10px] font-mono text-neutral-600">{team.name}</p>
          </div>
        </div>

        {/* Record + Style */}
        <div className={`flex items-center gap-2 mt-3 ${isLeft ? '' : 'flex-row-reverse'}`}>
          <span className="text-xs font-mono font-bold text-white">{team.record}</span>
          <span className="text-neutral-700">·</span>
          <span className="text-[10px] font-mono text-neutral-500">{team.style}</span>
        </div>

        {/* Recent Form */}
        <div className={`flex items-center gap-1.5 mt-2 ${isLeft ? '' : 'flex-row-reverse'}`}>
          <span className="text-[9px] font-mono text-neutral-700 mr-1">FORM</span>
          {[...team.metrics.last5].reverse().map((r, i) => (
            <FormPip key={i} result={r} />
          ))}
          <span className="text-[9px] font-mono text-neutral-600 ml-1">{team.metrics.streak}</span>
        </div>
      </div>

      {/* Win Probability */}
      <div className="px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono text-neutral-600 tracking-widest">WIN PROB</span>
          <span className="text-sm font-mono font-bold tabular-nums" style={{ color: winColor }}>
            {winProb}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-900 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${winProb}%`,
              background: `linear-gradient(90deg, ${winColor}40, ${winColor})`,
              boxShadow: `0 0 6px ${winColor}60`,
            }}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="px-4 py-3 flex-1">
        <div className="text-[9px] font-mono text-neutral-700 tracking-widest mb-2 uppercase">// Key Metrics</div>

        <div className="space-y-0">
          <MetricRow label="OFF EFF" value={`${team.metrics.offEff.toFixed(1)} (#${team.metrics.offEffRank})`} highlight={team.metrics.offEffRank <= 15} />
          <MetricRow label="DEF EFF" value={`${team.metrics.defEff.toFixed(1)} (#${team.metrics.defEffRank})`} highlight={team.metrics.defEffRank <= 15} />
          <MetricRow label="TEMPO" value={`${team.metrics.adjustedTempo.toFixed(1)} pos/40`} />
          <MetricRow label="eFG%" value={`${team.metrics.effectiveFGPct.toFixed(1)}%`} highlight={team.metrics.effectiveFGPct > 55} />
          <MetricRow label="3PT RATE" value={`${team.metrics.threePtRate.toFixed(1)}%`} />
          <MetricRow label="TO RATE" value={`${team.metrics.toRate.toFixed(1)}`} />
          <MetricRow label="OFF REB%" value={`${team.metrics.offRebPct.toFixed(1)}%`} />
          <MetricRow label="AVG TOTAL" value={`${team.metrics.avgTotal.toFixed(1)}`} />
        </div>
      </div>

      {/* Projected Score */}
      <div
        className="px-4 py-3 border-t border-neutral-800 text-center"
        style={{ background: 'rgba(0,255,255,0.02)' }}
      >
        <div className="text-[9px] font-mono text-neutral-600 mb-1">PROJECTED PTS</div>
        <div className="text-2xl font-bold font-mono tabular-nums text-[#00ffff]">
          {projectedScore.toFixed(0)}
        </div>
      </div>
    </div>
  );
}

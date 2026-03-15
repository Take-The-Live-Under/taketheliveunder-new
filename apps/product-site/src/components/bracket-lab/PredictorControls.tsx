"use client";

import { PredictorWeights, DEFAULT_WEIGHTS } from './projectionEngine';

interface SliderRowProps {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  color?: string;
}

function SliderRow({ label, sublabel, value, onChange, color = '#00ffff' }: SliderRowProps) {
  const pct = value;
  const intensity = value >= 75 ? 'HIGH' : value >= 40 ? 'MED' : 'LOW';
  const intensityColor = value >= 75 ? color : value >= 40 ? '#eab308' : '#525252';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono font-semibold text-white">{label}</div>
          <div className="text-[9px] font-mono text-neutral-600">{sublabel}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold tracking-widest" style={{ color: intensityColor }}>
            {intensity}
          </span>
          <span className="text-xs font-mono font-bold tabular-nums w-8 text-right" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      {/* Custom slider */}
      <div className="relative">
        <div className="relative h-2 rounded-full bg-neutral-900 border border-neutral-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}40, ${color})`,
              boxShadow: `0 0 6px ${color}40`,
            }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ margin: 0 }}
        />
        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#0a0a0a] pointer-events-none transition-all duration-150"
          style={{
            left: `calc(${pct}% - 6px)`,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

interface PredictorControlsProps {
  weights: PredictorWeights;
  onChange: (key: keyof PredictorWeights, value: number) => void;
  onReset: () => void;
}

const SLIDER_DEFS: {
  key: keyof PredictorWeights;
  label: string;
  sublabel: string;
  color: string;
}[] = [
  { key: 'tempo',       label: 'TEMPO WEIGHT',      sublabel: 'Influence of pace on total',       color: '#00ffff' },
  { key: 'offEff',      label: 'OFF EFFICIENCY',     sublabel: 'Points per possession weight',     color: '#00ffff' },
  { key: 'defEff',      label: 'DEF EFFICIENCY',     sublabel: 'Defensive resistance weight',      color: '#00ffff' },
  { key: 'threePtRate', label: '3PT INFLUENCE',      sublabel: '3-point attempt rate factor',      color: '#eab308' },
  { key: 'rebounding',  label: 'REBOUND CONTROL',    sublabel: 'Second chance scoring impact',     color: '#eab308' },
  { key: 'turnovers',   label: 'TURNOVER PRESSURE',  sublabel: 'Forced TO rate influence',        color: '#eab308' },
  { key: 'recentForm',  label: 'RECENT FORM',        sublabel: 'Last 5 game trend weight',         color: '#ff6b00' },
  { key: 'variance',    label: 'VARIANCE / CHAOS',   sublabel: 'Volatility and unpredictability',  color: '#ff00ff' },
];

export default function PredictorControls({ weights, onChange, onReset }: PredictorControlsProps) {
  const isDefault = JSON.stringify(weights) === JSON.stringify(DEFAULT_WEIGHTS);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono font-bold text-white tracking-wider">PREDICTOR CONTROLS</div>
          <div className="text-[9px] font-mono text-neutral-600">Adjust weighting — projection updates live</div>
        </div>
        {!isDefault && (
          <button
            onClick={onReset}
            className="text-[9px] font-mono text-neutral-600 hover:text-[#00ffff] transition-colors border border-neutral-800 hover:border-[#00ffff]/40 px-2 py-1 rounded"
          >
            RESET
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-[#00ffff]/20 via-neutral-800 to-transparent" />

      {/* Sliders */}
      <div className="space-y-5">
        {SLIDER_DEFS.map(def => (
          <SliderRow
            key={def.key}
            label={def.label}
            sublabel={def.sublabel}
            value={weights[def.key]}
            onChange={v => onChange(def.key, v)}
            color={def.color}
          />
        ))}
      </div>

      {/* Preset buttons */}
      <div className="pt-2 border-t border-neutral-800">
        <div className="text-[9px] font-mono text-neutral-600 mb-2 tracking-widest">PRESETS</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'PACE_FIRST',  weights: { tempo: 90, offEff: 60, defEff: 50, threePtRate: 40, rebounding: 40, turnovers: 40, recentForm: 70, variance: 20 } },
            { label: 'DEF_FOCUS',   weights: { tempo: 50, offEff: 70, defEff: 95, threePtRate: 30, rebounding: 75, turnovers: 80, recentForm: 60, variance: 15 } },
            { label: 'CHAOS_MODE',  weights: { tempo: 60, offEff: 50, defEff: 40, threePtRate: 80, rebounding: 30, turnovers: 30, recentForm: 90, variance: 100 } },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => {
                Object.entries(preset.weights).forEach(([k, v]) => onChange(k as keyof PredictorWeights, v));
              }}
              className="py-1.5 text-[9px] font-mono font-bold rounded border border-neutral-800 text-neutral-500 hover:border-[#00ffff]/40 hover:text-[#00ffff] transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { TriggerSettings, PRESETS, DEFAULT_SETTINGS } from "@/hooks/useTriggerSettings";

interface Props {
  settings: TriggerSettings;
  onUpdate: <K extends keyof TriggerSettings>(key: K, value: TriggerSettings[K]) => void;
  onReset: () => void;
}

interface SliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (v: number) => void;
}

function Slider({ label, description, value, min, max, step, defaultValue, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const isModified = value !== defaultValue;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-neutral-300 font-mono">{label}</span>
          <span className="ml-2 text-[10px] text-neutral-600 font-mono">{description}</span>
        </div>
        <span className={`text-sm font-bold font-mono tabular-nums ${isModified ? "text-[#00ffff]" : "text-neutral-400"}`}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-neutral-800"
          style={{
            background: `linear-gradient(to right, ${isModified ? "#00ffff" : "#404040"} ${pct}%, #262626 ${pct}%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-neutral-700 font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function TriggerSettingsPanel({ settings, onUpdate, onReset }: Props) {
  const isDefault =
    settings.minRequiredPPM === DEFAULT_SETTINGS.minRequiredPPM &&
    settings.underGapMin === DEFAULT_SETTINGS.underGapMin &&
    settings.overGapMin === DEFAULT_SETTINGS.overGapMin;

  const activePreset = Object.entries(PRESETS).find(([, p]) =>
    p.minRequiredPPM === settings.minRequiredPPM &&
    p.underGapMin === settings.underGapMin &&
    p.overGapMin === settings.overGapMin,
  )?.[0] ?? null;

  return (
    <div className="rounded-xl border border-neutral-800 p-4 space-y-4" style={{ background: "rgba(18,18,18,0.95)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
            // TRIGGER SETTINGS
          </span>
          {!isDefault && (
            <span className="px-1.5 py-0.5 rounded border border-[#00ffff]/30 text-[10px] text-[#00ffff] font-mono">
              MODIFIED
            </span>
          )}
        </div>
        {!isDefault && (
          <button
            onClick={onReset}
            className="text-[10px] text-neutral-600 hover:text-neutral-300 font-mono transition-colors tap-target"
          >
            Reset defaults
          </button>
        )}
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {(["conservative", "default", "aggressive"] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => {
              const p = PRESETS[preset];
              onUpdate("minRequiredPPM", p.minRequiredPPM);
              onUpdate("underGapMin", p.underGapMin);
              onUpdate("overGapMin", p.overGapMin);
            }}
            className={`flex-1 py-1.5 rounded-lg border text-xs font-mono capitalize transition-all tap-target ${
              activePreset === preset
                ? "bg-[#00ffff]/10 border-[#00ffff]/40 text-[#00ffff]"
                : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-4 pt-1">
        <Slider
          label="Min Req PPM"
          description="baseline threshold"
          value={settings.minRequiredPPM}
          min={4.0}
          max={6.0}
          step={0.1}
          defaultValue={DEFAULT_SETTINGS.minRequiredPPM}
          onChange={(v) => onUpdate("minRequiredPPM", v)}
        />
        <Slider
          label="Under Gap"
          description="req − cur PPM"
          value={settings.underGapMin}
          min={0.8}
          max={2.0}
          step={0.1}
          defaultValue={DEFAULT_SETTINGS.underGapMin}
          onChange={(v) => onUpdate("underGapMin", v)}
        />
        <Slider
          label="Over Gap"
          description="cur − req PPM"
          value={settings.overGapMin}
          min={0.1}
          max={1.0}
          step={0.1}
          defaultValue={DEFAULT_SETTINGS.overGapMin}
          onChange={(v) => onUpdate("overGapMin", v)}
        />
      </div>

      <p className="text-[10px] text-neutral-700 font-mono leading-relaxed">
        // Changes apply to the Triggers tab in real time. Saved locally.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { TriggerSettings, PRESETS, DEFAULT_SETTINGS } from "@/hooks/useTriggerSettings";

interface Props {
  settings: TriggerSettings;
  onUpdate: <K extends keyof TriggerSettings>(key: K, value: TriggerSettings[K]) => void;
  onReset: () => void;
}

interface SettingRowProps {
  label: string;
  description: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function SettingRow({ label, description, value, defaultValue, min, max, step, onChange }: SettingRowProps) {
  const [inputVal, setInputVal] = useState(value.toFixed(1));
  const [focused, setFocused] = useState(false);
  const isModified = value !== defaultValue;
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  // Keep input in sync when value changes externally (e.g. preset applied)
  const displayVal = focused ? inputVal : value.toFixed(1);

  function commit(raw: string) {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      // Allow any number — no clamping, user is free to set what they want
      const rounded = Math.round(parsed * 10) / 10;
      onChange(rounded);
      setInputVal(rounded.toFixed(1));
    } else {
      setInputVal(value.toFixed(1));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-neutral-300 font-mono">{label}</span>
          <span className="ml-2 text-[10px] text-neutral-600 font-mono">{description}</span>
        </div>
        {/* Direct number input */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => { const v = Math.round((value - step) * 10) / 10; onChange(v); setInputVal(v.toFixed(1)); }}
            className="w-6 h-6 rounded border border-neutral-700 text-neutral-400 hover:border-[#00ffff]/50 hover:text-[#00ffff] transition-all text-sm font-bold flex items-center justify-center leading-none"
          >−</button>
          <input
            type="number"
            value={displayVal}
            step={step}
            onChange={(e) => setInputVal(e.target.value)}
            onFocus={() => { setFocused(true); setInputVal(value.toFixed(1)); }}
            onBlur={(e) => { setFocused(false); commit(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") { setFocused(false); commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
            className={`w-16 text-center text-sm font-bold font-mono tabular-nums rounded-lg border bg-neutral-900 px-1 py-1 outline-none transition-all
              ${isModified
                ? "border-[#00ffff]/50 text-[#00ffff]"
                : "border-neutral-700 text-neutral-300"}
              focus:border-[#00ffff] focus:text-white
            `}
          />
          <button
            onClick={() => { const v = Math.round((value + step) * 10) / 10; onChange(v); setInputVal(v.toFixed(1)); }}
            className="w-6 h-6 rounded border border-neutral-700 text-neutral-400 hover:border-[#00ffff]/50 hover:text-[#00ffff] transition-all text-sm font-bold flex items-center justify-center leading-none"
          >+</button>
        </div>
      </div>

      {/* Slider — purely visual, wide range for reference */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => { const v = parseFloat(e.target.value); onChange(v); setInputVal(v.toFixed(1)); }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${isModified ? "#00ffff" : "#404040"} ${pct}%, #262626 ${pct}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-neutral-700 font-mono mt-0.5">
          <span>{min}</span>
          <span className="text-neutral-600">type any value ↑</span>
          <span>{max}</span>
        </div>
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
            className="text-[10px] text-neutral-600 hover:text-neutral-300 font-mono transition-colors"
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
            className={`flex-1 py-1.5 rounded-lg border text-xs font-mono capitalize transition-all ${
              activePreset === preset
                ? "bg-[#00ffff]/10 border-[#00ffff]/40 text-[#00ffff]"
                : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Settings rows */}
      <div className="space-y-5 pt-1">
        <SettingRow
          label="Min Req PPM"
          description="baseline threshold"
          value={settings.minRequiredPPM}
          defaultValue={DEFAULT_SETTINGS.minRequiredPPM}
          min={3.0}
          max={7.0}
          step={0.1}
          onChange={(v) => onUpdate("minRequiredPPM", v)}
        />
        <SettingRow
          label="Under Gap"
          description="req − cur PPM"
          value={settings.underGapMin}
          defaultValue={DEFAULT_SETTINGS.underGapMin}
          min={0.1}
          max={3.0}
          step={0.1}
          onChange={(v) => onUpdate("underGapMin", v)}
        />
        <SettingRow
          label="Over Gap"
          description="cur − req PPM"
          value={settings.overGapMin}
          defaultValue={DEFAULT_SETTINGS.overGapMin}
          min={0.1}
          max={2.0}
          step={0.1}
          onChange={(v) => onUpdate("overGapMin", v)}
        />
      </div>

      <p className="text-[10px] text-neutral-700 font-mono leading-relaxed">
        // Type any value or use +/− buttons. Changes apply in real time. Saved locally.
      </p>
    </div>
  );
}

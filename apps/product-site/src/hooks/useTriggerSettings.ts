"use client";

import { useState, useCallback } from "react";

export interface TriggerSettings {
  minRequiredPPM: number; // minimum requiredPPM to qualify — default 4.7
  underGapMin: number;    // minimum (requiredPPM - currentPPM) for under trigger — default 1.2
  overGapMin: number;     // minimum (currentPPM - requiredPPM) for over trigger — default 0.3
}

export const DEFAULT_SETTINGS: TriggerSettings = {
  minRequiredPPM: 4.7,
  underGapMin: 1.2,
  overGapMin: 0.3,
};

export const PRESETS: Record<string, TriggerSettings> = {
  conservative: { minRequiredPPM: 5.2, underGapMin: 1.5, overGapMin: 0.5 },
  default: DEFAULT_SETTINGS,
  aggressive: { minRequiredPPM: 4.3, underGapMin: 0.9, overGapMin: 0.2 },
};

function loadSettings(): TriggerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("ttlu_trigger_settings");
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<TriggerSettings>;
    return {
      minRequiredPPM: parsed.minRequiredPPM ?? DEFAULT_SETTINGS.minRequiredPPM,
      underGapMin: parsed.underGapMin ?? DEFAULT_SETTINGS.underGapMin,
      overGapMin: parsed.overGapMin ?? DEFAULT_SETTINGS.overGapMin,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: TriggerSettings) {
  try {
    localStorage.setItem("ttlu_trigger_settings", JSON.stringify(s));
  } catch {}
}

export function useTriggerSettings() {
  const [settings, setSettings] = useState<TriggerSettings>(loadSettings);

  const updateSetting = useCallback(
    <K extends keyof TriggerSettings>(key: K, value: TriggerSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  const applyPreset = useCallback((preset: keyof typeof PRESETS) => {
    const next = PRESETS[preset];
    saveSettings(next);
    setSettings(next);
  }, []);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const isDefault =
    settings.minRequiredPPM === DEFAULT_SETTINGS.minRequiredPPM &&
    settings.underGapMin === DEFAULT_SETTINGS.underGapMin &&
    settings.overGapMin === DEFAULT_SETTINGS.overGapMin;

  return { settings, updateSetting, applyPreset, resetSettings, isDefault };
}

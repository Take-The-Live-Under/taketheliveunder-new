'use client';

import React from 'react';
import clsx from 'clsx';

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  className?: string;
  colorScheme?: 'purple' | 'orange' | 'teal';
}

export default function RangeSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  className,
  colorScheme = 'purple'
}: RangeSliderProps) {
  const [minVal, maxVal] = value;

  const colorClasses = {
    purple: 'bg-brand-purple-500',
    orange: 'bg-brand-orange-500',
    teal: 'bg-brand-teal-500',
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(parseFloat(e.target.value), maxVal - step);
    onChange([newMin, maxVal]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(parseFloat(e.target.value), minVal + step);
    onChange([minVal, newMax]);
  };

  const progressPercentage = {
    left: ((minVal - min) / (max - min)) * 100,
    right: 100 - ((maxVal - min) / (max - min)) * 100,
  };

  return (
    <div className={clsx('space-y-2', className)} role="group" aria-labelledby={`${label}-label`}>
      <div className="flex justify-between items-center">
        <label id={`${label}-label`} className="text-sm font-medium text-deep-slate-300">
          {label}
        </label>
        <span className="text-xs font-mono text-deep-slate-400">
          {minVal.toFixed(1)} - {maxVal.toFixed(1)}
        </span>
      </div>

      <div className="relative pt-2 pb-4">
        {/* Track */}
        <div className="absolute top-5 left-0 right-0 h-1.5 bg-deep-slate-700 rounded-full">
          {/* Active range */}
          <div
            className={clsx('absolute h-full rounded-full transition-all', colorClasses[colorScheme])}
            style={{
              left: `${progressPercentage.left}%`,
              right: `${progressPercentage.right}%`,
            }}
          />
        </div>

        {/* Min slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={handleMinChange}
          className="range-slider"
          aria-label={`${label} minimum`}
          style={{ zIndex: minVal > max - 1 ? 5 : undefined }}
        />

        {/* Max slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={handleMaxChange}
          className="range-slider"
          aria-label={`${label} maximum`}
        />
      </div>

      {/* Value indicators */}
      <div className="flex justify-between text-xs text-deep-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      <style jsx>{`
        .range-slider {
          position: absolute;
          width: 100%;
          height: 0;
          pointer-events: none;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          outline: none;
        }

        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 2px solid rgb(var(--slider-color, 168, 85, 247));
          transition: all 0.15s ease;
        }

        .range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }

        .range-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 2px solid rgb(var(--slider-color, 168, 85, 247));
          transition: all 0.15s ease;
        }

        .range-slider::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }

        .range-slider:focus::-webkit-slider-thumb {
          outline: 2px solid rgba(168, 85, 247, 0.5);
          outline-offset: 2px;
        }

        .range-slider:focus::-moz-range-thumb {
          outline: 2px solid rgba(168, 85, 247, 0.5);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

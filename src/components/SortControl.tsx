'use client';

import React from 'react';
import clsx from 'clsx';

interface SortControlProps {
  value: string;
  direction: 'asc' | 'desc';
  onChange: (value: string) => void;
  onDirectionChange: (direction: 'asc' | 'desc') => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export default function SortControl({
  value,
  direction,
  onChange,
  onDirectionChange,
  options,
  className
}: SortControlProps) {
  const toggleDirection = () => {
    onDirectionChange(direction === 'desc' ? 'asc' : 'desc');
  };

  const currentOption = options.find(opt => opt.value === value);

  return (
    <div className={clsx('flex items-center gap-2', className)} role="group" aria-label="Sort controls">
      <label htmlFor="sort-select" className="text-sm font-medium text-deep-slate-400">
        Sort by:
      </label>

      <select
        id="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-modern min-w-[160px] text-sm cursor-pointer focus:ring-2 focus:ring-brand-purple-500/50"
        aria-label="Sort field"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        onClick={toggleDirection}
        className={clsx(
          'group flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all',
          'glass-card hover:bg-deep-slate-700/70 text-deep-slate-200 shadow-elevation-1 hover:shadow-elevation-2'
        )}
        aria-label={`Sort direction: ${direction === 'desc' ? 'High to low' : 'Low to high'}`}
        title={`Currently sorting ${direction === 'desc' ? 'high to low' : 'low to high'}. Click to reverse.`}
      >
        {direction === 'desc' ? (
          <>
            <svg
              className="w-5 h-5 transition-transform group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="hidden sm:inline">High → Low</span>
            <span className="sm:hidden">↓</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 transition-transform group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="hidden sm:inline">Low → High</span>
            <span className="sm:hidden">↑</span>
          </>
        )}
      </button>

      <div className="text-xs text-deep-slate-500 hidden md:block">
        Sorting {currentOption?.label} {direction === 'desc' ? 'descending' : 'ascending'}
      </div>
    </div>
  );
}

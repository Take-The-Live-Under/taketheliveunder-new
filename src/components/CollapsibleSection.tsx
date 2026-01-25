'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'compact';
  icon?: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  variant = 'default',
  icon
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className={clsx(
      'rounded-lg border transition-all',
      isOpen
        ? 'bg-deep-slate-800/60 border-deep-slate-700/50'
        : 'bg-deep-slate-800/30 border-deep-slate-700/30 hover:border-deep-slate-600/50'
    )}>
      <button
        onClick={toggleOpen}
        className={clsx(
          'w-full flex items-center justify-between transition-all',
          variant === 'compact' ? 'p-2 text-xs' : 'p-3 text-sm'
        )}
        aria-expanded={isOpen}
        aria-controls={`${title}-content`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-deep-slate-400">{icon}</span>}
          <span className={clsx(
            'font-semibold',
            isOpen ? 'text-deep-slate-200' : 'text-deep-slate-400'
          )}>
            {title}
          </span>
        </div>

        <svg
          className={clsx(
            'w-5 h-5 transition-transform text-deep-slate-400',
            isOpen && 'transform rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id={`${title}-content`}
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className={clsx(
          'border-t border-deep-slate-700/50',
          variant === 'compact' ? 'p-2' : 'p-3'
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}

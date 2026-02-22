'use client';

import { TrialStatus, getTrialMessage } from '@/lib/trial';

interface TrialBannerProps {
  trialStatus: TrialStatus;
  onUpgradeClick: () => void;
}

export default function TrialBanner({ trialStatus, onUpgradeClick }: TrialBannerProps) {
  // Don't show for paid users or active trial users
  if (trialStatus.isPaid || trialStatus.phase === 'active') {
    return null;
  }

  const message = getTrialMessage(trialStatus);

  // Different styles based on phase
  const getBannerStyle = () => {
    switch (trialStatus.phase) {
      case 'final':
        return 'bg-red-900/80 border-red-700 text-red-400';
      case 'warning':
        return 'bg-yellow-900/60 border-yellow-700 text-yellow-400';
      case 'expired':
        return 'bg-green-900/60 border-green-700 text-green-400';
      default:
        return 'bg-green-900/40 border-green-800 text-green-500';
    }
  };

  return (
    <div className={`sticky top-0 z-20 border-b ${getBannerStyle()} font-mono`}>
      <div className="mx-auto max-w-2xl px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          {trialStatus.phase === 'final' && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
          )}
          <span>// {message.toUpperCase().replace(/ /g, '_')}</span>
        </div>
        <button
          onClick={onUpgradeClick}
          className="shrink-0 border border-current hover:bg-green-900/50 px-3 py-1 text-xs font-semibold transition-colors"
        >
          {trialStatus.phase === 'expired' ? 'SUBSCRIBE' : 'UPGRADE'}
        </button>
      </div>
    </div>
  );
}

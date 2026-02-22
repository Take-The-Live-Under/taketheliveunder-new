'use client';

import { useState } from 'react';

interface PaywallModalProps {
  onSelectPlan: (plan: 'monthly' | 'season') => void;
  stats?: {
    triggersViewed: number;
    gamesTracked: number;
    alertsReceived: number;
  };
}

export default function PaywallModal({ onSelectPlan, stats }: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'season'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    onSelectPlan(selectedPlan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/98 font-mono">
      <div className="w-full max-w-lg border border-green-900 bg-black/90 p-6 terminal-glow-box">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-green-600 text-xs mb-4">// SUBSCRIPTION_REQUIRED</div>
          <h2 className="text-xl font-bold text-green-400 mb-2">
            KEEP_YOUR_LIVE_TRIGGERS
          </h2>
          <p className="text-green-700 text-sm">
            Your free trial has ended. Subscribe to continue accessing real-time triggers and alerts.
          </p>
        </div>

        {/* Trial Stats */}
        {stats && (stats.triggersViewed > 0 || stats.gamesTracked > 0) && (
          <div className="border border-green-900 bg-green-900/20 p-4 mb-6">
            <p className="text-xs text-green-700 mb-3">// TRIAL_STATS</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-green-400">{stats.triggersViewed}</div>
                <div className="text-[10px] text-green-700">TRIGGERS</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-400">{stats.gamesTracked}</div>
                <div className="text-[10px] text-green-700">GAMES</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-400">{stats.alertsReceived}</div>
                <div className="text-[10px] text-green-700">ALERTS</div>
              </div>
            </div>
          </div>
        )}

        {/* What you lose / What you keep */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="border border-red-900/50 bg-red-900/10 p-3">
            <p className="text-xs font-medium text-red-400 mb-2">// WITHOUT_PRO</p>
            <ul className="text-[10px] text-red-400/80 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span className="text-red-500">×</span>
                Real-time triggers
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-red-500">×</span>
                Favorites & watchlist
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-red-500">×</span>
                Push alerts
              </li>
            </ul>
          </div>
          <div className="border border-green-700/50 bg-green-900/10 p-3">
            <p className="text-xs font-medium text-green-400 mb-2">// WITH_PRO</p>
            <ul className="text-[10px] text-green-500 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                Unlimited triggers
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                Full live board
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                Research tools
              </li>
            </ul>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`p-4 border transition-all ${
              selectedPlan === 'monthly'
                ? 'border-green-500 bg-green-900/30'
                : 'border-green-900 hover:border-green-700'
            }`}
          >
            <div className="text-lg font-bold text-green-400">$19/mo</div>
            <div className="text-[10px] text-green-700">MONTHLY</div>
          </button>
          <button
            onClick={() => setSelectedPlan('season')}
            className={`p-4 border transition-all relative ${
              selectedPlan === 'season'
                ? 'border-green-500 bg-green-900/30'
                : 'border-green-900 hover:border-green-700'
            }`}
          >
            <div className="absolute -top-2 right-2 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5">
              -40%
            </div>
            <div className="text-lg font-bold text-green-400">$49/szn</div>
            <div className="text-[10px] text-green-700">~4 MONTHS</div>
          </button>
        </div>

        {/* Subscribe button */}
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full bg-green-500 hover:bg-green-400 py-4 font-bold text-black transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
              PROCESSING...
            </span>
          ) : (
            `SUBSCRIBE_${selectedPlan === 'monthly' ? '$19_MONTHLY' : '$49_SEASON'}`
          )}
        </button>

        <p className="text-center text-[10px] text-green-700 mt-4">
          // Cancel anytime. Secure payment via Stripe.
        </p>

        {/* Disclaimer */}
        <p className="text-center text-[10px] text-green-900 mt-4">
          For entertainment and research purposes only. No guaranteed outcomes.
        </p>
      </div>
    </div>
  );
}

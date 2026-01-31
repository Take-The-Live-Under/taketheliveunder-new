'use client';

import { useState } from 'react';

interface LandingPageProps {
  onAccess: (email: string) => void;
}

export default function LandingPage({ onAccess }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      // Save email to database
      await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      // Don't block access if save fails
      console.error('Failed to save signup:', err);
    }

    // Pass email up to parent for access
    onAccess(email);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-green-400 font-mono">
      {/* Header */}
      <header className="border-b border-green-900/50 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-base md:text-lg font-bold tracking-tight">TTLU_TERMINAL</span>
            <span className="text-green-600 text-xs hidden sm:inline">v2.1.0</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-green-600">
            <span className="hidden sm:inline">NCAAB LIVE</span>
            <span className="text-green-400 hidden sm:inline">|</span>
            <span>716 TEAMS</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left - Text */}
          <div>
            <div className="text-green-600 text-xs md:text-sm mb-4 font-mono">// LIVE EDGE DETECTION</div>
            <h1 className="text-3xl md:text-5xl font-bold text-green-400 leading-tight mb-6">
              Find the edge<br />
              <span className="text-green-500">before the market does.</span>
            </h1>
            <p className="text-green-600 text-base md:text-lg mb-8 leading-relaxed">
              We track every NCAA game in real-time and alert you when pace diverges from the posted total. Simple idea. Powerful results.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
              <div className="border border-green-900 p-3 md:p-4 terminal-glow-box">
                <div className="text-2xl md:text-3xl font-bold text-green-400">69.7%</div>
                <div className="text-green-700 text-[10px] md:text-xs mt-1">WIN_RATE</div>
              </div>
              <div className="border border-green-900 p-3 md:p-4 terminal-glow-box">
                <div className="text-2xl md:text-3xl font-bold text-green-400">+33.1%</div>
                <div className="text-green-700 text-[10px] md:text-xs mt-1">ROI</div>
              </div>
              <div className="border border-green-900 p-3 md:p-4 terminal-glow-box">
                <div className="text-2xl md:text-3xl font-bold text-green-400">4,026</div>
                <div className="text-green-700 text-[10px] md:text-xs mt-1">GAMES</div>
              </div>
            </div>

            {/* Email CTA */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-transparent border border-green-700 px-4 py-3 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none font-mono"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-green-500 text-black px-6 py-3 font-bold hover:bg-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading ? 'LOADING...' : 'GET_ACCESS'}
              </button>
            </form>
            {error && (
              <div className="text-red-400 text-xs mt-2 font-mono">// ERROR: {error}</div>
            )}
            <div className="text-green-800 text-xs mt-3 font-mono">
              // No credit card required. Research purposes only.
            </div>
          </div>

          {/* Right - Terminal Preview */}
          <div className="border border-green-900 bg-black/50 p-3 md:p-4 terminal-glow-box hidden md:block">
            <div className="flex items-center gap-2 text-green-700 text-xs mb-4 pb-2 border-b border-green-900">
              <span>LIVE_TRIGGERS</span>
              <span className="ml-auto">GOLDEN_ZONE: 3</span>
            </div>

            {/* Mock Games */}
            <div className="space-y-3">
              <div className="border border-green-800 p-3 terminal-glow-box">
                <div className="flex justify-between text-sm mb-2">
                  <span>DUKE vs UNC</span>
                  <span className="text-green-500 terminal-glow">UNDER</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-green-600">
                  <div>
                    <div className="text-green-400">145.5</div>
                    <div className="text-green-800">O/U</div>
                  </div>
                  <div>
                    <div className="text-green-400">5.2</div>
                    <div className="text-green-800">REQ_PPM</div>
                  </div>
                  <div>
                    <div className="text-green-400">3.8</div>
                    <div className="text-green-800">CUR_PPM</div>
                  </div>
                  <div>
                    <div className="text-yellow-400">+1.4</div>
                    <div className="text-green-800">EDGE</div>
                  </div>
                </div>
              </div>

              <div className="border border-green-800/50 p-3 opacity-60">
                <div className="flex justify-between text-sm mb-2">
                  <span>KANSAS vs BAYLOR</span>
                  <span className="text-green-600">MONITORING</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-green-700">
                  <div>
                    <div className="text-green-500">151.0</div>
                    <div className="text-green-800">O/U</div>
                  </div>
                  <div>
                    <div className="text-green-500">4.1</div>
                    <div className="text-green-800">REQ_PPM</div>
                  </div>
                  <div>
                    <div className="text-green-500">4.0</div>
                    <div className="text-green-800">CUR_PPM</div>
                  </div>
                  <div>
                    <div className="text-green-600">+0.1</div>
                    <div className="text-green-800">EDGE</div>
                  </div>
                </div>
              </div>

              <div className="border border-green-800/30 p-3 opacity-40">
                <div className="flex justify-between text-sm mb-2">
                  <span>UCLA vs ARIZONA</span>
                  <span className="text-green-700">WATCHING</span>
                </div>
                <div className="h-6 bg-green-900/10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-green-900/50 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-green-600 text-xs md:text-sm mb-8 font-mono">// HOW_IT_WORKS</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <div className="text-green-500 text-3xl md:text-4xl font-bold mb-2">01</div>
              <div className="text-green-400 font-bold mb-2 text-sm md:text-base">MONITOR</div>
              <div className="text-green-700 text-xs md:text-sm">Every NCAA game tracked in real-time. Scores update every 30 seconds.</div>
            </div>
            <div>
              <div className="text-green-500 text-3xl md:text-4xl font-bold mb-2">02</div>
              <div className="text-green-400 font-bold mb-2 text-sm md:text-base">ANALYZE</div>
              <div className="text-green-700 text-xs md:text-sm">Compare current scoring pace to what&apos;s needed to hit the total.</div>
            </div>
            <div>
              <div className="text-green-500 text-3xl md:text-4xl font-bold mb-2">03</div>
              <div className="text-green-400 font-bold mb-2 text-sm md:text-base">DETECT</div>
              <div className="text-green-700 text-xs md:text-sm">Identify when pace significantly diverges from the posted line.</div>
            </div>
            <div>
              <div className="text-green-500 text-3xl md:text-4xl font-bold mb-2">04</div>
              <div className="text-green-400 font-bold mb-2 text-sm md:text-base">ALERT</div>
              <div className="text-green-700 text-xs md:text-sm">Get notified instantly when our Golden Zone criteria are met.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats/Social Proof */}
      <div className="border-t border-green-900/50 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-green-600 text-xs md:text-sm mb-8 font-mono">// SYSTEM_STATS</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="border border-green-900 p-4 terminal-glow-box">
              <div className="text-green-500 text-2xl md:text-3xl font-bold">162K+</div>
              <div className="text-green-700 text-xs mt-1">OBSERVATIONS</div>
            </div>
            <div className="border border-green-900 p-4 terminal-glow-box">
              <div className="text-green-500 text-2xl md:text-3xl font-bold">716</div>
              <div className="text-green-700 text-xs mt-1">TEAM_PROFILES</div>
            </div>
            <div className="border border-green-900 p-4 terminal-glow-box">
              <div className="text-green-500 text-2xl md:text-3xl font-bold">4</div>
              <div className="text-green-700 text-xs mt-1">HMM_STATES</div>
            </div>
            <div className="border border-green-900 p-4 terminal-glow-box">
              <div className="text-green-500 text-2xl md:text-3xl font-bold">30s</div>
              <div className="text-green-700 text-xs mt-1">POLL_INTERVAL</div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-green-900/50 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-green-600 text-xs md:text-sm mb-8 font-mono">// FAQ</div>
          <div className="space-y-6">
            <div className="border-l-2 border-green-800 pl-4">
              <div className="text-green-400 font-bold mb-2">Is this gambling advice?</div>
              <div className="text-green-700 text-sm">No. This is a research tool for entertainment purposes. We surface statistical patterns. All decisions are yours. Past performance does not guarantee future results.</div>
            </div>
            <div className="border-l-2 border-green-800 pl-4">
              <div className="text-green-400 font-bold mb-2">How accurate is it?</div>
              <div className="text-green-700 text-sm">Our Golden Zone triggers have hit at a 69.7% rate across 4,026 games analyzed. We track every prediction and update our stats daily.</div>
            </div>
            <div className="border-l-2 border-green-800 pl-4">
              <div className="text-green-400 font-bold mb-2">What&apos;s the Golden Zone?</div>
              <div className="text-green-700 text-sm">It&apos;s our highest-confidence signal. When a game is running significantly slower than the line implies, with enough time left for it to matter.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-green-900/50 py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center">
          <div className="text-green-800 text-xs font-mono mb-2">
            // DISCLAIMER
          </div>
          <p className="text-green-700 text-xs max-w-2xl mx-auto">
            For entertainment and research purposes only. This is not financial or gambling advice.
            Past performance does not guarantee future results. Please gamble responsibly.
          </p>
          <div className="text-green-900 text-xs mt-4 font-mono">
            TTLU_TERMINAL v2.1.0 | 2025-26 NCAAB SEASON
          </div>
        </div>
      </div>
    </div>
  );
}

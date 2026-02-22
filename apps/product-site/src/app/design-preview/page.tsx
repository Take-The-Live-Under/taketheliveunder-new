'use client';

import { useState } from 'react';

type DesignStyle = 'quant' | 'minimal' | 'sports';

export default function DesignPreview() {
  const [activeStyle, setActiveStyle] = useState<DesignStyle>('quant');

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Style Switcher */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-slate-800 p-1 rounded-full">
        <button
          onClick={() => setActiveStyle('quant')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeStyle === 'quant' ? 'bg-green-500 text-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          Quant Terminal
        </button>
        <button
          onClick={() => setActiveStyle('minimal')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeStyle === 'minimal' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          Clean Minimal
        </button>
        <button
          onClick={() => setActiveStyle('sports')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeStyle === 'sports' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Sports Energy
        </button>
      </div>

      {/* Quant Terminal Style */}
      {activeStyle === 'quant' && (
        <div className="min-h-screen bg-[#0a0a0a] text-green-400 font-mono">
          {/* Header */}
          <header className="border-b border-green-900/50 px-6 py-4">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-bold tracking-tight">TTLU_TERMINAL</span>
                <span className="text-green-600 text-xs">v2.1.0</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-green-600">
                <span>NCAAB LIVE</span>
                <span className="text-green-400">|</span>
                <span>716 TEAMS</span>
                <span className="text-green-400">|</span>
                <span>REAL-TIME</span>
              </div>
            </div>
          </header>

          {/* Hero */}
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="grid grid-cols-2 gap-12">
              {/* Left - Text */}
              <div>
                <div className="text-green-600 text-sm mb-4">// LIVE EDGE DETECTION</div>
                <h1 className="text-5xl font-bold text-green-400 leading-tight mb-6">
                  Live betting markets<br/>
                  <span className="text-green-500">are inefficient.</span>
                </h1>
                <p className="text-green-600 text-lg mb-8 leading-relaxed">
                  Our HMM + Kalman model detects when game pace makes the under profitable.
                  Books use linear extrapolation. We use machine learning.
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="border border-green-900 p-4">
                    <div className="text-3xl font-bold text-green-400">69.7%</div>
                    <div className="text-green-700 text-xs mt-1">WIN_RATE</div>
                  </div>
                  <div className="border border-green-900 p-4">
                    <div className="text-3xl font-bold text-green-400">+33.1%</div>
                    <div className="text-green-700 text-xs mt-1">ROI</div>
                  </div>
                  <div className="border border-green-900 p-4">
                    <div className="text-3xl font-bold text-green-400">4,026</div>
                    <div className="text-green-700 text-xs mt-1">GAMES_ANALYZED</div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex gap-4">
                  <input
                    type="email"
                    placeholder="email@example.com"
                    className="flex-1 bg-transparent border border-green-700 px-4 py-3 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none"
                  />
                  <button className="bg-green-500 text-black px-6 py-3 font-bold hover:bg-green-400 transition">
                    GET_ACCESS
                  </button>
                </div>
                <div className="text-green-800 text-xs mt-3">
                  // No credit card required. Research purposes only.
                </div>
              </div>

              {/* Right - Terminal Preview */}
              <div className="border border-green-900 bg-black/50 p-4">
                <div className="flex items-center gap-2 text-green-700 text-xs mb-4 pb-2 border-b border-green-900">
                  <span>LIVE_TRIGGERS</span>
                  <span className="ml-auto">GOLDEN_ZONE: 3</span>
                </div>

                {/* Mock Game */}
                <div className="space-y-3">
                  <div className="border border-green-800 p-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span>DUKE vs UNC</span>
                      <span className="text-green-500">UNDER</span>
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
                    <div className="h-8 bg-green-900/20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="border-t border-green-900/50 py-16">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-green-600 text-sm mb-8">// METHODOLOGY</div>
              <div className="grid grid-cols-4 gap-8">
                <div>
                  <div className="text-green-500 text-4xl font-bold mb-2">01</div>
                  <div className="text-green-400 font-bold mb-2">INGEST</div>
                  <div className="text-green-700 text-sm">Poll live scores every 30s. Match with betting lines from 6 books.</div>
                </div>
                <div>
                  <div className="text-green-500 text-4xl font-bold mb-2">02</div>
                  <div className="text-green-400 font-bold mb-2">DETECT</div>
                  <div className="text-green-700 text-sm">HMM identifies game regime: Slow, Normal, Fast, or Foul/Endgame.</div>
                </div>
                <div>
                  <div className="text-green-500 text-4xl font-bold mb-2">03</div>
                  <div className="text-green-400 font-bold mb-2">FILTER</div>
                  <div className="text-green-700 text-sm">Kalman filter smooths noise. Team-specific Q/R adjustments.</div>
                </div>
                <div>
                  <div className="text-green-500 text-4xl font-bold mb-2">04</div>
                  <div className="text-green-400 font-bold mb-2">SIGNAL</div>
                  <div className="text-green-700 text-sm">Generate edge %, confidence score, unit sizing recommendation.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean Minimal Style */}
      {activeStyle === 'minimal' && (
        <div className="min-h-screen bg-white text-slate-900">
          {/* Header */}
          <header className="px-6 py-6">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
              <div className="text-xl font-semibold tracking-tight">Take The Live Under</div>
              <div className="flex items-center gap-8 text-sm text-slate-500">
                <a href="#" className="hover:text-slate-900 transition">How it works</a>
                <a href="#" className="hover:text-slate-900 transition">Research</a>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm hover:bg-slate-800 transition">
                  Get started
                </button>
              </div>
            </div>
          </header>

          {/* Hero */}
          <div className="max-w-5xl mx-auto px-6 py-24">
            <div className="max-w-3xl">
              <h1 className="text-6xl font-semibold leading-[1.1] tracking-tight mb-6">
                Find the edge in<br/>
                live basketball totals.
              </h1>
              <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-xl">
                Our model watches every NCAA game in real-time and alerts you when pace suggests the under is mispriced.
              </p>

              {/* Email capture */}
              <div className="flex gap-3 max-w-md mb-6">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 border border-slate-200 rounded-full px-5 py-3 text-base focus:border-slate-400 focus:outline-none"
                />
                <button className="bg-slate-900 text-white px-6 py-3 rounded-full font-medium hover:bg-slate-800 transition whitespace-nowrap">
                  Get early access
                </button>
              </div>
              <p className="text-sm text-slate-400">Free to try. No credit card required.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="border-y border-slate-100 py-16">
            <div className="max-w-5xl mx-auto px-6">
              <div className="grid grid-cols-4 gap-12">
                <div>
                  <div className="text-4xl font-semibold text-slate-900 mb-1">69.7%</div>
                  <div className="text-slate-500">Historical win rate</div>
                </div>
                <div>
                  <div className="text-4xl font-semibold text-slate-900 mb-1">33.1%</div>
                  <div className="text-slate-500">Return on investment</div>
                </div>
                <div>
                  <div className="text-4xl font-semibold text-slate-900 mb-1">4,026</div>
                  <div className="text-slate-500">Games analyzed</div>
                </div>
                <div>
                  <div className="text-4xl font-semibold text-slate-900 mb-1">716</div>
                  <div className="text-slate-500">Teams tracked</div>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="py-24">
            <div className="max-w-5xl mx-auto px-6">
              <h2 className="text-3xl font-semibold mb-16">How it works</h2>
              <div className="grid grid-cols-3 gap-12">
                <div>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl font-semibold mb-6">1</div>
                  <h3 className="text-xl font-medium mb-3">We monitor every game</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Live scores polled every 30 seconds. Current odds from 6 major sportsbooks.
                  </p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl font-semibold mb-6">2</div>
                  <h3 className="text-xl font-medium mb-3">Detect pace regimes</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Our model identifies when a game is playing slower than the line suggests.
                  </p>
                </div>
                <div>
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl font-semibold mb-6">3</div>
                  <h3 className="text-xl font-medium mb-3">Get alerted to edges</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Real-time notifications when our Golden Zone criteria are met.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="border-t border-slate-100 py-8">
            <div className="max-w-5xl mx-auto px-6 text-center text-sm text-slate-400">
              For entertainment and research purposes only. Past performance does not guarantee future results.
            </div>
          </div>
        </div>
      )}

      {/* Sports Energy Style */}
      {activeStyle === 'sports' && (
        <div className="min-h-screen bg-slate-900">
          {/* Header */}
          <header className="px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-black text-white tracking-tight">TTLU</div>
                <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">LIVE</span>
              </div>
              <div className="flex items-center gap-6">
                <a href="#" className="text-white/80 hover:text-white text-sm font-medium transition">How It Works</a>
                <a href="#" className="text-white/80 hover:text-white text-sm font-medium transition">Research</a>
                <button className="bg-white text-orange-600 px-5 py-2 rounded-lg font-bold text-sm hover:bg-orange-50 transition">
                  Join Free
                </button>
              </div>
            </div>
          </header>

          {/* Hero */}
          <div className="relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, orange 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-20 relative">
              <div className="text-center max-w-4xl mx-auto">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-2 mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
                  </span>
                  <span className="text-orange-400 text-sm font-semibold">3 Golden Triggers Active Now</span>
                </div>

                <h1 className="text-6xl font-black text-white leading-tight mb-6">
                  CATCH THE EDGE<br/>
                  <span className="bg-gradient-to-r from-orange-400 to-yellow-400 text-transparent bg-clip-text">BEFORE IT&apos;S GONE</span>
                </h1>
                <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                  Real-time pace analysis for NCAA basketball. Know when the under is golden.
                </p>

                {/* Big Stats */}
                <div className="flex justify-center gap-8 mb-10">
                  <div className="text-center">
                    <div className="text-5xl font-black text-orange-400">69.7%</div>
                    <div className="text-slate-500 text-sm font-medium mt-1">WIN RATE</div>
                  </div>
                  <div className="w-px bg-slate-700"></div>
                  <div className="text-center">
                    <div className="text-5xl font-black text-green-400">+33.1%</div>
                    <div className="text-slate-500 text-sm font-medium mt-1">ROI</div>
                  </div>
                  <div className="w-px bg-slate-700"></div>
                  <div className="text-center">
                    <div className="text-5xl font-black text-blue-400">4,026</div>
                    <div className="text-slate-500 text-sm font-medium mt-1">GAMES</div>
                  </div>
                </div>

                {/* Email capture */}
                <div className="flex gap-3 max-w-lg mx-auto">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-5 py-4 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none text-lg"
                  />
                  <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-red-600 transition whitespace-nowrap shadow-lg shadow-orange-500/25">
                    Get Access
                  </button>
                </div>
                <p className="text-slate-600 text-sm mt-4">Free early access. No credit card.</p>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="py-16 bg-slate-800/50">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-3">Live Trigger Example</h2>
                <p className="text-slate-400">This is what a Golden Zone trigger looks like</p>
              </div>

              {/* Mock Game Card */}
              <div className="max-w-md mx-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-yellow-500/50 p-6 shadow-xl shadow-yellow-500/10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">GOLDEN ZONE</span>
                  <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    </span>
                    LIVE
                  </span>
                  <span className="text-slate-500 text-sm ml-auto">2H 12:34</span>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">DUKE</div>
                    <div className="text-4xl font-black text-white">38</div>
                  </div>
                  <div className="text-slate-600 text-sm">vs</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">UNC</div>
                    <div className="text-4xl font-black text-white">34</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-xl">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">145.5</div>
                    <div className="text-xs text-slate-500">O/U LINE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400">5.2 PPM</div>
                    <div className="text-xs text-slate-500">REQUIRED</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">3.8 PPM</div>
                    <div className="text-xs text-slate-500">CURRENT</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-semibold">TAKE THE UNDER</span>
                    <span className="text-green-400 font-bold">+1.4 PPM Edge</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="py-20">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-3xl font-bold text-white text-center mb-16">How It Works</h2>
              <div className="grid grid-cols-3 gap-8">
                <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition">
                  <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center text-2xl font-black text-white mb-6">1</div>
                  <h3 className="text-xl font-bold text-white mb-3">Live Monitoring</h3>
                  <p className="text-slate-400">Every NCAA game tracked in real-time. Scores update every 30 seconds.</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition">
                  <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center text-2xl font-black text-white mb-6">2</div>
                  <h3 className="text-xl font-bold text-white mb-3">Pace Analysis</h3>
                  <p className="text-slate-400">Our model detects when game pace diverges from what the line implies.</p>
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition">
                  <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center text-2xl font-black text-white mb-6">3</div>
                  <h3 className="text-xl font-bold text-white mb-3">Golden Alerts</h3>
                  <p className="text-slate-400">Get notified instantly when our high-confidence triggers fire.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="border-t border-slate-800 py-8">
            <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-600">
              For entertainment and research purposes only. Gambling involves risk. Past results do not guarantee future performance.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { BRACKET_MATCHUPS, BracketMatchup } from '@/components/bracket-lab/mockData';
import BracketTree from '@/components/bracket-lab/BracketTree';
import MatchupBattleScreen from '@/components/bracket-lab/MatchupBattleScreen';
import { PredictorWeights, DEFAULT_WEIGHTS, runProjection } from '@/components/bracket-lab/projectionEngine';

export default function BracketLabPage() {
  const [selectedMatchup, setSelectedMatchup] = useState<BracketMatchup | null>(
    BRACKET_MATCHUPS.find(m => m.isFeatured) ?? BRACKET_MATCHUPS[0] ?? null
  );
  const [weights, setWeights] = useState<PredictorWeights>({ ...DEFAULT_WEIGHTS });
  const [mobileView, setMobileView] = useState<'bracket' | 'battle'>('battle');

  const handleSelectMatchup = useCallback((matchup: BracketMatchup) => {
    setSelectedMatchup(matchup);
    setMobileView('battle');
    setWeights({ ...DEFAULT_WEIGHTS }); // reset weights on new matchup
  }, []);

  const handleWeightChange = useCallback((key: keyof PredictorWeights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleWeightReset = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
  }, []);

  const projection = useMemo(() => {
    if (!selectedMatchup) return null;
    return runProjection(selectedMatchup, weights);
  }, [selectedMatchup, weights]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-mono overflow-hidden">

      {/* ── Ambient background grid ─────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Corner glows */}
      <div
        className="fixed top-0 left-0 w-96 h-96 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(0,255,255,0.04) 0%, transparent 70%)' }}
      />
      <div
        className="fixed top-0 right-0 w-96 h-96 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(255,107,0,0.04) 0%, transparent 70%)' }}
      />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-neutral-800 bg-[#0a0a0a]/95 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[10px] font-mono text-neutral-600 hover:text-[#00ffff] transition-colors flex items-center gap-1.5 group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              LIVE_FEED
            </Link>
            <div className="w-px h-4 bg-neutral-800" />
            <div className="flex items-center gap-2">
              <div
                className="px-2 py-0.5 rounded text-[9px] font-mono font-bold border"
                style={{
                  color: '#ff6b00',
                  borderColor: '#ff6b0040',
                  background: '#ff6b0010',
                }}
              >
                BETA
              </div>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase">
                <span className="text-[#00ffff]">BRACKET</span>
                <span className="text-white">_LAB</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[9px] font-mono text-neutral-600">
            <span>{BRACKET_MATCHUPS.length} MATCHUPS</span>
            <span className="text-neutral-800">|</span>
            <span className="text-[#00ffff]/60">MARCH MADNESS 2025</span>
          </div>
        </div>

        {/* Header scan line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ffff]/20 to-transparent" />
      </header>

      {/* ── Mobile Tab Switch ───────────────────────────────────── */}
      <div className="lg:hidden relative z-10 border-b border-neutral-800 bg-[#0a0a0a]/95">
        <div className="flex">
          {(['bracket', 'battle'] as const).map(view => (
            <button
              key={view}
              onClick={() => setMobileView(view)}
              className={`flex-1 py-2.5 text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
                mobileView === view
                  ? 'text-[#00ffff] border-b-2 border-[#00ffff]'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {view === 'bracket' ? '◉ BRACKET' : '⚔ BATTLE'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto flex h-[calc(100vh-53px)] overflow-hidden">

        {/* LEFT PANEL — Bracket Tree */}
        <aside
          className={`
            w-full lg:w-80 lg:flex-shrink-0 lg:border-r border-neutral-800 overflow-y-auto
            ${mobileView === 'bracket' ? 'block' : 'hidden lg:block'}
          `}
          style={{ background: 'rgba(10,10,10,0.8)' }}
        >
          <div className="p-4">
            {/* Panel header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#00ffff] rounded-full" />
              <div>
                <div className="text-xs font-mono font-bold text-white tracking-wider">MATCHUPS</div>
                <div className="text-[9px] font-mono text-neutral-600">Select to enter battle mode</div>
              </div>
            </div>

            <BracketTree
              matchups={BRACKET_MATCHUPS}
              selectedId={selectedMatchup?.id ?? null}
              onSelect={handleSelectMatchup}
            />
          </div>
        </aside>

        {/* RIGHT PANEL — Battle Screen */}
        <main
          className={`
            flex-1 overflow-y-auto
            ${mobileView === 'battle' ? 'block' : 'hidden lg:block'}
          `}
        >
          {selectedMatchup && projection ? (
            <div className="p-4 h-full">
              <MatchupBattleScreen
                matchup={selectedMatchup}
                projection={projection}
                weights={weights}
                onWeightChange={handleWeightChange}
                onWeightReset={handleWeightReset}
                onBack={() => setMobileView('bracket')}
              />
            </div>
          ) : (
            /* Empty state */
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-20">⚔</div>
                <div className="text-[#00ffff]/40 text-xs font-mono tracking-[0.4em] uppercase mb-2">
                  Select a Matchup
                </div>
                <p className="text-neutral-700 text-xs font-mono">
                  Choose a game from the bracket to enter battle mode
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Footer watermark ───────────────────────────────────── */}
      <div className="fixed bottom-3 right-4 z-20 text-[8px] font-mono text-neutral-800 pointer-events-none">
        TTLU // BRACKET_LAB v0.1-beta
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { BracketMatchup } from './mockData';
import { ProjectionResult, PredictorWeights, ARCHETYPE_LABELS } from './projectionEngine';
import TeamProfilePanel from './TeamProfilePanel';
import PredictorControls from './PredictorControls';
import { StatBarGroup, PaceMeter, ConfidenceGauge, OverUnderLean } from './StatComparisonBars';

interface MatchupBattleScreenProps {
  matchup: BracketMatchup;
  projection: ProjectionResult;
  weights: PredictorWeights;
  onWeightChange: (key: keyof PredictorWeights, value: number) => void;
  onWeightReset: () => void;
  onBack: () => void;
}

type BattleTab = 'OVERVIEW' | 'DEEP_STATS' | 'PREDICTOR';

export default function MatchupBattleScreen({
  matchup,
  projection,
  weights,
  onWeightChange,
  onWeightReset,
  onBack,
}: MatchupBattleScreenProps) {
  const [activeTab, setActiveTab] = useState<BattleTab>('OVERVIEW');
  const [revealed, setRevealed] = useState(false);

  // Cinematic reveal on mount
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, [matchup.id]);

  const { teamA, teamB } = matchup;
  const archetype = ARCHETYPE_LABELS[projection.gameArchetype];

  const TABS: BattleTab[] = ['OVERVIEW', 'DEEP_STATS', 'PREDICTOR'];

  return (
    <div
      className={`flex flex-col h-full transition-all duration-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* ── Back + Nav ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-mono text-neutral-600 hover:text-[#00ffff] transition-colors group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          BRACKET
        </button>
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all ${
                activeTab === tab
                  ? 'bg-[#00ffff] text-black'
                  : 'text-neutral-600 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── VS HERO HEADER ─────────────────────────────────────── */}
      <div
        className="relative rounded-2xl border border-neutral-800 overflow-hidden mb-4 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.015)' }}
      >
        {/* Background grid glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Radial glows from each side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 40% 60% at 15% 50%, rgba(0,255,255,0.06) 0%, transparent 70%),
              radial-gradient(ellipse 40% 60% at 85% 50%, rgba(255,107,0,0.06) 0%, transparent 70%)
            `,
          }}
        />

        <div className="relative z-10 p-4">
          {/* Region + Round */}
          <div className="flex items-center justify-center mb-3">
            <div className="text-[9px] font-mono text-neutral-600 tracking-[0.3em] uppercase">
              {matchup.region} Region · Round of 8
            </div>
          </div>

          {/* Main VS layout */}
          <div className="flex items-center justify-between gap-2">
            {/* Team A */}
            <div className="flex-1 text-center">
              <div className="text-4xl mb-1">{teamA.logoPlaceholder}</div>
              <div
                className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold font-mono bg-neutral-800 border border-neutral-700 text-neutral-400 mb-1"
              >
                {teamA.seed}
              </div>
              <div className="text-xl font-black font-mono text-white tracking-wide">{teamA.shortName}</div>
              <div className="text-[10px] font-mono text-neutral-500">{teamA.record}</div>
              <div className="mt-2 text-lg font-bold font-mono text-[#00ffff] tabular-nums">
                {projection.teamAProjected.toFixed(0)}
              </div>
              <div className="text-[9px] font-mono text-neutral-700">PROJ PTS</div>
            </div>

            {/* VS Center */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1.5 px-2">
              {/* VS text with glow */}
              <div
                className="text-3xl font-black font-mono tracking-tighter"
                style={{
                  color: '#ffffff',
                  textShadow: '0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(0,255,255,0.2)',
                }}
              >
                VS
              </div>

              {/* Archetype badge */}
              <div
                className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border tracking-wider"
                style={{
                  color: archetype.color,
                  borderColor: `${archetype.color}40`,
                  background: `${archetype.color}10`,
                  boxShadow: `0 0 8px ${archetype.color}20`,
                }}
              >
                {archetype.label.toUpperCase()}
              </div>

              {/* O/U line */}
              {matchup.projectedLine && (
                <div className="text-[9px] font-mono text-neutral-600 text-center">
                  O/U <span className="text-[#eab308] font-bold">{matchup.projectedLine}</span>
                </div>
              )}

              {/* Projected total */}
              <div className="text-[10px] font-mono text-neutral-500 text-center">
                PROJ <span className="text-white font-bold">{projection.projectedTotal.toFixed(1)}</span>
              </div>
            </div>

            {/* Team B */}
            <div className="flex-1 text-center">
              <div className="text-4xl mb-1">{teamB.logoPlaceholder}</div>
              <div
                className="inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold font-mono bg-neutral-800 border border-neutral-700 text-neutral-400 mb-1"
              >
                {teamB.seed}
              </div>
              <div className="text-xl font-black font-mono text-white tracking-wide">{teamB.shortName}</div>
              <div className="text-[10px] font-mono text-neutral-500">{teamB.record}</div>
              <div className="mt-2 text-lg font-bold font-mono text-[#ff6b00] tabular-nums">
                {projection.teamBProjected.toFixed(0)}
              </div>
              <div className="text-[9px] font-mono text-neutral-700">PROJ PTS</div>
            </div>
          </div>

          {/* Edge summary */}
          <div className="mt-3 pt-3 border-t border-neutral-800/60 text-center">
            <div className="text-[10px] font-mono text-neutral-500 italic">
              // {projection.edgeSummary}
            </div>
          </div>
        </div>

        {/* Bottom scan line accent */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00ffff]/30 to-transparent" />
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-4 animate-fade-in">
            {/* Team Profiles side-by-side */}
            <div className="grid grid-cols-2 gap-3">
              <TeamProfilePanel
                team={teamA}
                side="left"
                winProb={projection.teamAWinProb}
                projectedScore={projection.teamAProjected}
              />
              <TeamProfilePanel
                team={teamB}
                side="right"
                winProb={100 - projection.teamAWinProb}
                projectedScore={projection.teamBProjected}
              />
            </div>

            {/* Pace + Confidence row */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-xl border border-neutral-800 p-4"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="text-[9px] font-mono text-neutral-600 tracking-widest mb-3 uppercase">// Pace Profile</div>
                <PaceMeter pace={projection.expectedPace} label="EXPECTED PACE" />
                <div className="mt-3 flex justify-between text-[10px] font-mono">
                  <span className="text-neutral-600">POSSESSIONS</span>
                  <span className="text-white font-bold">{projection.estimatedPossessions.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono mt-1">
                  <span className="text-neutral-600">
                    <span className="text-[#00ffff]">{teamA.shortName}</span> TEMPO
                  </span>
                  <span className="text-neutral-400 tabular-nums">{teamA.metrics.adjustedTempo.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono mt-1">
                  <span className="text-neutral-600">
                    <span className="text-[#ff6b00]">{teamB.shortName}</span> TEMPO
                  </span>
                  <span className="text-neutral-400 tabular-nums">{teamB.metrics.adjustedTempo.toFixed(1)}</span>
                </div>
              </div>

              <div
                className="rounded-xl border border-neutral-800 p-4 flex flex-col items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <ConfidenceGauge score={projection.confidenceScore} />
              </div>
            </div>

            {/* Over/Under lean */}
            <div
              className="rounded-xl border border-neutral-800 p-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="text-[9px] font-mono text-neutral-600 tracking-widest mb-3 uppercase">// Total Projection</div>
              <OverUnderLean
                lean={projection.overLean}
                projectedTotal={projection.projectedTotal}
                line={matchup.projectedLine}
              />
            </div>

            {/* Archetype detail */}
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: `${archetype.color}30`,
                background: `${archetype.color}08`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-1.5 h-6 rounded-full"
                  style={{ background: archetype.color }}
                />
                <div>
                  <div className="text-xs font-mono font-bold" style={{ color: archetype.color }}>
                    {archetype.label.toUpperCase()}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-600">Game Archetype</div>
                </div>
              </div>
              <p className="text-xs font-mono text-neutral-400">{archetype.description}</p>
            </div>
          </div>
        )}

        {/* DEEP STATS TAB */}
        {activeTab === 'DEEP_STATS' && (
          <div className="space-y-4 animate-fade-in">
            {/* Offense vs Defense */}
            <div
              className="rounded-xl border border-neutral-800 p-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="text-[9px] font-mono text-neutral-600 tracking-widest mb-4 uppercase">// Offensive Firepower</div>
              <StatBarGroup
                nameA={teamA.shortName}
                nameB={teamB.shortName}
                colorA="#00ffff"
                colorB="#ff6b00"
                stats={[
                  { label: 'OFF EFF', valueA: teamA.metrics.offEff, valueB: teamB.metrics.offEff, format: v => v.toFixed(1) },
                  { label: 'eFG%', valueA: teamA.metrics.effectiveFGPct, valueB: teamB.metrics.effectiveFGPct, format: v => `${v.toFixed(1)}%` },
                  { label: '3PT RATE', valueA: teamA.metrics.threePtRate, valueB: teamB.metrics.threePtRate, format: v => `${v.toFixed(1)}%` },
                  { label: 'FT RATE', valueA: teamA.metrics.ftRate, valueB: teamB.metrics.ftRate, format: v => v.toFixed(2) },
                  { label: 'OFF REB%', valueA: teamA.metrics.offRebPct, valueB: teamB.metrics.offRebPct, format: v => `${v.toFixed(1)}%` },
                ]}
              />
            </div>

            <div
              className="rounded-xl border border-neutral-800 p-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="text-[9px] font-mono text-neutral-600 tracking-widest mb-4 uppercase">// Defensive Wall</div>
              <StatBarGroup
                nameA={teamA.shortName}
                nameB={teamB.shortName}
                colorA="#00ffff"
                colorB="#ff6b00"
                stats={[
                  { label: 'DEF EFF', valueA: teamA.metrics.defEff, valueB: teamB.metrics.defEff, higherIsBetter: false, format: v => v.toFixed(1) },
                  { label: 'OPP eFG%', valueA: teamA.metrics.oppEffFGPct, valueB: teamB.metrics.oppEffFGPct, higherIsBetter: false, format: v => `${v.toFixed(1)}%` },
                  { label: 'OPP 3PT%', valueA: teamA.metrics.oppThreePtRate, valueB: teamB.metrics.oppThreePtRate, higherIsBetter: false, format: v => `${v.toFixed(1)}%` },
                  { label: 'DEF REB%', valueA: teamA.metrics.defRebPct, valueB: teamB.metrics.defRebPct, format: v => `${v.toFixed(1)}%` },
                  { label: 'FORCED TO', valueA: teamA.metrics.oppToRate, valueB: teamB.metrics.oppToRate, format: v => v.toFixed(1) },
                ]}
              />
            </div>

            <div
              className="rounded-xl border border-neutral-800 p-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="text-[9px] font-mono text-neutral-600 tracking-widest mb-4 uppercase">// Pace & Efficiency</div>
              <StatBarGroup
                nameA={teamA.shortName}
                nameB={teamB.shortName}
                colorA="#00ffff"
                colorB="#ff6b00"
                stats={[
                  { label: 'ADJ TEMPO', valueA: teamA.metrics.adjustedTempo, valueB: teamB.metrics.adjustedTempo, format: v => v.toFixed(1) },
                  { label: 'RECENT T', valueA: teamA.metrics.recentTempo, valueB: teamB.metrics.recentTempo, format: v => v.toFixed(1) },
                  { label: 'PPP OFF', valueA: teamA.metrics.ptsPerPoss, valueB: teamB.metrics.ptsPerPoss, format: v => v.toFixed(3) },
                  { label: 'PPP DEF', valueA: teamA.metrics.oppPtsPerPoss, valueB: teamB.metrics.oppPtsPerPoss, higherIsBetter: false, format: v => v.toFixed(3) },
                  { label: 'AVG TOTAL', valueA: teamA.metrics.avgTotal, valueB: teamB.metrics.avgTotal, format: v => v.toFixed(1) },
                ]}
              />
            </div>

            {/* Last 5 paces */}
            <div
              className="rounded-xl border border-neutral-800 p-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="text-[9px] font-mono text-neutral-600 tracking-widest mb-3 uppercase">// Last 5 Game Pace</div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { team: teamA, color: '#00ffff' },
                  { team: teamB, color: '#ff6b00' },
                ].map(({ team, color }) => (
                  <div key={team.id}>
                    <div className="text-[10px] font-mono mb-2" style={{ color }}>{team.shortName}</div>
                    <div className="flex items-end gap-1 h-10">
                      {team.metrics.last5Pace.map((pace, i) => {
                        const pct = ((pace - 60) / 20) * 100;
                        const result = team.metrics.last5[i];
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                              className="w-full rounded-sm transition-all"
                              style={{
                                height: `${Math.max(15, pct)}%`,
                                background: result === 'W' ? color : '#404040',
                                opacity: 0.8,
                              }}
                            />
                            <span className="text-[8px] font-mono text-neutral-700">{pace}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PREDICTOR TAB */}
        {activeTab === 'PREDICTOR' && (
          <div className="space-y-4 animate-fade-in">
            {/* Live projection output */}
            <div
              className="rounded-xl border border-[#00ffff]/20 p-4"
              style={{
                background: 'rgba(0,255,255,0.03)',
                boxShadow: '0 0 20px rgba(0,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ffff]" />
                </span>
                <span className="text-[9px] font-mono text-[#00ffff]/60 tracking-widest">LIVE PROJECTION OUTPUT</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'EXP PACE', value: projection.expectedPace.toFixed(1), unit: 'pos/40', color: '#00ffff' },
                  { label: 'POSSESSIONS', value: projection.estimatedPossessions.toFixed(0), unit: 'est', color: '#00ffff' },
                  { label: 'PROJ TOTAL', value: projection.projectedTotal.toFixed(1), unit: 'pts', color: projection.overLean > 0 ? '#ff6b00' : '#00ffff' },
                  { label: 'CONFIDENCE', value: `${projection.confidenceScore}`, unit: '/100', color: projection.confidenceScore >= 70 ? '#00ffff' : projection.confidenceScore >= 45 ? '#eab308' : '#ef4444' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-neutral-800 p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="text-[9px] font-mono text-neutral-600 mb-1 tracking-widest">{item.label}</div>
                    <div className="text-xl font-bold font-mono tabular-nums" style={{ color: item.color }}>
                      {item.value}
                      <span className="text-xs text-neutral-600 ml-0.5">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Score projection */}
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <div className="text-[9px] font-mono text-[#00ffff]/60">{teamA.shortName}</div>
                  <div className="text-2xl font-black font-mono text-[#00ffff] tabular-nums">
                    {projection.teamAProjected.toFixed(0)}
                  </div>
                </div>
                <div className="text-neutral-700 font-mono">—</div>
                <div className="flex-1 text-center">
                  <div className="text-[9px] font-mono text-[#ff6b00]/60">{teamB.shortName}</div>
                  <div className="text-2xl font-black font-mono text-[#ff6b00] tabular-nums">
                    {projection.teamBProjected.toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Over/Under lean */}
              <div className="mt-4">
                <OverUnderLean
                  lean={projection.overLean}
                  projectedTotal={projection.projectedTotal}
                  line={matchup.projectedLine}
                />
              </div>
            </div>

            {/* Controls */}
            <div
              className="rounded-xl border border-neutral-800 p-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <PredictorControls
                weights={weights}
                onChange={onWeightChange}
                onReset={onWeightReset}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

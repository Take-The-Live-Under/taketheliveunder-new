"use client";

import { BracketMatchup } from './mockData';

interface BracketTreeProps {
  matchups: BracketMatchup[];
  selectedId: string | null;
  onSelect: (matchup: BracketMatchup) => void;
}

function SeedBadge({ seed }: { seed: number }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold font-mono bg-neutral-800 border border-neutral-700 text-neutral-400 flex-shrink-0">
      {seed}
    </span>
  );
}

function MatchupCard({
  matchup,
  selected,
  onClick,
}: {
  matchup: BracketMatchup;
  selected: boolean;
  onClick: () => void;
}) {
  const isSelected = selected;
  const isFeatured = matchup.isFeatured;

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full text-left rounded-xl border transition-all duration-300 overflow-hidden group
        ${isSelected
          ? 'border-[#00ffff] shadow-[0_0_24px_rgba(0,255,255,0.25)] bg-[#00ffff]/5'
          : isFeatured
          ? 'border-[#ff6b00]/50 shadow-[0_0_12px_rgba(255,107,0,0.12)] bg-[#ff6b00]/[0.03] hover:border-[#ff6b00] hover:shadow-[0_0_20px_rgba(255,107,0,0.2)]'
          : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-600 hover:bg-neutral-800/40'}
      `}
    >
      {/* Scan line animation on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ffff]/[0.03] to-transparent animate-scan-line" />
      </div>

      {/* Featured badge */}
      {isFeatured && !isSelected && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-mono font-bold text-[#ff6b00] bg-[#ff6b00]/10 border border-[#ff6b00]/30 px-1.5 py-0.5 rounded">
            FEATURED
          </span>
        </div>
      )}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-[#00ffff]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00ffff]" />
            </span>
            ACTIVE
          </span>
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Region label */}
        <div className="text-[9px] font-mono text-neutral-700 tracking-widest uppercase">
          {matchup.region} · {matchup.projectedLine ? `O/U ${matchup.projectedLine}` : ''}
        </div>

        {/* Team A */}
        <div className="flex items-center gap-2">
          <SeedBadge seed={matchup.teamA.seed} />
          <span className="text-lg">{matchup.teamA.logoPlaceholder}</span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold font-mono truncate ${isSelected ? 'text-[#00ffff]' : 'text-white'}`}>
              {matchup.teamA.shortName}
            </div>
            <div className="text-[10px] text-neutral-600 font-mono">{matchup.teamA.record}</div>
          </div>
          <div className="text-[10px] font-mono text-neutral-600">
            {matchup.teamA.metrics.adjustedTempo.toFixed(0)} T
          </div>
        </div>

        {/* Divider with VS */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-neutral-800" />
          <span className="text-[9px] font-mono text-neutral-700">VS</span>
          <div className="flex-1 h-px bg-neutral-800" />
        </div>

        {/* Team B */}
        <div className="flex items-center gap-2">
          <SeedBadge seed={matchup.teamB.seed} />
          <span className="text-lg">{matchup.teamB.logoPlaceholder}</span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold font-mono truncate ${isSelected ? 'text-[#00ffff]' : 'text-white'}`}>
              {matchup.teamB.shortName}
            </div>
            <div className="text-[10px] text-neutral-600 font-mono">{matchup.teamB.record}</div>
          </div>
          <div className="text-[10px] font-mono text-neutral-600">
            {matchup.teamB.metrics.adjustedTempo.toFixed(0)} T
          </div>
        </div>
      </div>

      {/* Bottom glow bar when selected */}
      {isSelected && (
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00ffff] to-transparent" />
      )}
    </button>
  );
}

export default function BracketTree({ matchups, selectedId, onSelect }: BracketTreeProps) {
  const regions = Array.from(new Set(matchups.map(m => m.region)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-[#00ffff]/40 to-transparent" />
        <div className="text-[10px] font-mono text-[#00ffff]/60 tracking-[0.3em] uppercase">
          // Select Matchup
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-[#00ffff]/40 to-transparent" />
      </div>

      {regions.map(region => {
        const regionMatchups = matchups.filter(m => m.region === region);
        return (
          <div key={region}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-[#00ffff]/60 rounded-full" />
              <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">
                {region} Region
              </span>
            </div>
            <div className="space-y-2">
              {regionMatchups.map(matchup => (
                <MatchupCard
                  key={matchup.id}
                  matchup={matchup}
                  selected={selectedId === matchup.id}
                  onClick={() => onSelect(matchup)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Coming soon */}
      <div
        className="rounded-xl border border-dashed border-neutral-800 p-4 text-center"
        style={{ background: 'rgba(255,255,255,0.01)' }}
      >
        <div className="text-[10px] font-mono text-neutral-700 tracking-widest mb-1">// MORE_MATCHUPS</div>
        <p className="text-xs text-neutral-700">Full 64-team bracket coming when seeding drops</p>
      </div>
    </div>
  );
}

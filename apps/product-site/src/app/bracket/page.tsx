"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BracketData, BracketGame, BracketTeam } from "@/app/api/bracket/route";

// ─── Team slot ────────────────────────────────────────────────────────────────

function TeamSlot({
  team,
  isWinner,
  isEliminated,
}: {
  team: BracketTeam | null;
  isWinner: boolean;
  isEliminated: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-1.5 h-8 px-2 border-b border-neutral-800 last:border-b-0">
        <span className="text-[10px] text-neutral-800">TBD</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 h-8 px-2 border-b border-neutral-800 last:border-b-0
        ${isWinner ? "bg-neutral-800/50" : ""}
        ${isEliminated ? "opacity-30" : ""}
      `}
    >
      <span className={`text-[10px] font-bold font-mono w-4 flex-shrink-0 ${isWinner ? "text-white" : "text-neutral-500"}`}>
        {team.seed || ""}
      </span>
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt={team.shortName} className="w-4 h-4 object-contain flex-shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full bg-neutral-800 flex-shrink-0" />
      )}
      <span className={`text-[11px] truncate flex-1 ${isWinner ? "text-white font-semibold" : "text-neutral-300"}`}>
        {team.shortName}
      </span>
      {team.score !== undefined && (
        <span className={`text-[11px] font-mono font-bold flex-shrink-0 tabular-nums ${isWinner ? "text-white" : "text-neutral-600"}`}>
          {team.score}
        </span>
      )}
      {isWinner && <span className="text-[#00ffff] text-[9px] flex-shrink-0">✓</span>}
    </div>
  );
}

// ─── Matchup box ──────────────────────────────────────────────────────────────

function MatchupBox({ game, showLocation }: { game: BracketGame; showLocation?: boolean }) {
  const isComplete = game.status === "post";
  return (
    <div className="relative">
      {showLocation && (
        <div className="mb-0.5 text-[9px] text-neutral-700 font-mono truncate w-44">
          {game.date}{game.location ? ` · ${game.location}` : ""}
        </div>
      )}
      <div className={`rounded border overflow-hidden bg-[#0f0f0f] w-44 ${isComplete ? "border-neutral-700" : "border-neutral-800"}`}>
        <TeamSlot
          team={game.topTeam}
          isWinner={isComplete && game.winner?.id === game.topTeam?.id}
          isEliminated={isComplete && !!game.winner && game.winner.id !== game.topTeam?.id}
        />
        <TeamSlot
          team={game.bottomTeam}
          isWinner={isComplete && game.winner?.id === game.bottomTeam?.id}
          isEliminated={isComplete && !!game.winner && game.winner.id !== game.bottomTeam?.id}
        />
      </div>
      {showLocation && game.venue && (
        <div className="mt-0.5 text-[9px] text-neutral-800 font-mono truncate w-44">
          {game.venue}
        </div>
      )}
    </div>
  );
}

// ─── Connectors ───────────────────────────────────────────────────────────────

function RoundConnectors({ gameCount }: { gameCount: number }) {
  const BOX_H = 64;
  const GAP = 24;
  const UNIT = BOX_H + GAP;
  const TOTAL_H = Math.max(1, gameCount) * UNIT - GAP;

  const paths: React.ReactNode[] = [];
  for (let i = 0; i < gameCount; i += 2) {
    const topMid = i * UNIT + BOX_H / 2;
    const botMid = (i + 1) * UNIT + BOX_H / 2;
    const midY = (topMid + botMid) / 2;
    paths.push(
      <g key={i}>
        <line x1="0" y1={topMid} x2="12" y2={topMid} stroke="#2a2a2a" strokeWidth="1" />
        <line x1="0" y1={botMid} x2="12" y2={botMid} stroke="#2a2a2a" strokeWidth="1" />
        <line x1="12" y1={topMid} x2="12" y2={botMid} stroke="#2a2a2a" strokeWidth="1" />
        <line x1="12" y1={midY} x2="24" y2={midY} stroke="#2a2a2a" strokeWidth="1" />
      </g>
    );
  }

  return (
    <svg width="24" height={TOTAL_H} className="flex-shrink-0 self-start overflow-visible">
      {paths}
    </svg>
  );
}

// ─── Round column ─────────────────────────────────────────────────────────────

function RoundColumn({ games, showLocations, offsetTop = 0 }: { games: BracketGame[]; showLocations?: boolean; offsetTop?: number }) {
  return (
    <div className="flex flex-col gap-6" style={{ paddingTop: offsetTop }}>
      {games.length === 0 ? (
        <MatchupBox game={{ id: "tbd", round: 0, region: "", regionSlot: 0, topTeam: null, bottomTeam: null, winner: null, date: "", venue: "", location: "", status: "pre", gameDate: "" }} />
      ) : (
        games.map((game) => (
          <MatchupBox key={game.id} game={game} showLocation={showLocations} />
        ))
      )}
    </div>
  );
}

// ─── Region bracket ───────────────────────────────────────────────────────────

function RegionBracket({
  label, r1, r2, r3, r4, flip = false,
}: {
  label: string; r1: BracketGame[]; r2: BracketGame[]; r3: BracketGame[]; r4: BracketGame[]; flip?: boolean;
}) {
  const BOX_H = 64;
  const GAP = 24;
  const UNIT = BOX_H + GAP;

  const r2Offset = UNIT / 2;
  const r3Offset = r2Offset + UNIT;
  const r4Offset = r3Offset + UNIT * 2;

  const cols = [
    { games: r1, offset: 0, showLoc: true },
    { games: r2, offset: r2Offset, showLoc: false },
    { games: r3, offset: r3Offset, showLoc: false },
    { games: r4, offset: r4Offset, showLoc: false },
  ];

  const ordered = flip ? [...cols].reverse() : cols;

  return (
    <div>
      <div className={`text-[10px] font-mono text-neutral-500 tracking-widest uppercase mb-3 ${flip ? "text-right" : ""}`}>
        {label}
      </div>
      <div className="flex items-start gap-0">
        {ordered.map((col, ci) => (
          <div key={ci} className="flex items-start">
            <RoundColumn
              games={col.games}
              showLocations={col.showLoc}
              offsetTop={col.offset}
            />
            {ci < ordered.length - 1 && (
              <RoundConnectors gameCount={Math.max(col.games.length, 1)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Championship center ──────────────────────────────────────────────────────

function CenterChampionship({ f4: f4Games, champ }: { f4: BracketGame[]; champ: BracketGame | null }) {
  const TBD_GAME: BracketGame = { id: "tbd", round: 0, region: "", regionSlot: 0, topTeam: null, bottomTeam: null, winner: null, date: "", venue: "", location: "", status: "pre", gameDate: "" };

  return (
    <div className="flex flex-col items-center gap-6 px-6">
      <div className="text-center">
        <div className="text-[9px] font-mono text-neutral-700 mb-1 tracking-widest">FINAL FOUR</div>
        <MatchupBox game={f4Games[0] ?? TBD_GAME} showLocation />
      </div>
      <div className="text-center">
        <div className="text-[10px] font-mono text-[#00ffff]/50 tracking-widest mb-1">CHAMPIONSHIP</div>
        <MatchupBox game={champ ?? TBD_GAME} showLocation />
        {champ?.winner && (
          <div className="mt-2 text-[10px] font-mono text-[#00ffff] text-center">
            🏆 {champ.winner.name}
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="text-[9px] font-mono text-neutral-700 mb-1 tracking-widest">FINAL FOUR</div>
        <MatchupBox game={f4Games[1] ?? TBD_GAME} showLocation />
      </div>
    </div>
  );
}

// ─── First Four ───────────────────────────────────────────────────────────────

function FirstFour({ games }: { games: BracketGame[] }) {
  if (!games.length) return null;
  return (
    <div className="mb-8 pb-6 border-b border-neutral-800">
      <div className="text-[10px] font-mono text-neutral-600 tracking-widest uppercase mb-4">
        First Four — Mar 18–19
      </div>
      <div className="flex flex-wrap gap-6">
        {games.map((g) => <MatchupBox key={g.id} game={g} showLocation />)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BracketPage() {
  const [data, setData] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bracket")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load bracket data"); setLoading(false); });
  }, []);

  function games(region: string, round: number): BracketGame[] {
    if (!data) return [];
    return data.rounds.find((r) => r.round === round)?.games.filter((g) => g.region === region) ?? [];
  }

  const firstFour = data?.rounds.find((r) => r.round === 0)?.games ?? [];
  const f4 = data?.rounds.find((r) => r.round === 5)?.games ?? [];
  const champ = data?.rounds.find((r) => r.round === 6)?.games[0] ?? null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <div className="border-b border-neutral-800 px-4 py-4 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-10">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-neutral-600 hover:text-white transition-colors">← Back</Link>
            <div>
              <h1 className="text-sm font-bold text-white">2025 NCAA Tournament</h1>
              <p className="text-[11px] text-neutral-600">
                {loading ? "Loading..." : data ? `Live data from ESPN · Updated ${new Date(data.lastUpdated).toLocaleTimeString()}` : error}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-neutral-700">
            <span><span className="text-[#00ffff]">✓</span> Winner</span>
            <span>Faded = Eliminated</span>
            <span>Location shown on first round</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8 overflow-x-auto">
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
            <span className="text-neutral-600 text-xs font-mono">Fetching bracket from ESPN...</span>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-24 text-neutral-600 text-xs">{error}</div>
        )}

        {data && !loading && (
          <>
            <FirstFour games={firstFour} />

            {/* Main bracket */}
            <div className="flex items-start gap-0 min-w-max">
              {/* Left — South + East */}
              <div className="flex flex-col gap-10">
                <RegionBracket label="South" r1={games("South", 1)} r2={games("South", 2)} r3={games("South", 3)} r4={games("South", 4)} />
                <RegionBracket label="East"  r1={games("East",  1)} r2={games("East",  2)} r3={games("East",  3)} r4={games("East",  4)} />
              </div>

              {/* Center — Final Four + Championship */}
              <CenterChampionship f4={f4} champ={champ} />

              {/* Right — West + Midwest (flipped to face center) */}
              <div className="flex flex-col gap-10">
                <RegionBracket label="West"    r1={games("West",    1)} r2={games("West",    2)} r3={games("West",    3)} r4={games("West",    4)} flip />
                <RegionBracket label="Midwest" r1={games("Midwest", 1)} r2={games("Midwest", 2)} r3={games("Midwest", 3)} r4={games("Midwest", 4)} flip />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-neutral-800 flex flex-wrap items-center gap-6 text-[10px] font-mono text-neutral-700">
              {data.rounds.map((r) => (
                <span key={r.round}>{r.label} <span className="text-neutral-600">({r.games.length})</span></span>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

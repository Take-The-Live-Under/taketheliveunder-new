"use client";

import Link from "next/link";
import { useState } from "react";
import { BRACKET_MATCHUPS, BracketTeam } from "@/components/bracket-lab/mockData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BracketGame {
  id: string;
  round: number;
  region: string;
  topTeam: BracketTeam | null;
  bottomTeam: BracketTeam | null;
  winner: BracketTeam | null;
}

// ─── Build initial bracket structure from mock matchups ───────────────────────

function buildBracket(): { south: BracketGame[]; west: BracketGame[] } {
  const south: BracketGame[] = [
    {
      id: "S-R1-1",
      round: 1,
      region: "South",
      topTeam: BRACKET_MATCHUPS[0].teamA,    // 1 Duke
      bottomTeam: BRACKET_MATCHUPS[0].teamB, // 4 Kansas
      winner: null,
    },
    {
      id: "S-R1-2",
      round: 1,
      region: "South",
      topTeam: BRACKET_MATCHUPS[1].teamA,    // 2 Auburn
      bottomTeam: BRACKET_MATCHUPS[1].teamB, // 3 Kentucky
      winner: null,
    },
    {
      id: "S-R2-1",
      round: 2,
      region: "South",
      topTeam: null,
      bottomTeam: null,
      winner: null,
    },
  ];

  const west: BracketGame[] = [
    {
      id: "W-R1-1",
      round: 1,
      region: "West",
      topTeam: BRACKET_MATCHUPS[2].teamA,    // 1 Houston
      bottomTeam: BRACKET_MATCHUPS[2].teamB, // 4 Gonzaga
      winner: null,
    },
    {
      id: "W-R1-2",
      round: 1,
      region: "West",
      topTeam: BRACKET_MATCHUPS[3].teamA,    // 2 Tennessee
      bottomTeam: BRACKET_MATCHUPS[3].teamB, // 3 Marquette
      winner: null,
    },
    {
      id: "W-R2-1",
      round: 2,
      region: "West",
      topTeam: null,
      bottomTeam: null,
      winner: null,
    },
  ];

  return { south, west };
}

// ─── Team slot component ──────────────────────────────────────────────────────

function TeamSlot({
  team,
  isWinner,
  isEliminated,
  onClick,
  position,
}: {
  team: BracketTeam | null;
  isWinner: boolean;
  isEliminated: boolean;
  onClick?: () => void;
  position: "top" | "bottom";
}) {
  const isEmpty = !team;

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-1.5 h-8 px-2 border-b border-neutral-800 last:border-b-0
        ${isEmpty ? "cursor-default" : onClick ? "cursor-pointer" : "cursor-default"}
        ${isWinner ? "bg-neutral-800/60" : ""}
        ${isEliminated ? "opacity-35" : ""}
        ${!isEmpty && onClick ? "hover:bg-neutral-800/40 group" : ""}
      `}
    >
      {isEmpty ? (
        <span className="text-[10px] text-neutral-800 font-mono">TBD</span>
      ) : (
        <>
          {/* Seed */}
          <span className={`text-[10px] font-bold font-mono w-4 flex-shrink-0 ${
            isWinner ? "text-white" : "text-neutral-500"
          }`}>
            {team.seed}
          </span>
          {/* Team name */}
          <span className={`text-xs font-medium truncate flex-1 ${
            isWinner
              ? "text-white font-semibold"
              : isEliminated
              ? "text-neutral-600"
              : "text-neutral-300 group-hover:text-white transition-colors"
          }`}>
            {team.shortName}
          </span>
          {/* Record */}
          <span className="text-[10px] text-neutral-700 font-mono flex-shrink-0 hidden sm:block">
            {team.record}
          </span>
          {/* Winner checkmark */}
          {isWinner && (
            <span className="text-[#00ffff] text-[10px] flex-shrink-0">✓</span>
          )}
        </>
      )}
    </div>
  );
}

// ─── Matchup box ─────────────────────────────────────────────────────────────

function MatchupBox({
  game,
  onPickWinner,
  linkToLab,
}: {
  game: BracketGame;
  onPickWinner: (game: BracketGame, team: BracketTeam) => void;
  linkToLab?: string;
}) {
  const canPick = game.round === 1 && (game.topTeam || game.bottomTeam);

  return (
    <div className="relative">
      <div className="rounded border border-neutral-800 overflow-hidden bg-[#111111] w-40 sm:w-48">
        <TeamSlot
          team={game.topTeam}
          isWinner={game.winner?.id === game.topTeam?.id}
          isEliminated={!!game.winner && game.winner.id !== game.topTeam?.id}
          onClick={canPick && game.topTeam ? () => onPickWinner(game, game.topTeam!) : undefined}
          position="top"
        />
        <TeamSlot
          team={game.bottomTeam}
          isWinner={game.winner?.id === game.bottomTeam?.id}
          isEliminated={!!game.winner && game.winner.id !== game.bottomTeam?.id}
          onClick={canPick && game.bottomTeam ? () => onPickWinner(game, game.bottomTeam!) : undefined}
          position="bottom"
        />
      </div>

      {/* Lab link for round 1 games */}
      {linkToLab && game.round === 1 && (
        <Link
          href={linkToLab}
          className="absolute -bottom-5 left-0 right-0 text-center text-[9px] font-mono text-neutral-700 hover:text-[#00ffff] transition-colors"
        >
          stats →
        </Link>
      )}
    </div>
  );
}

// ─── Connector line SVG ───────────────────────────────────────────────────────

function ConnectorLines({ count }: { count: number }) {
  // count = number of matchup pairs feeding into next round
  const SLOT_H = 32; // h-8 = 32px
  const BOX_H = SLOT_H * 2; // each matchup box = 2 slots
  const GAP = 32; // gap between boxes (mt-8 = 32px)
  const UNIT = BOX_H + GAP; // distance from top of one box to top of next

  const lines = [];
  for (let i = 0; i < count; i++) {
    const topBoxMid = i * UNIT + SLOT_H / 2 + SLOT_H / 2; // midpoint of top match box (avg of 2 slots)
    const botBoxMid = i * UNIT + SLOT_H + GAP + SLOT_H / 2 + SLOT_H / 2;
    const midY = (topBoxMid + botBoxMid) / 2;

    lines.push(
      <g key={i}>
        {/* Top game → right */}
        <line x1="0" y1={topBoxMid} x2="16" y2={topBoxMid} stroke="#2a2a2a" strokeWidth="1" />
        {/* Bottom game → right */}
        <line x1="0" y1={botBoxMid} x2="16" y2={botBoxMid} stroke="#2a2a2a" strokeWidth="1" />
        {/* Vertical connector */}
        <line x1="16" y1={topBoxMid} x2="16" y2={botBoxMid} stroke="#2a2a2a" strokeWidth="1" />
        {/* → next round */}
        <line x1="16" y1={midY} x2="32" y2={midY} stroke="#2a2a2a" strokeWidth="1" />
      </g>
    );
  }

  const totalH = count * UNIT;
  return (
    <svg width="32" height={totalH} className="flex-shrink-0 overflow-visible">
      {lines}
    </svg>
  );
}

// ─── Region bracket ───────────────────────────────────────────────────────────

function RegionBracket({
  region,
  games,
  onPickWinner,
  labMatchupIds,
}: {
  region: string;
  games: BracketGame[];
  onPickWinner: (game: BracketGame, team: BracketTeam) => void;
  labMatchupIds: Record<string, string>;
}) {
  const round1 = games.filter((g) => g.round === 1);
  const round2 = games.filter((g) => g.round === 2);

  return (
    <div className="flex-1 min-w-0">
      {/* Region header */}
      <div className="mb-4 pb-2 border-b border-neutral-800">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          {region} Region
        </span>
      </div>

      <div className="flex items-start gap-0">
        {/* Round 1 */}
        <div className="flex flex-col gap-8">
          {round1.map((game) => (
            <MatchupBox
              key={game.id}
              game={game}
              onPickWinner={onPickWinner}
              linkToLab={labMatchupIds[game.id]}
            />
          ))}
        </div>

        {/* Connector */}
        <ConnectorLines count={Math.floor(round1.length / 2) || 1} />

        {/* Round 2 (Semi) */}
        <div className="flex flex-col justify-center" style={{ marginTop: `${32 + 8}px` }}>
          {round2.map((game) => (
            <MatchupBox
              key={game.id}
              game={game}
              onPickWinner={onPickWinner}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Championship connector ───────────────────────────────────────────────────

function ChampionshipGame({
  topGame,
  bottomGame,
}: {
  topGame: BracketGame;
  bottomGame: BracketGame;
}) {
  const topTeam = topGame.winner;
  const bottomTeam = bottomGame.winner;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] font-mono text-neutral-600 tracking-widest uppercase mb-1">
        Championship
      </div>
      <div className="rounded border border-neutral-700 overflow-hidden bg-[#111111] w-40 sm:w-48">
        <div className={`flex items-center gap-1.5 h-8 px-2 border-b border-neutral-800 ${!topTeam ? 'opacity-30' : ''}`}>
          {topTeam ? (
            <>
              <span className="text-[10px] font-bold font-mono w-4 text-neutral-500">{topTeam.seed}</span>
              <span className="text-xs text-neutral-300">{topTeam.shortName}</span>
            </>
          ) : (
            <span className="text-[10px] text-neutral-800 font-mono">TBD</span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 h-8 px-2 ${!bottomTeam ? 'opacity-30' : ''}`}>
          {bottomTeam ? (
            <>
              <span className="text-[10px] font-bold font-mono w-4 text-neutral-500">{bottomTeam.seed}</span>
              <span className="text-xs text-neutral-300">{bottomTeam.shortName}</span>
            </>
          ) : (
            <span className="text-[10px] text-neutral-800 font-mono">TBD</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BracketPage() {
  const initial = buildBracket();
  const [southGames, setSouthGames] = useState<BracketGame[]>(initial.south);
  const [westGames, setWestGames] = useState<BracketGame[]>(initial.west);

  function handlePickWinner(
    regionSetter: React.Dispatch<React.SetStateAction<BracketGame[]>>,
    game: BracketGame,
    team: BracketTeam
  ) {
    regionSetter((prev) => {
      const updated = prev.map((g) => {
        // Toggle: clicking winner again clears it
        if (g.id === game.id) {
          return { ...g, winner: g.winner?.id === team.id ? null : team };
        }
        return g;
      });

      // Propagate winner into next round's matchup
      const updatedGame = updated.find((g) => g.id === game.id)!;
      const winner = updatedGame.winner;

      // Figure out which slot in round 2 this feeds
      const round1Games = updated.filter((g) => g.round === 1);
      const gameIdx = round1Games.findIndex((g) => g.id === game.id);
      const round2GameIdx = Math.floor(gameIdx / 2);
      const isTopSlot = gameIdx % 2 === 0;

      return updated.map((g) => {
        if (g.round === 2) {
          const r2Games = prev.filter((x) => x.round === 2);
          if (r2Games.indexOf(g) === round2GameIdx) {
            return {
              ...g,
              topTeam: isTopSlot ? winner : g.topTeam,
              bottomTeam: !isTopSlot ? winner : g.bottomTeam,
              winner: null, // clear any existing round 2 pick when round 1 changes
            };
          }
        }
        return g;
      });
    });
  }

  // Map game IDs to bracket-lab matchup IDs for "stats →" links
  const labLinks: Record<string, string> = {
    "S-R1-1": "/bracket-lab",
    "S-R1-2": "/bracket-lab",
    "W-R1-1": "/bracket-lab",
    "W-R1-2": "/bracket-lab",
  };

  const southSemi = southGames.find((g) => g.round === 2)!;
  const westSemi = westGames.find((g) => g.round === 2)!;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <div className="border-b border-neutral-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-neutral-600 hover:text-white transition-colors"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-sm font-bold text-white">2025 NCAA Tournament</h1>
              <p className="text-[11px] text-neutral-600">Click a team to pick your winner · <Link href="/bracket-lab" className="text-[#00ffff] hover:underline">Open Stats Lab →</Link></p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-neutral-700 hidden sm:block">
            BRACKET BETA
          </div>
        </div>
      </div>

      {/* Bracket */}
      <div className="max-w-6xl mx-auto px-4 py-8 overflow-x-auto">
        <div className="flex gap-12 min-w-max lg:min-w-0">

          {/* South */}
          <RegionBracket
            region="South"
            games={southGames}
            onPickWinner={(game, team) => handlePickWinner(setSouthGames, game, team)}
            labMatchupIds={labLinks}
          />

          {/* Championship center */}
          <div className="flex flex-col items-center justify-center px-4 gap-4">
            <div className="w-px flex-1 bg-neutral-800" />
            <ChampionshipGame topGame={southSemi} bottomGame={westSemi} />
            <div className="w-px flex-1 bg-neutral-800" />
          </div>

          {/* West */}
          <RegionBracket
            region="West"
            games={westGames}
            onPickWinner={(game, team) => handlePickWinner(setWestGames, game, team)}
            labMatchupIds={labLinks}
          />
        </div>

        {/* Legend */}
        <div className="mt-10 pt-6 border-t border-neutral-800 flex flex-wrap gap-6 text-[11px] text-neutral-600">
          <span>Click a team to advance them</span>
          <span>·</span>
          <span>Click again to undo</span>
          <span>·</span>
          <span><Link href="/bracket-lab" className="text-[#00ffff] hover:underline">Stats Lab</Link> for deep analytics</span>
          <span>·</span>
          <span className="text-neutral-700">Full 64-team bracket coming at selection Sunday</span>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Play } from "@/app/api/play-by-play/route";

interface PlayByPlayData {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamAbbrev: string;
  awayTeamAbbrev: string;
  homeScore: number;
  awayScore: number;
  status: string;
  period: number;
  clock: string;
  plays: Play[];
  totalPlays: number;
}

interface PlayByPlayTabProps {
  gameId: string;
  isLive: boolean;
}

function periodLabel(period: number): string {
  if (period === 1) return "1st Half";
  if (period === 2) return "2nd Half";
  if (period === 3) return "OT";
  return `OT${period - 2}`;
}

function playTypeIcon(playType: string, scoringPlay: boolean): string {
  const t = playType.toLowerCase();
  if (scoringPlay) return "🏀";
  if (t.includes("foul")) return "✋";
  if (t.includes("rebound")) return "↩";
  if (t.includes("turnover") || t.includes("steal")) return "💨";
  if (t.includes("timeout")) return "⏸";
  if (t.includes("block")) return "🛡";
  if (t.includes("jump ball") || t.includes("tip")) return "⬆";
  if (t.includes("free throw")) return "🎯";
  if (t.includes("substitution") || t.includes("sub")) return "🔄";
  return "·";
}

function playRowStyle(play: Play): string {
  if (play.scoringPlay) {
    return play.isHomeTeam === true
      ? "border-l-2 border-[#00ffff]/60 bg-[#00ffff]/5"
      : "border-l-2 border-[#ff6b00]/60 bg-[#ff6b00]/5";
  }
  const t = play.playType.toLowerCase();
  if (t.includes("foul")) return "border-l-2 border-yellow-600/40";
  if (t.includes("turnover") || t.includes("steal")) return "border-l-2 border-red-700/40";
  return "border-l-2 border-transparent";
}

function scoreColor(play: Play, isHome: boolean): string {
  if (!play.scoringPlay) return "text-neutral-500";
  if (isHome && play.isHomeTeam) return "text-[#00ffff]";
  if (!isHome && !play.isHomeTeam && play.isHomeTeam !== null) return "text-[#ff6b00]";
  return "text-neutral-400";
}

export default function PlayByPlayTab({ gameId, isLive }: PlayByPlayTabProps) {
  const [data, setData] = useState<PlayByPlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [newPlayIds, setNewPlayIds] = useState<Set<string>>(new Set());
  const prevPlayIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPlays = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/play-by-play?gameId=${gameId}&limit=100`);
      if (!res.ok) throw new Error("Failed to fetch plays");
      const json: PlayByPlayData = await res.json();

      // Highlight truly new plays since last fetch
      const incoming = new Set(json.plays.map((p) => p.id));
      const fresh = new Set<string>();
      for (const id of incoming) {
        if (!prevPlayIdsRef.current.has(id)) fresh.add(id);
      }
      prevPlayIdsRef.current = incoming;
      if (fresh.size > 0) {
        setNewPlayIds(fresh);
        setTimeout(() => setNewPlayIds(new Set()), 3000);
      }

      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchPlays();
    if (isLive) {
      intervalRef.current = setInterval(() => fetchPlays(true), 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPlays, isLive]);

  if (loading && !data) {
    return (
      <div className="p-8 flex flex-col items-center gap-3 text-neutral-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
        <span className="text-xs font-mono">Loading play-by-play...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-xs text-red-400 font-mono">Failed to load plays</p>
        <button
          onClick={() => fetchPlays()}
          className="mt-3 text-xs text-neutral-500 hover:text-white font-mono underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Group plays by period for display
  const displayPlays = showAll ? data.plays : data.plays.slice(0, 25);

  // Group into period buckets
  const grouped: { period: number; plays: Play[] }[] = [];
  for (const play of displayPlays) {
    const last = grouped[grouped.length - 1];
    if (!last || last.period !== play.period) {
      grouped.push({ period: play.period, plays: [play] });
    } else {
      last.plays.push(play);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="px-4 pt-3 pb-2 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest">
            // PLAY-BY-PLAY
          </span>
          {isLive && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#00ffff]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00ffff]" />
              </span>
              LIVE · 5s
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <span className="text-[#ff6b00] font-bold">{data.awayTeamAbbrev} {data.awayScore}</span>
          <span className="text-neutral-600">—</span>
          <span className="text-[#00ffff] font-bold">{data.homeScore} {data.homeTeamAbbrev}</span>
        </div>
      </div>

      {/* Team legend */}
      <div className="px-4 py-2 flex gap-4 text-[10px] font-mono text-neutral-600 border-b border-neutral-800 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-0.5 bg-[#ff6b00]/60 rounded" />
          {data.awayTeamAbbrev} (Away)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-0.5 bg-[#00ffff]/60 rounded" />
          {data.homeTeamAbbrev} (Home)
        </span>
      </div>

      {/* Plays feed — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {grouped.map(({ period, plays: periodPlays }) => (
          <div key={period}>
            {/* Period divider */}
            <div className="sticky top-0 z-10 px-4 py-1.5 flex items-center gap-2"
              style={{ background: "rgba(12,12,12,0.95)", backdropFilter: "blur(8px)" }}>
              <span className="text-[10px] font-bold font-mono text-neutral-500 uppercase tracking-widest">
                {periodLabel(period)}
              </span>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>

            {/* Plays in this period */}
            <div className="divide-y divide-neutral-800/30">
              {periodPlays.map((play) => {
                const isNew = newPlayIds.has(play.id);
                return (
                  <div
                    key={play.id}
                    className={`px-4 py-2.5 flex items-start gap-3 transition-colors duration-500 ${playRowStyle(play)} ${isNew ? "bg-[#00ffff]/10" : ""}`}
                  >
                    {/* Clock */}
                    <div className="flex-shrink-0 w-10 text-right">
                      <span className="text-[10px] font-mono text-neutral-600 tabular-nums">
                        {play.clock}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="flex-shrink-0 w-5 text-center text-xs leading-5">
                      {playTypeIcon(play.playType, play.scoringPlay)}
                    </div>

                    {/* Team abbrev */}
                    <div className="flex-shrink-0 w-8">
                      {play.teamAbbrev && (
                        <span className={`text-[10px] font-bold font-mono ${play.isHomeTeam ? "text-[#00ffff]/70" : "text-[#ff6b00]/70"}`}>
                          {play.teamAbbrev}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-mono leading-relaxed ${play.scoringPlay ? "text-white" : "text-neutral-400"}`}>
                        {play.description || play.playType}
                      </p>
                    </div>

                    {/* Score after play */}
                    {play.scoringPlay && (
                      <div className="flex-shrink-0 text-[10px] font-mono tabular-nums text-neutral-500 text-right">
                        <span className={scoreColor(play, false)}>{play.awayScore}</span>
                        <span className="text-neutral-700">–</span>
                        <span className={scoreColor(play, true)}>{play.homeScore}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Show more / total count */}
        <div className="px-4 py-4 text-center">
          {!showAll && data.plays.length > 25 ? (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-neutral-500 hover:text-white font-mono transition-colors tap-target"
            >
              Show all {data.totalPlays} plays ↓
            </button>
          ) : (
            <p className="text-[10px] text-neutral-700 font-mono">
              {data.totalPlays} total plays
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

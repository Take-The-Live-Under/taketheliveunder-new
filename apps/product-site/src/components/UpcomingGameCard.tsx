"use client";

import { GamePrediction } from "@/app/api/predictions/route";
import { getTeamBadge } from "@/lib/teamFilters";

interface UpcomingGameCardProps {
  prediction: GamePrediction;
  onClick?: () => void;
}

function formatGameTime(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export default function UpcomingGameCard({
  prediction,
  onClick,
}: UpcomingGameCardProps) {
  const {
    homeTeam,
    awayTeam,
    homeRank,
    awayRank,
    kenpomHomeScore,
    kenpomAwayScore,
    kenpomTotal,
    kenpomWinProb,
    kenpomTempo,
    vegasLine,
    lineDiff,
    confidence,
    gameTime,
  } = prediction;

  const homeBadge = getTeamBadge(homeTeam);
  const awayBadge = getTeamBadge(awayTeam);

  const favorsUnder = lineDiff !== null && lineDiff > 0;
  const favorsOver = lineDiff !== null && lineDiff < 0;
  const lineDiffAbs = lineDiff !== null ? Math.abs(lineDiff) : null;

  const getLineDiffStyle = () => {
    if (lineDiff === null) return { color: "text-neutral-700", label: "" };
    const abs = Math.abs(lineDiff);
    if (abs >= 5)
      return {
        color: favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]",
        label: "STRONG",
      };
    if (abs >= 3)
      return {
        color: favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]",
        label: "GOOD",
      };
    if (abs >= 1) return { color: "text-neutral-400", label: "" };
    return { color: "text-neutral-700", label: "" };
  };

  const lineDiffStyle = getLineDiffStyle();

  const getTempoStyle = () => {
    if (kenpomTempo >= 72) return { label: "FAST", color: "text-[#ff6b00]" };
    if (kenpomTempo >= 68) return { label: "AVG", color: "text-neutral-400" };
    return { label: "SLOW", color: "text-[#00ffff]" };
  };

  const tempoStyle = getTempoStyle();

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 transition-all duration-200 font-mono hover:border-neutral-700 ${
        lineDiffAbs && lineDiffAbs >= 3
          ? favorsUnder
            ? "border-[#00ffff]/30"
            : "border-[#ff6b00]/30"
          : "border-neutral-800"
      } ${onClick ? "cursor-pointer active:scale-[0.99]" : ""}`}
      style={{ background: "rgba(15,15,15,0.7)", backdropFilter: "blur(8px)" }}
    >
      {/* KenPom Signal Banner */}
      {lineDiffAbs !== null && lineDiffAbs >= 3 && (
        <div
          className={`mb-3 flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg ${
            favorsUnder
              ? "border border-[#00ffff]/30"
              : "border border-[#ff6b00]/30"
          }`}
          style={{
            background: favorsUnder
              ? "rgba(0,255,255,0.05)"
              : "rgba(255,107,0,0.05)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold ${favorsUnder ? "text-[#00ffff]" : "text-[#ff6b00]"}`}
            >
              {favorsUnder ? "❄️ KENPOM_UNDER" : "🔥 KENPOM_OVER"}
            </span>
          </div>
          <span className={`text-xs font-bold ${lineDiffStyle.color}`}>
            {lineDiffStyle.label}{" "}
            {lineDiffAbs >= 1 && `(${lineDiffAbs.toFixed(1)} pts)`}
          </span>
        </div>
      )}

      {/* Game Time */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-neutral-600 font-mono">
          {formatGameTime(gameTime)} ET
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border ${tempoStyle.color} border-current`}
          >
            {tempoStyle.label} TEMPO
          </span>
          <span className="text-[10px] text-neutral-600">
            {kenpomTempo.toFixed(0)} poss
          </span>
        </div>
      </div>

      {/* Teams with KenPom Scores */}
      <div className="mb-3">
        {/* Away Team */}
        <div className="flex items-center justify-between gap-3 py-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[10px] text-neutral-600 font-medium w-8">
              AWAY
            </span>
            {awayRank && awayRank <= 50 && (
              <span className="text-[10px] text-yellow-500 font-bold">
                #{awayRank}
              </span>
            )}
            <span className="text-sm font-semibold text-white truncate">
              {awayTeam}
            </span>
            {awayBadge && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                  awayBadge.color === "red"
                    ? "border-red-700 text-red-400 bg-red-900/30"
                    : awayBadge.color === "orange"
                      ? "border-[#ff6b00]/40 text-[#ff6b00] bg-[#ff6b00]/10"
                      : awayBadge.color === "blue"
                        ? "border-[#00ffff]/40 text-[#00ffff] bg-[#00ffff]/10"
                        : "border-neutral-700 text-neutral-400 bg-neutral-900/50"
                }`}
              >
                {awayBadge.text}
              </span>
            )}
          </div>
          <span className="text-lg font-bold text-white tabular-nums font-mono">
            {kenpomAwayScore.toFixed(0)}
          </span>
        </div>

        {/* Home Team */}
        <div className="flex items-center justify-between gap-3 py-1.5 border-t border-neutral-800/50">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[10px] text-neutral-600 font-medium w-8">
              HOME
            </span>
            {homeRank && homeRank <= 50 && (
              <span className="text-[10px] text-yellow-500 font-bold">
                #{homeRank}
              </span>
            )}
            <span className="text-sm font-semibold text-white truncate">
              {homeTeam}
            </span>
            {homeBadge && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                  homeBadge.color === "red"
                    ? "border-red-700 text-red-400 bg-red-900/30"
                    : homeBadge.color === "orange"
                      ? "border-[#ff6b00]/40 text-[#ff6b00] bg-[#ff6b00]/10"
                      : homeBadge.color === "blue"
                        ? "border-[#00ffff]/40 text-[#00ffff] bg-[#00ffff]/10"
                        : "border-neutral-700 text-neutral-400 bg-neutral-900/50"
                }`}
              >
                {homeBadge.text}
              </span>
            )}
          </div>
          <span className="text-lg font-bold text-white tabular-nums font-mono">
            {kenpomHomeScore.toFixed(0)}
          </span>
        </div>
      </div>

      {/* KenPom Stats Bar */}
      <div
        className="grid grid-cols-3 gap-2 rounded-lg border border-neutral-800/50 p-2"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <div className="text-center">
          <div className="text-[10px] text-neutral-600 mb-0.5">KENPOM</div>
          <div className="text-sm font-bold text-[#00ffff] font-mono">
            {kenpomTotal.toFixed(1)}
          </div>
        </div>

        <div className="text-center border-x border-neutral-800/50">
          <div className="text-[10px] text-neutral-600 mb-0.5">VEGAS</div>
          <div className="text-sm font-bold text-white font-mono">
            {vegasLine !== null ? vegasLine.toFixed(1) : "—"}
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] text-neutral-600 mb-0.5">DIFF</div>
          <div className={`text-sm font-bold font-mono ${lineDiffStyle.color}`}>
            {lineDiff !== null ? (
              <>
                {favorsUnder ? "↓" : favorsOver ? "↑" : ""}{" "}
                {lineDiffAbs?.toFixed(1)}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {/* Win Probability Bar */}
      <div className="mt-2 pt-2 border-t border-neutral-800/50">
        <div className="flex items-center justify-between text-[10px] text-neutral-600 mb-1">
          <span>
            {awayTeam.split(" ").pop()} {(100 - kenpomWinProb).toFixed(0)}%
          </span>
          <span>WIN PROB</span>
          <span>
            {homeTeam.split(" ").pop()} {kenpomWinProb.toFixed(0)}%
          </span>
        </div>
        <div
          className="h-1.5 w-full rounded-full overflow-hidden flex"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${100 - kenpomWinProb}%`,
              background: "rgba(0,255,255,0.4)",
            }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${kenpomWinProb}%`, background: "#00ffff" }}
          />
        </div>
      </div>
    </div>
  );
}

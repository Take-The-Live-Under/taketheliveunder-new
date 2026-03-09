"use client";

import { Game } from "@/types/game";
import TriggerBuilder from "./TriggerBuilder";

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

function formatPPM(ppm: number | null): string {
  if (ppm === null) return "—";
  return ppm.toFixed(2);
}

function getPeriodDisplay(game: Game): string {
  if (game.isOvertime) {
    const otNumber = game.period - 2;
    return otNumber > 1 ? `OT${otNumber}` : "OT";
  }
  if (game.period === 1) return "H1";
  if (game.period === 2) return "H2";
  return `P${game.period}`;
}

// Edge color coding based on PPM difference
function getEdgeColor(edge: number | null): {
  bg: string;
  text: string;
  label: string;
} {
  if (edge === null)
    return { bg: "bg-neutral-900/30", text: "text-neutral-600", label: "" };

  const absEdge = Math.abs(edge);

  if (absEdge >= 1.5) {
    return { bg: "bg-yellow-950/40", text: "text-yellow-400", label: "STRONG" };
  }
  if (absEdge >= 1.0) {
    return { bg: "bg-[#00ffff]/5", text: "text-[#00ffff]", label: "GOOD" };
  }
  if (absEdge >= 0.5) {
    return {
      bg: "bg-neutral-900/30",
      text: "text-[#00ffff]/70",
      label: "MODERATE",
    };
  }
  return { bg: "bg-neutral-900/20", text: "text-neutral-600", label: "" };
}

// Calculate trigger strength (0-100) based on how far above 4.5 the required PPM is
function getUnderTriggerStrength(requiredPPM: number | null): number {
  if (requiredPPM === null || requiredPPM < 4.5) return 0;
  const strength = Math.min(((requiredPPM - 4.5) / 1.5) * 100, 100);
  return Math.round(strength);
}

export default function GameCard({ game, onClick }: GameCardProps) {
  const isLive = game.status === "in";
  const isUnderTriggered = game.triggerType === "under";
  const isTripleDipper = game.triggerType === "tripleDipper";
  const isOverTriggered = game.triggerType === "over";
  const hasAnyTrigger = game.triggerType !== null;
  const triggerStrength = getUnderTriggerStrength(game.requiredPPM);

  // Calculate derived metrics
  const edge =
    game.requiredPPM !== null && game.currentPPM !== null
      ? game.requiredPPM - game.currentPPM
      : null;

  const edgeStyle = getEdgeColor(edge);

  // Projected final = current total + (current PPM * minutes remaining)
  const projectedFinal =
    game.currentPPM !== null && game.minutesRemainingReg > 0
      ? game.liveTotal + game.currentPPM * game.minutesRemainingReg
      : null;

  // Calculate if under-friendly (current PPM < required PPM means pace is slow)
  const isUnderFriendly =
    game.currentPPM !== null &&
    game.requiredPPM !== null &&
    game.currentPPM < game.requiredPPM;

  // Determine card styling based on trigger type
  const getCardStyle = () => {
    if (isTripleDipper) {
      return "border-yellow-500/40 bg-neutral-900/50 backdrop-blur-sm shadow-[0_0_20px_rgba(234,179,8,0.12)]";
    }
    if (isOverTriggered) {
      return "border-[#ff6b00]/40 bg-neutral-900/50 backdrop-blur-sm shadow-[0_0_20px_rgba(255,107,0,0.12)]";
    }
    if (isUnderTriggered) {
      return "border-[#00ffff]/40 bg-neutral-900/50 backdrop-blur-sm shadow-[0_0_20px_rgba(0,255,255,0.12)]";
    }
    return "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/60";
  };

  // Determine if trigger badge should be shown
  const showTriggerBadge = hasAnyTrigger;

  // Get trigger badge color and text
  const getTriggerStyle = () => {
    if (isTripleDipper) {
      return {
        color: "text-yellow-400",
        ping: "bg-yellow-400",
        dot: "bg-yellow-500",
        label: "TRIPLE DIPPER 🏆",
      };
    }
    if (isOverTriggered) {
      return {
        color: "text-[#ff6b00]",
        ping: "bg-[#ff6b00]",
        dot: "bg-[#ff6b00]",
        label: "OVER SIGNAL",
      };
    }
    return {
      color: "text-[#00ffff]",
      ping: "bg-[#00ffff]",
      dot: "bg-[#00ffff]",
      label: "GOLDEN ZONE",
    };
  };
  const triggerStyle = getTriggerStyle();

  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 transition-all duration-200 card-enter game-card-stable backdrop-blur-sm ${getCardStyle()} ${onClick ? "cursor-pointer active:scale-[0.99]" : ""}`}
    >
      {/* Trigger Badge - uses opacity for smooth transitions instead of unmounting */}
      <div
        className={`mb-3 transition-all duration-300 ${showTriggerBadge ? "opacity-100 max-h-20" : "opacity-0 max-h-0 overflow-hidden mb-0"}`}
        aria-hidden={!showTriggerBadge}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${triggerStyle.ping} opacity-75`}
              ></span>
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${triggerStyle.dot}`}
              ></span>
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wide font-mono ${triggerStyle.color}`}
            >
              {triggerStyle.label}
            </span>
          </div>
          {edge !== null && edgeStyle.label && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
                isTripleDipper
                  ? "border-yellow-700/50 text-yellow-400"
                  : isOverTriggered
                    ? "border-[#ff6b00]/50 text-[#ff6b00]"
                    : "border-[#00ffff]/50 text-[#00ffff]"
              }`}
            >
              {edgeStyle.label}
            </span>
          )}
        </div>
        {(isUnderTriggered || isTripleDipper) && (
          <div className="mt-2 h-0.5 w-full bg-neutral-800 overflow-hidden rounded-full">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isTripleDipper
                  ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                  : "bg-gradient-to-r from-[#00ffff] to-[#00ffff]/60"
              }`}
              style={{ width: `${triggerStrength}%` }}
            />
          </div>
        )}
      </div>

      {/* Teams & Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-3 py-1.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] text-neutral-600 font-medium font-mono w-8">
              AWAY
            </span>
            <span className="text-sm font-semibold text-white truncate">
              {game.awayTeam}
            </span>
            {/* Away team direction badge */}
            {game.awayTeamBadge && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded border font-mono ${
                  game.awayTeamBadge.color === "red"
                    ? "border-red-700/50 text-red-400"
                    : game.awayTeamBadge.color === "orange"
                      ? "border-[#ff6b00]/50 text-[#ff6b00]"
                      : game.awayTeamBadge.color === "blue"
                        ? "border-[#00ffff]/50 text-[#00ffff]"
                        : "border-neutral-700 text-neutral-400"
                }`}
              >
                {game.awayTeamBadge.text}
              </span>
            )}
            {/* Away team bonus indicator */}
            {isLive &&
              game.awayBonusStatus &&
              (game.awayBonusStatus.inBonus ||
                game.awayBonusStatus.inDoubleBonus) && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded border font-mono ${
                    game.awayBonusStatus.inDoubleBonus
                      ? "border-red-700/50 text-red-400"
                      : "border-yellow-700/50 text-yellow-400"
                  }`}
                >
                  {game.awayBonusStatus.inDoubleBonus ? "2X" : "BNS"}
                </span>
              )}
          </div>
          <span className="text-xl font-bold text-white tabular-nums font-mono">
            {game.awayScore}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5 border-t border-neutral-800/50">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] text-neutral-600 font-medium font-mono w-8">
              HOME
            </span>
            <span className="text-sm font-semibold text-white truncate">
              {game.homeTeam}
            </span>
            {/* Home team direction badge */}
            {game.homeTeamBadge && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded border font-mono ${
                  game.homeTeamBadge.color === "red"
                    ? "border-red-700/50 text-red-400"
                    : game.homeTeamBadge.color === "orange"
                      ? "border-[#ff6b00]/50 text-[#ff6b00]"
                      : game.homeTeamBadge.color === "blue"
                        ? "border-[#00ffff]/50 text-[#00ffff]"
                        : "border-neutral-700 text-neutral-400"
                }`}
              >
                {game.homeTeamBadge.text}
              </span>
            )}
            {/* Home team bonus indicator */}
            {isLive &&
              game.homeBonusStatus &&
              (game.homeBonusStatus.inBonus ||
                game.homeBonusStatus.inDoubleBonus) && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded border font-mono ${
                    game.homeBonusStatus.inDoubleBonus
                      ? "border-red-700/50 text-red-400"
                      : "border-yellow-700/50 text-yellow-400"
                  }`}
                >
                  {game.homeBonusStatus.inDoubleBonus ? "2X" : "BNS"}
                </span>
              )}
          </div>
          <span className="text-xl font-bold text-white tabular-nums font-mono">
            {game.homeScore}
          </span>
        </div>
      </div>

      {/* Game Status Bar */}
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50 px-3 py-2">
        {isLive ? (
          <>
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ffff]"></span>
            </span>
            <span className="text-xs font-semibold text-[#00ffff] font-mono">
              {game.clock} | {getPeriodDisplay(game)}
            </span>
            <span className="text-[10px] text-neutral-600 ml-auto font-mono">
              {game.minutesRemainingReg.toFixed(1)}m LEFT
            </span>
          </>
        ) : game.status === "post" ? (
          <span className="text-xs font-medium text-neutral-500 font-mono">
            FINAL
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {game.isTomorrow && (
              <span className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] font-medium text-neutral-400 font-mono">
                TOMORROW
              </span>
            )}
            <span className="text-xs font-medium text-neutral-400 font-mono">
              {new Date(game.startTime).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
        {game.isOvertime && (
          <span className="rounded border border-yellow-700/50 px-2 py-0.5 text-[10px] font-bold text-yellow-400 font-mono">
            OT
          </span>
        )}
      </div>

      {/* Foul Game Warning - smooth transition instead of conditional mount */}
      <div
        className={`transition-all duration-300 ease-out ${
          isLive && game.foulGameWarning
            ? "opacity-100 max-h-32 mb-3"
            : "opacity-0 max-h-0 overflow-hidden mb-0"
        }`}
        aria-hidden={!(isLive && game.foulGameWarning)}
      >
        <div
          className={`border p-3 ${
            game.foulGameWarningLevel === "high"
              ? "bg-red-900/20 border-red-700/50"
              : game.foulGameWarningLevel === "medium"
                ? "bg-yellow-900/20 border-yellow-700/50"
                : "bg-green-900/20 border-green-700/50"
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  game.foulGameWarningLevel === "high"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
              >
                // FT_FRENZY{" "}
                {game.foulGameWarningLevel === "high" ? "- HIGH IMPACT" : ""}
              </div>
              {game.foulGameWarningMessage && (
                <div className="text-xs text-green-500 mt-1">
                  {game.foulGameWarningMessage}
                </div>
              )}
              {/* Show team-specific info */}
              <div className="flex flex-wrap gap-2 mt-2">
                {game.homeFoulGameInfo && (
                  <span className="text-[10px] bg-green-900/30 border border-green-900 px-2 py-0.5 text-green-500">
                    {game.homeTeam.split(" ")[0]}: {game.homeFoulGameInfo}
                  </span>
                )}
                {game.awayFoulGameInfo && (
                  <span className="text-[10px] bg-green-900/30 border border-green-900 px-2 py-0.5 text-green-500">
                    {game.awayTeam.split(" ")[0]}: {game.awayFoulGameInfo}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid for Live Games */}
      {isLive && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* Current Total */}
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide font-mono">
              SCORE
            </div>
            <div className="text-lg font-bold text-white tabular-nums font-mono">
              {game.liveTotal}
            </div>
          </div>

          {/* O/U Line */}
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide font-mono">
              O/U
            </div>
            <div className="text-lg font-bold text-white tabular-nums font-mono">
              {game.ouLine !== null ? game.ouLine.toFixed(1) : "—"}
            </div>
          </div>

          {/* Required PPM */}
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide font-mono">
              REQ
            </div>
            <div
              className={`text-lg font-bold tabular-nums font-mono ${isUnderFriendly ? "text-yellow-400" : "text-[#00ffff]"}`}
            >
              {formatPPM(game.requiredPPM)}
            </div>
          </div>

          {/* Current PPM */}
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide font-mono">
              CUR
            </div>
            <div className="text-lg font-bold text-white tabular-nums font-mono">
              {formatPPM(game.currentPPM)}
            </div>
          </div>
        </div>
      )}

      {/* Line Movement Tracking for Live Games */}
      {isLive && game.openingLine !== null && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide font-mono">
              OPEN
            </div>
            <div className="text-sm font-bold text-neutral-300 tabular-nums font-mono">
              {game.openingLine.toFixed(1)}
            </div>
          </div>
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide font-mono">
              HIGH
            </div>
            <div className="text-sm font-bold text-neutral-300 tabular-nums font-mono">
              {game.maxLine !== null ? game.maxLine.toFixed(1) : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide font-mono">
              LOW
            </div>
            <div className="text-sm font-bold text-neutral-300 tabular-nums font-mono">
              {game.minLine !== null ? game.minLine.toFixed(1) : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide font-mono">
              MOVE
            </div>
            <div
              className={`text-sm font-bold tabular-nums font-mono ${
                game.lineMovement === null
                  ? "text-neutral-400"
                  : game.lineMovement > 0
                    ? "text-[#ff6b00]"
                    : game.lineMovement < 0
                      ? "text-[#00ffff]"
                      : "text-neutral-400"
              }`}
            >
              {game.lineMovement !== null
                ? (game.lineMovement > 0 ? "+" : "") +
                  game.lineMovement.toFixed(1)
                : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Edge Display */}
      {isLive && edge !== null && (
        <div
          className={`rounded-lg border p-2 mb-3 ${edgeStyle.bg} ${
            isUnderTriggered ? "border-[#00ffff]/30" : "border-neutral-800/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-600 uppercase font-mono">
              EDGE
            </span>
            <span
              className={`text-lg font-bold tabular-nums font-mono ${edgeStyle.text}`}
            >
              {edge > 0 ? "+" : ""}
              {edge.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Projected Final - with foul game adjustment */}
      {isLive && projectedFinal !== null && game.ouLine !== null && (
        <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-3 mb-3">
          {/* Base projection */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600 font-mono">
              PROJ FINAL
            </span>
            <span
              className={`text-sm font-bold tabular-nums font-mono ${
                projectedFinal < game.ouLine
                  ? "text-[#00ffff]"
                  : "text-[#ff6b00]"
              }`}
            >
              {projectedFinal.toFixed(1)}
              <span className="text-[10px] ml-2 text-neutral-600 font-mono">
                ({projectedFinal < game.ouLine ? "UNDER" : "OVER"}{" "}
                {Math.abs(projectedFinal - game.ouLine).toFixed(1)})
              </span>
            </span>
          </div>

          {/* Foul game adjusted projection */}
          {(game.inFoulGame || game.couldEnterFoulGame) &&
            game.adjustedProjectedTotal !== null &&
            game.foulGameAdjustment !== null && (
              <div className="mt-2 pt-2 border-t border-neutral-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full ${game.inFoulGame ? "bg-yellow-400" : "bg-[#ff6b00]"} opacity-75`}
                    ></span>
                    <span
                      className={`relative inline-flex h-1.5 w-1.5 rounded-full ${game.inFoulGame ? "bg-yellow-500" : "bg-[#ff6b00]"}`}
                    ></span>
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide font-mono ${game.inFoulGame ? "text-yellow-400" : "text-[#ff6b00]"}`}
                  >
                    {game.inFoulGame
                      ? "FT FRENZY ACTIVE"
                      : "FT FRENZY INCOMING"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600 font-mono">
                    ADJ PROJ
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums font-mono ${
                      game.adjustedProjectedTotal < game.ouLine
                        ? "text-[#00ffff]"
                        : "text-[#ff6b00]"
                    }`}
                  >
                    {game.adjustedProjectedTotal.toFixed(1)}
                    <span
                      className={`text-[10px] ml-2 font-mono ${game.inFoulGame ? "text-yellow-500" : "text-[#ff6b00]"}`}
                    >
                      (+{game.foulGameAdjustment.toFixed(1)} FTF
                      {!game.inFoulGame ? " est" : ""})
                    </span>
                  </span>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Simplified view for non-live games */}
      {!isLive && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-3">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide mb-1 font-mono">
              O/U LINE
            </div>
            <div className="text-xl font-bold text-white tabular-nums font-mono">
              {game.ouLine !== null ? game.ouLine.toFixed(1) : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-3">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wide mb-1 font-mono">
              STATUS
            </div>
            <div className="text-xl font-bold text-neutral-300 font-mono">
              {game.status === "pre" ? "SCHED" : "FINAL"}
            </div>
          </div>
        </div>
      )}

      {/* Trigger Builder - Shows code being executed */}
      {hasAnyTrigger && isLive && (
        <div className="mb-3">
          <TriggerBuilder game={game} />
        </div>
      )}

      {/* CTA for triggered games - smooth transitions */}
      {/* Triple Dipper CTA */}
      <div
        className={`transition-all duration-300 ease-out ${
          isTripleDipper && game.ouLine !== null
            ? "opacity-100 max-h-24"
            : "opacity-0 max-h-0 overflow-hidden"
        }`}
        aria-hidden={!(isTripleDipper && game.ouLine !== null)}
      >
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-950/30 p-3 text-center">
          <div className="text-[10px] text-yellow-500 uppercase tracking-wider mb-1 font-mono">
            // TRIPLE DIPPER 🏆
          </div>
          <div className="text-xl font-bold text-yellow-400 font-mono">
            UNDER {game.ouLine?.toFixed(1) ?? "—"}
          </div>
        </div>
      </div>

      {/* Standard Under CTA */}
      <div
        className={`transition-all duration-300 ease-out ${
          isUnderTriggered && game.ouLine !== null
            ? "opacity-100 max-h-24"
            : "opacity-0 max-h-0 overflow-hidden"
        }`}
        aria-hidden={!(isUnderTriggered && game.ouLine !== null)}
      >
        <div
          className="rounded-xl border border-[#00ffff]/40 p-3 text-center"
          style={{
            background: "rgba(0,255,255,0.05)",
            boxShadow: "0 0 15px rgba(0,255,255,0.1)",
          }}
        >
          <div className="text-[10px] text-[#00ffff]/70 uppercase tracking-wider mb-1 font-mono">
            // GOLDEN ZONE SIGNAL
          </div>
          <div className="text-xl font-bold text-[#00ffff] font-mono">
            UNDER {game.ouLine?.toFixed(1) ?? "—"}
          </div>
        </div>
      </div>

      {/* Over CTA */}
      <div
        className={`transition-all duration-300 ease-out ${
          isOverTriggered && game.ouLine !== null
            ? "opacity-100 max-h-24"
            : "opacity-0 max-h-0 overflow-hidden"
        }`}
        aria-hidden={!(isOverTriggered && game.ouLine !== null)}
      >
        <div
          className="rounded-xl border border-[#ff6b00]/40 p-3 text-center"
          style={{
            background: "rgba(255,107,0,0.05)",
            boxShadow: "0 0 15px rgba(255,107,0,0.1)",
          }}
        >
          <div className="text-[10px] text-[#ff6b00]/70 uppercase tracking-wider mb-1 font-mono">
            // OVER SIGNAL 🔥
          </div>
          <div className="text-xl font-bold text-[#ff6b00] font-mono">
            OVER {game.ouLine?.toFixed(1) ?? "—"}
          </div>
        </div>
      </div>

      {/* Tap indicator */}
      {onClick && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-neutral-700 font-mono">
          <span>// tap for details</span>
        </div>
      )}
    </div>
  );
}

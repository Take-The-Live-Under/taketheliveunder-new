"use client";

import { useEffect, useState } from "react";
import { Game } from "@/types/game";

interface TriggerAnnouncementProps {
  games: Game[];
}

export default function TriggerAnnouncement({
  games,
}: TriggerAnnouncementProps) {
  const [displayedTrigger, setDisplayedTrigger] = useState<Game | null>(null);
  const [typing, setTyping] = useState("");
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const triggeredGames = games.filter((g) => g.triggerType !== null);

  // Cycle through triggered games
  useEffect(() => {
    if (triggeredGames.length === 0) {
      setShowAnnouncement(false);
      return;
    }

    let index = 0;
    const cycleGame = () => {
      const game = triggeredGames[index % triggeredGames.length];
      setDisplayedTrigger(game);
      setShowAnnouncement(true);

      const announcement = getAnnouncement(game);
      let charIndex = 0;
      setTyping("");

      const typeInterval = setInterval(() => {
        if (charIndex < announcement.length) {
          setTyping(announcement.slice(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 30);

      index++;
    };

    cycleGame();
    const interval = setInterval(cycleGame, 8000);

    return () => clearInterval(interval);
  }, [triggeredGames.length]);

  const getAnnouncement = (game: Game): string => {
    const triggerName =
      game.triggerType === "over"
        ? "OVER_SIGNAL"
        : game.triggerType === "tripleDipper"
          ? "TRIPLE_DIPPER"
          : "GOLDEN_ZONE";
    const bet = game.triggerType === "over" ? "OVER" : "UNDER";

    return `${triggerName} DETECTED >> ${game.awayTeam} @ ${game.homeTeam} >> BET ${bet} ${game.ouLine?.toFixed(1)}`;
  };

  const getBorderStyle = () => {
    if (!displayedTrigger) return { border: "1px solid rgba(255,255,255,0.1)" };
    if (displayedTrigger.triggerType === "over")
      return {
        border: "1px solid rgba(255,107,0,0.5)",
        background: "rgba(255,107,0,0.06)",
      };
    if (displayedTrigger.triggerType === "tripleDipper")
      return {
        border: "1px solid rgba(234,179,8,0.5)",
        background: "rgba(234,179,8,0.06)",
      };
    return {
      border: "1px solid rgba(0,255,255,0.4)",
      background: "rgba(0,255,255,0.04)",
    };
  };

  const getTextColor = () => {
    if (!displayedTrigger) return "text-neutral-400";
    if (displayedTrigger.triggerType === "over") return "text-[#ff6b00]";
    if (displayedTrigger.triggerType === "tripleDipper")
      return "text-yellow-400";
    return "text-[#00ffff]";
  };

  const getPingColor = () => {
    if (!displayedTrigger) return "bg-neutral-500";
    if (displayedTrigger.triggerType === "over") return "bg-[#ff6b00]";
    if (displayedTrigger.triggerType === "tripleDipper") return "bg-yellow-400";
    return "bg-[#00ffff]";
  };

  if (!showAnnouncement || !displayedTrigger) return null;

  return (
    <div
      className="rounded-xl p-3 font-mono text-xs overflow-hidden"
      style={getBorderStyle()}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${getPingColor()} opacity-75`}
          ></span>
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${getPingColor()}`}
          ></span>
        </span>
        <span className={`${getTextColor()} truncate`}>
          {">"} {typing}
          <span className="animate-pulse">_</span>
        </span>
      </div>
    </div>
  );
}

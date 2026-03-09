"use client";

import { useEffect, useState, useRef } from "react";

interface SearchingCodeProps {
  liveCount: number;
  isSearching?: boolean;
}

const searchingLines = [
  { text: "// SCANNING_NCAA_GAMES", color: "text-[#00ffff]" },
  { text: "const games = await ESPN.fetchLive();", color: "text-neutral-300" },
  { text: "", color: "" },
  {
    text: 'console.log("Searching for triggers...");',
    color: "text-neutral-500",
  },
  { text: "", color: "" },
  { text: "for (const game of games) {", color: "text-neutral-300" },
  {
    text: "  analyzing(game.homeTeam, game.awayTeam);",
    color: "text-neutral-500",
  },
  {
    text: "  checkPPM(game.currentPPM, game.requiredPPM);",
    color: "text-neutral-500",
  },
  { text: "  scanTriggers(game);", color: "text-yellow-400" },
  { text: "}", color: "text-neutral-300" },
  { text: "", color: "" },
  { text: "// NO_TRIGGERS_FOUND", color: "text-neutral-700" },
  { text: "// Continuing to monitor...", color: "text-neutral-700" },
];

export default function SearchingCode({
  liveCount,
  isSearching = true,
}: SearchingCodeProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [dots, setDots] = useState("");
  const animationRef = useRef<number>(0);

  // Typing animation
  useEffect(() => {
    if (!isSearching) {
      setVisibleLines(searchingLines.length);
      return;
    }

    let lineIndex = 0;
    const typeNextLine = () => {
      if (lineIndex < searchingLines.length) {
        setVisibleLines(lineIndex + 1);
        lineIndex++;
        animationRef.current = window.setTimeout(typeNextLine, 120);
      } else {
        // Pause then restart
        animationRef.current = window.setTimeout(() => {
          setVisibleLines(0);
          lineIndex = 0;
          animationRef.current = window.setTimeout(typeNextLine, 500);
        }, 3000);
      }
    };

    typeNextLine();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isSearching]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="rounded-xl border border-neutral-800 p-4 font-mono text-xs overflow-hidden"
      style={{ background: "rgba(10,10,10,0.85)", backdropFilter: "blur(8px)" }}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-800">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-neutral-600"></div>
        </div>
        <span className="text-neutral-600">trigger_scanner.ts</span>
        <span className="ml-auto text-neutral-700">
          {liveCount} games in scope
        </span>
      </div>

      {/* Code lines */}
      <div className="space-y-0.5 min-h-[200px]">
        {searchingLines.slice(0, visibleLines).map((line, index) => (
          <div
            key={index}
            className={`${line.color} ${
              index === visibleLines - 1 ? "bg-[#00ffff]/5 -mx-2 px-2" : ""
            }`}
          >
            {line.text || "\u00A0"}
          </div>
        ))}

        {/* Blinking cursor */}
        <div className="flex items-center">
          <span
            className={`text-[#00ffff] ${cursorVisible ? "opacity-100" : "opacity-0"}`}
          >
            █
          </span>
          {visibleLines >= searchingLines.length && (
            <span className="text-neutral-600 ml-2">searching{dots}</span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ffff] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ffff]"></span>
          </span>
          <span className="text-neutral-500">SYSTEM_ACTIVE</span>
        </div>
        <span className="text-neutral-700">POLL_INTERVAL: 15s</span>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';

interface SearchingCodeProps {
  liveCount: number;
  isSearching?: boolean;
}

const searchingLines = [
  { text: '// SCANNING_NCAA_GAMES', color: 'text-blue-400' },
  { text: 'const games = await ESPN.fetchLive();', color: 'text-green-500' },
  { text: '', color: '' },
  { text: 'console.log("Searching for triggers...");', color: 'text-green-600' },
  { text: '', color: '' },
  { text: 'for (const game of games) {', color: 'text-green-500' },
  { text: '  analyzing(game.homeTeam, game.awayTeam);', color: 'text-green-600' },
  { text: '  checkPPM(game.currentPPM, game.requiredPPM);', color: 'text-green-600' },
  { text: '  scanTriggers(game);', color: 'text-yellow-400' },
  { text: '}', color: 'text-green-500' },
  { text: '', color: '' },
  { text: '// NO_TRIGGERS_FOUND', color: 'text-green-700' },
  { text: '// Continuing to monitor...', color: 'text-green-700' },
];

export default function SearchingCode({ liveCount, isSearching = true }: SearchingCodeProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [dots, setDots] = useState('');
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
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/80 border border-green-900/50 p-4 font-mono text-xs overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-900/30">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
        <span className="text-green-700">trigger_scanner.ts</span>
        <span className="ml-auto text-green-800">{liveCount} games in scope</span>
      </div>

      {/* Code lines */}
      <div className="space-y-0.5 min-h-[200px]">
        {searchingLines.slice(0, visibleLines).map((line, index) => (
          <div
            key={index}
            className={`${line.color} ${
              index === visibleLines - 1 ? 'bg-green-900/20 -mx-2 px-2' : ''
            }`}
          >
            {line.text || '\u00A0'}
          </div>
        ))}

        {/* Blinking cursor */}
        <div className="flex items-center">
          <span className={`text-green-400 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}>█</span>
          {visibleLines >= searchingLines.length && (
            <span className="text-green-600 ml-2">searching{dots}</span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-3 pt-2 border-t border-green-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          <span className="text-green-600">SYSTEM_ACTIVE</span>
        </div>
        <span className="text-green-700">POLL_INTERVAL: 15s</span>
      </div>
    </div>
  );
}

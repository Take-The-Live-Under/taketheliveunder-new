'use client';

import { useEffect, useState } from 'react';

interface BootSequenceProps {
  onComplete: () => void;
}

const bootMessages = [
  { text: 'TTLU_TERMINAL v2.1.0', delay: 100 },
  { text: 'Initializing system...', delay: 200 },
  { text: '[OK] Loading kernel modules', delay: 150 },
  { text: '[OK] Mounting data streams', delay: 200 },
  { text: '[OK] ESPN API connection established', delay: 300 },
  { text: '[OK] Odds API connection established', delay: 250 },
  { text: '[OK] PPM calculation engine loaded', delay: 200 },
  { text: '[OK] Trigger detection system online', delay: 300 },
  { text: '', delay: 100 },
  { text: 'Loading trigger algorithms...', delay: 200 },
  { text: '  > OVER_TRIGGER ✓', delay: 150 },
  { text: '  > TRIPLE_DIPPER ✓', delay: 150 },
  { text: '  > GOLDEN_ZONE ✓', delay: 150 },
  { text: '', delay: 100 },
  { text: '[OK] All systems operational', delay: 200 },
  { text: '', delay: 100 },
  { text: 'Starting TTLU_TERMINAL...', delay: 400 },
];

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (currentIndex >= bootMessages.length) {
      setTimeout(onComplete, 500);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleLines(prev => [...prev, bootMessages[currentIndex].text]);
      setCurrentIndex(prev => prev + 1);
    }, bootMessages[currentIndex].delay);

    return () => clearTimeout(timer);
  }, [currentIndex, onComplete]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl font-mono text-sm">
        <div className="border border-green-900 bg-black/50 p-4 rounded">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-green-900/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-green-700 text-xs ml-2">terminal</span>
          </div>

          <div className="space-y-1 min-h-[400px]">
            {visibleLines.map((line, index) => (
              <div
                key={index}
                className={`${
                  line.includes('[OK]') ? 'text-green-400' :
                  line.includes('✓') ? 'text-green-500' :
                  line.includes('>') ? 'text-yellow-400' :
                  'text-green-500'
                }`}
              >
                {line}
              </div>
            ))}
            {currentIndex < bootMessages.length && (
              <span className={`text-green-400 ${showCursor ? 'opacity-100' : 'opacity-0'}`}>
                █
              </span>
            )}
          </div>

          {currentIndex >= bootMessages.length && (
            <div className="mt-4 pt-4 border-t border-green-900/50 text-center">
              <span className="text-green-400 animate-pulse">Press any key to continue...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

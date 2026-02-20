'use client';

import { useEffect, useState } from 'react';
import { Game } from '@/types/game';

interface TriggerBuilderProps {
  game: Game;
}

interface CodeLine {
  code: string;
  value?: string;
  passed: boolean | null; // null = pending, true = passed, false = failed
  indent: number;
}

export default function TriggerBuilder({ game }: TriggerBuilderProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const gameMinute = 40 - game.minutesRemainingReg;
  const ppmGap = game.currentPPM !== null && game.requiredPPM !== null
    ? game.currentPPM - game.requiredPPM
    : null;

  // Determine which trigger type to show code for
  const getTriggerCode = (): CodeLine[] => {
    if (game.triggerType === 'over') {
      return [
        { code: '// OVER_TRIGGER_CHECK', value: '', passed: null, indent: 0 },
        { code: 'if (gameMinute >= 20 && gameMinute <= 30)', value: `// ${gameMinute.toFixed(1)}`, passed: gameMinute >= 20 && gameMinute <= 30, indent: 0 },
        { code: 'if (ppmGap >= 0.3)', value: `// ${ppmGap !== null ? (ppmGap > 0 ? '+' : '') + ppmGap.toFixed(2) : 'null'}`, passed: ppmGap !== null && ppmGap >= 0.3, indent: 1 },
        { code: 'return OVER_SIGNAL 🔥', value: '', passed: true, indent: 2 },
      ];
    } else if (game.triggerType === 'tripleDipper') {
      return [
        { code: '// TRIPLE_DIPPER_CHECK', value: '', passed: null, indent: 0 },
        { code: 'if (gameMinute >= 15 && gameMinute <= 32)', value: `// ${gameMinute.toFixed(1)}`, passed: gameMinute >= 15 && gameMinute <= 32, indent: 0 },
        { code: 'if (requiredPPM >= 4.5)', value: `// ${game.requiredPPM?.toFixed(2) ?? 'null'}`, passed: game.requiredPPM !== null && game.requiredPPM >= 4.5, indent: 1 },
        { code: 'if (ppmGap <= -1.0)', value: `// ${ppmGap !== null ? ppmGap.toFixed(2) : 'null'}`, passed: ppmGap !== null && ppmGap <= -1.0, indent: 2 },
        { code: 'return TRIPLE_DIPPER 🏆', value: '', passed: true, indent: 3 },
      ];
    } else {
      return [
        { code: '// GOLDEN_ZONE_CHECK', value: '', passed: null, indent: 0 },
        { code: 'if (gameMinute >= 4 && minutesLeft > 5)', value: `// ${gameMinute.toFixed(1)}, ${game.minutesRemainingReg.toFixed(1)}m left`, passed: gameMinute >= 4 && game.minutesRemainingReg > 5, indent: 0 },
        { code: 'if (requiredPPM >= 4.5)', value: `// ${game.requiredPPM?.toFixed(2) ?? 'null'}`, passed: game.requiredPPM !== null && game.requiredPPM >= 4.5, indent: 1 },
        { code: 'if (ppmDiff >= 1.0 && ppmDiff <= 1.5)', value: `// ${ppmGap !== null ? (ppmGap * -1).toFixed(2) : 'null'}`, passed: ppmGap !== null && -ppmGap >= 1.0 && -ppmGap <= 1.5, indent: 2 },
        { code: 'return GOLDEN_ZONE ✓', value: '', passed: true, indent: 3 },
      ];
    }
  };

  const codeLines = getTriggerCode();

  // Animate lines appearing one by one
  useEffect(() => {
    setVisibleLines(0);
    setShowResult(false);

    const timer = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= codeLines.length) {
          clearInterval(timer);
          setTimeout(() => setShowResult(true), 300);
          return prev;
        }
        return prev + 1;
      });
    }, 150);

    return () => clearInterval(timer);
  }, [game.id, game.triggerType, codeLines.length]);

  const getLineColor = (line: CodeLine) => {
    if (line.passed === null) return 'text-blue-400';
    if (line.passed) return 'text-green-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-black/80 border border-green-900/50 p-3 font-mono text-xs overflow-hidden">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-green-900/30">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
        <span className="text-green-700 text-[10px]">trigger_check.ts</span>
      </div>

      <div className="space-y-1">
        {codeLines.slice(0, visibleLines).map((line, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 transition-all duration-200 ${
              index === visibleLines - 1 ? 'animate-pulse' : ''
            }`}
            style={{ paddingLeft: `${line.indent * 12}px` }}
          >
            <span className={getLineColor(line)}>
              {line.code}
            </span>
            {line.value && (
              <span className="text-green-700">{line.value}</span>
            )}
            {line.passed === true && line.code.includes('return') && (
              <span className="text-yellow-400 animate-pulse">←</span>
            )}
          </div>
        ))}
      </div>

      {showResult && (
        <div className="mt-3 pt-2 border-t border-green-900/30 animate-fade-in">
          <div className={`text-sm font-bold ${
            game.triggerType === 'over' ? 'text-orange-400' :
            game.triggerType === 'tripleDipper' ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            {'>'} TRIGGER_CONFIRMED
          </div>
        </div>
      )}
    </div>
  );
}

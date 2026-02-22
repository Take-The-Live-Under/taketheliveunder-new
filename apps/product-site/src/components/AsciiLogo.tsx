'use client';

import { useEffect, useState } from 'react';

interface AsciiLogoProps {
  animate?: boolean;
  size?: 'small' | 'large';
}

const logoLarge = `
████████╗████████╗██╗     ██╗   ██╗
╚══██╔══╝╚══██╔══╝██║     ██║   ██║
   ██║      ██║   ██║     ██║   ██║
   ██║      ██║   ██║     ██║   ██║
   ██║      ██║   ███████╗╚██████╔╝
   ╚═╝      ╚═╝   ╚══════╝ ╚═════╝
`;

const logoSmall = `
╔╦╗╔╦╗╦  ╦ ╦
 ║  ║ ║  ║ ║
 ╩  ╩ ╩═╝╚═╝
`;

const tagline = '// TAKE THE LIVE UNDER';

export default function AsciiLogo({ animate = true, size = 'large' }: AsciiLogoProps) {
  const [visibleChars, setVisibleChars] = useState(0);
  const logo = size === 'large' ? logoLarge : logoSmall;
  const totalChars = logo.length;

  useEffect(() => {
    if (!animate) {
      setVisibleChars(totalChars);
      return;
    }

    setVisibleChars(0);
    const interval = setInterval(() => {
      setVisibleChars(prev => {
        if (prev >= totalChars) {
          clearInterval(interval);
          return prev;
        }
        return prev + 3;
      });
    }, 10);

    return () => clearInterval(interval);
  }, [animate, totalChars]);

  return (
    <div className="font-mono text-center">
      <pre className="text-green-400 text-xs md:text-sm leading-tight inline-block text-left terminal-glow">
        {logo.slice(0, visibleChars)}
        {visibleChars < totalChars && <span className="animate-pulse">█</span>}
      </pre>
      {visibleChars >= totalChars && (
        <div className="text-green-600 text-xs mt-2 animate-fade-in">
          {tagline}
        </div>
      )}
    </div>
  );
}

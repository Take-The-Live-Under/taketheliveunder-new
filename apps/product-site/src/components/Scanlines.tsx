'use client';

interface ScanlinesProps {
  active?: boolean;
}

export default function Scanlines({ active = true }: ScanlinesProps) {
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        background: `repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.1),
          rgba(0, 0, 0, 0.1) 1px,
          transparent 1px,
          transparent 2px
        )`,
        mixBlendMode: 'multiply',
      }}
    />
  );
}

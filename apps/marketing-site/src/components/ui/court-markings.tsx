"use client";

export function CourtMarkings() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Center Circle */}
        <circle
          cx="50"
          cy="50"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        />

        {/* Three Point Line approximation */}
        <path
          d="M10 100 Q 50 20 90 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        />

        {/* Key Area */}
        <rect
          x="35"
          y="70"
          width="30"
          height="30"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        />

        {/* Half Court Line */}
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke="currentColor"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}

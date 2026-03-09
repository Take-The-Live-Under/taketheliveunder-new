"use client";

export default function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 animate-pulse backdrop-blur-sm">
      {/* Matchup skeleton */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-neutral-800 rounded"></div>
            <div className="h-4 w-36 bg-neutral-800 rounded"></div>
          </div>
          <div className="h-6 w-10 bg-neutral-800 rounded"></div>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 border-t border-neutral-800/50">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-neutral-800 rounded"></div>
            <div className="h-4 w-32 bg-neutral-800 rounded"></div>
          </div>
          <div className="h-6 w-10 bg-neutral-800 rounded"></div>
        </div>
      </div>

      {/* Game status skeleton */}
      <div className="mb-3 rounded-lg bg-neutral-900/60 border border-neutral-800/50 px-3 py-2">
        <div className="h-4 w-28 bg-neutral-800 rounded"></div>
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
          <div className="h-2 w-10 bg-neutral-800 rounded mx-auto mb-1"></div>
          <div className="h-5 w-8 bg-neutral-800 rounded mx-auto"></div>
        </div>
        <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
          <div className="h-2 w-6 bg-neutral-800 rounded mx-auto mb-1"></div>
          <div className="h-5 w-10 bg-neutral-800 rounded mx-auto"></div>
        </div>
        <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
          <div className="h-2 w-12 bg-neutral-800 rounded mx-auto mb-1"></div>
          <div className="h-5 w-8 bg-neutral-800 rounded mx-auto"></div>
        </div>
        <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 p-2 text-center">
          <div className="h-2 w-12 bg-neutral-800 rounded mx-auto mb-1"></div>
          <div className="h-5 w-8 bg-neutral-800 rounded mx-auto"></div>
        </div>
      </div>

      {/* Edge skeleton */}
      <div className="rounded-lg border border-neutral-800/50 p-2 bg-neutral-900/60">
        <div className="flex items-center justify-between">
          <div className="h-3 w-8 bg-neutral-800 rounded"></div>
          <div className="h-5 w-12 bg-neutral-800 rounded"></div>
        </div>
      </div>
    </div>
  );
}

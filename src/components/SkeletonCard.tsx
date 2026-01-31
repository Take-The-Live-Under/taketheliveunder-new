'use client';

export default function SkeletonCard() {
  return (
    <div className="border border-green-900 bg-black/40 p-4 animate-pulse font-mono">
      {/* Matchup skeleton */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-green-900/50"></div>
            <div className="h-4 w-36 bg-green-900/50"></div>
          </div>
          <div className="h-6 w-10 bg-green-900/50"></div>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 border-t border-green-900/30">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-green-900/50"></div>
            <div className="h-4 w-32 bg-green-900/50"></div>
          </div>
          <div className="h-6 w-10 bg-green-900/50"></div>
        </div>
      </div>

      {/* Game status skeleton */}
      <div className="mb-3 bg-green-900/20 border border-green-900/50 px-3 py-2">
        <div className="h-4 w-28 bg-green-900/50"></div>
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
          <div className="h-2 w-10 bg-green-900/50 mx-auto mb-1"></div>
          <div className="h-5 w-8 bg-green-900/50 mx-auto"></div>
        </div>
        <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
          <div className="h-2 w-6 bg-green-900/50 mx-auto mb-1"></div>
          <div className="h-5 w-10 bg-green-900/50 mx-auto"></div>
        </div>
        <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
          <div className="h-2 w-12 bg-green-900/50 mx-auto mb-1"></div>
          <div className="h-5 w-8 bg-green-900/50 mx-auto"></div>
        </div>
        <div className="bg-green-900/20 border border-green-900/50 p-2 text-center">
          <div className="h-2 w-12 bg-green-900/50 mx-auto mb-1"></div>
          <div className="h-5 w-8 bg-green-900/50 mx-auto"></div>
        </div>
      </div>

      {/* Edge skeleton */}
      <div className="border border-green-900/50 p-2 bg-green-900/20">
        <div className="flex items-center justify-between">
          <div className="h-3 w-8 bg-green-900/50"></div>
          <div className="h-5 w-12 bg-green-900/50"></div>
        </div>
      </div>
    </div>
  );
}

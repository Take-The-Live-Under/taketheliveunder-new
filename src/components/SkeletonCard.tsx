'use client';

export default function SkeletonCard() {
  return (
    <div className="rounded-xl border-2 border-gray-700 bg-gray-800/50 p-4 animate-pulse">
      {/* Matchup skeleton */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-gray-700 rounded"></div>
            <div className="h-5 w-36 bg-gray-700 rounded"></div>
          </div>
          <div className="h-7 w-10 bg-gray-700 rounded"></div>
        </div>
        <div className="flex items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 bg-gray-700 rounded"></div>
            <div className="h-5 w-32 bg-gray-700 rounded"></div>
          </div>
          <div className="h-7 w-10 bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Game status skeleton */}
      <div className="mb-4 bg-gray-800/50 rounded-lg px-3 py-2">
        <div className="h-4 w-28 bg-gray-700 rounded"></div>
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="h-3 w-14 bg-gray-700 rounded mb-2"></div>
          <div className="h-6 w-16 bg-gray-700 rounded"></div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="h-3 w-20 bg-gray-700 rounded mb-2"></div>
          <div className="h-6 w-14 bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Required PPM skeleton */}
      <div className="rounded-xl bg-gray-800/30 p-4">
        <div className="h-3 w-32 bg-gray-700 rounded mb-2"></div>
        <div className="h-10 w-24 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

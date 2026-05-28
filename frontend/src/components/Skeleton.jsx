import React from "react";

// ── Primitive shimmer block ────────────────────────────────────────────────────
export const SkeletonBlock = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-800/60 via-gray-700/40 to-gray-800/60 bg-[length:400%_100%] ${className}`}
    style={{ animation: "skeleton-shimmer 1.6s ease-in-out infinite" }}
  />
);

// ── Stat card skeleton (used in Dashboard index grid) ────────────────────────
export const StatCardSkeleton = () => (
  <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between min-h-[120px]">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <SkeletonBlock className="h-9 w-9 rounded-lg" />
    </div>
    <div className="flex items-baseline justify-between mt-4">
      <SkeletonBlock className="h-6 w-24" />
      <SkeletonBlock className="h-3 w-16" />
    </div>
  </div>
);

// ── Dashboard indices grid skeleton ──────────────────────────────────────────
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-gray-800 pb-4">
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <SkeletonBlock className="h-7 w-40 rounded-full" />
    </div>

    {/* Tab bar */}
    <div className="flex gap-2">
      {[80, 110, 90, 80, 70].map((w, i) => (
        <SkeletonBlock key={i} className="h-9 rounded-xl" style={{ width: w }} />
      ))}
    </div>

    {/* Cards grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Watchlist panel */}
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-3 w-56" />
        </div>
        <SkeletonBlock className="h-9 w-44 rounded-xl" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/40">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

// ── Fund list item skeleton ───────────────────────────────────────────────────
export const FundListItemSkeleton = () => (
  <div className="w-full p-3.5 rounded-xl border border-transparent bg-gray-900/40 space-y-2">
    <div className="flex justify-between items-start">
      <SkeletonBlock className="h-3.5 w-16" />
      <SkeletonBlock className="h-4 w-8 rounded" />
    </div>
    <SkeletonBlock className="h-3 w-36" />
    <div className="flex justify-between items-baseline pt-1.5 border-t border-gray-850/50">
      <SkeletonBlock className="h-4 w-14" />
      <SkeletonBlock className="h-3 w-12" />
    </div>
  </div>
);

// ── Fund detail panel skeleton ────────────────────────────────────────────────
export const FundDetailSkeleton = () => (
  <div className="space-y-6">
    {/* Top banner */}
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <div className="flex justify-between items-start border-b border-gray-850 pb-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-64" />
          <SkeletonBlock className="h-3.5 w-48" />
        </div>
        <div className="space-y-2 text-right">
          <SkeletonBlock className="h-3 w-20 ml-auto" />
          <SkeletonBlock className="h-8 w-32 ml-auto" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-darkCard p-4 border border-gray-850 rounded-xl text-center space-y-2">
            <SkeletonBlock className="h-3 w-20 mx-auto" />
            <SkeletonBlock className="h-6 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>

    {/* Two-col grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map((_, i) => (
        <div key={i} className="glass-panel p-6 rounded-2xl space-y-4">
          <SkeletonBlock className="h-5 w-40 mb-2" />
          {Array.from({ length: 3 }).map((__, j) => (
            <div key={j} className="space-y-1.5">
              <div className="flex justify-between">
                <SkeletonBlock className="h-3.5 w-28" />
                <SkeletonBlock className="h-3.5 w-12" />
              </div>
              <SkeletonBlock className="h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Three-col grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="glass-panel p-6 rounded-2xl space-y-3">
          <SkeletonBlock className="h-5 w-36 mb-2" />
          {Array.from({ length: 5 }).map((__, j) => (
            <div key={j} className="flex justify-between items-center">
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="h-5 w-10 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ── Screener table skeleton ───────────────────────────────────────────────────
export const ScreenerSkeleton = () => (
  <div className="space-y-4">
    <div className="flex gap-3 mb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-9 w-28 rounded-xl" />
      ))}
    </div>
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <SkeletonBlock className="h-5 w-40" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-800/40">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-4 w-32 flex-1" />
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-14" />
          <SkeletonBlock className="h-4 w-14" />
          <SkeletonBlock className="h-6 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

// ── AI Signals skeleton ───────────────────────────────────────────────────────
export const AISignalsSkeleton = () => (
  <div className="space-y-6">
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <SkeletonBlock className="h-6 w-48 mb-2" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-darkCard p-4 border border-gray-850 rounded-xl space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-24" />
          </div>
        ))}
      </div>
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="glass-panel p-6 rounded-2xl space-y-3">
        <div className="flex justify-between border-b border-gray-800 pb-3">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-6 w-20 rounded-lg" />
        </div>
        {Array.from({ length: 3 }).map((__, j) => (
          <SkeletonBlock key={j} className="h-3.5 w-full" />
        ))}
      </div>
    ))}
  </div>
);

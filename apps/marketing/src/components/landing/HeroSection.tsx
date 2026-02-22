"use client";

import { FadeOutBasketball } from "@/components/ui/fade-out-basketball";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

export function HeroSection() {
  return (
    <div
      id="hero"
      className="relative flex min-h-screen w-full flex-col items-center justify-center pointer-events-auto px-4 sm:px-6"
    >
      <FadeOutBasketball />
      <div className="relative z-10 mx-auto w-full max-w-3xl border border-[#27272a] p-2">
        <main className="relative overflow-hidden border border-[#27272a] bg-black/50 py-10 backdrop-blur-sm">
          <h1 className="mb-6 text-center text-5xl md:text-7xl font-extrabold tracking-tighter text-white md:text-[clamp(2rem,8vw,7rem)]">
            Your Edge on{" "}
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#00ffff] via-[#b026ff] to-[#ff00ff] drop-shadow-[0_0_10px_rgba(176,38,255,0.3)]">
              Live Unders
              <svg
                viewBox="0 0 200 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute -bottom-2 left-0 w-full h-3 block md:-bottom-4 md:h-6"
                preserveAspectRatio="none"
              >
                <path
                  d="M5 20C40 30 70 8 100 20C130 32 160 10 195 20"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </h1>
          <p className="px-6 text-center text-xs text-white/60 md:text-sm lg:text-lg">
            Real-time game monitoring and live over/under signals. We do the
            math so you don't have to. Data updates instantly so you never miss
            a moment.
          </p>
          <div className="my-8 flex items-center justify-center gap-1">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-orange opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-orange"></span>
            </span>
            <p className="text-xs text-neon-orange">Live Game Tracking</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <button className="h-12 px-8 rounded-full bg-neon-blue text-black font-bold text-base hover:bg-white hover:text-neon-blue transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:shadow-[0_0_30px_rgba(0,255,255,0.6)] border border-transparent hover:border-neon-blue pointer-events-auto">
              <a
                href="https://app.taketheliveunder.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                Open Live Dashboard
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </a>
            </button>
            <button className="h-12 px-8 rounded-full border border-neon-purple/50 text-white font-medium text-base hover:bg-neon-purple/10 hover:border-neon-purple hover:shadow-[0_0_15px_rgba(176,38,255,0.3)] transition-all pointer-events-auto">
              View Methodology
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

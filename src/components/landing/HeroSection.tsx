"use client";

import { FadeOutBasketball } from "@/components/ui/fade-out-basketball";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

export function HeroSection() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center pointer-events-auto">
      <FadeOutBasketball />
      <div className="relative z-10 mx-auto w-full max-w-3xl border border-[#27272a] p-2">
        <main className="relative overflow-hidden border border-[#27272a] bg-black/50 py-10 backdrop-blur-sm">
          <h1 className="mb-6 text-center text-7xl font-extrabold tracking-tighter text-white md:text-[clamp(2rem,8vw,7rem)]">
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
            Real-time game monitoring for clear signals. Golden Zone alerts when
            the numbers are in your favor. Updated every 15 seconds, so you
            never miss the moment..
          </p>
          <div className="my-8 flex items-center justify-center gap-1">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <p className="text-xs text-green-500">Live Game Tracking</p>
          </div>

          <div className="flex justify-center">
            <LiquidButton
              className="rounded-full border text-white"
              size={"xl"}
            >
              Let&apos;s Go
            </LiquidButton>
          </div>
        </main>
      </div>
    </div>
  );
}

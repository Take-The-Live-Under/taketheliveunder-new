"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";

interface LandingPageProps {
  onAccess: (email: string) => void;
}

export default function LandingPage({ onAccess }: LandingPageProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      // Save email to database
      await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      // Don't block access if save fails
      console.error("Failed to save signup:", err);
    }

    // Pass email up to parent for access
    onAccess(email);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="px-4 md:px-6 py-5 border-b border-neutral-800/50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Logo size="md" />
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="hidden sm:inline">NCAAB LIVE</span>
            <span className="text-neutral-700 hidden sm:inline">|</span>
            <span>716 Teams</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left - Text */}
          <div>
            <div className="text-[#00ffff] text-xs md:text-sm mb-4 font-mono">
              // LIVE EDGE DETECTION
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
              Find the edge{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ffff] via-[#b026ff] to-[#ff00ff]">
                before the market does.
              </span>
            </h1>
            <p className="text-neutral-400 text-base md:text-lg mb-8 leading-relaxed">
              We track every NCAA game in real-time and alert you when pace
              diverges from the posted total. Simple idea. Powerful results.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
              <div
                className="rounded-xl border border-neutral-800 p-3 md:p-4"
                style={{ background: "rgba(0,255,255,0.04)" }}
              >
                <div className="text-2xl md:text-3xl font-bold text-[#00ffff] font-mono">
                  162K+
                </div>
                <div className="text-neutral-500 text-[10px] md:text-xs mt-1 font-mono">
                  DATA POINTS
                </div>
              </div>
              <div
                className="rounded-xl border border-neutral-800 p-3 md:p-4"
                style={{ background: "rgba(0,255,255,0.04)" }}
              >
                <div className="text-2xl md:text-3xl font-bold text-[#00ffff] font-mono">
                  4,026
                </div>
                <div className="text-neutral-500 text-[10px] md:text-xs mt-1 font-mono">
                  GAMES TRACKED
                </div>
              </div>
              <div
                className="rounded-xl border border-neutral-800 p-3 md:p-4"
                style={{ background: "rgba(0,255,255,0.04)" }}
              >
                <div className="text-2xl md:text-3xl font-bold text-[#00ffff] font-mono">
                  716
                </div>
                <div className="text-neutral-500 text-[10px] md:text-xs mt-1 font-mono">
                  TEAMS
                </div>
              </div>
            </div>

            {/* Email CTA */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-xl bg-neutral-900/80 border border-neutral-800 px-4 py-3 text-white placeholder-neutral-600 focus:border-[#00ffff]/50 focus:outline-none focus:ring-1 focus:ring-[#00ffff]/20 text-sm transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-full px-6 py-3 font-bold text-sm text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap hover:scale-105"
                style={{
                  background: "#00ffff",
                  boxShadow: "0 0 20px rgba(0,255,255,0.4)",
                }}
              >
                {isLoading ? "Loading..." : "Get Access"}
              </button>
            </form>
            {error && (
              <div className="text-red-400 text-xs mt-2 font-mono">
                // ERROR: {error}
              </div>
            )}
            <div className="text-neutral-700 text-xs mt-3 font-mono">
              // No credit card required. Research purposes only.
            </div>
          </div>

          {/* Right - Terminal Preview */}
          <div
            className="rounded-2xl border border-neutral-800 p-3 md:p-4 hidden md:block"
            style={{
              background: "rgba(23,23,23,0.7)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-2 text-neutral-600 text-xs mb-4 pb-2 border-b border-neutral-800">
              <span className="text-[#00ffff] font-mono">LIVE TRIGGERS</span>
              <span className="ml-auto text-neutral-600 font-mono">
                GOLDEN ZONE: 3
              </span>
            </div>

            {/* Mock Games */}
            <div className="space-y-3">
              <div
                className="rounded-xl border border-[#00ffff]/30 p-3"
                style={{
                  background: "rgba(0,255,255,0.04)",
                  boxShadow: "0 0 12px rgba(0,255,255,0.08)",
                }}
              >
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white font-medium">DUKE vs UNC</span>
                  <span className="text-[#00ffff] font-mono font-bold">
                    UNDER
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <div className="text-white font-mono font-bold">145.5</div>
                    <div className="text-neutral-600 font-mono">O/U</div>
                  </div>
                  <div>
                    <div className="text-white font-mono font-bold">5.2</div>
                    <div className="text-neutral-600 font-mono">REQ</div>
                  </div>
                  <div>
                    <div className="text-white font-mono font-bold">3.8</div>
                    <div className="text-neutral-600 font-mono">CUR</div>
                  </div>
                  <div>
                    <div className="text-yellow-400 font-mono font-bold">
                      +1.4
                    </div>
                    <div className="text-neutral-600 font-mono">EDGE</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 p-3 opacity-60">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-300">KANSAS vs BAYLOR</span>
                  <span className="text-neutral-500 font-mono">MONITORING</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-neutral-500">
                  <div>
                    <div className="text-neutral-400 font-mono">151.0</div>
                    <div className="text-neutral-700 font-mono">O/U</div>
                  </div>
                  <div>
                    <div className="text-neutral-400 font-mono">4.1</div>
                    <div className="text-neutral-700 font-mono">REQ</div>
                  </div>
                  <div>
                    <div className="text-neutral-400 font-mono">4.0</div>
                    <div className="text-neutral-700 font-mono">CUR</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 font-mono">+0.1</div>
                    <div className="text-neutral-700 font-mono">EDGE</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800/30 p-3 opacity-30">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-400">UCLA vs ARIZONA</span>
                  <span className="text-neutral-700 font-mono">WATCHING</span>
                </div>
                <div className="h-6 rounded bg-neutral-900/10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-neutral-800/50 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-[#00ffff] text-xs md:text-sm mb-8 font-mono">
            // HOW IT WORKS
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              {
                num: "01",
                title: "MONITOR",
                desc: "Every NCAA game tracked in real-time. Scores update every 30 seconds.",
              },
              {
                num: "02",
                title: "ANALYZE",
                desc: "Compare current scoring pace to what's needed to hit the total.",
              },
              {
                num: "03",
                title: "DETECT",
                desc: "Identify when pace significantly diverges from the posted line.",
              },
              {
                num: "04",
                title: "ALERT",
                desc: "Get notified instantly when our Golden Zone criteria are met.",
              },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <div className="text-[#00ffff] text-3xl md:text-4xl font-bold mb-2 font-mono opacity-60">
                  {num}
                </div>
                <div className="text-white font-bold mb-2 text-sm md:text-base">
                  {title}
                </div>
                <div className="text-neutral-500 text-xs md:text-sm">
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats/Social Proof */}
      <div className="border-t border-neutral-800/50 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-[#00ffff] text-xs md:text-sm mb-8 font-mono">
            // SYSTEM STATS
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: "162K+", label: "OBSERVATIONS" },
              { value: "716", label: "TEAM PROFILES" },
              { value: "4", label: "HMM STATES" },
              { value: "30s", label: "POLL INTERVAL" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl border border-neutral-800 p-4"
                style={{ background: "rgba(23,23,23,0.5)" }}
              >
                <div className="text-[#00ffff] text-2xl md:text-3xl font-bold font-mono">
                  {value}
                </div>
                <div className="text-neutral-600 text-xs mt-1 font-mono">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-neutral-800/50 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="text-[#00ffff] text-xs md:text-sm mb-8 font-mono">
            // FAQ
          </div>
          <div className="space-y-6">
            {[
              {
                q: "Is this gambling advice?",
                a: "No. This is a research tool for entertainment purposes. We surface statistical patterns. All decisions are yours. Past performance does not guarantee future results.",
              },
              {
                q: "What data do you track?",
                a: "We've collected 162K+ data points across 4,026 games this season. Every score update, line movement, and pace calculation is logged and analyzed in real-time.",
              },
              {
                q: "What's the Golden Zone?",
                a: "It's our highest-confidence signal. When a game is running significantly slower than the line implies, with enough time left for it to matter.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-l-2 border-[#00ffff]/30 pl-4">
                <div className="text-white font-bold mb-2">{q}</div>
                <div className="text-neutral-500 text-sm">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800/50 py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center">
          <p className="text-neutral-600 text-xs max-w-2xl mx-auto">
            For entertainment and research purposes only. This is not financial
            or gambling advice. Past performance does not guarantee future
            results. Please gamble responsibly.
          </p>
          <div className="text-neutral-800 text-xs mt-4 font-mono">
            © {new Date().getFullYear()} Take The Live Under
          </div>
        </div>
      </div>
    </div>
  );
}

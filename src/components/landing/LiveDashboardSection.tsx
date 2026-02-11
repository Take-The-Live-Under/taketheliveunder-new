"use client";

export function LiveDashboardSection() {
  return (
    <section
      id="live-dashboard"
      className="relative w-full py-24 text-white pointer-events-auto"
    >
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="mb-12 text-4xl font-bold md:text-5xl">
          Monitor games in real-time
        </h2>
        <p className="mb-12 text-lg text-neutral-400">
          See live PPM calculations, confidence scores, and Golden Zone triggers
          at a glance.
        </p>

        {/* Mock Dashboard UI */}
        <div className="relative mx-auto w-full">
          <div className="absolute -top-6 -left-8 text-neon-purple text-6xl font-marker -rotate-12 select-none z-0 drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">
            X
          </div>
          <div className="relative overflow-hidden rounded-3xl border-2 border-neon-blue bg-black/50 backdrop-blur-sm shadow-[0_0_15px_rgba(0,243,255,0.5),inset_0_0_10px_rgba(0,243,255,0.2)] z-10 transition-all duration-300">
            <div className="flex items-center gap-4 border-b border-white/10 bg-black/80 px-4 py-3">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="flex flex-1 items-center justify-center rounded-md border border-white/10 bg-black/50 px-4 py-1 text-center">
                <span className="flex items-center justify-center gap-2 text-xs font-mono tracking-wider text-neutral-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  app.taketheliveunder.com
                </span>
              </div>
              <div className="w-16"></div> {/* Spacer to center the URL bar */}
            </div>
            <div className="p-6 text-left">
              <div className="grid grid-cols-10 gap-16 border-b-2 border-white/20 pb-4 text-sm font-bold text-white">
                <div className="col-span-2">Game</div>
                <div>O/U</div>
                <div>Curr</div>
                <div>Conf</div>
                <div>Q</div>
                <div>Req</div>
                <div>Left</div>
                <div className="col-span-2">Status</div>
              </div>
              {[
                {
                  game: "Duke vs UNC",
                  line: "145.5",
                  curr: "68",
                  conf: "82%",
                  q: "Q1",
                  ReqPPM: "6.50",
                  minLeft: "12:00",
                  Status: "Golden Zone",
                },
                {
                  game: "Kentucky vs Kansas",
                  line: "152",
                  curr: "91",
                  conf: "91%",
                  q: "Q3",
                  ReqPPM: "5.02",
                  minLeft: "8:30",
                  Status: "Golden Zone",
                },
                {
                  game: "UCLA vs Arizona",
                  line: "156",
                  curr: "78",
                  conf: "74%",
                  q: "Q1",
                  ReqPPM: "4.08",
                  minLeft: "10:30",
                  Status: "Monitoring",
                },
                {
                  game: "Gonzaga vs Baylor",
                  line: "138.5",
                  curr: "102",
                  conf: "67%",
                  q: "Q4",
                  ReqPPM: "7.63",
                  minLeft: "4:00",
                  Status: "Monitoring",
                },
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-10 gap-12 py-4 text-sm border-b border-white/20 text-neutral-200 last:border-0 hover:bg-white/10 transition-colors items-center"
                >
                  <div className="col-span-2 font-medium text-white break-words">
                    {row.game}
                  </div>
                  <div>{row.line}</div>
                  <div>{row.curr}</div>
                  <div>{row.conf}</div>
                  <div>{row.q}</div>
                  <div>{row.ReqPPM}</div>
                  <div>{row.minLeft}</div>
                  <div className="col-span-2 flex justify-start">
                    {row.Status === "Golden Zone" ? (
                      <span className="rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400 backdrop-blur-md">
                        Golden Zone
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium text-neutral-500">
                        {row.Status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-6 py-3 text-xs text-neutral-500">
              <div>Sample data for demonstration</div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                Updates every 15s
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

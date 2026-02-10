"use client";

export function HowItWorksSection() {
  return (
    <section className="relative w-full py-24 text-white pointer-events-auto">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="mb-12 text-4xl font-bold md:text-5xl">
          Monitor games in real-time
        </h2>
        <p className="mb-12 text-lg text-neutral-400">
          See live PPM calculations, confidence scores, and Golden Zone triggers
          at a glance.
        </p>

        {/* Mock Dashboard UI */}
        <div className="relative mx-auto overflow-hidden rounded-3xl border-2 border-white bg-black/50 backdrop-blur-sm shadow-[8px_8px_0px_0px_#ffffff]">
          <div className="flex items-center gap-2 border-b-2 border-white bg-white/5 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
            <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
            <div className="ml-2 text-xs font-bold text-white">
              app.taketheliveunder.com
            </div>
          </div>
          <div className="p-6 text-left">
            <div className="grid grid-cols-10 gap-4 border-b-2 border-white/20 pb-4 text-sm font-bold text-white">
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
                className="grid grid-cols-10 gap-4 py-4 text-sm border-b border-white/20 text-neutral-200 last:border-0 hover:bg-white/10 transition-colors items-center"
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
    </section>
  );
}

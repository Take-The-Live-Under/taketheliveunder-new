"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Crown } from "@/components/ui/crown";

const steps = [
  {
    number: "1",
    title: "Ingest & Scout",
    description:
      "We scrape official NCAA feeds instantly, processing every shot, foul, and stoppage. Like a scout watching every game at once.",
    color: "text-neon-lime",
    borderColor: "group-hover:border-neon-pink",
    shadowColor: "group-hover:shadow-[0_0_10px_rgba(255,0,255,0.6)]",
  },
  {
    number: "2",
    title: "Run the Numbers",
    description:
      "Our engine calculates the required Points-Per-Minute (PPM) pace vs. the actual game tempo. It's pure math finding the gaps in the defense.",
    color: "text-neon-blue",
    borderColor: "group-hover:border-neon-lime",
    shadowColor: "group-hover:shadow-[0_0_10px_rgba(204,255,0,0.6)]",
  },
  {
    number: "3",
    title: "Execute the Play",
    description: (
      <>
        When the math says the line is inflated, we signal the{" "}
        <span className="text-neon-orange font-marker">Golden Zone</span>. You
        get the alert, you place the bet, you take the edge.
      </>
    ),
    color: "text-neon-orange",
    borderColor: "border-neon-orange",
    shadowColor: "shadow-[0_0_15px_rgba(0,255,255,0.4)]",
    active: true,
  },
];

export function HowItWorksSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24" id="how-it-works">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Column: Text Content */}
        <div className="">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <span className="text-2xl font-marker text-neon-blue tracking-widest -rotate-2 inline-block drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
              THE GAME PLAN
            </span>
            <Crown className="w-12 h-12 text-neon-blue" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-8 leading-tight font-display"
          >
            Your Ultimate Playbook <br /> for Winning
          </motion.h2>

          <div className="space-y-10 relative">
            {/* Dashed line connecting steps */}
            <div className="absolute left-[19px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-white/10 -z-10" />

            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                viewport={{ once: true }}
                className="flex gap-6 group"
              >
                <div
                  className={cn(
                    "flex-shrink-0 size-10 rounded-full bg-[#0A0A0A] border-2 border-white/20 flex items-center justify-center text-white font-mono font-bold transition-all relative z-10",
                    step.borderColor,
                    step.color,
                    step.shadowColor,
                  )}
                >
                  {step.number}
                </div>
                <div>
                  <h3
                    className={cn(
                      "text-xl font-bold text-white mb-2 transition-colors font-display",
                      index === 0 && "group-hover:text-neon-pink",
                      index === 1 && "group-hover:text-neon-lime",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed font-sans">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column: Visual */}
        <div className="">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotateY: 10 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative group perspective-[1000px]"
          >
            <div className="relative bg-[#0E0E10] border border-white/10 rounded-xl overflow-hidden shadow-2xl transform transition-transform duration-500 hover:rotate-1 hover:scale-[1.02]">
              {/* Court Texture */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(10,10,10,0.95),rgba(10,10,10,0.9)),repeating-linear-gradient(45deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_10px)] opacity-60" />

              <div className="relative p-8 min-h-[400px] flex flex-col justify-between">
                {/* Chalk Markings Background */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                  <div className="absolute top-1/2 w-full h-[2px] bg-white/50" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white/50" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 border-2 border-white/50 border-t-0" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 border-2 border-white/50 border-b-0" />
                </div>

                {/* Chalkboard content SVG */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox="0 0 600 400"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <style>
                    {`
                    .sketch-path { stroke: #fff; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; opacity: 0.9; }
                    .sketch-blue { stroke: #00ffff; opacity: 1; filter: drop-shadow(0 0 3px #00ffff); }
                    .sketch-pink { stroke: #ff00ff; opacity: 1; filter: drop-shadow(0 0 3px #ff00ff); }
                    .sketch-lime { stroke: #ccff00; opacity: 1; filter: drop-shadow(0 0 3px #ccff00); }
                    .sketch-orange { stroke: #ff6b00; opacity: 1; filter: drop-shadow(0 0 3px #ff6b00); }
                    .sketch-x { stroke: #ff00ff; stroke-width: 3; filter: drop-shadow(0 0 4px #ff00ff); }
                  `}
                  </style>
                  <text
                    fill="#ccff00"
                    fontFamily="Rock Salt, cursive"
                    fontSize="14"
                    opacity="0.9"
                    style={{ textShadow: "0 0 5px #ccff00" }}
                    x="50"
                    y="50"
                  >
                    1. DATA IN
                  </text>
                  <path
                    className="sketch-path sketch-x"
                    d="M40,80 L50,90 M50,80 L40,90"
                  />
                  <path
                    className="sketch-path sketch-x"
                    d="M60,80 L70,90 M70,80 L60,90"
                  />
                  <circle
                    className="sketch-path sketch-orange"
                    cx="100"
                    cy="85"
                    r="6"
                    strokeWidth="2"
                  />
                  <path
                    className="sketch-path sketch-lime"
                    d="M120,90 Q200,120 250,150"
                    strokeDasharray="8,5"
                  />
                  <path
                    className="sketch-path sketch-lime"
                    d="M245,145 L250,150 L240,152"
                  />

                  <text
                    fill="#00ffff"
                    fontFamily="Rock Salt, cursive"
                    fontSize="14"
                    opacity="0.9"
                    style={{ textShadow: "0 0 5px #00ffff" }}
                    x="260"
                    y="160"
                  >
                    2. THE EDGE
                  </text>
                  <path
                    className="sketch-path sketch-blue"
                    d="M250,180 Q300,180 350,180"
                    strokeWidth="4"
                  />
                  <text
                    fill="#ff00ff"
                    fontFamily="Permanent Marker, cursive"
                    fontSize="24"
                    style={{ textShadow: "0 0 8px #ff00ff" }}
                    x="270"
                    y="215"
                  >
                    UNDER
                  </text>
                  <path
                    className="sketch-path sketch-lime"
                    d="M360,190 Q420,200 480,250"
                    strokeDasharray="8,5"
                  />
                  <path
                    className="sketch-path sketch-lime"
                    d="M475,245 L480,250 L470,252"
                  />

                  <text
                    fill="#ff6b00"
                    fontFamily="Rock Salt, cursive"
                    fontSize="18"
                    opacity="1"
                    style={{ textShadow: "0 0 8px #ff6b00" }}
                    x="450"
                    y="280"
                  >
                    3. PROFIT $$
                  </text>
                  <circle
                    className="sketch-path sketch-blue"
                    cx="500"
                    cy="320"
                    r="20"
                    strokeWidth="3"
                  />
                  <circle
                    className="sketch-path sketch-pink"
                    cx="500"
                    cy="320"
                    opacity="0.5"
                    r="28"
                    strokeWidth="1"
                  />
                  <path
                    className="sketch-path sketch-blue"
                    d="M500,300 L500,290"
                  />
                  <path
                    className="sketch-path sketch-blue"
                    d="M500,340 L500,350"
                  />
                  <path
                    className="sketch-path sketch-blue"
                    d="M480,320 L470,320"
                  />
                  <path
                    className="sketch-path sketch-blue"
                    d="M520,320 L530,320"
                  />
                </svg>

                <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded text-xs font-mono text-neon-orange backdrop-blur-sm border border-neon-orange/40 shadow-[0_0_8px_rgba(255,107,0,0.3)]">
                  PLAY: GOLDEN ZONE TRAP
                </div>
              </div>
            </div>

            {/* Background Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-neon-blue to-neon-pink rounded-2xl opacity-20 blur-2xl -z-10 group-hover:opacity-30 transition-opacity" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

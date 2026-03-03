"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function LandingIntro() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Remove from DOM a bit after the overlay fade completes
    const timer = setTimeout(() => setIsVisible(false), 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="landing-intro"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut", delay: 1.9 }}
        >
          {/* Logo mark — pulsing neon basketball arc */}
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.65,
              ease: [0.34, 1.56, 0.64, 1], // spring-like overshoot
              delay: 0.2,
            }}
          >
            {/* Icon mark */}
            <motion.div
              animate={{
                filter: [
                  "drop-shadow(0 0 8px rgba(0,255,255,0.6))",
                  "drop-shadow(0 0 24px rgba(0,255,255,1))",
                  "drop-shadow(0 0 8px rgba(0,255,255,0.6))",
                ],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                repeatType: "mirror",
              }}
            >
              <svg
                width="72"
                height="72"
                viewBox="0 0 72 72"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Basketball outer circle */}
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  stroke="#00ffff"
                  strokeWidth="3"
                />
                {/* Horizontal seam */}
                <path
                  d="M4 36 Q36 20 68 36"
                  stroke="#00ffff"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M4 36 Q36 52 68 36"
                  stroke="#00ffff"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Vertical seam */}
                <line
                  x1="36"
                  y1="4"
                  x2="36"
                  y2="68"
                  stroke="#00ffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Arrow pointing down — "under" */}
                <path
                  d="M28 38 L36 48 L44 38"
                  stroke="#ff6b00"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </motion.div>

            {/* Wordmark */}
            <motion.div
              className="flex items-baseline gap-2 text-4xl font-bold tracking-tight"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.85 }}
            >
              <span
                className="text-[#00ffff] drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]"
                style={{ fontFamily: "'Rock Salt', cursive" }}
              >
                TakeThe
              </span>
              <span className="text-[#ff6b00] drop-shadow-[0_0_8px_rgba(255,107,0,0.8)] font-marker">
                LiveUnder
              </span>
            </motion.div>

            {/* Neon sweep line */}
            <motion.div
              className="relative h-[2px] w-64 overflow-hidden rounded-full"
              style={{ background: "rgba(0,255,255,0.15)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.2 }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #00ffff, #b026ff, transparent)",
                }}
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 0.7, ease: "easeInOut", delay: 1.3 }}
              />
              {/* Static glow after sweep settles */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 10%, #00ffff55 50%, transparent 90%)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.85, duration: 0.3 }}
              />
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="text-xs tracking-widest uppercase text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.55, duration: 0.4 }}
            >
              Real-time live under signals
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useEffect } from "react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({
  isOpen,
  onClose,
}: HowItWorksModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [
    {
      step: "01",
      title: "LIVE_DATA_INGESTION",
      description:
        "We pull real-time play-by-play data from ESPN for every NCAA basketball game.",
    },
    {
      step: "02",
      title: "PACE_CALCULATION",
      description:
        "We calculate real-time Points Per Minute (PPM) based on current score and elapsed time.",
    },
    {
      step: "03",
      title: "LINE_COMPARISON",
      description:
        "We compare current pace against the required pace to hit the O/U line.",
    },
    {
      step: "04",
      title: "EDGE_DETECTION",
      description:
        "We surface only statistically meaningful gaps where the pace diverges significantly from the line.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-neutral-800 animate-slide-up"
        style={{
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-[#00ffff]">// HOW_IT_WORKS</h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-600 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex gap-4 p-3 rounded-xl border border-neutral-800 bg-neutral-900/40"
            >
              <div className="flex-shrink-0 text-2xl font-bold text-[#00ffff] font-mono">
                {step.step}
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1 text-sm">
                  {step.title}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/30 rounded-b-2xl">
          <p className="text-[10px] text-neutral-600 text-center">
            // Our algorithm focuses on games where the required pace to hit the
            total is statistically unsustainable.
          </p>
        </div>
      </div>
    </div>
  );
}

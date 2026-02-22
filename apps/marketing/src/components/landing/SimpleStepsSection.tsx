"use client";

import { motion } from "framer-motion";
import {
  Crown,
  ArrowSketch,
  StarBurst,
  UnderlineSketch,
} from "@/components/ui/crown";
import { AnimatedBasketball } from "@/components/ui/animated-basketball";
import { CourtMarkings } from "@/components/ui/court-markings";

const howItWorksSteps = [
  {
    number: "01",
    title: "Watch the games",
    subtitle: "We track every play",
    description:
      "Our system follows every NCAA basketball game in real-time, updating scores, pace, and momentum every 15 seconds so you never miss a beat.",
    color: "from-orange-500/20 to-amber-500/20",
    borderColor: "border-orange-500/30",
    accentColor: "text-orange-400",
  },
  {
    number: "02",
    title: "Spot the edge",
    subtitle: "The Golden Zone lights up",
    description:
      "When the numbers line up in your favor, our Golden Zone alert fires. It means the game is trending under the line -- your signal to pay attention.",
    color: "from-amber-500/20 to-yellow-500/20",
    borderColor: "border-amber-500/30",
    accentColor: "text-amber-400",
  },
  {
    number: "03",
    title: "Make your move",
    subtitle: "Confidence you can feel",
    description:
      "Every alert comes with a confidence score so you know how strong the signal is. No guessing, no gut feelings -- just clear, honest data.",
    color: "from-yellow-500/20 to-orange-500/20",
    borderColor: "border-yellow-500/30",
    accentColor: "text-yellow-400",
  },
];

function FloatingParticle({
  delay,
  x,
  y,
  size,
  color,
}: {
  delay: number;
  x: string;
  y: string;
  size: number;
  color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{ left: x, top: y, width: size, height: size, background: color }}
      animate={{
        y: [0, -15, 0],
        opacity: [0.3, 0.7, 0.3],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    />
  );
}

export function SimpleStepsSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-20 overflow-hidden lg:py-32 pointer-events-auto"
    >
      {/* Warm radial glow */}
      <div className="absolute top-1/2 left-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 bg-gradient-radial from-orange-500/[0.04] via-transparent to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section heading with crown doodle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center lg:mb-20"
        >
          <div className="relative inline-block">
            <Crown className="absolute -top-16 left-1/2 h-16 w-24 -translate-x-1/2 opacity-50 text-white" />
            <h2 className="text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
              Simple as{" "}
              <span className="relative inline-block">
                <span className="text-orange-400">1-2-3</span>
                <UnderlineSketch className="absolute -bottom-2 left-0 h-5 w-full text-orange-400 opacity-50" />
              </span>
            </h2>
          </div>
          <p className="mx-auto mt-6 max-w-lg text-lg text-neutral-400">
            No spreadsheets. No math. Just open the dashboard and let the
            signals come to you.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="flex flex-col gap-8 lg:gap-6">
          {howItWorksSteps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              viewport={{ once: true }}
              className={`relative group ${
                index % 2 === 0 ? "lg:pr-[15%]" : "lg:pl-[15%]"
              }`}
            >
              <div
                className={`relative overflow-hidden rounded-3xl border ${step.borderColor} bg-gradient-to-br ${step.color} p-8 backdrop-blur-sm lg:p-10`}
              >
                {/* Doodle accents removed per request */}

                {/* Connecting arrow/line removed per request */}

                <div className="flex items-start gap-6">
                  {/* Step number */}
                  <div
                    className={`flex-shrink-0 select-none text-5xl font-bold leading-none opacity-30 lg:text-6xl ${step.accentColor}`}
                  >
                    {step.number}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`mb-2 text-xs font-semibold uppercase tracking-widest ${step.accentColor}`}
                    >
                      {step.subtitle}
                    </p>
                    <h3 className="mb-3 text-2xl font-bold text-white lg:text-3xl">
                      {step.title}
                    </h3>
                    <p className="max-w-lg leading-relaxed text-neutral-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

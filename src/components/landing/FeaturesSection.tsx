"use client";

import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  subtitle: string;
  description: string;
}

const FeatureCard = ({ title, subtitle, description }: FeatureCardProps) => {
  return (
    <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-neutral-800 p-2 md:rounded-[1.5rem] md:p-3">
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={3}
      />
      <div className="relative flex h-full flex-col justify-center gap-6 overflow-hidden rounded-xl border-[0.75px] border-neutral-800 bg-neutral-900/50 p-6 shadow-sm md:p-6 backdrop-blur-sm text-center items-center">
        <div className="space-y-2">
          <h3 className="text-4xl font-bold text-white md:text-5xl font-mono">
            {title}
          </h3>
          <p className="text-lg font-medium text-neon-blue md:text-xl font-display">
            {subtitle}
          </p>
          <p className="text-sm text-neutral-400 max-w-[200px] mx-auto">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export function FeaturesSection() {
  return (
    <section className="relative w-full border-y border-[#27272a] bg-black py-24 pointer-events-auto">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "15s",
              subtitle: "Polling Rate",
              description: "Updates every 15 seconds.",
            },
            {
              title: "99%",
              subtitle: "Uptime",
              description: "Always on during games.",
            },
            {
              title: "100+",
              subtitle: "Active Users",
              description: "Trust the system.",
            },
          ].map((feature, i) => (
            <FeatureCard key={i} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

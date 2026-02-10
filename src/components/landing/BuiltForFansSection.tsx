"use client";

import { motion } from "framer-motion";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Activity, BarChart3 } from "lucide-react";

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
  return (
    <li className={cn("min-h-[14rem] list-none", area)}>
      <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-neutral-800 p-2 md:rounded-[1.5rem] md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-neutral-800 bg-neutral-900/50 p-6 shadow-sm md:p-6 backdrop-blur-sm">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border-[0.75px] border-neutral-700 bg-neutral-800 p-2 text-white">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold font-sans tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-balance text-white">
                {title}
              </h3>
              <h2 className="[&_b]:md:font-semibold [&_strong]:md:font-semibold font-sans text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-neutral-400">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export function BuiltForFansSection() {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden pointer-events-auto">
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #f97316 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white text-balance">
            Built for fans who{" "}
            <span className="text-orange-400">play to win</span>
          </h2>
          <p className="mt-6 text-lg text-neutral-400 max-w-lg mx-auto">
            Whether you bet casually or track every line, our tools give you an
            edge you can actually see.
          </p>
        </motion.div>

        <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-2 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
          <GridItem
            area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
            icon={<Calendar className="h-5 w-5" />}
            title="Never miss a game"
            description="Covers every NCAA Division I basketball game — regular season, conference tourneys, and March Madness."
          />
          <GridItem
            area="md:[grid-area:1/7/2/13] xl:[grid-area:1/5/2/9]"
            icon={<Clock className="h-5 w-5" />}
            title="Lightning fast updates"
            description="While other tools give you stale numbers, our dashboard refreshes constantly so you see what's happening right now."
          />
          <GridItem
            area="md:[grid-area:2/1/3/7] xl:[grid-area:1/9/2/13]"
            icon={<Activity className="h-5 w-5" />}
            title="Golden Zone alerts"
            description="Our signature feature. When the stars align and the under looks strong, the Golden Zone lights up — bright and unmistakable."
          />
          <GridItem
            area="md:[grid-area:2/7/3/13] xl:[grid-area:2/1/3/13]"
            icon={<BarChart3 className="h-5 w-5" />}
            title="Simple confidence scores"
            description="No confusing charts or jargon. Just a clear score that tells you how confident the signal is — from warm to on fire."
          />
        </ul>
      </div>
    </section>
  );
}

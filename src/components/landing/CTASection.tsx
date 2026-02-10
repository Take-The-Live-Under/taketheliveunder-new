"use client";

import { LiquidButton } from "@/components/ui/liquid-glass-button";

export function CTASection() {
  return (
    <section className="relative w-full py-24 text-center pointer-events-auto">
      <h2 className="mb-6 text-4xl font-bold text-white md:text-6xl tracking-tighter">
        Ready to win?
      </h2>
      <div className="flex justify-center">
        <LiquidButton className="text-white border-white/20" size="xl">
          Get Access Now
        </LiquidButton>
      </div>
    </section>
  );
}

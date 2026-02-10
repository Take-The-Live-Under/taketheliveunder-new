"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UnderlineSketch, StarBurst } from "@/components/ui/crown";

export function PricingSection() {
  return (
    <section id="access" className="relative py-20 lg:py-32 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-radial from-orange-500/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
            Ready to{" "}
            <span className="relative inline-block">
              <span className="text-orange-400">level up</span>
              <UnderlineSketch className="absolute -bottom-2 left-0 w-full h-5 opacity-50 text-orange-400" />
            </span>
            ?
          </h2>
          <p className="mt-6 text-lg text-neutral-400 max-w-md mx-auto">
            Pick a plan and start watching games with better insight tonight.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Standard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="relative p-8 rounded-3xl border border-neutral-800 bg-neutral-900/50 hover:border-orange-500/20 transition-all duration-300 h-full flex flex-col"
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2 text-white">Standard</h3>
              <p className="text-neutral-400">
                Everything you need to start finding edges.
              </p>
            </div>
            <ul className="flex flex-col gap-4 mb-8 flex-1">
              {[
                "Real-time game dashboard",
                "Golden Zone alerts",
                "Confidence scores",
                "All NCAA D1 games",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-neutral-300"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full border border-orange-500/40 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500/60" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant="outline"
              className="w-full rounded-full border-neutral-700 bg-transparent hover:bg-orange-500/10 hover:border-orange-500/30 text-white h-12 text-base pointer-events-auto"
            >
              <a
                href="https://app.taketheliveunder.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Started
              </a>
            </Button>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative p-8 rounded-3xl border border-orange-500/40 bg-gradient-to-b from-orange-500/[0.08] to-amber-500/[0.03] hover:border-orange-500/60 transition-all duration-300 h-full flex flex-col"
          >
            {/* Popular badge */}
            <div className="absolute -top-3 left-8">
              <span className="inline-flex items-center rounded-full border border-transparent bg-orange-500 px-3 py-1 text-xs font-semibold text-[#050505]">
                Most Popular
              </span>
            </div>

            {/* Corner doodle */}
            <StarBurst className="absolute top-4 right-4 w-8 h-8 opacity-30 text-orange-400" />

            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2 text-white">Pro</h3>
              <p className="text-neutral-400">
                For serious bettors who want every advantage.
              </p>
            </div>
            <ul className="flex flex-col gap-4 mb-8 flex-1">
              {[
                "Everything in Standard",
                "Advanced confidence breakdowns",
                "Historical trend data",
                "Priority push notifications",
                "Early access to new features",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-neutral-300"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full border border-orange-400/60 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              asChild
              className="w-full rounded-full bg-orange-500 text-[#050505] hover:bg-orange-400 font-semibold h-12 text-base pointer-events-auto"
            >
              <a
                href="https://app.taketheliveunder.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Go Pro
              </a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

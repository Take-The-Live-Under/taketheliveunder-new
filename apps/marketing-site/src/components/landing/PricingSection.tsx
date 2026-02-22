"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UnderlineSketch, StarBurst } from "@/components/ui/crown";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const [billPlan, setBillPlan] = useState<"monthly" | "annually">("monthly");

  const handleSwitch = () => {
    setBillPlan((prev) => (prev === "monthly" ? "annually" : "monthly"));
  };

  return (
    <section
      id="access"
      className="relative py-20 lg:py-32 overflow-hidden pointer-events-auto"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-radial from-orange-500/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl font-bold md:text-5xl tracking-tight text-white mb-6">
            Ready to{" "}
            <span className="relative inline-block">
              <span className="text-neon-blue">level up</span>
              <UnderlineSketch className="absolute -bottom-2 left-0 w-full h-5 opacity-50 text-neon-blue" />
            </span>
            ?
          </h2>
          <p className="mt-6 text-lg text-neutral-400 max-w-xl mx-auto">
            Pick a plan and start watching games with better insight tonight.
            Annual billing saves you 1.5 month.
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="flex items-center justify-center space-x-4 mb-10">
          <span className="text-base font-medium text-neutral-300">
            Monthly
          </span>
          <button
            onClick={handleSwitch}
            className="relative rounded-full focus:outline-none"
          >
            <div className="w-12 h-6 transition rounded-full shadow-[0_0_10px_rgba(0,255,255,0.3)] outline-none bg-neon-blue/20 border border-neon-blue/50"></div>
            <div
              className={cn(
                "absolute inline-flex items-center justify-center w-4 h-4 transition-all duration-300 ease-in-out top-1 left-1 rounded-full bg-orange-500 shadow-sm",
                billPlan === "annually" ? "translate-x-6" : "translate-x-0",
              )}
            />
          </button>
          <span className="text-base font-medium text-neutral-300">
            Annually
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Standard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="relative p-8 rounded-3xl border border-neutral-800 bg-neutral-900/50 hover:border-orange-500/20 transition-all duration-300 h-full flex flex-col backdrop-blur-sm"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2 text-white">Standard</h3>

              {/* Price moved up */}
              <div className="my-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">
                  <NumberFlow
                    value={billPlan === "monthly" ? 5 : 54}
                    format={{
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }}
                  />
                </span>
                <span className="text-neutral-400">
                  /{billPlan === "monthly" ? "mo" : "yr"}
                </span>
              </div>

              {/* Description updated and moved down */}
              <p className="text-neutral-400 text-sm min-h-[40px]">
                Perfect for fans and bettors who want to stop guessing and start
                winning with real-time data and Golden Zone alerts.
              </p>
            </div>

            {/* Button */}
            <Button
              asChild
              variant="outline"
              className="w-full rounded-full border-neutral-700 bg-transparent hover:bg-orange-500/10 hover:border-orange-500/30 text-white h-12 text-base pointer-events-auto mb-2"
            >
              <a
                href="https://app.taketheliveunder.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Started
              </a>
            </Button>

            {/* Billed text */}
            <div className="h-6 mb-8 flex justify-center w-full">
              <AnimatePresence mode="wait">
                <motion.span
                  key={billPlan}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-neutral-500"
                >
                  {billPlan === "monthly"
                    ? "Billed monthly"
                    : "Billed in one annual payment"}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <span className="text-sm font-medium text-neutral-300">
                Includes:
              </span>
              <ul className="flex flex-col gap-4">
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
            </div>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative p-8 rounded-3xl border border-orange-500/40 bg-gradient-to-b from-orange-500/[0.08] to-amber-500/[0.03] hover:border-orange-500/60 transition-all duration-300 h-full flex flex-col backdrop-blur-sm"
          >
            {/* Popular badge */}
            <div className="absolute -top-3 left-8">
              <span className="inline-flex items-center rounded-full border border-transparent bg-orange-500 px-3 py-1 text-xs font-semibold text-[#050505]">
                Most Popular
              </span>
            </div>

            {/* Corner doodle */}
            <StarBurst className="absolute top-4 right-4 w-8 h-8 opacity-30 text-orange-400" />

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2 text-white">Pro</h3>

              {/* Price moved up */}
              <div className="my-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">
                  <NumberFlow
                    value={billPlan === "monthly" ? 10 : 108}
                    format={{
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }}
                  />
                </span>
                <span className="text-neutral-400">
                  /{billPlan === "monthly" ? "mo" : "yr"}
                </span>
              </div>

              {/* Description updated and moved down */}
              <p className="text-neutral-400 text-sm min-h-[40px]">
                The ultimate toolkit for serious bettors. Get advanced
                confidence breakdowns, historical trends, and priority
                notifications to beat the books.
              </p>
            </div>

            {/* Button */}
            <Button
              asChild
              className="w-full rounded-full bg-orange-500 text-[#050505] hover:bg-orange-400 font-semibold h-12 text-base pointer-events-auto mb-2"
            >
              <a
                href="https://app.taketheliveunder.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Go Pro
              </a>
            </Button>

            {/* Billed text */}
            <div className="h-6 mb-8 flex justify-center w-full">
              <AnimatePresence mode="wait">
                <motion.span
                  key={billPlan}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-neutral-500"
                >
                  {billPlan === "monthly"
                    ? "Billed monthly"
                    : "Billed in one annual payment"}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <span className="text-sm font-medium text-neutral-300">
                Includes:
              </span>
              <ul className="flex flex-col gap-4">
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
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

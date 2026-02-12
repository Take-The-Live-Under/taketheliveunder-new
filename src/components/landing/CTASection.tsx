"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function CTASection() {
  return (
    <section
      id="cta"
      className="relative w-full bg-black pt-20 pb-0 pointer-events-auto"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Main CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-3xl p-12 overflow-hidden group hover:border-neon-purple/50 transition-colors mb-20"
        >
          {/* Gradient Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 via-neon-pink/10 to-neon-lime/10 blur-3xl group-hover:opacity-100 opacity-50 transition-opacity duration-500" />

          {/* Decorative Basketball Icon */}
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <Image
              src="/sketched-basketball.png"
              alt="Basketball"
              width={144}
              height={144}
              className="rotate-12"
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <h2 className="text-4xl font-bold md:text-5xl text-white mb-6">
              Ready to join the{" "}
              <span className="text-neon-blue font-marker rotate-2 inline-block ml-2 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">
                Winning Team?
              </span>
            </h2>
            <p className="text-gray-400 mb-10 max-w-lg text-lg">
              Don't bet with your gut. Bet with data. Join 1,200+ sharps beating
              the closing line today.
            </p>
            <Button
              asChild
              className="h-14 px-10 rounded-full bg-neon-pink text-black font-bold text-lg hover:bg-white hover:text-neon-pink transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,0,255,0.5)] hover:shadow-[0_0_40px_rgba(255,0,255,0.7)] pointer-events-auto"
            >
              <a
                href="https://app.taketheliveunder.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Started Free
              </a>
            </Button>
            <p className="mt-6 text-xs text-gray-500">
              No credit card required for basic access.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="border-t border-white/10 text-gray-500 text-sm py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4 text-white">
                <Image
                  src="/sketched-basketball.png"
                  alt="Basketball"
                  width={20}
                  height={20}
                  className="text-neon-blue"
                />
                <span className="font-bold">TakeTheLiveUnder</span>
              </div>
              <p className="mb-4 max-w-xs">
                Data-driven insights for the modern sports bettor.
              </p>
              <div className="text-xs text-gray-600">
                © 2026 Metron Analytics LLC. All rights reserved.
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#features"
                    className="hover:text-neon-blue transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#access"
                    className="hover:text-neon-blue transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-neon-blue transition-colors"
                  >
                    API
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="hover:text-neon-pink transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-neon-pink transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-neon-pink transition-colors"
                  >
                    Responsible Gambling
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-12 pt-8 border-t border-white/5 text-xs text-center text-gray-600">
            For entertainment purposes only. Please gamble responsibly. If you
            or someone you know has a gambling problem, help is available.
          </div>
        </footer>
      </div>
    </section>
  );
}

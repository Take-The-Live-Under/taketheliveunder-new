"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

export function FadeOutBasketball() {
  const { scrollY } = useScroll();
  // Fade out: Opacity 1 at scroll 0, 0 at scroll 400
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  // Move down slightly: 0px at scroll 0, 100px at scroll 400
  const y = useTransform(scrollY, [0, 400], [0, 100]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="fixed bottom-[-25vh] md:bottom-[-55vh] lg:bottom-[-65vh] xl:bottom-[-40vh] left-1/2 w-[140vw] max-w-[1200px] -translate-x-1/2 pointer-events-none -z-10"
    >
      <Image
        src="/sketched-basketball.png"
        alt="Basketball Sketch"
        width={1200}
        height={1200}
        className="h-auto w-full object-contain opacity-90"
        priority
      />
    </motion.div>
  );
}

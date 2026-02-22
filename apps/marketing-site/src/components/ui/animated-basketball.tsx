"use client";

import { motion } from "framer-motion";
import { SVGProps } from "react";

export function AnimatedBasketball(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        strokeWidth="2"
        initial={{ pathLength: 0, rotate: -90 }}
        whileInView={{ pathLength: 1, rotate: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <motion.path
        d="M12 2a10 10 0 0 1 0 20M2 12h20"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
      />
      <motion.path
        d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
      />
      <motion.path
        d="M22 12c0-5.5-4.5-10-10-10"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
      />
    </svg>
  );
}

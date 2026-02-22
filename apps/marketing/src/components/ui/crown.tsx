import { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function Crown({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      stroke="currentColor"
      className={cn("drop-shadow-[0_0_15px_rgba(19,91,236,0.8)]", className)}
      {...props}
    >
      <defs>
        <filter id="bloom-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="30" />
        </filter>
        <linearGradient id="neonGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ccff00" stopOpacity="1" />
          <stop offset="50%" stopColor="#135bec" stopOpacity="1" />
          <stop offset="100%" stopColor="#ff00ff" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Background Bloom */}
      <circle
        cx="100"
        cy="80"
        r="60"
        fill="url(#neonGradient)"
        filter="url(#bloom-blur)"
        opacity="0.4"
        stroke="none"
      />
      {/* Base Rim */}
      <path
        d="M20,130 Q100,150 180,130 L170,110 Q100,130 30,110 Z"
        stroke="url(#neonGradient)"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 8px rgba(19, 91, 236, 0.8))" }}
      />
      {/* Center Spike */}
      <path
        d="M100,120 L85,60 L100,20 L115,60 Z"
        stroke="#135bec"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 5px #135bec)" }}
      />
      <circle
        cx="100"
        cy="15"
        r="6"
        fill="#ccff00"
        stroke="none"
        style={{ filter: "drop-shadow(0 0 5px #ccff00)" }}
      />
      {/* Left Spike */}
      <path
        d="M40,115 L20,50 L50,80 Z"
        stroke="#ff00ff"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 5px #ff00ff)" }}
      />
      <circle
        cx="17"
        cy="45"
        r="5"
        fill="#ff00ff"
        stroke="none"
        style={{ filter: "drop-shadow(0 0 5px #ff00ff)" }}
      />
      {/* Right Spike */}
      <path
        d="M160,115 L180,50 L150,80 Z"
        stroke="#ccff00"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 5px #ccff00)" }}
      />
      <circle
        cx="182"
        cy="45"
        r="5"
        fill="#ccff00"
        stroke="none"
        style={{ filter: "drop-shadow(0 0 5px #ccff00)" }}
      />
      {/* Abstract Scribbles / Energy Lines */}
      <path
        d="M10,140 L30,150"
        opacity="0.8"
        stroke="#ff00ff"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M190,140 L170,150"
        opacity="0.8"
        stroke="#135bec"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArrowSketch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 30" fill="none" stroke="currentColor" {...props}>
      <path
        d="M2 15 C 20 5, 40 25, 90 15 M 80 5 L 90 15 L 80 25"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarBurst(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M12 2L14 8L20 9L15 13L17 19L12 16L7 19L9 13L4 9L10 8L12 2Z"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UnderlineSketch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 25"
      fill="none"
      stroke="currentColor"
      preserveAspectRatio="none"
      {...props}
    >
      <path
        d="M5 20C40 30 70 8 100 20C130 32 160 10 195 20"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  textSize?: string; // Optional prop to control text size if tailored adjustments are needed
}

export function Logo({ className, textSize = "text-xl" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", textSize, className)}>
      <span
        className="text-neon-blue drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]"
        style={{ fontFamily: "'Rock Salt', cursive" }}
      >
        TakeThe
      </span>
      <span className="text-neon-orange font-marker drop-shadow-[0_0_5px_rgba(255,165,0,0.8)]">
        LiveUnder
      </span>
    </span>
  );
}

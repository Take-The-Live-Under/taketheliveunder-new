interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClass =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClass} ${className ?? ""}`}
    >
      {/* "TakeThe" — Rock Salt font, neon blue — matches marketing site exactly */}
      <span
        className="text-[#00ffff] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]"
        style={{ fontFamily: "var(--font-rock-salt), cursive" }}
      >
        TakeThe
      </span>
      {/* "LiveUnder" — Permanent Marker font, neon orange — matches marketing site exactly */}
      <span className="font-marker text-[#ff6b00] drop-shadow-[0_0_5px_rgba(255,107,0,0.8)]">
        LiveUnder
      </span>
    </span>
  );
}

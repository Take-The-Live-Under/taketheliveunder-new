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
      <span
        className="text-[#00ffff] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]"
        style={{ fontFamily: "'Rock Salt', cursive" }}
      >
        TakeThe
      </span>
      <span
        className="text-[#ff6b00] drop-shadow-[0_0_5px_rgba(255,107,0,0.8)]"
        style={{ fontFamily: "'Permanent Marker', cursive" }}
      >
        LiveUnder
      </span>
    </span>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  showHowItWorks?: boolean;
  onHowItWorksClick?: () => void;
  isRefreshing?: boolean;
}

export function Navbar({
  showHowItWorks,
  onHowItWorksClick,
  isRefreshing,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLink = (href: string, label: string) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={(e) => {
          e.preventDefault();
          window.location.href = href;
        }}
        className={`relative text-xs font-medium transition-colors pb-0.5 ${
          isActive ? "text-white" : "text-neutral-500 hover:text-white"
        }`}
      >
        {label}
        {isActive && (
          <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-[#00ffff] rounded-full shadow-[0_0_6px_rgba(0,255,255,0.8)]" />
        )}
      </Link>
    );
  };

  return (
    <div
      className={`sticky top-0 z-40 px-4 transition-all duration-300 ${
        scrolled ? "py-2" : "py-3"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        <div
          className="flex items-center justify-between h-14 px-4 rounded-2xl border border-neutral-800 backdrop-blur-sm"
          style={{ background: "rgba(10,10,10,0.85)" }}
        >
          {/* Left: Logo + Nav links */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <Logo size="sm" />
            </Link>
            <div className="hidden sm:flex items-center gap-3 border-l border-neutral-800 pl-4">
              {navLink("/research", "Research")}
              {navLink("/bracket", "Bracket")}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button 
                onClick={() => logout()}
                className="text-xs text-neutral-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-800 font-medium"
              >
                Sign Out
              </button>
            )}
            {isRefreshing && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#00ffff] border-t-transparent" />
            )}
            {showHowItWorks && onHowItWorksClick && (
              <button
                onClick={onHowItWorksClick}
                className="text-xs text-neutral-500 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-neutral-800"
              >
                How it works
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

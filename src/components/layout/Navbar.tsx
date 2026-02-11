"use client";

import * as React from "react";
import Link from "next/link";

import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { LogOut, LayoutGrid, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`absolute lg:fixed px-4 py-8 z-50 top-0 w-full transition-all duration-300 dark ${
        scrolled ? "pt-4" : "pt-8"
      }`}
    >
      <div className="flex items-center justify-between w-full mx-auto max-w-7xl">
        {/* Left Side: Logo & Navigation */}
        <div className="flex h-16 items-center px-0 lg:px-6 lg:bg-neutral-900/50 lg:border lg:border-neutral-800 lg:backdrop-blur-sm lg:rounded-2xl lg:shadow-sm">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl mr-2 lg:mr-6 text-foreground"
          >
            {/* <Activity className="h-6 w-6" /> Icon */}
            <span>
              <span
                className="text-neon-blue"
                style={{ fontFamily: "'Rock Salt', cursive" }}
              >
                TakeThe
              </span>
              <span className="text-neon-orange font-marker">LiveUnder</span>
            </span>
          </Link>
          <nav className="hidden lg:flex gap-6 border-l border-neutral-800 pl-6 h-8 items-center">
            <Link
              href="#live-dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Product
            </Link>
            <Link
              href="#access"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Methodology
            </Link>
            <Link
              href="#access"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </nav>
        </div>

        {/* Right Side: CTA & User Profile */}
        <div className="flex h-16 items-center gap-2 px-0 lg:px-4 lg:bg-neutral-900/50 lg:border lg:border-neutral-800 lg:backdrop-blur-sm lg:rounded-2xl lg:shadow-sm">
          <Button
            asChild
            className="rounded-full bg-neon-pink text-black font-bold text-sm hover:bg-white hover:text-neon-pink transition-all hover:scale-105 shadow-[0_0_15px_rgba(255,0,255,0.5)] hover:shadow-[0_0_20px_rgba(255,0,255,0.7)]"
          >
            <a
              href="https://app.taketheliveunder.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Started
            </a>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer border h-9 w-9 ring-2 ring-transparent hover:ring-neon-purple/50 transition-all">
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="@shadcn"
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-70 p-3 rounded-xl bg-neutral-900 border-neutral-800 text-white"
              align="end"
            >
              <div className="p-2">
                <h1 className="font-semibold">User Name</h1>
                <p className="text-sm text-neutral-400">user@example.com</p>
              </div>
              <DropdownMenuGroup>
                <DropdownMenuItem className="py-3 focus:bg-neutral-800 focus:text-white cursor-pointer">
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem className="py-3 focus:bg-neutral-800 focus:text-white cursor-pointer">
                  Account Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="-mx-3 bg-neutral-800" />
              <DropdownMenuGroup>
                <DropdownMenuItem className="py-3 justify-between focus:bg-neutral-800 focus:text-white cursor-pointer">
                  Theme <ThemeSwitcher />
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="-mx-3 bg-neutral-800" />
              <DropdownMenuItem className="py-3 justify-between focus:bg-neutral-800 focus:text-white cursor-pointer">
                Logout <LogOut className="w-4 h-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Placeholder */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-white hover:bg-neutral-800 hover:text-white"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const themes = [
  {
    key: "system",
    icon: Monitor,
    label: "System theme",
  },
  {
    key: "light",
    icon: Sun,
    label: "Light theme",
  },
  {
    key: "dark",
    icon: Moon,
    label: "Dark theme",
  },
];

export type ThemeSwitcherProps = {
  value?: "light" | "dark" | "system";
  onChange?: (theme: "light" | "dark" | "system") => void;
  defaultValue?: "light" | "dark" | "system";
  className?: string;
};

const ThemeSwitcher = ({ className }: ThemeSwitcherProps) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const handleThemeClick = useCallback(
    (themeKey: "light" | "dark" | "system") => {
      setTheme(themeKey);
    },
    [setTheme],
  );

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative isolate flex h-7 rounded-full bg-background p-1 ring-1 ring-border",
        className,
      )}
    >
      {themes.map(({ key, icon: Icon, label }) => {
        const isActive = theme === key;

        return (
          <button
            aria-label={label}
            className="relative h-5 w-6 rounded-full"
            key={key}
            onClick={() => handleThemeClick(key as "light" | "dark" | "system")}
            type="button"
          >
            {isActive && (
              <div className="absolute inset-0 rounded-full bg-secondary" />
            )}
            <Icon
              className={cn(
                "relative z-10 m-auto h-3.5 w-3.5",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

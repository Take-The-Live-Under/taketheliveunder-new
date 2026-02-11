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
      className={`flex fixed px-4 py-12 z-50 top-0 w-full items-center h-16 justify-between transition-all duration-300 dark ${
        scrolled
          ? "bg-transparent backdrop-blur-none border-transparent"
          : "bg-transparent border-transparent"
      }`}
    >
      {" "}
      <div className="flex items-center justify-between w-full  mx-auto max-w-7xl">
        <div className="flex h-14 justify-center items-center">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl mr-4 text-foreground"
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
          <nav className="ml-8 hidden lg:flex gap-8">
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
        <div className="flex gap-2">
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
              <Avatar className="cursor-pointer border h-8 w-8">
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="@shadcn"
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-70 p-3 rounded-xl" align="end">
              <div className="p-2">
                <h1 className="font-semibold">User Name</h1>
                <p className="text-sm text-muted-foreground">
                  user@example.com
                </p>
              </div>
              <DropdownMenuGroup>
                <DropdownMenuItem className="py-3">Dashboard</DropdownMenuItem>
                <DropdownMenuItem className="py-3">
                  Account Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="-mx-3" />
              <DropdownMenuGroup>
                <DropdownMenuItem className="py-3 justify-between">
                  Theme <ThemeSwitcher />
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="-mx-3" />
              <DropdownMenuItem className="py-3 justify-between">
                Logout <LogOut className="w-4 h-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Placeholder */}
          <Button variant="ghost" size="icon" className="lg:hidden">
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

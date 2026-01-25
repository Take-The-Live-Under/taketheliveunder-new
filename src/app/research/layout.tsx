import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NCAA Basketball Team Comparison | Head-to-Head Stats & Matchups",
  description: "Compare NCAA basketball teams head-to-head with advanced stats. View efficiency ratings, shooting percentages, pace, rebounding, and AP Poll rankings. Free college basketball team matchup analysis tool for March Madness and all NCAAB games.",
  keywords: [
    "ncaa basketball team comparison",
    "college basketball head to head",
    "ncaa basketball matchup",
    "college basketball team stats",
    "ncaa team comparison tool",
    "basketball efficiency ratings",
    "march madness matchups",
    "ncaa tournament predictions",
    "college basketball analytics",
    "kenpom comparison",
    "team efficiency comparison",
    "ncaa basketball head to head stats",
    "college basketball matchup tool",
    "ncaa team matchup analysis",
    "basketball team comparison",
  ],
  openGraph: {
    title: "NCAA Basketball Team Comparison | Head-to-Head Stats",
    description: "Compare any two NCAA basketball teams head-to-head. Advanced stats, efficiency ratings, shooting percentages, pace analysis, and AP Poll rankings.",
  },
  twitter: {
    title: "NCAA Basketball Team Comparison",
    description: "Compare NCAA basketball teams head-to-head with advanced stats and efficiency ratings.",
  },
};

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

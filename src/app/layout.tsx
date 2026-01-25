import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NCAA Basketball Live Stats & Analytics | College Basketball Scores Today",
  description: "Live NCAA basketball scores, stats, and analytics. Track college basketball games in real-time with pace analysis, team comparisons, head-to-head matchups, AP Poll rankings, and advanced efficiency metrics. Your source for March Madness and NCAAB live coverage.",
  keywords: [
    // High volume primary keywords
    "basketball",
    "NCAA basketball",
    "college basketball",
    "ncaa",
    "ncaab",
    "mens college basketball",
    // Live/scores keywords
    "ncaa basketball live",
    "live ncaab",
    "ncaa live",
    "basketball live",
    "college basketball scores",
    "ncaa basketball scores today",
    "live college basketball scores",
    // Schedule keywords
    "ncaa basketball schedule",
    "ncaa basketball today schedule",
    "schedule for ncaa basketball",
    "college basketball schedule today",
    "ncaa basketball games today",
    // Stats/analytics keywords
    "basketball stats",
    "ncaa basketball stats",
    "college basketball statistics",
    "basketball analytics",
    "pace analysis",
    "efficiency ratings",
    "points per minute",
    "PPM",
    "kenpom",
    "advanced basketball stats",
    // Team comparison keywords
    "team comparison",
    "head to head matchup",
    "college basketball rankings",
    "ap poll basketball",
    "ncaa basketball rankings",
    // Tournament/championship keywords
    "ncaa championship",
    "march madness",
    "ncaa tournament",
    "ncaa basketball tournament",
    "march madness bracket",
    "ncaa bracket",
    // Conference keywords
    "big ten basketball",
    "sec basketball",
    "acc basketball",
    "big 12 basketball",
    "pac 12 basketball",
    // Other relevant keywords
    "ncaa basketball final",
    "college basketball today",
    "ncaab live scores",
    "basketball game tracker",
    "live game momentum",
    "scoring projections"
  ],
  authors: [{ name: "Take The Live Under" }],
  creator: "Take The Live Under",
  publisher: "Take The Live Under",
  metadataBase: new URL("https://taketheliveunder.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://taketheliveunder.com",
    siteName: "Take The Live Under",
    title: "NCAA Basketball Live Stats & Analytics | College Basketball Scores",
    description: "Live NCAA basketball scores, stats, and analytics. Real-time game tracking with pace analysis, team comparisons, AP Poll rankings, and advanced efficiency metrics for March Madness and all NCAAB games.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Take The Live Under - NCAA Basketball Live Stats and Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NCAA Basketball Live Stats & Analytics",
    description: "Live college basketball scores, real-time game tracking, team comparisons, and advanced analytics for NCAAB and March Madness.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here when you have it
    // google: "your-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}
      >
        {children}
      </body>
    </html>
  );
}

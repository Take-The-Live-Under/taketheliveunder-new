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
  title: "Take The Live Under - NCAA Basketball Analytics",
  description: "Real-time NCAA basketball pace analysis. Track live game momentum, points per minute trends, and AI-powered scoring projections.",
  keywords: ["NCAA basketball", "college basketball", "basketball analytics", "pace analysis", "PPM", "points per minute", "game predictions", "scoring trends"],
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
    title: "Take The Live Under - NCAA Basketball Analytics",
    description: "Real-time NCAA basketball pace analysis and scoring projections powered by advanced PPM metrics.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Take The Live Under - NCAA Basketball Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Take The Live Under - NCAA Basketball Analytics",
    description: "Real-time NCAA basketball pace analysis and AI-powered scoring projections.",
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

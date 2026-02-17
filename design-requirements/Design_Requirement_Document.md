# TakeTheLiveUnder -- Master Design Requirement Document (DRD)

**Date:** February 16, 2026
**Source:** TTLU Marketing Site (`ttlu-marketing-site`)
**Purpose:** The single source of truth for the TakeTheLiveUnder visual identity. This document combines high-level design philosophy with strict technical specifications for implementation.

---

## 1. Executive Summary & Design Philosophy

**TakeTheLiveUnder** (TTLU) is a premium, high-energy live basketball analytics platform. The design aesthetic is **Dark, Vibrant, and Dynamic**, merging the raw energy of streetball with the precision of data analytics.

### 1.1 Core Aesthetic: "Neon Chalkboard"
The brand marries two contrasting visual metaphors:
1.  **The Coach's Chalkboard**: Hand-drawn sketch fonts (`Rock Salt`, `Patrick Hand`), wavy underlines, dashed connector lines, and scribbled "X" marks evoke a coach diagramming plays in the locker room.
2.  **Neon Data Terminal**: Electric neon glows, box shadows with colored light emission, monospace data readouts, and a pure black background create a high-tech, "live dashboard" feel.

**The Vibe**: "Street-smart sports intuition backed by real-time data."

### 1.2 Key Design Pillars
*   **Premium Dark Mode**: The default experience is a deep, rich dark mode (`#0a0a0a`), never pure black details on pure black backgrounds, but layered semi-transparent surfaces handling depth.
*   **Neon & Electric**: Use of high-contrast neon accents (Cyber Blue, Hot Pink, Lime Green) to guide attention. These are "live" colors that pulse and glow.
*   **Glassmorphism & Depth**: Extensive use of backdrop blurs (`backdrop-blur-sm`), semi-transparent layers (`bg-neutral-900/50`), and intricate border lighting to create a sense of physical depth.
*   **Kinetic Energy**: The interface feels alive. Elements don't just appear; they slide, fade, ripple, and glow. Static is the enemy.

---

## 2. Design Tokens & Color System

### 2.1 Palette Definition

| Token | Hex Value | Role | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `#0A0A0A` | Base Background | Page body, interactive background base. |
| `--foreground` | `#EDEDED` | Primary Text | Body copy, headings, labels. |
| `--color-neon-blue` | `#00FFFF` | Primary Brand Accent | Logo ("TakeThe"), primary CTAs, dashboard glows. |
| `--color-neon-pink` | `#FF00FF` | Secondary Brand Accent | "Get Started" buttons, CTA card hovers, X-marks. |
| `--color-neon-lime` | `#CCFF00` | Tertiary Accent | Step indicators, chalkboard annotations, success states. |
| `--color-neon-orange` | `#FF6B00` | Signal / Alert Color | Logo ("LiveUnder"), "Golden Zone", live indicators. |
| `--color-neon-purple` | `#B026FF` | Interactive Accent | Avatar ring hover, ghost button glows, premium features. |

### 2.2 Extended Neutral Scale (Tailwind)

| Class | Hex Approx | Role |
| :--- | :--- | :--- |
| `bg-black` | `#000000` | True black for layered backgrounds. |
| `neutral-900` | `#171717` | Card backgrounds (`bg-neutral-900/50`), dropdown menus. |
| `neutral-800` | `#262626` | Borders (`border-neutral-800`), dividers. |
| `neutral-400` | `#A3A3A3` | Body text on dark backgrounds. |
| `white` | `#FFFFFF` | Headings, bold values. |

### 2.3 Glow & Shadow System
Neon glows are a core visual signature, implemented via Tailwind `shadow` and CSS `drop-shadow`.

| Glow Type | Implementation | Usage |
| :--- | :--- | :--- |
| **Pink Action Glow** | `shadow-[0_0_15px_rgba(255,0,255,0.5)]` | Primary CTAs, key interactive elements. |
| **Cyan Action Glow** | `shadow-[0_0_20px_rgba(0,255,255,0.4)]` | Secondary CTAs, Hero buttons. |
| **Dashboard Glow** | `shadow-[0_0_10px_#00f3ff,0_0_20px_#00f3ff...]` | The main "Live Dashboard" container. |
| **Text Neon (Blue)** | `drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]` | "TakeThe" logo text. |
| **Text Neon (Orange)** | `drop-shadow-[0_0_5px_rgba(255,165,0,0.8)]` | "LiveUnder" logo text. |

---

## 3. Typography System

The typography mixes functional geometric sans-serifs for data with expressive fonts for brand personality.

### 3.1 Font Stack

| Variable | Font Family | Role |
| :--- | :--- | :--- |
| `--font-geist-sans` | **Geist** | Primary interface font. Clean, modern, highly legible. |
| `--font-geist-mono` | **Geist Mono** | Data, statistics, code, tabular numbers. |
| `--font-manrope` | **Manrope** | Display headings (H1-H3). Geometric and punchy. |
| `--font-rock-salt` | **Rock Salt** | The "Street" font. Used for "TakeThe" and messy notes. |
| `--font-permanent-marker` | **Permanent Marker** | The "Bold" marker. Used for "LiveUnder" and loud labels. |
| `--font-patrick-hand` | **Patrick Hand** | The "Coach" font. Used for handwritten annotations. |

### 3.2 Usage Guidelines
*   **Hero H1**: `Geist Sans`, ExtraBold, `text-5xl` to `text-7xl`.
*   **Stats Numbers**: `Geist Mono`, Bold.
*   **Coach's Notes**: `Patrick Hand`, often rotated (`-rotate-2`) with a neon color.
*   **Logo**: Combined `Rock Salt` (Blue) + `Permanent Marker` (Orange).

---

## 4. Component Patterns

### 4.1 Buttons: Liquid & Metal
Buttons are not flat. They feel tactile and expensive.

*   **Liquid Glass Button**: Uses a complex SVG filter (`feTurbulence` + `feDisplacementMap`) to create a "liquid" internal texture.
    *   *Interaction*: Scales up (`scale-105`), brightens (`brightness-110`), and casts a colored glow on hover.
*   **Metal Button**: Uses multi-layer gradients to simulate Gold, Bronze, or Steel.
    *   *Press State*: Physically depresses (`scale-0.97`, `translate-y-px`).

### 4.2 Cards: Glass & Glow
*   **Standard Card**: `bg-neutral-900/50`, `backdrop-blur-sm`, `border border-neutral-800`, `rounded-2xl`.
*   **Glowing Effect Card**: Uses a `GlowingEffect` component that tracks the mouse cursor to cast a conic gradient glow on the border.

### 4.3 Navigation Bar
*   **Sticky & Glass**: Fixed to top (`fixed top-0`), `bg-neutral-900/50`, `backdrop-blur-sm`.
*   **Split Layout**: Logo left, Navigation center (hidden on mobile), CTA right.
*   **Border**: Subtle `border-b border-neutral-800`.

### 4.4 Live Dashboard (Mock)
A centerpiece component simulating the product interface.
*   **Chrome**: `rounded-3xl` with a cyan triple-layer shadow.
*   **Content**: Data tables with monospace numbers (`Geist Mono`), "Live" pulsing indicators (`animate-ping`).

---

## 5. Animation & Motion
Static interfaces are forbidden. The site must feel "Live".

*   **Entrance**: Elements `fade-in` and `slide-up` (`y: 20 -> 0`) as they enter the viewport.
*   **Background**: A `BackgroundCells` grid tracks the mouse and ripples when clicked.
*   **Draw Animations**: SVG paths (basketballs, arrows) animate their `pathLength` from 0 to 1.
*   **Parallax**: Large background elements (like the basketball) fade and move slower than scroll speed.

---

## 6. Technical Stack
*   **Framework**: Next.js 16 (App Router)
*   **Styling**: Tailwind CSS v4 (using `@theme` inline configuration)
*   **Icons**: Lucide React + Custom SVGs
*   **Animation**: Framer Motion v12
*   **Component Primitives**: Radix UI (Dialog, Dropdown, Avatar)

---

## 7. Adoption Checklist for Product App
To replicate this system in the main application:

1.  [ ] **Copy Variables**: Port the `:root` CSS variables for colors (Neon palette) to your global CSS.
2.  [ ] **Install Fonts**: Add `Geist`, `Manrope`, `Rock Salt`, `Permanent Marker`, and `Patrick Hand` via `next/font`.
3.  [ ] **Port Components**: Copy `LiquidButton`, `GlowingEffect`, and the `BackgroundCells` system.
4.  [ ] **Set Base Theme**: Force the app background to `#0a0a0a` and default text to `#ededed`.
5.  [ ] **Implement Glows**: Add the custom `box-shadow` utilities to your Tailwind config (or CSS).

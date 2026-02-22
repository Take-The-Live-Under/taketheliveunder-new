# TakeTheLiveUnder Marketing Site

A modern, high-performance marketing website built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**. This project showcases a premium design aesthetic with 3D elements, smooth animations, and a dark mode-first approach.

## Design Philosophy

The visual identity of this project is built around a **"Street Basketball / Sony's Lebron PlayStation Controller / Japanese Neon Styles"** that are aesthetic—high energy, futuristic, and bold.

- **Vibe:** Playful, electric, and cutting-edge. It feels like a high-end sports entertainment interface.
- **Color Palette:** A deep, cinematic dark mode accented by vibrant neon colors:
    - ![#00ffff](https://placehold.co/15x15/00ffff/00ffff.png) **Neon Blue** (`#00ffff`)
    - ![#ff00ff](https://placehold.co/15x15/ff00ff/ff00ff.png) **Neon Pink** (`#ff00ff`)
    - ![#ccff00](https://placehold.co/15x15/ccff00/ccff00.png) **Neon Lime** (`#ccff00`)
    - ![#ff6b00](https://placehold.co/15x15/ff6b00/ff6b00.png) **Neon Orange** (`#ff6b00`)
    - ![#b026ff](https://placehold.co/15x15/b026ff/b026ff.png) **Neon Purple** (`#b026ff`)
- **Visuals:** Heavy use of **glassmorphism**, **glow effects**, and **dynamic gradients** to create depth and immersion.

## Typography

We utilize a diverse set of fonts to create hierarchy and character:

- **Primary UI:** [Geist Sans](https://vercel.com/font) (Clean, modern, highly legible)
- **Code / Tech:** [Geist Mono](https://vercel.com/font), [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (For data displays and technical accents)
- **Headlines / Display:** [Manrope](https://fonts.google.com/specimen/Manrope) (Modern, geometric sans-serif)
- **Handwritten / Playful:** [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) (Adds a human, approachable touch)
- **Artistic / Gritty:** [Rock Salt](https://fonts.google.com/specimen/Rock+Salt), [Permanent Marker](https://fonts.google.com/specimen/Permanent+Marker) (Used for energetic, "street" style highlights)

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **3D Graphics:** [Three.js](https://threejs.org/), [React Three Fiber](https://docs.pmnd.rs/react-three-fiber), [Drei](https://github.com/pmndrs/drei)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Package Manager:** npm / yarn / pnpm / bun

## Key Features

- **3D Interactive Hero:** Immersive 3D elements using Fiber and Drei.
- **Modern UI/UX:** Glassmorphism, neon glow effects, and smooth gradients.
- **Responsive Design:** Fully responsive layout for all device sizes.
- **Performance Optimized:** Built on Next.js 16 for optimal speed and SEO.
- **Dynamic Components:**
  - **Navbar:** Responsive navigation with neon hover effects and mobile menu.
  - **Stats Section:** Animated counters using `@number-flow/react`.
  - **Benefits & CTA:** Visually striking sections to convert visitors.

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ttlu-marketing-site
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

### Running the Development Server

Start the local development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

## 📂 Project Structure

```bash
├── src/
│   ├── app/              # Next.js App Router pages and layouts
│   ├── components/       # Reusable UI components
│   │   ├── landing/      # Landing page specific sections (Hero, CTA, etc.)
│   │   ├── layout/       # Global layout components (Navbar, Footer)
│   │   └── ui/           # Generic UI elements (Buttons, Cards, etc.)
│   ├── lib/              # Utility functions and shared logic
│   └── ...
├── public/               # Static assets (images, fonts, etc.)
├── next.config.ts        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── ...
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

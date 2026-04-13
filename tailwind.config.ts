// NOTE: This project uses Tailwind CSS v4, which uses CSS-based configuration.
// Design tokens (colors, fonts, animations) are defined in app/globals.css via @theme.
// This file is kept for reference and tooling compatibility.
// See: https://tailwindcss.com/docs/v4-beta#css-based-configuration

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "frc-blue": "#1565C0",
        "frc-red": "#E53935",
        "frc-yellow": "#FFD600",
        "surface": "#0A0A0F",
        "surface-elevated": "#12121A",
        "surface-border": "#1E1E2E",
        "text-primary": "#F0F0FF",
        "text-muted": "#8B8BA7",
        "success": "#00C853",
        "warning": "#FF6D00",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px #1565C040" },
          "100%": { boxShadow: "0 0 20px #1565C080, 0 0 40px #1565C030" },
        },
      },
      backgroundImage: {
        "frc-gradient": "linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)",
        "ai-gradient": "linear-gradient(135deg, #12121A 0%, #1a1a2e 100%)",
      },
    },
  },
  // tailwindcss-animate is loaded via tw-animate-css @import in globals.css for v4
  plugins: [],
};

export default config;

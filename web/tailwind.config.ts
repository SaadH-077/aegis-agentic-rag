import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Spider-Man-inspired palette
        spider: {
          red: "#e2122b",
          crimson: "#b11226",
          blue: "#1b3a8b",
          midnight: "#070713",
          web: "#ff3a4e",
          cyan: "#43e8ff",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(226,18,43,0.45)",
        "glow-cyan": "0 0 24px rgba(67,232,255,0.5)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

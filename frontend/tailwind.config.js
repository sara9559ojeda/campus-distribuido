/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Bebas Neue'", "cursive"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        night:  "#0a0b0f",
        panel:  "#111318",
        card:   "#161a22",
        border: "#1e2330",
        accent: "#ff3b3b",
        warn:   "#ff9500",
        safe:   "#00d084",
        info:   "#0a84ff",
        purple: "#bf5af2",
        yellow: "#ffd60a",
        muted:  "#4a5568",
        dim:    "#2d3748",
      },
      animation: {
        "pulse-fast":   "pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in":     "slideIn 0.3s ease-out",
        "slide-up":     "slideUp 0.4s ease-out",
        "fade-in":      "fadeIn 0.4s ease-out",
        "glow-pulse":   "glowPulse 2s ease-in-out infinite",
        "float":        "float 3s ease-in-out infinite",
        "count-up":     "fadeIn 0.6s ease-out",
        "ticker":       "ticker 20s linear infinite",
      },
      keyframes: {
        slideIn: {
          "0%":   { transform: "translateX(100%)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        slideUp: {
          "0%":   { transform: "translateY(16px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        fadeIn: {
          "0%":   { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 12px currentColor" },
          "50%":      { boxShadow: "0 0 28px currentColor" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      boxShadow: {
        "glow-red":    "0 0 20px rgba(255, 59, 59, 0.3)",
        "glow-green":  "0 0 20px rgba(0, 208, 132, 0.3)",
        "glow-blue":   "0 0 20px rgba(10, 132, 255, 0.3)",
        "glow-orange": "0 0 20px rgba(255, 149, 0, 0.3)",
        "glow-purple": "0 0 20px rgba(191, 90, 242, 0.3)",
        "card":        "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

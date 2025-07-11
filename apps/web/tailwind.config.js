/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        landscape: { raw: "(orientation: landscape)" },
        portrait: { raw: "(orientation: portrait)" },
      },
      fontFamily: {
        sans: [
          "SFCompactDisplay",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        "bg-surface": "#1e1f24",
        "brand-blue": "#2563eb",
        "brand-blue-light": "#3b82f6",
        "cta-green": "#00b331",
        "text-primary": "#ffffffde",
        "text-secondary": "#ffffff8a",
        // Legacy colors for backward compatibility
        background: "#000000",
        backgroundSecondary: "#1A1A1A",
        backgroundTertiary: "#2D2D2D",
        textPrimary: "#FFFFFF",
        textSecondary: "#B0B0B0",
        astronomyGreen: "#00AA00",
        astronomyBlue: "#0080FF",
        astronomyBlue2: "#2563eb",
        astronomyOrange: "#FFAA00",
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      boxShadow: {
        elevation: "0 1px 3px 0 rgba(0,0,0,0.4)",
      },
      spacing: {
        13: "3.25rem",
        18: "4.5rem",
        25: "6.25rem",
        38: "9.5rem",
      },
      width: {
        13: "3.25rem",
        18: "4.5rem",
        25: "6.25rem",
        38: "9.5rem",
        viewport: "var(--viewport-width)",
        "visual-viewport": "var(--visual-viewport-width)",
      },
      height: {
        13: "3.25rem",
        18: "4.5rem",
        25: "6.25rem",
        38: "9.5rem",
        viewport: "var(--viewport-height)",
        "viewport-adjusted": "var(--adjusted-viewport-height)",
        "visual-viewport": "var(--visual-viewport-height)",
      },
    },
  },
  plugins: [],
};

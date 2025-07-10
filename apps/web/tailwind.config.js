/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
        "brand-red": "#c6283c",
        "brand-pink": "#d22656",
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
        astronomyRed: "#FF4444",
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
      },
      height: {
        13: "3.25rem",
        18: "4.5rem",
        25: "6.25rem",
        38: "9.5rem",
      },
    },
  },
  plugins: [],
};

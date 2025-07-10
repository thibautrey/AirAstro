/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        backgroundSecondary: '#1A1A1A',
        backgroundTertiary: '#2D2D2D',
        textPrimary: '#FFFFFF',
        textSecondary: '#B0B0B0',
        astronomyGreen: '#00AA00',
        astronomyBlue: '#0080FF',
        astronomyRed: '#FF4444',
        astronomyOrange: '#FFAA00'
      }
    }
  },
  plugins: []
};

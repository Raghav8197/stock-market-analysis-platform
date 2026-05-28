/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",
        darkCard: "#151B2E",
        accent: "#6366F1", // Indigo accent
        accentLight: "#818CF8",
        success: "#10B981", // Bullish emerald green
        danger: "#EF4444", // Bearish rose red
        warning: "#F59E0B", // Warning amber
        textMuted: "#9CA3AF"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      }
    },
  },
  plugins: [],
}

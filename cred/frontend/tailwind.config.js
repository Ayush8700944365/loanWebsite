/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#18181B',       // Dark Charcoal / Black header & structural dark
          royal: '#DC2626',      // Primary Crimson Red (Replaced royal blue)
          electric: '#EF4444',   // Bright Red / Coral (Replaced electric blue)
          teal: '#B91C1C',       // Deep Crimson Accent
          bg: '#F8FAFC',         // Soft Clean Background
          lightRed: '#FFF5F5',   // Gentle red tint for cards & highlights
          dark: '#0F172A',       // Primary text
          muted: '#64748B',      // Secondary text
          surface: '#FFFFFF',    // Pure White Surface
          border: '#FEE2E2',     // Red-subtle border
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 2px 10px 0 rgba(220, 38, 38, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'premium': '0 12px 35px -8px rgba(220, 38, 38, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 25px -4px rgba(220, 38, 38, 0.35)',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-blue': '#0B1426',
        'space-purple': '#1A0B3D',
        'cosmic-orange': '#FF6B35',
        'stellar-gold': '#FFD700',
        'nebula-pink': '#FF69B4',
        'asteroid-gray': '#2C3E50',
        'cosmic-glow': '#FF6B35',
      },
      fontFamily: {
        'space': ['Orbitron', 'monospace'],
        'tech': ['Share Tech Mono', 'monospace'],
      },
      backgroundImage: {
        'space-gradient': 'linear-gradient(135deg, #0B1426 0%, #1A0B3D 100%)',
        'cosmic-glow': 'radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%)',
      }
    },
  },
  plugins: [],
}

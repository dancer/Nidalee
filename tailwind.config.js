/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bl-red': '#ff4f4f',
        'bl-gray': '#1a1a1a',
        'bl-light-gray': '#2a2a2a',
        'bl-dark': '#141414',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}; 
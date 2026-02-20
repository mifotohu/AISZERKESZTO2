/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#F59E0B',
        'brand-secondary': '#D97706',
        'base-100': '#111827',
        'base-200': '#1f2937',
        'base-300': '#374151',
        'text-primary': '#f9fafb',
        'text-secondary': '#d1d5db',
      }
    },
  },
  plugins: [],
}

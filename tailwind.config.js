/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#800000',
          dark: '#5B0000',
          light: '#991B1B',
          50: '#FDF2F2',
        },
        accent: {
          DEFAULT: '#D97706',
          dark: '#B45309',
          light: '#FDE68A',
        },
        dark: {
          DEFAULT: '#0F172A',
          secondary: '#64748B',
          border: '#E2E8F0',
        },
        surface: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
        },
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
};
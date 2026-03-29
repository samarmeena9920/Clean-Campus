/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eef5ff',
          100: '#d8e8ff',
          200: '#b9d7ff',
          300: '#89bfff',
          400: '#529bff',
          500: '#2a76ff',
          600: '#1355f5',
          700: '#0c40e1',
          800: '#1034b6',
          900: '#13308f',
          950: '#111f57',
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        claro: {
          DEFAULT: '#DA291C',
          50: '#FFF1F0',
          100: '#FFE1DF',
          200: '#FFC5C1',
          300: '#FFA39E',
          400: '#F56C64',
          500: '#DA291C',
          600: '#C22418',
          700: '#A11B10',
          800: '#80130A',
          900: '#5C0904',
          red: '#DA291C',
          darkred: '#B31E12',
          lightred: '#FFF1F0',
          dark: '#0F172A',
          navy: '#0B1329',
        },
      },
    },
  },
  plugins: [],
}

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

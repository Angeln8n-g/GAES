/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Tokens semánticos adaptativos a color-scheme
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          subtle: 'var(--bg-surface-subtle)',
          elevated: 'var(--bg-surface-elevated)',
          overlay: 'var(--bg-surface-overlay)',
        },
        fg: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        // Identidad Corporativa Claro
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
          red: 'var(--claro-red, #DA291C)',
          'red-text': 'var(--claro-red-text, #DA291C)',
          'red-subtle': 'var(--claro-red-subtle, rgba(218, 41, 28, 0.08))',
          'red-border': 'var(--claro-red-border, rgba(218, 41, 28, 0.20))',
          darkred: '#B31E12',
          lightred: 'var(--claro-badge-bg, #FFF1F0)',
          dark: '#0F172A',
          navy: '#0B1329',
        },
      },
    },
  },
  plugins: [],
}

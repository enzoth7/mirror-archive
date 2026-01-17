import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)'
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Work Sans"', 'sans-serif']
      },
      boxShadow: {
        soft: '0 8px 24px rgba(34, 28, 22, 0.06)',
        lift: '0 12px 30px rgba(34, 28, 22, 0.1)'
      },
      borderRadius: {
        card: '1rem',
        pill: '999px'
      }
    }
  },
  plugins: []
} satisfies Config

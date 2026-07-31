import type { Config } from 'tailwindcss';

/// Felicek's identity, unchanged from v1: the same canvas/ink/teal tokens the
/// Android app renders. Only the layout language changes in v2.
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f5f0',
        backdrop: '#e9e6df',
        surface: '#ffffff',
        'neutral-tint': '#f2f0ea',
        ink: {
          DEFAULT: '#1b2430', strong: '#1c2534',
          muted: '#5b6472', faint: '#8a92a0',
        },
        teal: { DEFAULT: '#0d9488', deep: '#0d7d74', tint: '#eaf6f4' },
        violet: { DEFAULT: '#8659c9', tint: '#f1eafb' },
        blue: { DEFAULT: '#2f5fa8', tint: '#eaf0fa' },
        amber: { DEFAULT: '#b45309', tint: '#fdf3e7' },
        danger: { DEFAULT: '#c2410c', tint: '#fdeee8' },
        border: { DEFAULT: 'rgba(27,36,48,.08)', strong: 'rgba(27,36,48,.12)' },
      },
      fontFamily: {
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        sans: ['var(--font-plex)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { lg: '12px', md: '10px', sm: '8px' },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down .2s ease-out',
        'accordion-up': 'accordion-up .2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

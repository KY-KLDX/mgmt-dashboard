/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: v('surface'),
        sunken: v('sunken'),
        line: v('line'),
        ink: { DEFAULT: v('ink'), 2: v('ink-2'), 3: v('ink-3') },
        rail: { DEFAULT: v('rail'), ink: v('rail-ink'), muted: v('rail-muted'), hover: v('rail-hover') },
        accent: { DEFAULT: v('accent'), soft: v('accent-soft'), ink: v('accent-ink') },
        crit: { DEFAULT: v('crit'), soft: v('crit-soft') },
        warn: { DEFAULT: v('warn'), soft: v('warn-soft') },
        good: { DEFAULT: v('good'), soft: v('good-soft') },
        info: { DEFAULT: v('info'), soft: v('info-soft') },
        mute: { DEFAULT: v('mute'), soft: v('mute-soft') },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        display: ['"Source Serif 4"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.05), 0 1px 3px rgb(var(--shadow) / 0.06)',
        lift: '0 8px 24px rgb(var(--shadow) / 0.12)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        slidein: { '0%': { transform: 'translateX(24px)', opacity: '0.4' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        fadein: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        rise: { '0%': { transform: 'translateY(6px)', opacity: '0.6' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        slidein: 'slidein 200ms ease-out',
        fadein: 'fadein 150ms ease-out',
        rise: 'rise 180ms ease-out',
      },
    },
  },
  plugins: [],
};

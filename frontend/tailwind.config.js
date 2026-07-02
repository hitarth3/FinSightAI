/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // NOTE: `primary`/`secondary` are FIXED brand hex values — they do NOT
        // track the active theme (the light theme's actual primary is purple,
        // not cyan). They're being phased out of theme-reactive UI in favor of
        // `var(--primary-color)`/`var(--secondary-color)` (see src/index.css),
        // which correctly swap per theme. Only use `primary`/`secondary` (or
        // the explicitly-named `brand-cyan`/`brand-purple` below) for content
        // that is intentionally theme-independent, e.g. pre-login marketing
        // decoration. Kept during migration — remove once nothing else uses it.
        primary: {
          DEFAULT: '#00D4FF', // Neon Cyan
          glow: 'rgba(0, 212, 255, 0.4)',
        },
        secondary: {
          DEFAULT: '#7C3AED', // Purple
          glow: 'rgba(124, 58, 237, 0.4)',
        },
        'brand-cyan': '#00D4FF',
        'brand-purple': '#7C3AED',
        darkBg: '#0B1120',
        lightBg: '#F8FAFC',
        darkCard: 'rgba(255, 255, 255, 0.08)',
        lightCard: 'rgba(15, 23, 42, 0.05)',
        darkBorder: 'rgba(255, 255, 255, 0.12)',
        lightBorder: 'rgba(15, 23, 42, 0.1)',
        success: '#22C55E',
        error: '#EF4444',
        textPrimaryDark: '#FFFFFF',
        textSecondaryDark: '#94A3B8',
        textPrimaryLight: '#0F172A',
        textSecondaryLight: '#475569',
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // A small named type scale — new UI should reach for these rather than
      // ad hoc sizes like text-[10px]/text-[11px] scattered per-component.
      fontSize: {
        display: ['2rem', { lineHeight: '2.25rem', fontWeight: '800', letterSpacing: '-0.025em' }],
        heading: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        subheading: ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '600', letterSpacing: '0.04em' }],
        label: ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '700', letterSpacing: '0.08em' }],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        // Fixed-color glows — reserved for theme-independent brand decoration
        // (see the `colors` note above). Toned down from the original 0.35
        // alpha / 15px blur, which read as excessive "AI demo" neon.
        'cyan-glow': '0 0 10px rgba(0, 212, 255, 0.22)',
        'purple-glow': '0 0 10px rgba(124, 58, 237, 0.22)',
        // Theme-reactive glow — resolves against the active theme's CSS
        // variables at paint time, so it correctly swaps color per theme.
        // Prefer this over `cyan-glow`/`purple-glow` in dashboard UI.
        'glow-accent': '0 0 10px var(--accent-glow)',
        'glow-border': '0 0 0 1px var(--border-glow)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 3s',
        'mesh-glow': 'meshGlow 15s ease infinite',
        'fadeIn': 'fadeIn 0.25s ease-out',
        'shake': 'shake 0.4s ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        meshGlow: {
          '0%, 100%': {
            'background-position': '0% 50%',
          },
          '50%': {
            'background-position': '100% 50%',
          },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        // Editorial display serif + clean grotesque body.
        // Loaded from Google Fonts via next/font in layout.tsx.
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Paper-and-ink palette. Warm off-white background, deep ink text.
        paper: {
          DEFAULT: 'hsl(var(--paper))',
          dim: 'hsl(var(--paper-dim))',
          deep: 'hsl(var(--paper-deep))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          soft: 'hsl(var(--ink-soft))',
          faint: 'hsl(var(--ink-faint))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          fg: 'hsl(var(--accent-fg))',
        },
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
        // Status hues — muted, legal-grade
        success: 'hsl(var(--success))',
        warn: 'hsl(var(--warn))',
        danger: 'hsl(var(--danger))',
        // shadcn compatibility
        background: 'hsl(var(--paper))',
        foreground: 'hsl(var(--ink))',
        muted: {
          DEFAULT: 'hsl(var(--paper-dim))',
          foreground: 'hsl(var(--ink-soft))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--paper))',
        },
        primary: {
          DEFAULT: 'hsl(var(--ink))',
          foreground: 'hsl(var(--paper))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--paper-dim))',
          foreground: 'hsl(var(--ink))',
        },
        card: {
          DEFAULT: 'hsl(var(--paper))',
          foreground: 'hsl(var(--ink))',
        },
        popover: {
          DEFAULT: 'hsl(var(--paper))',
          foreground: 'hsl(var(--ink))',
        },
        input: 'hsl(var(--border))',
      },
      borderRadius: {
        // Sharper than typical SaaS — closer to document/legal aesthetic
        lg: '4px',
        md: '3px',
        sm: '2px',
      },
      boxShadow: {
        paper: '0 1px 0 0 hsl(var(--border)), 0 1px 2px 0 hsla(var(--ink), 0.04)',
        sheet:
          '0 1px 0 0 hsl(var(--border)), 0 10px 30px -10px hsla(var(--ink), 0.12)',
        ink: '0 0 0 1px hsl(var(--ink) / 0.08)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;

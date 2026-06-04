import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1200px' },
    },
    extend: {
      fontFamily: {
        // App uses Inter Tight for everything. Serif kept available for
        // edge cases but no longer assigned to default headings.
        sans: ['var(--font-sans)', 'Inter Tight', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Inter Tight', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Fraunces', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Warm cream/ivory/paper surfaces
        cream: {
          DEFAULT: 'hsl(var(--cream))',
          2: 'hsl(var(--cream-2))',
        },
        ivory: {
          DEFAULT: 'hsl(var(--ivory))',
          2: 'hsl(var(--ivory-2))',
        },
        paper: {
          DEFAULT: 'hsl(var(--paper))',
          // Legacy aliases used by older components — pointed at app tokens
          dim: 'hsl(var(--ivory-2))',
          deep: 'hsl(var(--paper))',
        },

        // Ink ramp
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          2: 'hsl(var(--ink-2))',
          3: 'hsl(var(--ink-3))',
          soft: 'hsl(var(--ink-3))',
          faint: 'hsl(var(--muted))',
          mute: 'hsl(var(--muted-2))',
          bg: 'hsl(var(--ink))',
          bg2: 'hsl(var(--ink-2))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          2: 'hsl(var(--muted-2))',
          foreground: 'hsl(var(--ink-3))',
        },
        faint: 'hsl(var(--faint))',

        // Accent — terracotta, mostly for focus/drag/brand
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          soft: 'hsl(var(--accent) / 0.12)',
          softer: 'hsl(var(--accent) / 0.06)',
          ink: 'hsl(var(--accent-ink))',
          tint: 'hsl(var(--accent) / 0.10)',
          deep: 'hsl(var(--accent-ink))',
          fg: 'hsl(var(--accent-fg))',
        },

        // Lines
        border: 'hsl(var(--line))',
        'border-soft': 'hsl(var(--line-soft))',
        'border-strong': 'hsl(var(--line-strong))',
        ring: 'hsl(var(--ring))',

        // Status
        success: 'hsl(var(--ok))',
        warn: 'hsl(var(--warn))',
        danger: 'hsl(var(--err))',

        // shadcn compat
        background: 'hsl(var(--cream))',
        foreground: 'hsl(var(--ink))',
        destructive: {
          DEFAULT: 'hsl(var(--err))',
          foreground: 'hsl(var(--paper))',
        },
        primary: {
          DEFAULT: 'hsl(var(--ink))',
          foreground: 'hsl(var(--paper))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--ivory))',
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
        input: 'hsl(var(--line-strong))',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',      // --r-sm
        DEFAULT: '6px',
        md: '10px',     // --r-md
        lg: '14px',     // --r-lg
        xl: '20px',     // --r-xl
        pill: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px hsl(var(--ink) / 0.04)',
        paper: 'none',
        sheet: 'none',
        hairline: '0 1px 0 hsl(var(--line))',
        // Inset ring matches definable active state
        ring: 'inset 0 0 0 1px hsl(var(--line))',
        // Card lift (popovers / dropdowns)
        lifted: '0 5px 20px -5px hsl(var(--ink) / 0.15), 0 0 1px hsl(var(--ink) / 0.10)',
        popover: '0 12px 28px -14px hsl(var(--ink) / 0.18)',
        focus: '0 0 0 3px hsl(var(--accent) / 0.18)',
        coral: '0 0 0 3px hsl(var(--accent) / 0.18)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'pulse-coral': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.2s ease-out',
        'scale-in': 'scale-in 0.14s ease-out',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
        'pulse-coral': 'pulse-soft 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;

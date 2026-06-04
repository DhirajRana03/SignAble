import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Geist', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Geist Mono', 'ui-monospace', 'monospace'],
        serif: ['ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        // Surfaces
        surface: {
          DEFAULT: 'hsl(var(--surface-0))',
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          sunken: 'hsl(var(--surface-sunken))',
        },
        // Legacy aliases (kept for older callers)
        cream: {
          DEFAULT: 'hsl(var(--surface-0))',
          2: 'hsl(var(--surface-sunken))',
        },
        ivory: {
          DEFAULT: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-sunken))',
        },
        paper: {
          DEFAULT: 'hsl(var(--surface-2))',
          dim: 'hsl(var(--surface-sunken))',
          deep: 'hsl(var(--surface-2))',
        },

        // Ink ramp
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          2: 'hsl(var(--ink-2))',
          3: 'hsl(var(--ink-3))',
          4: 'hsl(var(--ink-4))',
          5: 'hsl(var(--ink-5))',
          soft: 'hsl(var(--ink-2))',
          faint: 'hsl(var(--ink-3))',
          mute: 'hsl(var(--ink-4))',
          bg: 'hsl(var(--ink))',
          bg2: 'hsl(var(--ink-2))',
        },
        muted: {
          DEFAULT: 'hsl(var(--ink-3))',
          2: 'hsl(var(--ink-4))',
          foreground: 'hsl(var(--ink-2))',
        },

        // Accent
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          deep: 'hsl(var(--accent-deep))',
          soft: 'hsl(var(--accent) / 0.10)',
          softer: 'hsl(var(--accent) / 0.06)',
          glow: 'hsl(var(--accent) / 0.18)',
          tint: 'hsl(var(--accent) / 0.12)',
          ink: 'hsl(var(--accent-deep))',
          fg: 'hsl(var(--accent-fg))',
        },

        // Hairlines
        border: 'hsl(var(--hairline))',
        'border-soft': 'hsl(var(--hairline-soft))',
        'border-strong': 'hsl(var(--hairline-strong))',
        ring: 'hsl(var(--ring))',

        // Status
        success: 'hsl(var(--ok))',
        warn: 'hsl(var(--warn))',
        danger: 'hsl(var(--err))',

        // shadcn compat
        background: 'hsl(var(--surface-0))',
        foreground: 'hsl(var(--ink))',
        destructive: {
          DEFAULT: 'hsl(var(--err))',
          foreground: 'hsl(0 0% 100%)',
        },
        primary: {
          DEFAULT: 'hsl(var(--ink))',
          foreground: 'hsl(0 0% 100%)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--surface-1))',
          foreground: 'hsl(var(--ink))',
        },
        card: {
          DEFAULT: 'hsl(var(--surface-2))',
          foreground: 'hsl(var(--ink))',
        },
        popover: {
          DEFAULT: 'hsl(var(--surface-2))',
          foreground: 'hsl(var(--ink))',
        },
        input: 'hsl(var(--hairline-strong))',
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
        '2xl': '28px',
        pill: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px hsl(240 10% 10% / 0.04)',
        soft: '0 2px 8px hsl(240 10% 10% / 0.04), 0 1px 2px hsl(240 10% 10% / 0.04)',
        glass: '0 8px 28px -12px hsl(240 10% 10% / 0.10)',
        lifted: '0 14px 40px -16px hsl(240 10% 10% / 0.18), 0 2px 6px hsl(240 10% 10% / 0.04)',
        popover: '0 18px 48px -16px hsl(240 10% 10% / 0.22)',
        glow: '0 0 0 4px hsl(var(--accent) / 0.14), 0 8px 24px -8px hsl(var(--accent) / 0.35)',
        focus: '0 0 0 3px hsl(var(--accent) / 0.18)',
        ring: 'inset 0 0 0 1px hsl(var(--hairline-strong))',
        // Legacy aliases used by older components — point at sensible new values
        paper: '0 1px 2px hsl(240 10% 10% / 0.04)',
        sheet: '0 8px 28px -12px hsl(240 10% 10% / 0.10)',
        hairline: '0 1px 0 hsl(var(--hairline))',
        coral: '0 0 0 4px hsl(var(--accent) / 0.14), 0 8px 24px -8px hsl(var(--accent) / 0.35)',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        DEFAULT: '14px',
        md: '14px',
        lg: '22px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'pulse-coral': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.28s cubic-bezier(0.32, 0.72, 0.16, 1)',
        'scale-in': 'scale-in 0.16s cubic-bezier(0.32, 0.72, 0.16, 1)',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'pulse-coral': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;

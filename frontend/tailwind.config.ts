import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1240px' },
    },
    extend: {
      fontFamily: {
        // Display: Playfair Display (matches definable.ai)
        // Sans: Inter
        // Mono: JetBrains Mono
        display: ['var(--font-display)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Surfaces
        paper: {
          DEFAULT: 'hsl(var(--paper))',
          dim: 'hsl(var(--paper-dim))',
          deep: 'hsl(var(--paper-deep))',
        },
        // Ink (text + on-paper marks)
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          soft: 'hsl(var(--ink-soft))',
          faint: 'hsl(var(--ink-faint))',
          mute: 'hsl(var(--ink-mute))',
          bg: 'hsl(var(--ink-bg))',
          bg2: 'hsl(var(--ink-bg-2))',
        },
        // Coral accent stack
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          deep: 'hsl(var(--accent-deep))',
          soft: 'hsl(var(--accent-soft))',
          tint: 'hsl(var(--accent-tint))',
          fg: 'hsl(var(--accent-fg))',
        },
        border: 'hsl(var(--border))',
        'border-soft': 'hsl(var(--border-soft))',
        ring: 'hsl(var(--ring))',
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
          DEFAULT: 'hsl(var(--paper-deep))',
          foreground: 'hsl(var(--ink))',
        },
        popover: {
          DEFAULT: 'hsl(var(--paper-deep))',
          foreground: 'hsl(var(--ink))',
        },
        input: 'hsl(var(--border))',
      },
      borderRadius: {
        // Match definable.ai radii: 6 / 10 / 18 / 28
        xs: '6px',
        sm: '8px',
        md: '10px',
        lg: '18px',
        xl: '28px',
        pill: '9999px',
      },
      boxShadow: {
        // Only used on hover-lift CTA. Default surfaces stay flat.
        xs: '0 1px 2px hsl(var(--ink) / 0.04)',
        paper: 'none',
        sheet: 'none',
        lifted: '0 24px 60px hsl(var(--ink) / 0.10), 0 8px 20px hsl(var(--ink) / 0.05)',
        coral: '0 10px 22px hsl(var(--accent) / 0.28)',
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
        'pulse-coral': {
          '0%': { boxShadow: '0 0 0 0 hsl(var(--accent) / 0.45)' },
          '70%': { boxShadow: '0 0 0 8px hsl(var(--accent) / 0)' },
          '100%': { boxShadow: '0 0 0 0 hsl(var(--accent) / 0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-coral': 'pulse-coral 1.6s ease-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;

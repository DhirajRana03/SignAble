import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Pill buttons matching definable.ai .btn system.
 * Primary = coral. Ink = inverse for CTAs on light. Ghost = subtle outline.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        // Coral CTA — equivalent to definable .v-primary
        primary:
          'bg-accent text-accent-fg border border-accent hover:bg-accent-deep hover:border-accent-deep hover:-translate-y-px hover:shadow-coral',
        // Inverse ink CTA (rare; for over-light hero contrast)
        ink:
          'bg-ink text-paper border border-ink hover:bg-ink-bg2 hover:-translate-y-px',
        // Ghost outline — definable .v-ghost
        secondary:
          'bg-transparent text-ink border border-border hover:bg-paper-dim hover:border-ink-faint',
        // Alias kept for backward compat — same as primary
        accent:
          'bg-accent text-accent-fg border border-accent hover:bg-accent-deep hover:border-accent-deep hover:-translate-y-px hover:shadow-coral',
        ghost:
          'bg-transparent text-ink-soft border border-transparent hover:bg-paper-dim hover:text-ink',
        danger:
          'bg-transparent text-danger border border-danger/40 hover:bg-danger hover:text-paper hover:border-danger',
      },
      size: {
        sm: 'h-8 px-3.5 text-xs',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

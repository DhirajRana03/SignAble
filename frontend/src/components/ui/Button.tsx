import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Buttons match app.definable.ai sizing — small (11.5px font, 4×9 padding,
 * 6px radius). Paper bg, hairline border, ink text. Active states use
 * inset ring, never accent fill. Accent reserved for primary CTA only.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium transition-all duration-[140ms] focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        // Primary CTA — ink fill (not accent)
        primary:
          'bg-ink text-paper hover:bg-ink-2 border border-ink',
        // Accent — terracotta, used sparingly for distinct actions
        accent:
          'bg-accent text-accent-fg hover:bg-accent-ink border border-accent',
        // Secondary — paper chip, hairline
        secondary:
          'bg-paper text-ink-3 hover:text-ink hover:bg-ivory-2 border border-border',
        ghost:
          'bg-transparent text-ink-3 hover:text-ink hover:bg-ivory-2 border border-transparent',
        danger:
          'bg-paper text-danger border border-border hover:bg-danger hover:text-paper hover:border-danger',
        // Legacy alias used by older callers
        ink:
          'bg-ink text-paper hover:bg-ink-2 border border-ink',
      },
      size: {
        // App primary size
        sm: 'h-7 px-2.5 text-[11.5px]',
        md: 'h-8 px-3 text-[12.5px]',
        lg: 'h-9 px-4 text-[13px]',
        icon: 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'sm' },
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
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

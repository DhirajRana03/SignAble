import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Button — Notion-friendly tactile sizing with glass surfaces for
 * non-primary variants. Primary is solid ink (deep), accent is indigo,
 * secondary is glass.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.005em] transition-all duration-150 select-none ' +
    'focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed ' +
    'active:scale-[0.98]',
  {
    variants: {
      variant: {
        // Primary CTA — solid ink
        primary:
          'bg-ink text-white hover:bg-ink-2 shadow-soft',
        // Accent — indigo, for distinct "create / continue" actions
        accent:
          'bg-accent text-accent-fg hover:bg-accent-deep shadow-glow',
        // Glass secondary — translucent, hairline edge
        secondary:
          'glass text-ink hover:bg-white/80',
        // Ghost — borderless, hover surface tint
        ghost:
          'bg-transparent text-ink-2 hover:bg-surface-sunken hover:text-ink',
        // Danger
        danger:
          'bg-white text-danger border border-danger/40 hover:bg-danger/10 hover:text-danger hover:border-danger transition-colors',
        // Legacy alias
        ink: 'bg-ink text-white hover:bg-ink-2 shadow-soft',
      },
      size: {
        sm: 'h-8 px-3 text-[12.5px] rounded-md',
        md: 'h-9 px-4 text-[13px] rounded-md',
        lg: 'h-11 px-5 text-[14px] rounded-lg',
        icon: 'h-9 w-9 rounded-md',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
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

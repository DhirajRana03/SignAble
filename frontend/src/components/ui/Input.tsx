import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Inputs use a sunken surface with hairline edge. Subtle inset shadow
 * to read as recessed instead of floating. Indigo focus glow.
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md bg-surface-2 px-3.5 py-2 text-[13.5px] text-ink',
        'border border-border-strong shadow-[inset_0_1px_2px_hsl(240_10%_10%/0.04)]',
        'placeholder:text-ink-4',
        'focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'transition-[border-color,box-shadow] duration-150',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[88px] w-full rounded-md bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-ink',
      'border border-border-strong shadow-[inset_0_1px_2px_hsl(240_10%_10%/0.04)]',
      'placeholder:text-ink-4',
      'focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus',
      'transition-[border-color,box-shadow] duration-150 resize-y',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block mb-2 text-[12.5px] font-medium text-ink-2 tracking-[-0.005em]',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

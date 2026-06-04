import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Inputs match app.definable.ai — paper container with strong hairline
 * border, terracotta focus ring (3px softer-tint). 13px text, 7×10 pad.
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-8 w-full rounded-sm bg-paper px-2.5 py-1.5 text-[13px] text-ink',
        'border border-border-strong',
        'placeholder:text-muted-2',
        'focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'transition-[border-color,box-shadow] duration-[120ms]',
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
      'flex min-h-[72px] w-full rounded-sm bg-paper px-2.5 py-2 text-[13px] text-ink',
      'border border-border-strong',
      'placeholder:text-muted-2',
      'focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus',
      'transition-[border-color,box-shadow] duration-[120ms] resize-y',
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
        'block mb-1.5 text-[11.5px] font-medium text-ink-3',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

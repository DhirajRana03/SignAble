import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-paper-deep px-3.5 py-2 text-sm text-ink',
        'placeholder:text-ink-mute',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-accent',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'transition-colors',
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
      'flex min-h-[80px] w-full rounded-md border border-border bg-paper-deep px-3.5 py-2.5 text-sm text-ink',
      'placeholder:text-ink-mute',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-accent',
      'transition-colors resize-y',
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
      className={cn('label-mono plain mb-1.5 block', className)}
      {...props}
    >
      {children}
    </label>
  );
}

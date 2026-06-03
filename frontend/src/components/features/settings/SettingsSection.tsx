import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Chapter-style section header. Roman numeral floats above the rule.
 * Always pair with a SettingsSection for consistent rhythm.
 */
export function SettingsSection({
  roman,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  roman: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={eyebrow.toLowerCase()}
      className={cn('space-y-6 animate-fade-up', className)}
    >
      <header className="relative pb-6 border-b border-border">
        <div className="absolute -top-3 left-0 flex items-center gap-3">
          <span className="font-display italic text-accent text-sm bg-paper px-2">
            {roman}
          </span>
          <span className="label-mono bg-paper pr-2">{eyebrow}</span>
        </div>
        <h2 className="font-display text-3xl tracking-tight pt-6">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-ink-soft max-w-2xl text-pretty">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/**
 * Subdivides a section. Smaller rule, optional trailing action area.
 */
export function SettingsRow({
  label,
  description,
  action,
  children,
  className,
}: {
  label?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-3 gap-6 py-6 border-b border-border last:border-0',
        className,
      )}
    >
      <div className="lg:col-span-1 space-y-1">
        {label ? (
          <p className="font-display tracking-tight text-base">{label}</p>
        ) : null}
        {description ? (
          <p className="text-xs text-ink-soft text-pretty">{description}</p>
        ) : null}
      </div>
      <div className="lg:col-span-2 space-y-4">
        {children}
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}

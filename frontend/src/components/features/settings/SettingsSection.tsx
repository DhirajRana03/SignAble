import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Chapter-style section header. Borderless. Eyebrow + display title +
 * hairline rule below.
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
      className={cn('space-y-8 animate-fade-up', className)}
    >
      <header>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="font-display italic text-accent text-sm">{roman}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
            {eyebrow}
          </span>
        </div>
        <h2 className="font-display tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-3 text-base text-ink-soft max-w-2xl text-pretty leading-relaxed">
            {description}
          </p>
        ) : null}
        <div className="rule mt-8" />
      </header>
      {children}
    </section>
  );
}

/**
 * Settings row with label gutter + content. Borderless dividers.
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
        'grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 py-8 border-b border-border-soft last:border-0',
        className,
      )}
    >
      <div className="lg:col-span-1 space-y-1.5">
        {label ? (
          <p className="font-display text-lg tracking-tight">{label}</p>
        ) : null}
        {description ? (
          <p className="text-sm text-ink-soft text-pretty leading-relaxed max-w-xs">
            {description}
          </p>
        ) : null}
      </div>
      <div className="lg:col-span-2 space-y-4">
        {children}
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}

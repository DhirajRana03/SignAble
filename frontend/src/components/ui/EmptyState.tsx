import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-20 text-center animate-fade-up',
        className,
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 -m-4 rounded-full bg-accent/8 blur-2xl" />
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          fill="none"
          className="relative text-ink-mute"
        >
          <rect
            x="10"
            y="6"
            width="36"
            height="44"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="hsl(var(--paper-dim))"
          />
          <line x1="16" y1="16" x2="40" y2="16" stroke="currentColor" strokeWidth="0.8" />
          <line x1="16" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="0.8" />
          <line x1="16" y1="28" x2="38" y2="28" stroke="currentColor" strokeWidth="0.8" />
          <path
            d="M16 38 Q22 32 30 38 T44 36"
            stroke="hsl(var(--accent))"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className="font-display text-2xl tracking-tight">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-ink-soft text-pretty leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

'use client';

import { Menu } from 'lucide-react';

export function Topbar({
  title,
  eyebrow,
  actions,
  onMenuClick,
  wide = false,
}: {
  title: string;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
  wide?: boolean;
}) {
  return (
    <header className="shrink-0 z-20 bg-surface-0/70 backdrop-blur-lg backdrop-saturate-150">
      <div
        className={
          wide
            ? 'flex h-16 items-center gap-3 px-3 md:px-5 lg:px-6 pt-3'
            : 'flex h-16 items-center gap-3 px-5 md:px-8 lg:px-12 pt-3'
        }
      >
        {onMenuClick ? (
          <button
            onClick={onMenuClick}
            className="md:hidden h-8 w-8 grid place-items-center rounded-md text-ink-3 hover:bg-surface-sunken hover:text-ink"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3 hidden sm:block leading-none mb-1">
              {eyebrow}
            </div>
          ) : null}
          {title ? (
            <h1 className="truncate text-[17px] font-semibold tracking-[-0.022em] text-ink leading-tight">
              {title}
            </h1>
          ) : null}
        </div>

        {actions ? (
          <div className="hidden sm:flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="rule-soft" />
    </header>
  );
}

'use client';

import { Menu } from 'lucide-react';

export function Topbar({
  title,
  eyebrow,
  actions,
  onMenuClick,
}: {
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 bg-surface-0/70 backdrop-blur-lg backdrop-saturate-150">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6 lg:px-8 pt-3">
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
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3 hidden sm:block leading-none mb-1">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.022em] text-ink leading-tight">
            {title}
          </h1>
        </div>

        {actions ? (
          <div className="hidden sm:flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="rule-soft" />
    </header>
  );
}

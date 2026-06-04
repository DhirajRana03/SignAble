'use client';

import { LogOut, Menu, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { cn, initials } from '@/lib/utils';

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
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-surface-0/70 backdrop-blur-lg backdrop-saturate-150">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6 lg:px-8">
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

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>

          <Link href="/envelopes/new">
            <Button variant="accent" size="sm">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New envelope</span>
            </Button>
          </Link>

          <div className="relative ml-1">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className={cn(
                'h-9 w-9 grid place-items-center rounded-pill text-[11px] font-semibold uppercase tracking-tight transition-all',
                menuOpen
                  ? 'bg-accent text-white'
                  : 'bg-surface-sunken text-ink-2 hover:bg-surface-1 hover:text-ink',
              )}
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              {user ? initials(user.name) : '?'}
            </button>
            {menuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 z-20 w-64 glass-strong shadow-popover animate-scale-in origin-top-right p-1.5">
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] font-medium truncate text-ink">
                      {user?.name}
                    </p>
                    <p className="text-[11.5px] text-ink-3 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="rule-soft my-1" />

                  <div className="px-3 py-2 sm:hidden">
                    <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3 mb-2">
                      Theme
                    </p>
                    <ThemeToggle />
                    <div className="rule-soft mt-2.5" />
                  </div>

                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] text-ink-2 hover:bg-surface-sunken hover:text-ink transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="rule-soft" />
    </header>
  );
}

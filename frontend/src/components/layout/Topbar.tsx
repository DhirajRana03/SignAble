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
    <header className="sticky top-0 z-20 border-b border-border bg-paper/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 sm:gap-4 px-4 md:px-6 lg:px-10">
        {/* Mobile menu trigger */}
        {onMenuClick ? (
          <button
            onClick={onMenuClick}
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-md border border-border bg-paper-deep text-ink-faint hover:bg-paper-dim hover:text-ink hover:border-accent-soft transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="label-mono mb-0.5 hidden sm:block">{eyebrow}</p>
          ) : null}
          <h1 className="truncate font-display text-lg sm:text-xl tracking-tight">
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

          <div className="relative ml-1 sm:ml-2">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-pill border bg-paper-deep text-xs font-mono uppercase tracking-wider transition-all',
                menuOpen
                  ? 'border-accent text-accent-deep bg-accent-tint'
                  : 'border-border text-ink-soft hover:border-accent-soft hover:text-ink hover:-translate-y-px',
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
                <div
                  className={cn(
                    'absolute right-0 top-11 z-20 w-56 sheet animate-scale-in origin-top-right p-1',
                  )}
                >
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-ink-soft truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* Theme toggle inside menu on mobile */}
                  <div className="px-3 py-2 sm:hidden border-b border-border">
                    <p className="label-mono mb-2">Theme</p>
                    <ThemeToggle />
                  </div>

                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink-soft hover:bg-paper-dim hover:text-ink"
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
    </header>
  );
}

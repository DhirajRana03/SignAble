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
    <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur-md border-b border-border-soft">
      <div className="flex h-12 items-center gap-2 px-3 md:px-5 lg:px-7">
        {onMenuClick ? (
          <button
            onClick={onMenuClick}
            className="md:hidden h-7 w-7 grid place-items-center rounded-sm text-muted hover:bg-ivory-2 hover:text-ink"
            aria-label="Open navigation"
          >
            <Menu className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[10.5px] uppercase tracking-[0.09em] text-muted hidden sm:block leading-none mb-0.5">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="truncate text-[15px] font-semibold text-ink leading-tight">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1.5">
            {actions}
            <ThemeToggle />
          </div>

          <Link href="/envelopes/new">
            <Button variant="primary" size="sm">
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">New envelope</span>
            </Button>
          </Link>

          <div className="relative ml-1">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className={cn(
                'h-7 w-7 grid place-items-center rounded-sm text-[10px] font-medium uppercase tracking-wide transition-colors',
                menuOpen
                  ? 'item-active text-ink'
                  : 'text-ink-3 hover:bg-ivory-2 hover:text-ink',
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
                <div className="absolute right-0 top-9 z-20 w-56 card shadow-popover animate-scale-in p-1">
                  <div className="px-2.5 py-2 border-b border-border-soft">
                    <p className="text-[12.5px] font-medium truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="px-2.5 py-2 sm:hidden border-b border-border-soft">
                    <p className="text-[10.5px] uppercase tracking-[0.09em] text-muted mb-1.5">
                      Theme
                    </p>
                    <ThemeToggle />
                  </div>

                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-[12.5px] text-ink-3 hover:bg-ivory-2 hover:text-ink"
                  >
                    <LogOut className="h-3 w-3" />
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

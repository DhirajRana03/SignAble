'use client';

import {
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  Settings,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/envelopes', label: 'Envelopes', icon: Mail },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
];

/**
 * Sidebar renders inline at md+ and as a slide-over drawer below.
 * Controlled `open` only matters for mobile breakpoints.
 */
export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname() ?? '/';

  // Lock body scroll while mobile drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const navContent = (
    <div className="flex flex-1 flex-col p-5">
      <div className="mb-10 px-2 flex items-center justify-between">
        <Link href="/" onClick={onClose}>
          <Logo />
        </Link>
        {onClose ? (
          <button
            onClick={onClose}
            className="md:hidden h-8 w-8 flex items-center justify-center rounded-sm text-ink-faint hover:bg-paper-dim hover:text-ink"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="px-2 mb-4">
        <span className="label-mono">Workspace</span>
      </div>

      <nav className="space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-ink text-paper shadow-paper'
                  : 'text-ink-soft hover:bg-paper-deep/40 hover:text-ink',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  active ? 'text-paper' : 'text-ink-faint',
                )}
              />
              <span>{item.label}</span>
              {active ? (
                <span className="ml-auto h-1 w-1 rounded-full bg-accent" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 space-y-3">
        <div className="rule" />
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-2 text-xs text-ink-faint hover:text-ink"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
        <p className="label-mono">v0.2 · beta</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: persistent column */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 border-r border-border bg-paper-dim/40 backdrop-blur-sm">
        {navContent}
      </aside>

      {/* Mobile: drawer */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85vw] flex border-r border-border bg-paper transition-transform shadow-sheet',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {navContent}
        </aside>
      </div>
    </>
  );
}

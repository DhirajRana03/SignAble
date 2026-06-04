'use client';

import {
  Archive,
  CheckCircle2,
  FileEdit,
  Inbox,
  LayoutDashboard,
  LogOut,
  Send,
  Settings,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { cn, initials } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/sent', label: 'Sent for Signature', icon: Send },
  { href: '/completed', label: 'Completed', icon: CheckCircle2 },
  { href: '/drafts', label: 'Drafts', icon: FileEdit },
  { href: '/archive', label: 'Archive', icon: Archive },
];

/**
 * Sidebar: no fill column. Items are pill-shaped nav rows that gain
 * accent-soft fill + accent-deep text when active. Larger icons (16px),
 * proper spacing, no enclosing box.
 */
export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname() ?? '/';
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const inner = (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-5 pb-6 flex items-center justify-between">
        <Link href="/" onClick={onClose}>
          <Logo />
        </Link>
        {onClose ? (
          <button
            onClick={onClose}
            className="md:hidden h-8 w-8 grid place-items-center rounded-md text-ink-3 hover:bg-surface-sunken hover:text-ink"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="px-4 pt-1 pb-2">
        <span className="eyebrow">Workspace</span>
      </div>

      <nav className="px-2 py-1 flex flex-col gap-0.5">
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
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-md pl-3 pr-3 py-2 text-[14px]',
                'transition-all duration-200 ease-out',
                active
                  ? 'bg-accent-soft text-accent-deep font-medium translate-x-0.5'
                  : 'text-ink-2 hover:bg-surface-sunken/70 hover:text-ink hover:translate-x-0.5',
              )}
            >
              {/* Active rail — animates in with scaleY */}
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-pill bg-accent',
                  'origin-center transition-transform duration-200 ease-out',
                  active ? 'scale-y-100' : 'scale-y-0',
                )}
              />
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-all duration-200',
                  active
                    ? 'text-accent-deep scale-110'
                    : 'text-ink-3 group-hover:text-ink-2 group-hover:scale-105',
                )}
                strokeWidth={2}
              />
              <span className="tracking-[-0.005em] truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4 pt-2 relative">
        <button
          type="button"
          onClick={() => setProfileOpen((s) => !s)}
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          aria-label="Open account menu"
          className={cn(
            'w-full flex items-center gap-2.5 rounded-md px-2 py-2',
            'border transition-colors duration-150',
            profileOpen
              ? 'border-accent/40 bg-transparent'
              : 'border-transparent hover:bg-surface-sunken/70',
          )}
        >
          <span
            className={cn(
              'h-10 w-10 grid place-items-center rounded-full shrink-0',
              'text-[12px] font-semibold uppercase tracking-tight text-white',
              'bg-accent shadow-paper ring-2 ring-paper',
              'transition-transform duration-150 ease-out',
              profileOpen ? 'scale-105 bg-accent-deep' : 'group-hover:scale-105',
            )}
          >
            {user ? initials(user.name) : '?'}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[12.5px] font-medium text-ink truncate leading-tight">
              {user?.name ?? 'Account'}
            </p>
            <p className="text-[10.5px] text-ink-3 truncate">
              {user?.email ?? ''}
            </p>
          </div>
        </button>

        {profileOpen ? (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setProfileOpen(false)}
            />
            <div className="absolute bottom-full left-3 right-3 mb-2 z-20 glass-strong shadow-popover animate-scale-in origin-bottom p-1.5">
              <Link
                href="/settings"
                onClick={() => {
                  setProfileOpen(false);
                  onClose?.();
                }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-ink-2 hover:bg-surface-sunken hover:text-ink transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-ink-3" />
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-ink-2 hover:bg-surface-sunken hover:text-ink transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-ink-3" />
                Sign out
              </button>
              <div className="rule-soft my-1" />
              <div className="px-3 py-1.5 text-[10px] text-ink-4 font-mono">
                v0.3
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop column — transparent, shares mesh */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 bg-transparent">
        {inner}
      </aside>

      {/* Mobile drawer — glass */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity duration-150',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
          onClick={onClose}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[82vw] flex glass-strong transition-transform duration-150',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {inner}
        </aside>
      </div>
    </>
  );
}

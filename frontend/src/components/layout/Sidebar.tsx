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
 * Sidebar mirrors app.definable.ai `.sb` pattern:
 *   - cream bg shared with page
 *   - tight 13px nav items, 4–5px vertical padding
 *   - active state: paper chip + inset 1px line (never coral fill)
 *   - section labels: 10.5px uppercase 0.09em tracking
 */
export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname() ?? '/';

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
      <div className="px-3 pt-4 pb-3 flex items-center justify-between">
        <Link href="/" onClick={onClose}>
          <Logo />
        </Link>
        {onClose ? (
          <button
            onClick={onClose}
            className="md:hidden h-7 w-7 grid place-items-center rounded-sm text-muted hover:bg-ivory-2 hover:text-ink"
            aria-label="Close menu"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="px-3 pt-2 pb-1">
        <span className="sect-label">Workspace</span>
      </div>

      <nav className="px-2 py-1 flex flex-col gap-[1px]">
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
                'flex items-center gap-2.5 rounded-sm px-2 py-[5px] text-[13px] transition-colors duration-[120ms]',
                active
                  ? 'item-active font-medium'
                  : 'text-ink-3 hover:bg-ivory-2 hover:text-ink',
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  active ? 'text-ink' : 'text-muted',
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border-soft px-3 py-2 flex items-center justify-between">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-1.5 text-[11.5px] text-muted hover:text-ink"
        >
          <Settings className="h-3 w-3" />
          Settings
        </Link>
        <span className="text-[10px] text-muted-2 font-mono">v0.3</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop column — shares cream surface */}
      <aside className="hidden md:flex md:w-56 lg:w-60 shrink-0 border-r border-border-soft bg-cream">
        {inner}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity duration-[140ms]',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-64 max-w-[80vw] flex bg-cream border-r border-border-soft transition-transform duration-[140ms]',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {inner}
        </aside>
      </div>
    </>
  );
}

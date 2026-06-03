'use client';

import { FileText, Inbox, LayoutDashboard, Mail, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/envelopes', label: 'Envelopes', icon: Mail },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
];

export function Sidebar() {
  const pathname = usePathname() ?? '/';

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 border-r border-border bg-paper-dim/40 backdrop-blur-sm">
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-10 px-2">
          <Link href="/">
            <Logo />
          </Link>
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
            className="flex items-center gap-2 text-xs text-ink-faint hover:text-ink"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          <p className="label-mono">v0.1 · beta</p>
        </div>
      </div>
    </aside>
  );
}

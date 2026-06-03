'use client';

import { useState, type ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Borderless sidebar + topbar shell. Content area carries its own max-width.
 * No box separators between sidebar and main — they share the same paper.
 */
export function DashboardShell({
  title,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={title}
          eyebrow={eyebrow}
          actions={actions}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 px-4 md:px-8 lg:px-12 xl:px-16 py-8 lg:py-12">
          <div className="max-w-[1180px]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

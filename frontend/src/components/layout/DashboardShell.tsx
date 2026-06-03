'use client';

import { useState, type ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Composes Sidebar + Topbar + main content scroll region.
 * Holds mobile drawer state; rest of children unaware of breakpoint.
 * Content wrapped in ErrorBoundary so feature crashes do not blank the shell.
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
    <div className="flex min-h-screen">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={title}
          eyebrow={eyebrow}
          actions={actions}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 px-4 md:px-6 lg:px-10 py-6 md:py-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

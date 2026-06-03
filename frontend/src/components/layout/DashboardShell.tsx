import type { ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Composes Sidebar + Topbar + main content scroll region.
 * Pure structural component — no data, no logic. Content wrapped in
 * ErrorBoundary so a feature crash doesn't blank the shell.
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
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} eyebrow={eyebrow} actions={actions} />
        <main className="flex-1 px-6 lg:px-10 py-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

'use client';

import { useState, type ReactNode } from 'react';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

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
    <div className="flex min-h-screen bg-cream">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={title}
          eyebrow={eyebrow}
          actions={actions}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 lg:py-8">
          <div className="max-w-[920px]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

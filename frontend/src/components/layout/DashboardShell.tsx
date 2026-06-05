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
  wide = false,
}: {
  title: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar
          title={title}
          eyebrow={eyebrow}
          actions={actions}
          onMenuClick={() => setDrawerOpen(true)}
          wide={wide}
        />
        <main
          className={
            wide
              ? 'flex-1 overflow-y-auto px-3 md:px-5 lg:px-6 py-8 lg:py-10'
              : 'flex-1 overflow-y-auto px-5 md:px-8 lg:px-12 py-8 lg:py-10'
          }
        >
          <div className={wide ? 'w-full' : 'max-w-[1080px]'}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

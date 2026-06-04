'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ComposerGuardModal } from '@/components/features/envelopes/ComposerGuardModal';
import { useAuthStore } from '@/store/authStore';

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace('/login');
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="label-mono animate-pulse">loading</span>
      </div>
    );
  }
  return (
    <>
      {children}
      <ComposerGuardModal />
    </>
  );
}

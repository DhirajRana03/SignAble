'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

import { configureApiClient } from '@/services/api-client';
import { useAuthStore } from '@/store/authStore';

/**
 * Root client providers: TanStack Query + token wiring + toast portal.
 * api-client receives a token-getter callback so it stays decoupled from Zustand.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    configureApiClient({
      getToken: () => useAuthStore.getState().accessToken,
      onUnauthorized: () => {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          // Avoid bounce loop on /sign/* public routes
          if (!window.location.pathname.startsWith('/sign')) {
            window.location.replace('/login');
          }
        }
      },
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'font-sans',
          style: {
            background: 'hsl(var(--paper))',
            color: 'hsl(var(--ink))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '4px',
          },
        }}
      />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

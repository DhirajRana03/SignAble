import type { ReactNode } from 'react';

import { Logo } from '@/components/ui/Logo';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative grid + serif ornament */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--ink)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--ink)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-12 flex items-center justify-between">
          <Logo />
          <span className="label-mono">est. mmxxv</span>
        </div>

        <div className="sheet animate-fade-up p-8">
          <div className="mb-8 space-y-2">
            <h1 className="font-display text-3xl tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-ink-soft text-pretty">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? (
          <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
        ) : null}

        <div className="mt-12 text-center label-mono">
          a more intentional way to sign
        </div>
      </div>
    </div>
  );
}

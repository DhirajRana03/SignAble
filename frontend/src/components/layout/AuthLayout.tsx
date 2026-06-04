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
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="px-6 py-5">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-[22px] font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 text-[13px] text-muted">{subtitle}</p>
            ) : null}
          </div>

          <div className="rounded-md bg-paper border border-border p-6">
            {children}
          </div>

          {footer ? (
            <p className="mt-4 text-center text-[12.5px] text-muted">{footer}</p>
          ) : null}
        </div>
      </div>

      <div className="px-6 py-4 text-center">
        <span className="text-[10.5px] font-mono uppercase tracking-[0.09em] text-muted-2">
          SinAble
        </span>
      </div>
    </div>
  );
}

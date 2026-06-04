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
    <div className="min-h-screen flex flex-col">
      <div className="px-6 py-5">
        <Logo />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-[26px] font-semibold tracking-[-0.028em] text-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-[14px] text-ink-3 leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="glass-strong p-7">{children}</div>

          {footer ? (
            <p className="mt-5 text-center text-[13px] text-ink-3">{footer}</p>
          ) : null}
        </div>
      </div>

      <div className="px-6 py-5 text-center">
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-4">
          SignAble
        </span>
      </div>
    </div>
  );
}

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
    <div className="relative min-h-screen overflow-hidden bg-paper">
      {/* Coral aurora — radial glows like definable.ai hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 40% at 88% 8%, hsl(var(--accent) / 0.14) 0%, transparent 100%), radial-gradient(35% 30% at 8% 92%, hsl(var(--accent) / 0.08) 0%, transparent 100%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-16 flex items-center justify-between">
          <Logo />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-mute">
            est. mmxxv
          </span>
        </div>

        {/* Borderless form area — no box, no card */}
        <div className="animate-fade-up">
          <div className="mb-10 space-y-3">
            <h1 className="font-display text-[clamp(34px,4vw,52px)] font-medium leading-[1.02] tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-base text-ink-soft text-pretty leading-relaxed max-w-sm">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? (
          <div className="mt-8 text-sm text-ink-soft">{footer}</div>
        ) : null}

        <div className="mt-16">
          <span className="font-display italic text-sm text-ink-mute">
            a more intentional way to sign.
          </span>
        </div>
      </div>
    </div>
  );
}

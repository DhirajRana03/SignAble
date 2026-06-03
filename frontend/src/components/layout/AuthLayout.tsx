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
      {/* Soft grid texture — almost invisible, gives paper depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--ink)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--ink)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Coral aurora — definable-style radial glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(45% 35% at 90% 5%, hsl(var(--accent) / 0.14) 0%, transparent 100%), radial-gradient(30% 30% at 5% 95%, hsl(var(--accent) / 0.08) 0%, transparent 100%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-12 flex items-center justify-between">
          <Logo />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-mute">
            est. mmxxv
          </span>
        </div>

        <div className="sheet rounded-lg p-8 lg:p-10 shadow-paper animate-fade-up">
          <div className="mb-8 space-y-2">
            <h1 className="font-display text-[clamp(28px,3vw,38px)] font-medium leading-tight tracking-tight text-ink">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-sm text-ink-soft text-pretty leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? (
          <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
        ) : null}

        <div className="mt-12 text-center">
          <span className="font-display italic text-sm text-ink-mute">
            a more intentional way to sign.
          </span>
        </div>
      </div>
    </div>
  );
}

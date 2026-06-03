'use client';

import { ArrowUpRight, FileText, MailCheck, MailOpen, Send } from 'lucide-react';
import Link from 'next/link';

import { EnvelopeCard } from '@/components/features/envelopes/EnvelopeCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { useDocuments } from '@/hooks/useDocuments';
import { useEnvelopes } from '@/hooks/useEnvelopes';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const envelopes = useEnvelopes();
  const docs = useDocuments();

  const env = envelopes.data ?? [];
  const stats = {
    drafts: env.filter((e) => e.status === 'DRAFT').length,
    inFlight: env.filter((e) =>
      ['SENT', 'IN_PROGRESS'].includes(e.status),
    ).length,
    completed: env.filter((e) => e.status === 'COMPLETED').length,
    documents: docs.data?.length ?? 0,
  };

  const recent = env.slice(0, 6);

  return (
    <DashboardShell
      eyebrow={`Hello, ${user?.name?.split(' ')[0] ?? 'there'}`}
      title="Today, signed with intent."
    >
      <div className="max-w-7xl space-y-12">
        {/* Editorial hero — coral aurora + Playfair display */}
        <section className="relative overflow-hidden rounded-lg border border-border bg-paper-deep px-8 py-12 lg:px-12 lg:py-16 shadow-paper">
          {/* Background composition */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 50% at 18% 0%, hsl(var(--accent) / 0.12) 0%, transparent 100%), radial-gradient(50% 40% at 82% 18%, hsl(var(--accent) / 0.08) 0%, transparent 100%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -bottom-32 h-80 w-80 rounded-pill bg-accent/10 blur-3xl"
          />

          <div className="relative max-w-3xl">
            <Link
              href="/envelopes/new"
              className="inline-flex items-center gap-2 rounded-pill border border-border bg-paper-deep py-1 pl-1 pr-3.5 text-[12.5px] text-ink-soft shadow-xs transition-all hover:-translate-y-px hover:border-accent-soft"
            >
              <span className="rounded-pill bg-accent-tint px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.05em] text-accent-deep">
                New
              </span>
              <span>Send an envelope in under a minute</span>
              <ArrowUpRight className="h-3 w-3 text-ink-faint" />
            </Link>

            <h1 className="mt-7 font-display text-[clamp(40px,5vw,68px)] font-medium leading-[1.02] tracking-tight text-balance text-ink">
              Sign with intent.{' '}
              <em className="italic-accent block sm:inline">
                Let the rest follow.
              </em>
            </h1>

            <p className="mt-6 max-w-xl text-base lg:text-lg leading-relaxed text-ink-soft text-pretty">
              Upload a document, route it through the right hands, and watch
              every signature land — with audit and finalization handled for
              you.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/envelopes/new">
                <Button variant="primary" size="lg">
                  <Send className="h-3.5 w-3.5" /> Start an envelope
                </Button>
              </Link>
              <Link href="/documents">
                <Button variant="secondary" size="lg">
                  <FileText className="h-3.5 w-3.5" /> Upload a document
                </Button>
              </Link>
            </div>

            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
              Edition · {new Date().getFullYear()} · {env.length} envelope
              {env.length === 1 ? '' : 's'} in your workspace
            </p>
          </div>
        </section>

        {/* Stat strip — definable-style 4-column with hairline dividers */}
        <section className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-md border border-border bg-paper-deep shadow-xs">
          <StatCell label="Documents" value={stats.documents} icon={FileText} />
          <StatCell label="Drafts" value={stats.drafts} icon={MailOpen} />
          <StatCell
            label="In flight"
            value={stats.inFlight}
            icon={Send}
            highlight
          />
          <StatCell
            label="Completed"
            value={stats.completed}
            icon={MailCheck}
            last
          />
        </section>

        {/* Recent envelopes */}
        <section className="space-y-5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="label-mono mb-2">Workspace</p>
              <h2 className="font-display text-2xl tracking-tight">
                Recent envelopes
              </h2>
            </div>
            <Link
              href="/envelopes"
              className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute transition-colors hover:text-accent-deep"
            >
              View all
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="sheet rounded-md p-10 text-center">
              <p className="font-display text-xl tracking-tight">
                A blank page.{' '}
                <em className="italic-accent">A clean start.</em>
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Send your first envelope above to fill this space.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((e, i) => (
                <EnvelopeCard key={e.id} envelope={e} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function StatCell({
  label,
  value,
  icon: Icon,
  highlight,
  last,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative px-6 py-7 transition-colors',
        !last && 'md:border-r border-border',
        highlight && 'bg-accent-tint/40',
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
          {label}
        </span>
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            highlight ? 'text-accent-deep' : 'text-ink-faint',
          )}
        />
      </div>
      <div
        className={cn(
          'font-display font-medium leading-none tracking-tight',
          'text-[clamp(32px,3.6vw,48px)]',
          highlight ? 'text-accent-deep' : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );
}

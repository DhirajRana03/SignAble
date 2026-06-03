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
      title="Today"
    >
      <div className="space-y-24 lg:space-y-32 pb-16">
        {/* Hero — no box. Full bleed, generous space, coral aurora behind. */}
        <section className="relative pt-8 lg:pt-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -top-20"
            style={{
              background:
                'radial-gradient(45% 35% at 12% 0%, hsl(var(--accent) / 0.10) 0%, transparent 100%), radial-gradient(35% 30% at 88% 18%, hsl(var(--accent) / 0.06) 0%, transparent 100%)',
            }}
          />

          <div className="relative max-w-3xl">
            <Link
              href="/envelopes/new"
              className="group inline-flex items-center gap-2.5 text-[12.5px] text-ink-soft hover:text-ink transition-colors"
            >
              <span className="rounded-pill bg-accent-tint px-2.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.05em] text-accent-deep">
                New
              </span>
              <span>Send an envelope in under a minute</span>
              <ArrowUpRight className="h-3 w-3 text-ink-faint group-hover:text-accent-deep group-hover:translate-x-px group-hover:-translate-y-px transition-all" />
            </Link>

            <h1 className="mt-8 font-display font-medium leading-[0.98] tracking-tight text-balance">
              Sign with intent.{' '}
              <em className="italic-accent block sm:inline">
                Let the rest follow.
              </em>
            </h1>

            <p className="lede mt-7">
              Upload a document, route it through the right hands, watch every
              signature land — with audit and finalization handled for you.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/envelopes/new">
                <Button variant="primary" size="lg">
                  <Send className="h-3.5 w-3.5" /> Start an envelope
                </Button>
              </Link>
              <Link href="/documents">
                <Button variant="secondary" size="lg">
                  Upload a document
                </Button>
              </Link>
            </div>

            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
              Edition · {new Date().getFullYear()} · {env.length} envelope
              {env.length === 1 ? '' : 's'} in your workspace
            </p>
          </div>
        </section>

        {/* Stats — definable signature. Hairline dividers, no box. */}
        <section>
          <div className="rule" />
          <div className="grid grid-cols-2 md:grid-cols-4">
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
          </div>
          <div className="rule" />
        </section>

        {/* Recent envelopes — list, not grid of boxes */}
        <section>
          <div className="flex items-baseline justify-between mb-10">
            <div>
              <span className="eyebrow">Workspace</span>
              <h2 className="mt-3">Recent envelopes</h2>
            </div>
            <Link
              href="/envelopes"
              className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint hover:text-accent-deep transition-colors"
            >
              View all
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-2xl tracking-tight max-w-md mx-auto">
                A blank page.{' '}
                <em className="italic-accent">A clean start.</em>
              </p>
              <p className="mt-3 text-sm text-ink-soft">
                Send your first envelope above to fill this space.
              </p>
            </div>
          ) : (
            <div>
              <div className="rule" />
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
        'relative py-8 lg:py-10 px-2',
        !last && 'md:border-r border-border-soft',
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          {label}
        </span>
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            highlight ? 'text-accent-deep' : 'text-ink-mute',
          )}
        />
      </div>
      <div
        className={cn(
          'font-display font-medium leading-none tracking-tight',
          'text-[clamp(40px,4vw,56px)]',
          highlight ? 'text-accent-deep' : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );
}

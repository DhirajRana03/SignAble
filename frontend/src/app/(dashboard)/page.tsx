'use client';

import { FileText, MailCheck, MailOpen, Send } from 'lucide-react';
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
      <div className="max-w-7xl space-y-10">
        {/* Editorial hero with drop cap */}
        <section className="sheet p-8 lg:p-10 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <p className="label-mono mb-3">Volume I · Issue {new Date().getFullYear()}</p>
            <p className="font-display text-3xl lg:text-4xl tracking-tight leading-tight text-balance">
              A signature is{' '}
              <span className="italic text-accent">consent made visible</span>.
              Send your next one with the gravity it deserves.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/envelopes/new">
                <Button variant="accent">
                  <Send className="h-3.5 w-3.5" /> Start an envelope
                </Button>
              </Link>
              <Link href="/documents">
                <Button variant="secondary">
                  <FileText className="h-3.5 w-3.5" /> Upload a document
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats — newspaper-column layout */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
          <StatCard label="Documents" value={stats.documents} icon={FileText} />
          <StatCard label="Drafts" value={stats.drafts} icon={MailOpen} />
          <StatCard label="In flight" value={stats.inFlight} icon={Send} accent />
          <StatCard label="Completed" value={stats.completed} icon={MailCheck} />
        </section>

        {/* Recent envelopes */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl tracking-tight">
              Recent envelopes
            </h2>
            <Link
              href="/envelopes"
              className="text-xs font-mono uppercase tracking-wider text-ink-faint hover:text-accent"
            >
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="sheet p-10 text-center text-sm text-ink-soft">
              No envelopes yet. Send your first one above.
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

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  accent?: boolean;
}) {
  return (
    <div className={cn('bg-paper p-6', accent && 'bg-paper-dim')}>
      <div className="flex items-center justify-between mb-3">
        <span className="label-mono">{label}</span>
        <Icon
          className={cn(
            'h-3.5 w-3.5',
            accent ? 'text-accent' : 'text-ink-faint',
          )}
        />
      </div>
      <div className="font-display text-4xl tracking-tight">{value}</div>
    </div>
  );
}

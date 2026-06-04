'use client';

import { FileText, MailCheck, MailOpen, Send } from 'lucide-react';
import Link from 'next/link';

import { EnvelopeCard } from '@/components/features/envelopes/EnvelopeCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useDocuments } from '@/hooks/useDocuments';
import { useEnvelopes } from '@/hooks/useEnvelopes';
import { cn } from '@/lib/utils';

export default function DashboardHome() {
  const envelopes = useEnvelopes();
  const docs = useDocuments();

  const env = envelopes.data ?? [];
  const stats = [
    { label: 'Documents', value: docs.data?.length ?? 0, icon: FileText, href: '/documents' },
    { label: 'Drafts', value: env.filter((e) => e.status === 'DRAFT').length, icon: MailOpen, href: '/envelopes' },
    { label: 'In flight', value: env.filter((e) => ['SENT', 'IN_PROGRESS'].includes(e.status)).length, icon: Send, href: '/envelopes' },
    { label: 'Completed', value: env.filter((e) => e.status === 'COMPLETED').length, icon: MailCheck, href: '/envelopes' },
  ];

  const recent = env.slice(0, 6);

  return (
    <DashboardShell eyebrow="Workspace" title="Overview">
      <div className="space-y-8 pb-12">
        {/* Stat row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-sm bg-paper border border-border-soft px-3.5 py-3 hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] uppercase tracking-[0.09em] text-muted">
                  {s.label}
                </span>
                <s.icon className="h-3 w-3 text-muted-2" />
              </div>
              <div className={cn('text-[22px] font-semibold tracking-tight leading-none text-ink')}>
                {s.value}
              </div>
            </Link>
          ))}
        </section>

        {/* Recent envelopes */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2>Recent envelopes</h2>
            <Link
              href="/envelopes"
              className="text-[11.5px] text-muted hover:text-ink"
            >
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="rounded-sm bg-paper border border-border-soft p-8 text-center">
              <p className="text-[13px] text-ink mb-1">No envelopes yet</p>
              <p className="text-[11.5px] text-muted">
                Send your first envelope to fill this space.
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

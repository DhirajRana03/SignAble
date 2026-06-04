'use client';

import {
  ArrowUpRight,
  FileText,
  MailCheck,
  MailOpen,
  Plus,
  Send,
} from 'lucide-react';
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
  const stats: Array<{
    label: string;
    value: number;
    icon: typeof FileText;
    href: string;
    tone: 'indigo' | 'amber' | 'rose' | 'emerald';
  }> = [
    {
      label: 'Documents',
      value: docs.data?.length ?? 0,
      icon: FileText,
      href: '/documents',
      tone: 'indigo',
    },
    {
      label: 'Drafts',
      value: env.filter((e) => e.status === 'DRAFT').length,
      icon: MailOpen,
      href: '/drafts',
      tone: 'amber',
    },
    {
      label: 'In flight',
      value: env.filter((e) => ['SENT', 'IN_PROGRESS'].includes(e.status)).length,
      icon: Send,
      href: '/sent',
      tone: 'rose',
    },
    {
      label: 'Completed',
      value: env.filter((e) => e.status === 'COMPLETED').length,
      icon: MailCheck,
      href: '/completed',
      tone: 'emerald',
    },
  ];

  const recent = env.slice(0, 5);

  return (
    <DashboardShell
      eyebrow={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
      title="Dashboard"
    >
      <div className="space-y-8 pb-16">
        {/* Hero CTA */}
        <Link
          href="/envelopes/new"
          className="group glass flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lifted"
        >
          <span className="h-11 w-11 grid place-items-center rounded-md bg-accent text-white shrink-0 group-hover:scale-105 transition-transform">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-ink leading-tight">
              New envelope
            </p>
            <p className="text-[12px] text-ink-3 mt-0.5">
              Upload a document and route it for signature.
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-ink-4 group-hover:text-accent-deep group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </Link>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <StatTile key={s.label} {...s} index={i} />
          ))}
        </section>

        {/* Recent envelopes */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <span className="eyebrow">Recently</span>
              <h2 className="mt-1.5">Envelopes in flight</h2>
            </div>
            <Link href="/envelopes">
              <Button variant="ghost" size="sm">
                View all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="glass p-10 text-center">
              <p className="text-[14px] text-ink-3">
                No envelopes yet. Use the button above to create one.
              </p>
            </div>
          ) : (
            <div className="glass overflow-hidden">
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

function StatTile({
  label,
  value,
  icon: Icon,
  href,
  tone,
  index,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  href: string;
  tone: 'indigo' | 'amber' | 'rose' | 'emerald';
  index: number;
}) {
  const toneClass: Record<string, string> = {
    indigo: 'from-indigo-100/70 to-violet-100/40 text-indigo-600',
    amber: 'from-amber-100/70 to-orange-100/40 text-amber-700',
    rose: 'from-rose-100/70 to-pink-100/40 text-rose-600',
    emerald: 'from-emerald-100/70 to-teal-100/40 text-emerald-600',
  };

  return (
    <Link
      href={href}
      className="group glass p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lifted animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={cn(
            'h-9 w-9 grid place-items-center rounded-md bg-gradient-to-br',
            toneClass[tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-ink-4 group-hover:text-accent-deep group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
      <div className="text-[28px] font-semibold tracking-[-0.025em] leading-none text-ink">
        {value}
      </div>
      <p className="mt-1.5 text-[12px] text-ink-3 font-medium tracking-[-0.005em]">
        {label}
      </p>
    </Link>
  );
}

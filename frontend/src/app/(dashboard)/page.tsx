'use client';

import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  FileEdit,
  Inbox,
  type LucideIcon,
  Plus,
  Send,
} from 'lucide-react';
import Link from 'next/link';

import { ActivityFeed } from '@/components/features/dashboard/ActivityFeed';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useEnvelopes } from '@/hooks/useEnvelopes';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Envelope, EnvelopeStatus } from '@/types/envelope.types';

type Tone = 'indigo' | 'amber' | 'rose' | 'emerald' | 'slate';

interface NavCard {
  label: string;
  href: string;
  icon: LucideIcon;
  statuses: EnvelopeStatus[];
  tone: Tone;
}

const TONES: Record<Tone, string> = {
  indigo: 'from-indigo-100/70 to-violet-100/40 text-indigo-600',
  amber: 'from-amber-100/70 to-orange-100/40 text-amber-700',
  rose: 'from-rose-100/70 to-pink-100/40 text-rose-600',
  emerald: 'from-emerald-100/70 to-teal-100/40 text-emerald-600',
  slate: 'from-slate-100/70 to-zinc-100/40 text-slate-600',
};

const NAV_CARDS: NavCard[] = [
  {
    label: 'Inbox',
    href: '/inbox',
    icon: Inbox,
    statuses: ['SENT', 'IN_PROGRESS'],
    tone: 'indigo',
  },
  {
    label: 'Sent for Signature',
    href: '/sent',
    icon: Send,
    statuses: ['SENT', 'IN_PROGRESS'],
    tone: 'rose',
  },
  {
    label: 'Completed',
    href: '/completed',
    icon: CheckCircle2,
    statuses: ['COMPLETED'],
    tone: 'emerald',
  },
  {
    label: 'Drafts',
    href: '/drafts',
    icon: FileEdit,
    statuses: ['DRAFT'],
    tone: 'amber',
  },
  {
    label: 'Archive',
    href: '/archive',
    icon: Archive,
    statuses: ['VOIDED', 'EXPIRED'],
    tone: 'slate',
  },
];

function countByStatus(
  envelopes: Envelope[],
  statuses: EnvelopeStatus[],
): number {
  const set = new Set(statuses);
  return envelopes.filter((e) => set.has(e.status)).length;
}

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);
  const { data: envelopes = [] } = useEnvelopes();

  return (
    <DashboardShell
      eyebrow={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
      title="Dashboard"
    >
      <div className="space-y-8 pb-16">
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

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {NAV_CARDS.map((card, i) => (
            <NavTile
              key={card.href}
              card={card}
              count={countByStatus(envelopes, card.statuses)}
              index={i}
            />
          ))}
        </section>

        <ActivityFeed />
      </div>
    </DashboardShell>
  );
}

function NavTile({
  card,
  count,
  index,
}: {
  card: NavCard;
  count: number;
  index: number;
}) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      className="group glass p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lifted animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={cn(
            'h-9 w-9 grid place-items-center rounded-md bg-gradient-to-br',
            TONES[card.tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-ink-4 group-hover:text-accent-deep group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>
      <div className="text-[28px] font-semibold tracking-[-0.025em] leading-none text-ink">
        {count}
      </div>
      <p className="mt-1.5 text-[12px] text-ink-3 font-medium tracking-[-0.005em]">
        {card.label}
      </p>
    </Link>
  );
}

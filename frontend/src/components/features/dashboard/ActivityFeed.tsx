'use client';

import {
  CheckCircle2,
  Eye,
  FilePlus2,
  Send,
  Trash2,
  UserCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { useRecentActivity } from '@/hooks/useEnvelopes';
import { cn, formatRelative } from '@/lib/utils';
import type { ActivityItem, AuditEventType } from '@/types/envelope.types';

interface IconConfig {
  icon: LucideIcon;
  tone: string;
}

const EVENT_META: Record<AuditEventType, IconConfig> = {
  ENVELOPE_CREATED: { icon: FilePlus2, tone: 'bg-indigo-100 text-indigo-600' },
  ENVELOPE_SENT: { icon: Send, tone: 'bg-rose-100 text-rose-600' },
  ENVELOPE_RESENT: { icon: Send, tone: 'bg-rose-100 text-rose-600' },
  DOCUMENT_VIEWED: { icon: Eye, tone: 'bg-sky-100 text-sky-600' },
  RECIPIENT_SIGNED: { icon: UserCheck, tone: 'bg-emerald-100 text-emerald-600' },
  RECIPIENT_DECLINED: { icon: UserX, tone: 'bg-amber-100 text-amber-700' },
  ENVELOPE_COMPLETED: {
    icon: CheckCircle2,
    tone: 'bg-emerald-100 text-emerald-600',
  },
  ENVELOPE_VOIDED: { icon: Trash2, tone: 'bg-slate-100 text-slate-600' },
};

function describe(item: ActivityItem): string {
  const actor = item.actorEmail?.split('@')[0] ?? 'Someone';
  const title = `"${item.envelopeTitle}"`;
  switch (item.eventType) {
    case 'ENVELOPE_CREATED':
      return `You created ${title}`;
    case 'ENVELOPE_SENT':
      return `You sent ${title}`;
    case 'ENVELOPE_RESENT':
      return `You resent ${title}`;
    case 'DOCUMENT_VIEWED':
      return `${actor} viewed ${title}`;
    case 'RECIPIENT_SIGNED':
      return `${actor} signed ${title}`;
    case 'RECIPIENT_DECLINED':
      return `${actor} declined ${title}`;
    case 'ENVELOPE_COMPLETED':
      return `${title} was completed`;
    case 'ENVELOPE_VOIDED':
      return `${title} was voided`;
    default:
      return `${actor} updated ${title}`;
  }
}

const EVENT_LABEL: Record<AuditEventType, string> = {
  ENVELOPE_CREATED: 'Created',
  ENVELOPE_SENT: 'Sent',
  ENVELOPE_RESENT: 'Resent',
  DOCUMENT_VIEWED: 'Viewed',
  RECIPIENT_SIGNED: 'Signed',
  RECIPIENT_DECLINED: 'Declined',
  ENVELOPE_COMPLETED: 'Completed',
  ENVELOPE_VOIDED: 'Voided',
};

export function ActivityFeed() {
  const { data, isLoading } = useRecentActivity(15);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <span className="eyebrow">Recent activity</span>
          <h2 className="mt-1.5">What is happening</h2>
        </div>
        {data?.length ? (
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
            {data.length} events
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="glass px-4 py-3 h-14 animate-pulse flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-full bg-surface-sunken shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 bg-surface-sunken rounded-pill" />
                <div className="h-2.5 w-24 bg-surface-sunken rounded-pill" />
              </div>
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <div className="glass p-10 text-center">
          <p className="text-[14px] text-ink-3">
            No activity yet. Latest events appear here.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {data.map((item, i) => (
            <ActivityRow key={item.id} item={item} index={i} />
          ))}
        </ol>
      )}
    </section>
  );
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const meta = EVENT_META[item.eventType] ?? EVENT_META.ENVELOPE_CREATED;
  const Icon = meta.icon;
  const label = EVENT_LABEL[item.eventType] ?? item.eventType;
  const actor = item.actorEmail?.split('@')[0] ?? '';
  return (
    <li>
      <Link
        href={`/envelopes/${item.envelopeId}`}
        className={cn(
          'group glass flex items-center gap-4 px-4 py-3 animate-fade-up',
          'transition-all duration-200',
          'hover:border-accent/40 hover:shadow-lifted',
        )}
        style={{ animationDelay: `${index * 24}ms` }}
      >
        <span
          className={cn(
            'h-9 w-9 grid place-items-center rounded-full shrink-0 ring-1 ring-white/60',
            meta.tone,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>

        <div className="flex flex-col min-w-0 flex-[2_2_0%]">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">
            {label}
          </span>
          <p className="mt-0.5 text-[13px] text-ink truncate">
            {describe(item)}
          </p>
        </div>

        <div className="hidden md:flex flex-col flex-1 basis-0 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">
            Actor
          </span>
          <span
            className="mt-0.5 text-[12px] text-ink-3 truncate"
            title={item.actorEmail}
          >
            {actor || '—'}
          </span>
        </div>

        <div className="hidden lg:flex flex-col flex-1 basis-0 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">
            When
          </span>
          <span className="mt-0.5 text-[12px] text-ink-3 truncate">
            {formatRelative(item.createdAt)}
          </span>
        </div>
      </Link>
    </li>
  );
}

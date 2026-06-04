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

export function ActivityFeed() {
  const { data, isLoading } = useRecentActivity(10);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <span className="eyebrow">Recent activity</span>
          <h2 className="mt-1.5">What is happening</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="glass overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 flex items-center gap-3 animate-pulse"
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
            No activity yet. Latest events will appear here.
          </p>
        </div>
      ) : (
        <ol className="glass overflow-hidden divide-y divide-border/60">
          {data.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ol>
      )}
    </section>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const meta = EVENT_META[item.eventType] ?? EVENT_META.ENVELOPE_CREATED;
  const Icon = meta.icon;
  return (
    <li>
      <Link
        href={`/envelopes/${item.envelopeId}`}
        className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken/60 transition-colors"
      >
        <span
          className={cn(
            'h-8 w-8 grid place-items-center rounded-full shrink-0',
            meta.tone,
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <p className="flex-1 text-[13px] text-ink-2 truncate">
          {describe(item)}
        </p>
        <span className="text-[11px] text-ink-4 shrink-0">
          {formatRelative(item.createdAt)}
        </span>
      </Link>
    </li>
  );
}

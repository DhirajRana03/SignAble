'use client';

import { type LucideIcon } from 'lucide-react';

import { EnvelopeRow } from '@/components/features/envelopes/EnvelopeRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEnvelopes, useInboxEnvelopes } from '@/hooks/useEnvelopes';

interface Props {
  source?: 'owned' | 'inbox';
  status?: string | string[];
  emptyTitle: string;
  emptyDescription: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  dateLabel?: string;
  /**
   * Override action href per envelope. Receives envelope id, returns href.
   * Defaults to `/envelopes/:id`.
   */
  hrefFor?: (id: string) => string;
}

/**
 * Row-layout envelope list. Replaces card-grid EnvelopeListView for buckets
 * adopting unified row UI (Sent, Inbox, Completed, Archive).
 */
export function EnvelopeRowList({
  source = 'owned',
  status,
  emptyTitle,
  emptyDescription,
  actionLabel = 'View',
  actionIcon,
  dateLabel = 'Sent',
  hrefFor,
}: Props) {
  const owned = useEnvelopes(source === 'owned' ? status : undefined);
  const inbox = useInboxEnvelopes();
  const { data: rawData, isLoading } = source === 'inbox' ? inbox : owned;

  const data =
    source === 'owned' && status && rawData
      ? rawData.filter((env) => {
          const allowed = Array.isArray(status)
            ? new Set(status.map((s) => s.toUpperCase()))
            : new Set(status.split(',').map((s) => s.trim().toUpperCase()));
          return allowed.has(env.status);
        })
      : rawData;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="glass px-4 py-3 h-16 animate-pulse flex items-center gap-4"
          >
            <div className="h-9 w-9 rounded-full bg-surface-sunken shrink-0" />
            <div className="h-4 w-1/3 bg-surface-sunken rounded-pill" />
            <div className="h-3 w-24 bg-surface-sunken rounded-pill ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((e, i) => (
        <EnvelopeRow
          key={e.id}
          envelope={e}
          index={i}
          actionLabel={actionLabel}
          actionIcon={actionIcon}
          dateLabel={dateLabel}
          actionHref={hrefFor ? hrefFor(e.id) : undefined}
        />
      ))}
    </div>
  );
}

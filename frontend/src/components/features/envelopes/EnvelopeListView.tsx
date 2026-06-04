'use client';

import { EnvelopeCard } from '@/components/features/envelopes/EnvelopeCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEnvelopes, useInboxEnvelopes } from '@/hooks/useEnvelopes';

interface Props {
  /**
   * 'owned' — envelopes user created. Filter by status.
   * 'inbox' — envelopes others sent to user awaiting signature.
   */
  source?: 'owned' | 'inbox';
  status?: string | string[];
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * Shared list renderer for envelope buckets. Sent / Completed / Drafts /
 * Archive filter user-owned envelopes by status. Inbox lists envelopes
 * routed to the user as a recipient via a dedicated endpoint.
 */
export function EnvelopeListView({
  source = 'owned',
  status,
  emptyTitle,
  emptyDescription,
}: Props) {
  const owned = useEnvelopes(source === 'owned' ? status : undefined);
  const inbox = useInboxEnvelopes();
  const { data: rawData, isLoading } = source === 'inbox' ? inbox : owned;

  // Client-side fallback filter. Server-side status query relies on
  // backend that may run stale code ignoring the parameter; filtering
  // here guarantees correct bucket data regardless.
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
      <div className="glass overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="px-5 py-4 animate-pulse grid grid-cols-12 gap-4 items-center"
          >
            <div className="col-span-5 space-y-2">
              <div className="h-4 w-2/3 bg-surface-sunken rounded-pill" />
              <div className="h-3 w-1/2 bg-surface-sunken rounded-pill" />
            </div>
            <div className="col-span-4 flex items-center gap-3">
              <div className="h-4 w-16 bg-surface-sunken rounded-pill" />
            </div>
            <div className="col-span-2 flex justify-end">
              <div className="h-5 w-20 bg-surface-sunken rounded-pill" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="glass overflow-hidden">
      {data.map((e, i) => (
        <EnvelopeCard key={e.id} envelope={e} index={i} />
      ))}
    </div>
  );
}

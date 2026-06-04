'use client';

import { EnvelopeCard } from '@/components/features/envelopes/EnvelopeCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEnvelopes } from '@/hooks/useEnvelopes';

interface Props {
  status?: string | string[];
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * Shared list renderer for envelope buckets (Inbox, Sent, Completed,
 * Drafts, Archive). Status filter passed through to the list query;
 * empty-state copy varies per bucket.
 */
export function EnvelopeListView({
  status,
  emptyTitle,
  emptyDescription,
}: Props) {
  const { data, isLoading } = useEnvelopes(status);

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

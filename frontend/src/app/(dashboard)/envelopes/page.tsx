'use client';

import { EnvelopeCard } from '@/components/features/envelopes/EnvelopeCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEnvelopes } from '@/hooks/useEnvelopes';

export default function EnvelopesPage() {
  const { data, isLoading } = useEnvelopes();

  return (
    <DashboardShell eyebrow="Routing" title="Envelopes">
      <div className="pb-12">
        {isLoading ? (
          <div className="glass overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse grid grid-cols-12 gap-4 items-center">
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
        ) : !data?.length ? (
          <EmptyState
            title="No envelopes yet"
            description="When you send a document for signature it appears here. Start by uploading a document."
          />
        ) : (
          <div className="glass overflow-hidden">
            {data.map((e, i) => (
              <EnvelopeCard key={e.id} envelope={e} index={i} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

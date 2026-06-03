'use client';

import { EnvelopeCard } from '@/components/features/envelopes/EnvelopeCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEnvelopes } from '@/hooks/useEnvelopes';

export default function EnvelopesPage() {
  const { data, isLoading } = useEnvelopes();

  return (
    <DashboardShell eyebrow="Routing" title="Envelopes">
      <div className="pb-16">
        {isLoading ? (
          <div>
            <div className="rule" />
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="py-7 animate-pulse grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5 space-y-2">
                    <div className="h-5 w-2/3 bg-paper-dim rounded-pill" />
                    <div className="h-3 w-1/2 bg-paper-dim rounded-pill" />
                  </div>
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="h-4 w-16 bg-paper-dim rounded-pill" />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <div className="h-5 w-20 bg-paper-dim rounded-pill" />
                  </div>
                </div>
                <div className="rule" />
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="No envelopes yet"
            description="Once you send a document for signing, it lives here. Upload a PDF in Documents to begin."
          />
        ) : (
          <div>
            <div className="rule" />
            {data.map((e, i) => (
              <EnvelopeCard key={e.id} envelope={e} index={i} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

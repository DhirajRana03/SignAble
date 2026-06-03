'use client';

import { EnvelopeCard } from '@/components/features/envelopes/EnvelopeCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEnvelopes } from '@/hooks/useEnvelopes';

export default function EnvelopesPage() {
  const { data, isLoading } = useEnvelopes();

  return (
    <DashboardShell eyebrow="Routing" title="Envelopes">
      <div className="max-w-7xl">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="sheet h-40 animate-pulse" />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="No envelopes yet"
            description="Once you send a document for signing, it lives here. Upload a PDF in Documents to begin."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((e, i) => (
              <EnvelopeCard key={e.id} envelope={e} index={i} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

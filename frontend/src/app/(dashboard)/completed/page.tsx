'use client';

import { EnvelopeListView } from '@/components/features/envelopes/EnvelopeListView';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function CompletedPage() {
  return (
    <DashboardShell eyebrow="Finalized" title="Completed">
      <EnvelopeListView
        status="COMPLETED"
        emptyTitle="No completed envelopes"
        emptyDescription="Fully signed envelopes appear here with the signed PDF ready to download."
      />
    </DashboardShell>
  );
}

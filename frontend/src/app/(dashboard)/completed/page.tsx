'use client';

import { Download } from 'lucide-react';

import { EnvelopeRowList } from '@/components/features/envelopes/EnvelopeRowList';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function CompletedPage() {
  return (
    <DashboardShell eyebrow="Finalized" title="Completed" wide>
      <EnvelopeRowList
        status="COMPLETED"
        emptyTitle="No completed envelopes"
        emptyDescription="Fully signed envelopes appear here with the signed PDF ready to download."
        actionLabel="View"
        actionIcon={Download}
        dateLabel="Date & Time"
      />
    </DashboardShell>
  );
}

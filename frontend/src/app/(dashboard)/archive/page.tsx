'use client';

import { EnvelopeListView } from '@/components/features/envelopes/EnvelopeListView';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function ArchivePage() {
  return (
    <DashboardShell eyebrow="History" title="Archive">
      <EnvelopeListView
        status="VOIDED,EXPIRED"
        emptyTitle="Archive empty"
        emptyDescription="Voided or expired envelopes are kept here for reference."
      />
    </DashboardShell>
  );
}

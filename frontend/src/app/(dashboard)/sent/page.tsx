'use client';

import { EnvelopeListView } from '@/components/features/envelopes/EnvelopeListView';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function SentPage() {
  return (
    <DashboardShell eyebrow="Outbound" title="Sent for Signature">
      <EnvelopeListView
        status="SENT,IN_PROGRESS"
        emptyTitle="Nothing sent yet"
        emptyDescription="Envelopes you send to recipients appear here while awaiting their response."
      />
    </DashboardShell>
  );
}

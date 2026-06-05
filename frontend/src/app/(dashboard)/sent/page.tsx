'use client';

import { Eye } from 'lucide-react';

import { EnvelopeRowList } from '@/components/features/envelopes/EnvelopeRowList';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function SentPage() {
  return (
    <DashboardShell eyebrow="Outbound" title="Sent for Signature" wide>
      <EnvelopeRowList
        status="SENT,IN_PROGRESS"
        emptyTitle="Nothing sent yet"
        emptyDescription="Envelopes you send to recipients appear here while awaiting their response."
        actionLabel="View"
        actionIcon={Eye}
        dateLabel="Date & Time"
      />
    </DashboardShell>
  );
}

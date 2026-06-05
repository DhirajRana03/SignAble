'use client';

import { Eye } from 'lucide-react';

import { EnvelopeRowList } from '@/components/features/envelopes/EnvelopeRowList';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function ArchivePage() {
  return (
    <DashboardShell eyebrow="History" title="Archive" wide>
      <EnvelopeRowList
        status="VOIDED,EXPIRED"
        emptyTitle="Archive empty"
        emptyDescription="Voided or expired envelopes are kept here for reference."
        actionLabel="View"
        actionIcon={Eye}
        dateLabel="Date & Time"
      />
    </DashboardShell>
  );
}

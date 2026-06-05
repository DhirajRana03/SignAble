'use client';

import { Eye } from 'lucide-react';

import { EnvelopeRowList } from '@/components/features/envelopes/EnvelopeRowList';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function EnvelopesPage() {
  return (
    <DashboardShell eyebrow="Routing" title="Envelopes" wide>
      <EnvelopeRowList
        emptyTitle="No envelopes yet"
        emptyDescription="When you send a document for signature it appears here. Start by uploading a document."
        actionLabel="View"
        actionIcon={Eye}
        dateLabel="Date & Time"
      />
    </DashboardShell>
  );
}

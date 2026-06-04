'use client';

import { EnvelopeListView } from '@/components/features/envelopes/EnvelopeListView';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function DraftsPage() {
  return (
    <DashboardShell eyebrow="In progress" title="Drafts">
      <EnvelopeListView
        status="DRAFT"
        emptyTitle="No drafts"
        emptyDescription="Envelopes you started but have not yet sent appear here."
      />
    </DashboardShell>
  );
}

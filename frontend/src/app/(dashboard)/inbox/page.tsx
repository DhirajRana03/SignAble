'use client';

import { EnvelopeListView } from '@/components/features/envelopes/EnvelopeListView';
import { DashboardShell } from '@/components/layout/DashboardShell';

/**
 * Inbox — documents others sent to current user awaiting signature.
 * Backend currently lists only envelopes user owns; recipient-side
 * inbox needs a dedicated endpoint. Placeholder empty state until then.
 */
export default function InboxPage() {
  return (
    <DashboardShell eyebrow="Action required" title="Inbox">
      <EnvelopeListView
        status="SENT,IN_PROGRESS"
        emptyTitle="Inbox empty"
        emptyDescription="Documents waiting for your signature will appear here."
      />
    </DashboardShell>
  );
}

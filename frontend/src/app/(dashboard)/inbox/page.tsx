'use client';

import { EnvelopeListView } from '@/components/features/envelopes/EnvelopeListView';
import { DashboardShell } from '@/components/layout/DashboardShell';

/**
 * Inbox: envelopes others sent to the current user awaiting signature.
 * Sourced from the recipient-side /envelopes/inbox endpoint.
 */
export default function InboxPage() {
  return (
    <DashboardShell eyebrow="Action required" title="Inbox">
      <EnvelopeListView
        source="inbox"
        emptyTitle="Inbox empty"
        emptyDescription="Documents waiting for your signature appear here."
      />
    </DashboardShell>
  );
}

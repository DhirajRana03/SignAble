'use client';

import { PenLine } from 'lucide-react';

import { EnvelopeRowList } from '@/components/features/envelopes/EnvelopeRowList';
import { DashboardShell } from '@/components/layout/DashboardShell';

/**
 * Inbox: envelopes others sent to current user awaiting signature.
 * Sourced from recipient-side /envelopes/inbox endpoint.
 */
export default function InboxPage() {
  return (
    <DashboardShell eyebrow="Action required" title="Inbox" wide>
      <EnvelopeRowList
        source="inbox"
        emptyTitle="Inbox empty"
        emptyDescription="Documents waiting for your signature appear here."
        actionLabel="Sign"
        actionIcon={PenLine}
        dateLabel="Date & Time"
      />
    </DashboardShell>
  );
}

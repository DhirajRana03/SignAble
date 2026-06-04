'use client';

import { useParams } from 'next/navigation';

import { EnvelopeComposer } from '@/components/features/envelopes/EnvelopeComposer';
import { DashboardShell } from '@/components/layout/DashboardShell';

/**
 * Draft edit. Reuses composer in hydrated draftId mode. User finalizes
 * documents, recipients, title, signing order then continues to prepare
 * workspace or saves draft again.
 */
export default function EditEnvelopePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <DashboardShell eyebrow="Continue draft" title="Edit envelope">
      <EnvelopeComposer draftId={id} />
    </DashboardShell>
  );
}

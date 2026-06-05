'use client';

import { EnvelopeComposer } from '@/components/features/envelopes/EnvelopeComposer';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function NewEnvelopePage() {
  return (
    <DashboardShell eyebrow="New envelope" title="Create envelope" wide>
      <EnvelopeComposer />
    </DashboardShell>
  );
}

'use client';

import { EnvelopeRow } from './EnvelopeRow';
import type { Envelope } from '@/types/envelope.types';

export function SentRow({
  envelope,
  index,
}: {
  envelope: Envelope;
  index: number;
}) {
  return (
    <EnvelopeRow
      envelope={envelope}
      index={index}
      actionLabel="View"
      dateLabel="Date & Time"
    />
  );
}

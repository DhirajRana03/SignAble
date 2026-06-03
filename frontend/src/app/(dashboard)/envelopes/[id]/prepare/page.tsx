'use client';

import { Send } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import { FieldPlacer } from '@/components/features/field-placer/FieldPlacer';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { useEnvelope, useSendEnvelope } from '@/hooks/useEnvelopes';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';

export default function PreparePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const envelope = useEnvelope(id);
  const send = useSendEnvelope();
  const dirty = useEnvelopeEditorStore((s) => s.dirty);

  if (envelope.isLoading || !envelope.data) {
    return (
      <DashboardShell eyebrow="Prepare" title="Loading…">
        <div className="label-mono">loading envelope…</div>
      </DashboardShell>
    );
  }

  const onSend = () => {
    send.mutate(envelope.data!.id, {
      onSuccess: () => router.push(`/envelopes/${envelope.data!.id}`),
    });
  };

  return (
    <DashboardShell
      eyebrow="Prepare"
      title={envelope.data.title}
      actions={
        <Button
          variant="accent"
          onClick={onSend}
          disabled={dirty}
          loading={send.isPending}
          title={dirty ? 'Save fields before sending' : undefined}
        >
          <Send className="h-3.5 w-3.5" /> Send envelope
        </Button>
      }
    >
      <FieldPlacer envelope={envelope.data} />
    </DashboardShell>
  );
}

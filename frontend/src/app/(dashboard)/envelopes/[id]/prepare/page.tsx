'use client';

import { ArrowLeft, Save, Send } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import { FieldPlacer } from '@/components/features/field-placer/FieldPlacer';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useBulkSaveFields, useEnvelope, useSendEnvelope } from '@/hooks/useEnvelopes';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';

export default function PreparePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const envelope = useEnvelope(id);
  const send = useSendEnvelope();
  const dirty = useEnvelopeEditorStore((s) => s.dirty);
  const fields = useEnvelopeEditorStore((s) => s.fields);
  const markClean = useEnvelopeEditorStore((s) => s.markClean);
  const save = useBulkSaveFields(id ?? '');

  if (envelope.isLoading || !envelope.data) {
    return (
      <div className="min-h-screen grid place-items-center">
        <span className="label-mono animate-pulse">loading envelope…</span>
      </div>
    );
  }

  const env = envelope.data;

  const onSaveDraft = () => {
    save.mutate(
      fields.map((f) => ({
        recipientId: f.recipientId,
        pageNumber: f.pageNumber,
        xPct: f.xPct,
        yPct: f.yPct,
        widthPct: f.widthPct,
        heightPct: f.heightPct,
        fieldType: f.fieldType,
        required: f.required,
        options: f.options ?? undefined,
      })),
      {
        onSuccess: () => {
          markClean();
          router.push('/drafts');
        },
      },
    );
  };

  const onSend = () => {
    send.mutate(env.id, {
      onSuccess: () => router.push(`/envelopes/${env.id}`),
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      <header className="sticky top-0 z-30 bg-surface-0/85 backdrop-blur-lg backdrop-saturate-150 border-b border-border">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={() => router.push(`/envelopes/${env.id}/edit`)}
            className="h-8 w-8 grid place-items-center rounded-md text-ink-3 hover:bg-surface-sunken hover:text-ink transition-colors"
            aria-label="Back to draft"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-3 leading-none mb-0.5">
              Prepare envelope
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-[-0.022em] text-ink leading-tight">
              {env.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              loading={save.isPending}
              disabled={!dirty}
              onClick={onSaveDraft}
              className="border border-accent/40 text-accent-deep bg-transparent hover:bg-accent-soft hover:border-accent/60 disabled:border-border disabled:text-ink-4 transition-colors"
            >
              <Save className="h-3.5 w-3.5" /> Save as draft
            </Button>
            <Button
              size="sm"
              variant="accent"
              onClick={onSend}
              disabled={dirty}
              loading={send.isPending}
              title={dirty ? 'Save fields before sending' : undefined}
            >
              <Send className="h-3.5 w-3.5" /> Send envelope
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-6 py-6">
        <ErrorBoundary>
          <FieldPlacer envelope={env} />
        </ErrorBoundary>
      </main>
    </div>
  );
}

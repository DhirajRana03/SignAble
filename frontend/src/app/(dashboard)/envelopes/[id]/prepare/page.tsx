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

  /**
   * Send envelope. Auto-saves dirty field layout first so user does not
   * have to think about a separate save step. Only sends after save
   * resolves to avoid sending stale server-side field state.
   */
  const onSend = () => {
    const dispatchSend = () =>
      send.mutate(env.id, {
        onSuccess: () => router.push(`/envelopes/${env.id}`),
      });
    if (!dirty) {
      dispatchSend();
      return;
    }
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
          dispatchSend();
        },
      },
    );
  };

  const canSend = fields.length > 0 && !send.isPending && !save.isPending;

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="shrink-0 bg-slate-50/90 backdrop-blur-md">
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
              onClick={onSaveDraft}
              title={
                dirty
                  ? 'Save current field layout as draft'
                  : 'No unsaved changes — save anyway'
              }
              className="bg-white/60 backdrop-blur-md border border-white/60 text-accent-deep hover:bg-white/80 hover:border-accent/40 transition-colors"
            >
              <Save className="h-3.5 w-3.5" /> Save as draft
            </Button>
            <Button
              size="sm"
              variant="accent"
              onClick={onSend}
              disabled={!canSend}
              loading={send.isPending || save.isPending}
              title={
                fields.length === 0
                  ? 'Drop at least one field before sending'
                  : undefined
              }
            >
              <Send className="h-3.5 w-3.5" /> Send envelope
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        <ErrorBoundary>
          <FieldPlacer envelope={env} />
        </ErrorBoundary>
      </main>
    </div>
  );
}

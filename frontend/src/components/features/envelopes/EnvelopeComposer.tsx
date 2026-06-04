'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  FileText,
  GitBranch,
  GripVertical,
  Mail,
  Pen,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import {
  useDeleteDocument,
  useDocument,
  useUploadDocument,
} from '@/hooks/useDocuments';
import { useQueryClient } from '@tanstack/react-query';

import { useCreateEnvelope } from '@/hooks/useEnvelopes';
import { useComposerGuardStore } from '@/store/composerGuardStore';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api-client';
import type { RecipientRole, SigningOrder } from '@/types/envelope.types';

interface DraftRecipient {
  id: string;
  name: string;
  email: string;
  role: RecipientRole;
}

const recipientSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});
type RecipientFormValues = z.infer<typeof recipientSchema>;

export function EnvelopeComposer({
  draftId,
}: {
  draftId?: string;
} = {}) {
  const router = useRouter();
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<DraftRecipient[]>([]);
  const [pendingRecipientInput, setPendingRecipientInput] = useState(false);
  const [title, setTitle] = useState('');
  const [signingOrder, setSigningOrder] = useState<SigningOrder>('SEQUENTIAL');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Only mark hydrated when draftId resolves and load succeeds. Avoid
  // initializing from !draftId since useParams returns undefined on first
  // render, which would skip hydration when draftId arrives later.
  const [hydrated, setHydrated] = useState(false);
  // Server snapshot at hydration. Used to compute diffs at save time so
  // detaches and recipient deletes are issued for items the user removed.
  const initialDocIdsRef = useRef<string[]>([]);
  const initialRecipientIdsRef = useRef<string[]>([]);

  // Hydrate from existing draft. Loads envelope + attached docs once.
  // Skips when draftId absent (fresh create flow).
  useEffect(() => {
    // Create mode: nothing to hydrate, mark ready.
    if (!draftId) {
      setHydrated(true);
      return;
    }
    if (hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const { envelopeService } = await import(
          '@/services/envelope.service'
        );
        const env = await envelopeService.get(draftId);
        if (cancelled) return;
        if (env.status !== 'DRAFT') {
          // Non-draft cannot edit via composer. Bounce to detail.
          router.replace(`/envelopes/${env.id}`);
          return;
        }
        // Attached docs endpoint may be unavailable on older backends;
        // primary documentId still loads from envelope payload.
        let attached: Awaited<
          ReturnType<typeof envelopeService.listAttachedDocuments>
        > = [];
        try {
          attached = await envelopeService.listAttachedDocuments(draftId);
        } catch {
          // Tolerate failure — primary doc still renders.
        }
        if (cancelled) return;
        const docIds = [
          env.documentId,
          ...attached
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((a) => a.documentId),
        ];
        const hydratedRecipients = (env.recipients ?? [])
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            role: r.role,
          }));
        initialDocIdsRef.current = docIds;
        initialRecipientIdsRef.current = hydratedRecipients.map((r) => r.id);
        setDocumentIds(docIds);
        setTitle(env.title ?? '');
        setSigningOrder(env.signingOrder);
        setRecipients(hydratedRecipients);
        setHydrated(true);
      } catch (err) {
        setSubmitError(extractErrorMessage(err));
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId, hydrated, router]);

  // Primary document: first in list. Drives envelope creation + title seed.
  const primaryId = documentIds[0] ?? null;
  const docQuery = useDocument(primaryId ?? undefined);
  const primaryDoc = docQuery.data;
  const docReady = primaryDoc?.status === 'READY';

  useEffect(() => {
    // Skip filename auto-seed in draft edit mode — hydration owns title.
    if (draftId) return;
    if (primaryDoc && !title) {
      setTitle(
        primaryDoc.filename.replace(
          /\.(pdf|png|jpe?g|tiff?|bmp|gif|heic)$/i,
          '',
        ),
      );
    }
  }, [draftId, primaryDoc, title]);

  const createEnvelope = useCreateEnvelope();
  const queryClient = useQueryClient();
  const deleteDoc = useDeleteDocument();
  const signerCount = recipients.filter((r) => r.role === 'SIGNER').length;
  const canSubmit = docReady && signerCount > 0 && !!title && !submitting;

  const handleRemoveDoc = (id: string) => {
    setDocumentIds((ids) => ids.filter((d) => d !== id));
    // In create mode the document is throwaway, hard-delete it. In edit
    // mode persist() diff handles detach; deleting Document row would
    // orphan the envelope's primary FK if user removes the primary.
    if (!draftId) {
      deleteDoc.mutate(id);
    }
  };

  // Sortable sensors — pointer for mouse/touch, keyboard for a11y
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRecipients((rs) => {
      const oldIdx = rs.findIndex((r) => r.id === active.id);
      const newIdx = rs.findIndex((r) => r.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return rs;
      return arrayMove(rs, oldIdx, newIdx);
    });
  };

  /**
   * Persist envelope. mode='continue' routes user to prepare workspace
   * for field placement. mode='draft' saves and exits to drafts list.
   * Draft mode skips signer requirement so user can return later.
   */
  const persist = useCallback(async (mode: 'continue' | 'draft') => {
    if (!primaryId) {
      setSubmitError('Upload at least one document.');
      return;
    }
    if (!docReady) {
      setSubmitError('Wait for document to finish processing.');
      return;
    }
    if (mode === 'continue' && !title.trim()) {
      setSubmitError('Title required.');
      return;
    }
    if (mode === 'continue' && signerCount === 0) {
      setSubmitError('Add at least one signer.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { envelopeService } = await import('@/services/envelope.service');
      let envelopeId: string;
      if (draftId) {
        // Update existing draft. Diff documents and recipients against
        // hydration snapshot.
        const initialPrimary = initialDocIdsRef.current[0];
        const newPrimary = primaryId;
        const initialAll = initialDocIdsRef.current;
        const currentAll = documentIds;
        const currentSet = new Set(currentAll);

        // Detach removed docs first. Skip primary (cannot detach via
        // join — handled by PATCH documentId swap below).
        for (const removedId of initialAll) {
          if (currentSet.has(removedId)) continue;
          if (removedId === initialPrimary) continue;
          try {
            await envelopeService.detachDocument(draftId, removedId);
          } catch {
            // Continue.
          }
        }

        // Attach new extras (skip the one destined to become primary).
        const initialSet = new Set(initialAll);
        for (let i = 1; i < currentAll.length; i++) {
          const id = currentAll[i];
          if (initialSet.has(id)) continue;
          if (id === newPrimary) continue;
          try {
            await envelopeService.attachDocument(draftId, id);
          } catch {
            // Duplicate or transient; continue.
          }
        }

        // PATCH metadata + primary swap. documentId only included when
        // changed; backend validates owner + READY.
        await envelopeService.update(draftId, {
          title: title.trim() || 'Untitled draft',
          signingOrder,
          documentId:
            newPrimary && newPrimary !== initialPrimary
              ? newPrimary
              : undefined,
        });

        // If primary swap occurred, detach the old primary (it remained
        // referenced by envelope.documentId until the PATCH succeeded).
        if (newPrimary && newPrimary !== initialPrimary) {
          if (!currentSet.has(initialPrimary)) {
            // Old primary fully removed: nothing further; Document row
            // remains as orphan in user's library.
          } else {
            // Old primary now sits as extra: ensure attached.
            try {
              await envelopeService.attachDocument(draftId, initialPrimary);
            } catch {
              // Already attached.
            }
          }
        }

        // Recipient reconcile. Remove ones dropped from UI, add new ones.
        const currentRecipientIds = new Set(recipients.map((r) => r.id));
        for (const removedId of initialRecipientIdsRef.current) {
          if (currentRecipientIds.has(removedId)) continue;
          try {
            await envelopeService.deleteRecipient(draftId, removedId);
          } catch {
            // Continue.
          }
        }
        const initialRecipientSet = new Set(initialRecipientIdsRef.current);
        for (let i = 0; i < recipients.length; i++) {
          const r = recipients[i];
          if (initialRecipientSet.has(r.id)) continue;
          await envelopeService.addRecipient(draftId, {
            name: r.name,
            email: r.email,
            orderIndex: i,
            role: r.role,
          });
        }
        envelopeId = draftId;
      } else {
        const envelope = await createEnvelope.mutateAsync({
          documentId: primaryId,
          title: title.trim() || 'Untitled draft',
          signingOrder,
        });
        envelopeId = envelope.id;
        for (const extraId of documentIds.slice(1)) {
          await envelopeService.attachDocument(envelopeId, extraId);
        }
        for (let i = 0; i < recipients.length; i++) {
          const r = recipients[i];
          await envelopeService.addRecipient(envelopeId, {
            name: r.name,
            email: r.email,
            orderIndex: i,
            role: r.role,
          });
        }
      }
      // Refresh snapshot so subsequent saves diff against current state.
      initialDocIdsRef.current = [...documentIds];
      initialRecipientIdsRef.current = recipients.map((r) => r.id);
      queryClient.invalidateQueries({ queryKey: ['envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['envelopes', envelopeId] });
      if (mode === 'draft') {
        toast.success('Draft saved');
        router.push('/drafts');
      } else {
        toast.success(draftId ? 'Draft updated' : 'Envelope created');
        router.push(`/envelopes/${envelopeId}/prepare`);
      }
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
      setSubmitting(false);
    }
  }, [
    draftId,
    primaryId,
    docReady,
    title,
    signerCount,
    createEnvelope,
    documentIds,
    recipients,
    signingOrder,
    router,
    queryClient,
  ]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void persist('continue');
  };

  // Draft enables when any composer field has user input. Title auto-fills
  // from filename once doc ready, so doc-only state still qualifies.
  const hasAnyInput =
    documentIds.length > 0 ||
    recipients.length > 0 ||
    title.trim().length > 0 ||
    pendingRecipientInput;
  const canSaveDraft = hasAnyInput && !submitting;

  const setDirty = useComposerGuardStore((s) => s.setDirty);
  const setSaveDraftHandler = useComposerGuardStore((s) => s.setSaveDraft);
  const isDirty =
    documentIds.length > 0 ||
    recipients.length > 0 ||
    title.trim().length > 0 ||
    pendingRecipientInput;

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  useEffect(() => {
    setSaveDraftHandler(canSaveDraft ? () => persist('draft') : null);
  }, [canSaveDraft, setSaveDraftHandler, persist]);

  useEffect(
    () => () => {
      setDirty(false);
      setSaveDraftHandler(null);
    },
    [setDirty, setSaveDraftHandler],
  );

  /**
   * Intercept browser back/forward. Push dummy entry on mount so first
   * popstate consumes dummy without leaving composer. When dirty, push
   * dummy again to cancel pop, then surface guard modal via sentinel
   * href. Modal resolves with router.back() after clearing dirty flag.
   */
  const requestNavigate = useComposerGuardStore((s) => s.requestNavigate);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.pushState({ composerGuard: true }, '');
    const handler = () => {
      if (!useComposerGuardStore.getState().dirty) return;
      window.history.pushState({ composerGuard: true }, '');
      requestNavigate('__BACK__');
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [requestNavigate]);

  // Native beforeunload covers tab close + full reload.
  useEffect(() => {
    if (typeof window === 'undefined' || !isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const sequential = signingOrder === 'SEQUENTIAL';

  // Wait for draft hydration before painting form. Prevents flashing
  // empty inputs during async load + race vs title-seed effect.
  if (draftId && !hydrated) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 pb-12">
        <div className="space-y-5">
          <div className="glass p-5 h-24 animate-pulse" />
          <div className="glass p-5 h-40 animate-pulse" />
          <div className="glass p-5 h-32 animate-pulse" />
        </div>
        <div className="glass p-5 h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 pb-12"
    >
      <div className="space-y-5">
        {/* Title */}
        <div className="glass p-4 lg:p-5">
          <Label htmlFor="env-title">Envelope title</Label>
          <Input
            id="env-title"
            placeholder="Q4 vendor agreement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-[15px]"
          />
        </div>

        {/* Documents */}
        <div className="glass p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold tracking-[-0.018em]">
              Documents
            </h3>
            {documentIds.length > 0 ? (
              <span className="text-[11.5px] text-ink-3">
                {documentIds.length} file{documentIds.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          <DocumentDropzoneCompact
            hasExisting={documentIds.length > 0}
            onUploaded={(id) =>
              setDocumentIds((ids) =>
                ids.includes(id) ? ids : [...ids, id],
              )
            }
          />

          {documentIds.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {documentIds.map((id, idx) => (
                <DocumentCard
                  key={id}
                  documentId={id}
                  primary={idx === 0}
                  onRemove={() => handleRemoveDoc(id)}
                />
              ))}
            </ul>
          ) : null}
        </div>

        {/* Recipients + signing-order header */}
        <div className="glass p-4 lg:p-5">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.018em]">
                Recipients
              </h3>
              <p className="text-[12px] text-ink-3 mt-0.5">
                {sequential
                  ? 'Sequential signing — drag to reorder.'
                  : 'Parallel signing — order does not matter.'}
              </p>
            </div>
            <SigningOrderToggle
              value={signingOrder}
              onChange={setSigningOrder}
            />
          </div>

          <RecipientAddForm
            onDirtyChange={setPendingRecipientInput}
            onAdd={(v) =>
              setRecipients((rs) => [
                ...rs,
                {
                  id: tempId(),
                  name: v.name,
                  email: v.email,
                  role: 'SIGNER',
                },
              ])
            }
          />

          {recipients.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={recipients.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="mt-3 space-y-1">
                  {recipients.map((r, i) => (
                    <SortableRecipientItem
                      key={r.id}
                      index={i}
                      recipient={r}
                      sequential={sequential}
                      onChangeRole={(role) =>
                        setRecipients((rs) =>
                          rs.map((x) =>
                            x.id === r.id ? { ...x, role } : x,
                          ),
                        )
                      }
                      onRemove={() =>
                        setRecipients((rs) => rs.filter((x) => x.id !== r.id))
                      }
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          ) : null}
        </div>

        {submitError ? (
          <div className="rounded-md border border-danger/30 bg-danger/8 px-4 py-3 text-[13px] text-danger">
            {submitError}
          </div>
        ) : null}
      </div>

      {/* Sticky review */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="glass p-5">
          <span className="eyebrow">Review</span>
          <h2 className="mt-2 text-[18px]">Ready to create</h2>
          <p className="text-[13px] text-ink-3 mt-1.5 leading-relaxed">
            We will create the envelope, then take you to place signature
            fields.
          </p>

          <div className="mt-5 space-y-2.5">
            <ReviewRow
              label="Title"
              value={title || 'Untitled'}
              state={title ? 'ok' : 'todo'}
            />
            <ReviewRow
              label="Documents"
              value={
                documentIds.length === 0
                  ? 'Not uploaded'
                  : docReady
                    ? `${primaryDoc!.filename}${
                        documentIds.length > 1
                          ? ` +${documentIds.length - 1} more`
                          : ''
                      }`
                    : 'Processing…'
              }
              state={
                docReady ? 'ok' : documentIds.length > 0 ? 'pending' : 'todo'
              }
            />
            <ReviewRow
              label="Signers"
              value={`${signerCount} of ${recipients.length}`}
              state={signerCount > 0 ? 'ok' : 'todo'}
            />
            <ReviewRow
              label="Order"
              value={
                signingOrder === 'SEQUENTIAL' ? 'Sequential' : 'Parallel'
              }
              state="ok"
            />
          </div>

          <div className="rule-soft my-5" />

          <div className="space-y-2">
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              loading={submitting}
              disabled={!canSubmit}
            >
              {submitting
                ? draftId
                  ? 'Saving…'
                  : 'Creating…'
                : draftId
                  ? 'Continue to fields'
                  : 'Create envelope'}
            </Button>
            <Button
              type="button"
              size="md"
              className={cn(
                'w-full bg-transparent border border-accent/40 text-accent-deep',
                'hover:bg-accent-soft hover:border-accent/60',
                'disabled:border-border disabled:text-ink-4',
                'transition-colors duration-150',
              )}
              disabled={!canSaveDraft}
              onClick={() => void persist('draft')}
            >
              Save as draft
            </Button>
          </div>
          <p className="text-[11px] text-ink-4 mt-3 text-center">
            Next: place fields, then send.
          </p>
        </div>
      </aside>
    </form>
  );
}

/* ─────────────── Progress ring (SVG, GPU-accelerated) ─────────────── */

function ProgressRing({ pct }: { pct: number }) {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  return (
    <div className="relative h-8 w-8 shrink-0">
      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-accent/15"
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-accent transition-[stroke-dashoffset] duration-150 ease-linear"
        />
      </svg>
      <UploadCloud
        className="absolute inset-0 m-auto h-3.5 w-3.5 text-accent-deep"
        strokeWidth={2.2}
      />
    </div>
  );
}

/* ─────────────── Compact dropzone ─────────────── */

function DocumentDropzoneCompact({
  onUploaded,
  hasExisting = false,
}: {
  onUploaded: (id: string) => void;
  hasExisting?: boolean;
}) {
  const upload = useUploadDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0); // remaining files in batch

  /**
   * Upload files sequentially. Sequential keeps progress UI coherent
   * (one bar) and avoids hammering the processor with parallel jobs.
   */
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      setQueueCount(list.length);
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setUploadingName(file.name);
        setQueueCount(list.length - i);
        try {
          // eslint-disable-next-line no-await-in-loop
          const doc = await upload.mutateAsync(file);
          onUploaded(doc.id);
        } catch {
          // Cancel or error: stop the batch.
          break;
        }
      }
      setUploadingName(null);
      setQueueCount(0);
    },
    [upload, onUploaded],
  );

  // Active upload: compact card with progress arc + cancel.
  if (upload.isPending) {
    const pct = upload.progress;
    return (
      <div className="rounded-md border border-accent/40 bg-accent-soft/20 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <ProgressRing pct={pct} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-ink truncate leading-tight">
              {uploadingName ?? 'Uploading…'}
            </p>
            <p className="text-[10.5px] text-ink-3 mt-0.5">
              {pct}%
              {queueCount > 1 ? ` · ${queueCount} files left` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              upload.cancel();
              setUploadingName(null);
            }}
            className="h-6 w-6 grid place-items-center rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
            aria-label="Cancel upload"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'relative cursor-pointer rounded-md border border-dashed',
        'flex items-center gap-2.5 px-3 py-2.5',
        'transition-colors duration-150',
        dragging
          ? 'border-accent bg-accent-soft/40'
          : 'border-border-strong/70 bg-surface-1/30 hover:border-accent/60 hover:bg-accent-soft/15',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.gif,.heic,.heif,application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          // Reset so re-selecting same file triggers change
          e.target.value = '';
        }}
      />
      <div
        className={cn(
          'h-8 w-8 grid place-items-center rounded-md shrink-0',
          'transition-colors duration-150',
          dragging || hasExisting
            ? 'bg-accent text-white'
            : 'bg-accent-soft text-accent-deep',
        )}
      >
        {hasExisting ? (
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <UploadCloud className="h-4 w-4" strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-ink leading-tight">
          {hasExisting ? 'Add document' : 'Drop or click to upload'}
        </p>
        <p className="text-[10.5px] text-ink-3 mt-0.5">
          {hasExisting
            ? 'Multiple files allowed'
            : 'PDF or image · up to 50 MB'}
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Document card ─────────────── */

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-ink-4',
  PROCESSING: 'bg-warn animate-pulse',
  READY: 'bg-success',
  FAILED: 'bg-danger',
};

function DocumentCard({
  documentId,
  primary,
  onRemove,
}: {
  documentId: string;
  primary: boolean;
  onRemove: () => void;
}) {
  const docQuery = useDocument(documentId);
  const doc = docQuery.data;
  const status = doc?.status ?? 'PENDING';
  const failed = status === 'FAILED';
  const isProcessing = status === 'PENDING' || status === 'PROCESSING';
  const isReady = status === 'READY';

  return (
    <li
      className={cn(
        'group relative rounded-md bg-surface-2/70 backdrop-blur-sm',
        'border border-border/60 px-3 py-2.5',
        'hover:border-accent/40 hover:shadow-paper transition-all duration-150',
        primary && 'border-accent/40 ring-1 ring-accent/15',
      )}
    >
      <button
        type="button"
        onClick={onRemove}
        aria-label="Delete document"
        title="Delete document"
        className={cn(
          'absolute -top-1.5 -right-1.5 h-5 w-5 grid place-items-center rounded-full',
          'bg-danger text-white shadow-sm ring-2 ring-paper',
          'hover:bg-red-600 hover:scale-110 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-danger/50',
          'transition-transform duration-100',
        )}
      >
        <Trash2 className="h-2.5 w-2.5" strokeWidth={3} />
      </button>

      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'h-7 w-7 grid place-items-center rounded-sm shrink-0',
            isReady
              ? 'bg-accent-soft text-accent-deep'
              : failed
                ? 'bg-danger/10 text-danger'
                : 'bg-surface-sunken text-ink-3',
          )}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className="text-[12.5px] font-medium text-ink truncate leading-tight"
              title={doc?.filename}
            >
              {doc?.filename ?? 'Loading…'}
            </p>
            {primary ? (
              <span className="text-[8.5px] font-semibold uppercase tracking-[0.06em] text-accent-deep bg-accent-soft px-1 py-px rounded shrink-0">
                Primary
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0',
                STATUS_DOT[status] ?? STATUS_DOT.PENDING,
              )}
            />
            <p className="text-[10.5px] text-ink-3 truncate">
              {isProcessing
                ? 'Processing'
                : isReady
                  ? `${doc?.pageCount ?? 0} page${doc?.pageCount === 1 ? '' : 's'}`
                  : failed
                    ? doc?.errorMessage ?? 'Failed'
                    : String(status).toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ─────────────── Pill toggle with sliding indicator ─────────────── */

function SigningOrderToggle({
  value,
  onChange,
}: {
  value: SigningOrder;
  onChange: (v: SigningOrder) => void;
}) {
  const opts: {
    value: SigningOrder;
    label: string;
    icon: typeof ArrowRight;
  }[] = [
    { value: 'SEQUENTIAL', label: 'Sequential', icon: ArrowRight },
    { value: 'PARALLEL', label: 'Parallel', icon: GitBranch },
  ];
  const activeIdx = opts.findIndex((o) => o.value === value);

  return (
    <div
      role="radiogroup"
      aria-label="Signing order"
      className={cn(
        // Elliptical glass track — height 44px gives a tall oval silhouette
        'relative inline-flex items-center p-1 h-11',
        'rounded-[999px]',
        'bg-white/30 backdrop-blur-xl backdrop-saturate-150',
        'border border-white/55',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(99,102,241,0.06),0_1px_2px_rgba(15,15,15,0.04)]',
      )}
    >
      {/* Sliding elliptical glass capsule */}
      <span
        aria-hidden
        className={cn(
          'absolute top-1 bottom-1 rounded-[999px]',
          'bg-gradient-to-b from-white via-white/95 to-white/80',
          'border border-white',
          'shadow-[0_2px_6px_-1px_rgba(99,102,241,0.30),0_10px_24px_-10px_rgba(99,102,241,0.50),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(99,102,241,0.12)]',
          'transition-[left,box-shadow] duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        )}
        style={{
          width: 'calc(50% - 4px)',
          left: activeIdx === 0 ? '4px' : 'calc(50% + 0px)',
        }}
      />

      {opts.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative z-[1] inline-flex items-center justify-center gap-1.5',
              // Taller pill — matches track height for elliptical look
              'h-9 px-5 rounded-[999px] min-w-[112px]',
              'text-[11px] font-semibold tracking-[0.01em]',
              'transition-colors duration-300',
              active
                ? 'text-accent-deep'
                : 'text-ink-3 hover:text-ink',
            )}
          >
            <Icon
              className={cn(
                'h-3 w-3 transition-all duration-300',
                active ? 'text-accent-deep' : 'text-ink-4',
              )}
              strokeWidth={2.4}
            />
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────── Add recipient form ─────────────── */

function RecipientAddForm({
  onAdd,
  onDirtyChange,
}: {
  onAdd: (values: RecipientFormValues) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const form = useForm<RecipientFormValues>({
    resolver: zodResolver(recipientSchema),
    defaultValues: { name: '', email: '' },
  });

  // Watch form values; propagate dirty signal so composer guard captures
  // unsaved typing before user clicks Add.
  const values = form.watch();
  useEffect(() => {
    const hasInput =
      (values.name?.length ?? 0) > 0 || (values.email?.length ?? 0) > 0;
    onDirtyChange?.(hasInput);
  }, [values.name, values.email, onDirtyChange]);

  const submit = form.handleSubmit((vals) => {
    onAdd(vals);
    form.reset({ name: '', email: '' });
    onDirtyChange?.(false);
  });

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void submit();
        }
      }}
      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5 items-start"
    >
      <div>
        <Input
          placeholder="Name"
          autoComplete="off"
          {...form.register('name')}
        />
        {form.formState.errors.name ? (
          <p className="mt-1 text-[11px] text-danger">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>
      <div>
        <Input
          type="email"
          placeholder="email@example.com"
          autoComplete="off"
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <p className="mt-1 text-[11px] text-danger">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>
      <Button type="button" variant="secondary" size="md" onClick={submit}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}

/* ─────────────── Sortable recipient row ─────────────── */

function SortableRecipientItem({
  index,
  recipient,
  sequential,
  onChangeRole,
  onRemove,
}: {
  index: number;
  recipient: DraftRecipient;
  sequential: boolean;
  onChangeRole: (role: RecipientRole) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recipient.id, disabled: !sequential });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
  } as React.CSSProperties;

  const tones = [
    'from-violet-400/30 to-indigo-500/30 text-indigo-700',
    'from-amber-400/30 to-orange-500/30 text-orange-700',
    'from-emerald-400/30 to-teal-500/30 text-teal-700',
    'from-sky-400/30 to-blue-500/30 text-blue-700',
    'from-pink-400/30 to-rose-500/30 text-rose-700',
  ];
  const tone = tones[index % tones.length];

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md transition-colors',
        isDragging
          ? 'bg-white shadow-lifted ring-1 ring-accent/30'
          : 'hover:bg-surface-sunken/60',
      )}
    >
      {sequential ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={cn(
            'h-7 w-5 grid place-items-center rounded text-ink-4 hover:text-ink hover:bg-surface-sunken transition-colors shrink-0',
            isDragging ? 'cursor-grabbing text-accent-deep' : 'cursor-grab',
          )}
          aria-label={`Drag to reorder ${recipient.name}`}
          tabIndex={0}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="w-5 shrink-0" aria-hidden />
      )}

      {sequential ? (
        <span className="font-mono text-[10.5px] text-ink-4 w-5 text-center shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>
      ) : null}

      <span
        className={cn(
          'h-8 w-8 grid place-items-center rounded-pill bg-gradient-to-br text-[12px] font-semibold uppercase shrink-0',
          tone,
        )}
      >
        {recipient.name[0]}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink truncate">
          {recipient.name}
        </p>
        <p className="text-[12px] text-ink-3 truncate">{recipient.email}</p>
      </div>

      <ActionDropdown value={recipient.role} onChange={onChangeRole} />

      <button
        type="button"
        onClick={onRemove}
        className="h-7 w-7 grid place-items-center rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        aria-label="Remove recipient"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/* ─────────────── Action dropdown ─────────────── */

const ROLE_OPTIONS: {
  value: RecipientRole;
  label: string;
  icon: typeof Pen;
  hint: string;
}[] = [
  { value: 'SIGNER', label: 'Needs to sign', icon: Pen, hint: 'Must sign the document' },
  { value: 'CC', label: 'Receives a copy', icon: Mail, hint: 'Gets a copy when complete' },
  { value: 'VIEWER', label: 'Needs to view', icon: Eye, hint: 'Must view before completion' },
];

function ActionDropdown({
  value,
  onChange,
}: {
  value: RecipientRole;
  onChange: (v: RecipientRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = ROLE_OPTIONS.find((o) => o.value === value) ?? ROLE_OPTIONS[0];
  const Icon = current.icon;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium transition-colors',
          'bg-surface-2 border border-border-strong text-ink-2 hover:border-accent hover:text-ink',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon className="h-3.5 w-3.5 text-ink-3" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="h-3 w-3 text-ink-3" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-56 glass-strong shadow-popover animate-scale-in origin-top-right p-1">
            {ROLE_OPTIONS.map((o) => {
              const O = o.icon;
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                    active
                      ? 'bg-accent-soft text-accent-deep'
                      : 'text-ink-2 hover:bg-surface-sunken hover:text-ink',
                  )}
                >
                  <O
                    className={cn(
                      'h-3.5 w-3.5 mt-0.5 shrink-0',
                      active ? 'text-accent-deep' : 'text-ink-3',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium">{o.label}</p>
                    <p
                      className={cn(
                        'text-[11px] mt-0.5',
                        active ? 'text-accent-deep/80' : 'text-ink-3',
                      )}
                    >
                      {o.hint}
                    </p>
                  </div>
                  {active ? (
                    <Check
                      className="h-3 w-3 text-accent-deep mt-1 shrink-0"
                      strokeWidth={3}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ─────────────── Review row ─────────────── */

function ReviewRow({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: 'ok' | 'pending' | 'todo';
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'h-5 w-5 grid place-items-center rounded-pill shrink-0',
          state === 'ok'
            ? 'bg-success/15'
            : state === 'pending'
              ? 'bg-warn/15 animate-pulse-soft'
              : 'bg-surface-sunken',
        )}
      >
        {state === 'ok' ? (
          <Check className="h-3 w-3 text-success" strokeWidth={3} />
        ) : null}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">
          {label}
        </p>
        <p className="text-[13px] text-ink truncate">{value}</p>
      </div>
    </div>
  );
}

function tempId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

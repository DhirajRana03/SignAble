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
import { useCreateEnvelope } from '@/hooks/useEnvelopes';
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

export function EnvelopeComposer() {
  const router = useRouter();
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<DraftRecipient[]>([]);
  const [title, setTitle] = useState('');
  const [signingOrder, setSigningOrder] = useState<SigningOrder>('SEQUENTIAL');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Primary document: first in list. Drives envelope creation + title seed.
  const primaryId = documentIds[0] ?? null;
  const docQuery = useDocument(primaryId ?? undefined);
  const primaryDoc = docQuery.data;
  const docReady = primaryDoc?.status === 'READY';

  useEffect(() => {
    if (primaryDoc && !title) {
      setTitle(
        primaryDoc.filename.replace(
          /\.(pdf|png|jpe?g|tiff?|bmp|gif|heic)$/i,
          '',
        ),
      );
    }
  }, [primaryDoc, title]);

  const createEnvelope = useCreateEnvelope();
  const deleteDoc = useDeleteDocument();
  const signerCount = recipients.filter((r) => r.role === 'SIGNER').length;
  const canSubmit = docReady && signerCount > 0 && !!title && !submitting;

  const handleRemoveDoc = (id: string) => {
    setDocumentIds((ids) => ids.filter((d) => d !== id));
    if (primaryId === id && documentIds.length === 1 && !title) {
      // Optional: clear title if user never edited it. Simpler: keep title.
    }
    deleteDoc.mutate(id);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryId || !docReady) {
      setSubmitError('Wait for document to finish processing.');
      return;
    }
    if (signerCount === 0) {
      setSubmitError('Add at least one signer.');
      return;
    }
    if (!title.trim()) {
      setSubmitError('Title required.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const envelope = await createEnvelope.mutateAsync({
        documentId: primaryId,
        title: title.trim(),
        signingOrder,
      });
      const { envelopeService } = await import('@/services/envelope.service');
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        await envelopeService.addRecipient(envelope.id, {
          name: r.name,
          email: r.email,
          orderIndex: i,
          role: r.role,
        });
      }
      toast.success('Envelope created');
      router.push(`/envelopes/${envelope.id}/prepare`);
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
      setSubmitting(false);
    }
  };

  const sequential = signingOrder === 'SEQUENTIAL';

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

          {documentIds.length > 0 ? (
            <ul className="space-y-2 mb-3">
              {documentIds.map((id, idx) => (
                <DocumentRow
                  key={id}
                  documentId={id}
                  primary={idx === 0}
                  onRemove={() => handleRemoveDoc(id)}
                />
              ))}
            </ul>
          ) : null}

          <DocumentDropzoneCompact
            hasExisting={documentIds.length > 0}
            onUploaded={(id) =>
              setDocumentIds((ids) =>
                ids.includes(id) ? ids : [...ids, id],
              )
            }
          />
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

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            loading={submitting}
            disabled={!canSubmit}
          >
            {submitting ? 'Creating…' : 'Create envelope'}
          </Button>
          <p className="text-[11px] text-ink-4 mt-2.5 text-center">
            Next: place fields, then send.
          </p>
        </div>
      </aside>
    </form>
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

  // Active upload view: filename + progress + cancel.
  if (upload.isPending) {
    return (
      <div className="rounded-md border-2 border-dashed border-accent bg-accent-soft/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 grid place-items-center rounded-pill bg-accent text-white shrink-0">
            <UploadCloud className="h-4 w-4 animate-pulse" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-ink truncate">
              {uploadingName ?? 'Uploading…'}
            </p>
            <p className="text-[11.5px] text-ink-3 mt-0.5">
              {upload.progress}% uploaded
              {queueCount > 1 ? ` · ${queueCount} remaining` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              upload.cancel();
              setUploadingName(null);
            }}
            className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-[12px] font-medium text-ink-3 hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
            aria-label="Cancel upload"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
        <div className="mt-2.5 h-1 rounded-full bg-white/60 overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${upload.progress}%` }}
          />
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
        'relative cursor-pointer rounded-md border-2 border-dashed transition-all duration-150',
        'flex items-center gap-3 px-4 py-3',
        dragging
          ? 'border-accent bg-accent-soft/40'
          : 'border-border-strong bg-surface-1/40 hover:border-accent hover:bg-accent-soft/20',
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
          'h-9 w-9 grid place-items-center rounded-pill transition-all shrink-0',
          dragging ? 'bg-accent text-white' : 'bg-accent-soft text-accent-deep',
        )}
      >
        <UploadCloud className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">
          {hasExisting
            ? 'Add another file'
            : 'Drop files or click to browse'}
        </p>
        <p className="text-[11.5px] text-ink-3 mt-0.5">
          PDF or image · up to 50 MB · multiple allowed
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Document row (live status from server) ─────────────── */

function DocumentRow({
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

  return (
    <li className="relative group">
      <DocumentLine
        filename={doc?.filename ?? 'Loading…'}
        pageCount={doc?.pageCount ?? 0}
        status={status}
        errorMessage={failed ? doc?.errorMessage ?? null : null}
        primary={primary}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove document"
        title="Remove document"
        className={cn(
          'absolute -top-1.5 -right-1.5 h-5 w-5 grid place-items-center rounded-full',
          'bg-danger text-white shadow-sm',
          'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity',
          'hover:bg-danger/90 focus:outline-none focus:ring-2 focus:ring-danger/40',
        )}
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
      </button>
    </li>
  );
}

/* ─────────────── Document line ─────────────── */

function DocumentLine({
  filename,
  pageCount,
  status,
  errorMessage,
  primary = false,
}: {
  filename: string;
  pageCount: number;
  status: string;
  errorMessage: string | null;
  primary?: boolean;
}) {
  const isProcessing = status === 'PENDING' || status === 'PROCESSING';
  const isReady = status === 'READY';
  const isFailed = status === 'FAILED';

  return (
    <div className="flex items-center gap-3 p-3 rounded-md sunken">
      <div className="h-9 w-9 grid place-items-center rounded-md bg-accent-soft text-accent-deep shrink-0">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13.5px] font-medium text-ink truncate">
            {filename}
          </p>
          {primary ? (
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-accent-deep bg-accent-soft px-1.5 py-0.5 rounded-pill shrink-0">
              Primary
            </span>
          ) : null}
        </div>
        <p className="text-[11.5px] text-ink-3 mt-0.5">
          {isProcessing
            ? 'Processing pages…'
            : isReady
              ? `${pageCount} page${pageCount === 1 ? '' : 's'} · ready`
              : isFailed
                ? errorMessage ?? 'Failed'
                : status.toLowerCase()}
        </p>
      </div>
      <StatusChip status={status} />
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    PENDING: { tone: 'bg-surface-sunken text-ink-3', label: 'queued' },
    PROCESSING: { tone: 'bg-warn/12 text-warn', label: 'processing' },
    READY: { tone: 'bg-success/12 text-success', label: 'ready' },
    FAILED: { tone: 'bg-danger/12 text-danger', label: 'failed' },
  };
  const m = map[status] ?? map.PENDING;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em]',
        m.tone,
      )}
    >
      {m.label}
    </span>
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
}: {
  onAdd: (values: RecipientFormValues) => void;
}) {
  const form = useForm<RecipientFormValues>({
    resolver: zodResolver(recipientSchema),
    defaultValues: { name: '', email: '' },
  });

  const submit = form.handleSubmit((values) => {
    onAdd(values);
    form.reset({ name: '', email: '' });
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

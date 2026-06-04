'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  ChevronDown,
  Eye,
  FileText,
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
import { useDocument, useUploadDocument } from '@/hooks/useDocuments';
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

/**
 * Envelope composer — compact create flow.
 *
 * Layout:
 *   - Title inline at top
 *   - Document upload (small)
 *   - Recipients section with signing-order toggle in its header
 *     Each recipient has Name + Email + Action dropdown (signer/cc/viewer)
 *   - Sticky review sidebar with submit
 */
export function EnvelopeComposer() {
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<DraftRecipient[]>([]);
  const [title, setTitle] = useState('');
  const [signingOrder, setSigningOrder] = useState<SigningOrder>('SEQUENTIAL');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const docQuery = useDocument(documentId ?? undefined);
  const document = docQuery.data;
  const docReady = document?.status === 'READY';
  const docFailed = document?.status === 'FAILED';

  // Prefill title from filename when document arrives
  useEffect(() => {
    if (document && !title) {
      setTitle(
        document.filename.replace(/\.(pdf|png|jpe?g|tiff?|bmp|gif|heic)$/i, ''),
      );
    }
  }, [document, title]);

  const createEnvelope = useCreateEnvelope();
  const signerCount = recipients.filter((r) => r.role === 'SIGNER').length;
  const canSubmit = docReady && signerCount > 0 && !!title && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentId || !docReady) {
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
        documentId,
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

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 pb-12"
    >
      {/* Main column */}
      <div className="space-y-5">
        {/* Title — inline at top */}
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

        {/* Document — small uploader */}
        <div className="glass p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold tracking-[-0.018em]">
              Document
            </h3>
            {documentId ? (
              <button
                type="button"
                onClick={() => setDocumentId(null)}
                className="text-[11.5px] text-ink-3 hover:text-danger transition-colors"
              >
                Replace
              </button>
            ) : null}
          </div>

          {!documentId ? (
            <DocumentDropzoneCompact onUploaded={(id) => setDocumentId(id)} />
          ) : (
            <DocumentLine
              filename={document?.filename ?? 'Loading…'}
              pageCount={document?.pageCount ?? 0}
              status={document?.status ?? 'PENDING'}
              errorMessage={docFailed ? document?.errorMessage ?? null : null}
            />
          )}
        </div>

        {/* Recipients + signing-order in header */}
        <div className="glass p-4 lg:p-5">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.018em]">
                Recipients
              </h3>
              <p className="text-[12px] text-ink-3 mt-0.5">
                Add everyone who needs to sign, review, or get a copy.
              </p>
            </div>
            <SigningOrderToggle value={signingOrder} onChange={setSigningOrder} />
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
            <ul className="mt-3 space-y-1">
              {recipients.map((r, i) => (
                <RecipientItem
                  key={r.id}
                  index={i}
                  recipient={r}
                  onChangeRole={(role) =>
                    setRecipients((rs) =>
                      rs.map((x) => (x.id === r.id ? { ...x, role } : x)),
                    )
                  }
                  onRemove={() =>
                    setRecipients((rs) => rs.filter((x) => x.id !== r.id))
                  }
                />
              ))}
            </ul>
          ) : null}
        </div>

        {submitError ? (
          <div className="rounded-md border border-danger/30 bg-danger/8 px-4 py-3 text-[13px] text-danger">
            {submitError}
          </div>
        ) : null}
      </div>

      {/* Sticky review panel */}
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
              label="Document"
              value={
                docReady ? document!.filename : documentId ? 'Processing…' : 'Not uploaded'
              }
              state={docReady ? 'ok' : documentId ? 'pending' : 'todo'}
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
}: {
  onUploaded: (id: string) => void;
}) {
  const upload = useUploadDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      upload.mutate(file, { onSuccess: (doc) => onUploaded(doc.id) });
    },
    [upload, onUploaded],
  );

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
        upload.isPending && 'pointer-events-none opacity-60',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.gif,.heic,.heif,application/pdf,image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={cn(
          'h-9 w-9 grid place-items-center rounded-pill transition-all shrink-0',
          dragging ? 'bg-accent text-white' : 'bg-accent-soft text-accent-deep',
        )}
      >
        <UploadCloud
          className={cn('h-4 w-4', upload.isPending && 'animate-pulse')}
          strokeWidth={2}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">
          {upload.isPending ? 'Uploading…' : 'Drop a file or click to browse'}
        </p>
        <p className="text-[11.5px] text-ink-3 mt-0.5">
          PDF or image · up to 50 MB
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Document line (after upload) ─────────────── */

function DocumentLine({
  filename,
  pageCount,
  status,
  errorMessage,
}: {
  filename: string;
  pageCount: number;
  status: string;
  errorMessage: string | null;
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
        <p className="text-[13.5px] font-medium text-ink truncate">{filename}</p>
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

/* ─────────────── Signing order toggle (segment control) ─────────────── */

function SigningOrderToggle({
  value,
  onChange,
}: {
  value: SigningOrder;
  onChange: (v: SigningOrder) => void;
}) {
  const opts: { value: SigningOrder; label: string }[] = [
    { value: 'SEQUENTIAL', label: 'Sequential' },
    { value: 'PARALLEL', label: 'Parallel' },
  ];
  return (
    <div className="inline-flex items-center rounded-pill bg-surface-sunken p-0.5">
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'h-7 px-3 rounded-pill text-[11.5px] font-medium transition-all duration-150',
              active
                ? 'bg-surface-2 text-ink shadow-soft'
                : 'text-ink-3 hover:text-ink',
            )}
            aria-pressed={active}
          >
            {o.label}
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

/* ─────────────── Recipient row with action dropdown ─────────────── */

const ROLE_OPTIONS: { value: RecipientRole; label: string; icon: typeof Pen; hint: string }[] = [
  { value: 'SIGNER', label: 'Needs to sign', icon: Pen, hint: 'Must sign the document' },
  { value: 'CC', label: 'Receives a copy', icon: Mail, hint: 'Gets a copy when complete' },
  { value: 'VIEWER', label: 'Needs to view', icon: Eye, hint: 'Must view before completion' },
];

function RecipientItem({
  index,
  recipient,
  onChangeRole,
  onRemove,
}: {
  index: number;
  recipient: DraftRecipient;
  onChangeRole: (role: RecipientRole) => void;
  onRemove: () => void;
}) {
  const tones = [
    'from-violet-400/30 to-indigo-500/30 text-indigo-700',
    'from-amber-400/30 to-orange-500/30 text-orange-700',
    'from-emerald-400/30 to-teal-500/30 text-teal-700',
    'from-sky-400/30 to-blue-500/30 text-blue-700',
    'from-pink-400/30 to-rose-500/30 text-rose-700',
  ];
  const tone = tones[index % tones.length];

  return (
    <li className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-surface-sunken/60 transition-colors">
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
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
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

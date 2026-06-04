'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowUpRight,
  Check,
  FileText,
  Mail,
  Plus,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDocument, useUploadDocument } from '@/hooks/useDocuments';
import {
  useAddRecipient,
  useCreateEnvelope,
} from '@/hooks/useEnvelopes';
import { cn, recipientColor } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api-client';
import type { Document } from '@/types/document.types';
import type { SigningOrder } from '@/types/envelope.types';

interface DraftRecipient {
  id: string; // client-only temp id
  name: string;
  email: string;
}

const recipientSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
});
type RecipientFormValues = z.infer<typeof recipientSchema>;

const envelopeSchema = z.object({
  title: z.string().min(1, 'Title required').max(500),
  message: z.string().max(5000).optional(),
  signingOrder: z.enum(['SEQUENTIAL', 'PARALLEL']),
});
type EnvelopeFormValues = z.infer<typeof envelopeSchema>;

/**
 * Single-page envelope composer.
 *
 * Sections (top-to-bottom):
 *   1. Document — inline uploader, polls processing status
 *   2. Recipients — name + email form, client-side list
 *   3. Envelope — title, message, signing order
 *
 * Submit flow: ensure document READY → create envelope → add all recipients
 * sequentially → navigate to /prepare for field placement.
 */
export function EnvelopeComposer() {
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<DraftRecipient[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Poll the document until READY
  const docQuery = useDocument(documentId ?? undefined);
  const document = docQuery.data;
  const docReady = document?.status === 'READY';
  const docFailed = document?.status === 'FAILED';

  // Envelope form — title prefills from filename once document arrives
  const envelopeForm = useForm<EnvelopeFormValues>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: {
      title: '',
      message: '',
      signingOrder: 'SEQUENTIAL',
    },
  });

  // Sync title default when document filename arrives
  if (
    document &&
    !envelopeForm.getValues('title') &&
    !envelopeForm.formState.isDirty
  ) {
    envelopeForm.setValue(
      'title',
      document.filename.replace(/\.(pdf|png|jpe?g|tiff?|bmp|gif|heic)$/i, ''),
      { shouldDirty: false },
    );
  }

  const createEnvelope = useCreateEnvelope();
  // addRecipient mutation factory expects envelope id at call time — we'll
  // build a fresh per-envelope mutation via service inside submit handler.

  const canSubmit =
    docReady &&
    recipients.length > 0 &&
    !!envelopeForm.watch('title') &&
    !submitting;

  const onSubmit = envelopeForm.handleSubmit(async (values) => {
    if (!documentId || !docReady) {
      setSubmitError('Upload + wait for document to finish processing first.');
      return;
    }
    if (recipients.length === 0) {
      setSubmitError('Add at least one recipient.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      // 1. Create envelope
      const envelope = await createEnvelope.mutateAsync({
        documentId,
        title: values.title,
        message: values.message?.trim() || undefined,
        signingOrder: values.signingOrder as SigningOrder,
      });

      // 2. Add recipients sequentially (preserve order)
      const { envelopeService } = await import('@/services/envelope.service');
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        await envelopeService.addRecipient(envelope.id, {
          name: r.name,
          email: r.email,
          orderIndex: i,
        });
      }

      // 3. Navigate to field placement
      toast.success('Envelope created');
      router.push(`/envelopes/${envelope.id}/prepare`);
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-20 pb-16 max-w-4xl">
      {/* ──────────── 1. Document ──────────── */}
      <section className="space-y-6 animate-fade-up">
        <SectionHeader
          step="01"
          eyebrow="Document"
          title="What needs signing?"
          accent="Upload it."
          description="PDFs and common image formats. We will render every page for field placement."
        />

        {!documentId ? (
          <DocumentDropzone onUploaded={(id) => setDocumentId(id)} />
        ) : (
          <DocumentStatusLine
            document={document}
            loading={docQuery.isLoading}
            failed={docFailed}
            onReplace={() => setDocumentId(null)}
          />
        )}
      </section>

      <div className="rule" />

      {/* ──────────── 2. Recipients ──────────── */}
      <section className="space-y-6 animate-fade-up">
        <SectionHeader
          step="02"
          eyebrow="Recipients"
          title="Who needs to sign?"
          accent="Add them."
          description="Each recipient receives an email with a unique signing link. Order is preserved for sequential signing."
        />

        <RecipientInlineForm
          onAdd={(values) =>
            setRecipients((rs) => [
              ...rs,
              { id: tempId(), name: values.name, email: values.email },
            ])
          }
        />

        {recipients.length > 0 ? (
          <RecipientDraftList
            recipients={recipients}
            onRemove={(id) =>
              setRecipients((rs) => rs.filter((r) => r.id !== id))
            }
          />
        ) : (
          <p className="text-sm text-ink-soft py-2">
            No recipients added yet. Add the first above.
          </p>
        )}
      </section>

      <div className="rule" />

      {/* ──────────── 3. Envelope details ──────────── */}
      <section className="space-y-6 animate-fade-up">
        <SectionHeader
          step="03"
          eyebrow="Envelope"
          title="Title and tone."
          accent="Set the context."
          description="Shown in signing emails and on every recipient's signing page."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <Label htmlFor="env-title">Envelope title</Label>
            <Input
              id="env-title"
              placeholder="Q4 vendor agreement"
              {...envelopeForm.register('title')}
            />
            {envelopeForm.formState.errors.title ? (
              <p className="mt-1.5 text-xs text-danger">
                {envelopeForm.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="env-message">Message to signers (optional)</Label>
            <Textarea
              id="env-message"
              rows={3}
              placeholder="Please review and sign at your convenience. Thank you."
              {...envelopeForm.register('message')}
            />
          </div>

          <div className="lg:col-span-2">
            <Label className="mb-3">Signing order</Label>
            <SigningOrderPicker
              value={envelopeForm.watch('signingOrder')}
              onChange={(v) => envelopeForm.setValue('signingOrder', v)}
            />
          </div>
        </div>
      </section>

      {/* Error banner */}
      {submitError ? (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {submitError}
        </div>
      ) : null}

      {/* Submit bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
        <ReadinessSummary
          docReady={docReady}
          docPending={!!documentId && !docReady && !docFailed}
          recipientCount={recipients.length}
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!canSubmit}
        >
          {submitting ? 'Creating envelope…' : 'Continue to field placement'}
          {!submitting ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}
        </Button>
      </div>
    </form>
  );
}

/* ──────────────────── Section header ──────────────────── */

function SectionHeader({
  step,
  eyebrow,
  title,
  accent,
  description,
}: {
  step: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
}) {
  return (
    <header>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-display italic text-accent text-sm">{step}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
          {eyebrow}
        </span>
      </div>
      <h2 className="font-display tracking-tight">
        {title} <em className="italic-accent">{accent}</em>
      </h2>
      <p className="lede mt-3">{description}</p>
    </header>
  );
}

/* ──────────────────── Document dropzone ──────────────────── */

function DocumentDropzone({
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
      upload.mutate(file, {
        onSuccess: (doc) => onUploaded(doc.id),
      });
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
        'relative cursor-pointer rounded-md p-10 lg:p-14 transition-all group',
        'flex items-center gap-6 border border-dashed',
        dragging
          ? 'border-accent bg-accent-tint/30'
          : 'border-border hover:border-accent-soft hover:bg-paper-dim/30',
        upload.isPending && 'pointer-events-none opacity-70',
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
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-pill transition-all',
          dragging
            ? 'bg-accent text-accent-fg'
            : 'bg-paper-dim text-ink-soft group-hover:bg-accent-tint group-hover:text-accent-deep',
        )}
      >
        <UploadCloud
          className={cn('h-5 w-5', upload.isPending && 'animate-pulse')}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-display text-2xl tracking-tight">
          {upload.isPending ? 'Uploading…' : 'Drop a file, or click to browse'}
        </p>
        <p className="text-sm text-ink-soft mt-1">
          Max 50&nbsp;MB · PDF and common image formats
        </p>
      </div>
    </div>
  );
}

/* ──────────────────── Document status line ──────────────────── */

function DocumentStatusLine({
  document,
  loading,
  failed,
  onReplace,
}: {
  document: Document | undefined;
  loading: boolean;
  failed: boolean;
  onReplace: () => void;
}) {
  if (loading || !document) {
    return (
      <div className="flex items-center gap-4 py-4 animate-pulse">
        <div className="h-12 w-11 rounded-xs bg-paper-dim" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 bg-paper-dim rounded-pill" />
          <div className="h-3 w-1/4 bg-paper-dim rounded-pill" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-4 rounded-md">
      <div className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xs bg-accent-tint text-accent-deep">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-xl tracking-tight truncate">
          {document.filename}
        </p>
        <p className="text-xs text-ink-soft mt-0.5">
          {document.pageCount > 0
            ? `${document.pageCount} page${document.pageCount === 1 ? '' : 's'}`
            : 'Processing pages…'}
        </p>
        {failed && document.errorMessage ? (
          <p className="text-xs text-danger mt-1">{document.errorMessage}</p>
        ) : null}
      </div>
      <StatusBadge status={document.status} />
      <button
        type="button"
        onClick={onReplace}
        className="p-2 rounded-pill text-ink-mute hover:text-danger hover:bg-danger/5 transition-colors"
        aria-label="Replace document"
        title="Replace document"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ──────────────────── Recipient inline form ──────────────────── */

function RecipientInlineForm({
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
      className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-start"
    >
      <div className="sm:col-span-5">
        <Label htmlFor="r-name">Name</Label>
        <Input
          id="r-name"
          placeholder="Ada Lovelace"
          autoComplete="off"
          {...form.register('name')}
        />
        {form.formState.errors.name ? (
          <p className="mt-1.5 text-xs text-danger">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="sm:col-span-5">
        <Label htmlFor="r-email">Email</Label>
        <Input
          id="r-email"
          type="email"
          placeholder="ada@analytical.engine"
          autoComplete="off"
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <p className="mt-1.5 text-xs text-danger">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="sm:col-span-2 sm:pt-[26px]">
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          className="w-full"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────── Draft recipient list ──────────────────── */

function RecipientDraftList({
  recipients,
  onRemove,
}: {
  recipients: DraftRecipient[];
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="rule" />
      {recipients.map((r, i) => {
        const color = recipientColor(i);
        return (
          <div key={r.id}>
            <div className="group flex items-center gap-4 py-5 px-2 -mx-2 rounded-sm hover:bg-paper-dim/50 transition-colors">
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute w-6">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'h-9 w-9 rounded-pill border flex items-center justify-center text-xs font-mono uppercase font-medium',
                    color.bg,
                    color.fg,
                    'border-current',
                  )}
                >
                  {r.name[0]?.toUpperCase() ?? '?'}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-display text-lg tracking-tight truncate">
                  {r.name}
                </p>
                <p className="text-xs text-ink-soft truncate flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  {r.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRemove(r.id)}
                className="p-1.5 rounded-pill text-ink-mute hover:text-danger hover:bg-danger/5 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Remove recipient"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="rule" />
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────── Signing order picker ──────────────────── */

function SigningOrderPicker({
  value,
  onChange,
}: {
  value: SigningOrder;
  onChange: (v: SigningOrder) => void;
}) {
  const options: { value: SigningOrder; title: string; desc: string }[] = [
    {
      value: 'SEQUENTIAL',
      title: 'Sequential',
      desc: 'One signer at a time, in the order added. Recommended.',
    },
    {
      value: 'PARALLEL',
      title: 'Parallel',
      desc: 'Notify everyone at once. Anyone can sign first.',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'relative text-left rounded-md p-5 transition-all border',
              active
                ? 'border-accent bg-accent-tint/40'
                : 'border-border hover:border-accent-soft hover:bg-paper-dim/40',
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute right-3 top-3 inline-flex h-1.5 w-1.5 rounded-pill bg-accent"
              />
            ) : null}
            <p className="font-display text-lg tracking-tight">{o.title}</p>
            <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
              {o.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────── Readiness summary ──────────────────── */

function ReadinessSummary({
  docReady,
  docPending,
  recipientCount,
}: {
  docReady: boolean;
  docPending: boolean;
  recipientCount: number;
}) {
  return (
    <div className="flex items-center gap-4 text-xs text-ink-soft">
      <Pip label="Document" ok={docReady} pending={docPending} />
      <Pip label={`${recipientCount} signer${recipientCount === 1 ? '' : 's'}`} ok={recipientCount > 0} />
    </div>
  );
}

function Pip({
  label,
  ok,
  pending,
}: {
  label: string;
  ok: boolean;
  pending?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em]',
        ok ? 'text-success' : pending ? 'text-accent-deep' : 'text-ink-mute',
      )}
    >
      <span
        className={cn(
          'inline-block h-3 w-3 rounded-pill flex items-center justify-center',
          ok ? 'bg-success/15' : pending ? 'bg-accent-tint' : 'bg-paper-dim',
        )}
      >
        {ok ? (
          <Check className="h-2 w-2 text-success" strokeWidth={4} />
        ) : pending ? (
          <span className="h-1 w-1 rounded-pill bg-accent animate-pulse" />
        ) : (
          <UserRound className="h-2 w-2 text-ink-mute" />
        )}
      </span>
      {label}
    </span>
  );
}

/* ──────────────────── Util ──────────────────── */

function tempId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

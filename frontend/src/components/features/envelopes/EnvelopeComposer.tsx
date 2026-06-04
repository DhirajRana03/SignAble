'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  FileText,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { useDocument, useUploadDocument } from '@/hooks/useDocuments';
import { useCreateEnvelope } from '@/hooks/useEnvelopes';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api-client';
import type { SigningOrder } from '@/types/envelope.types';

interface DraftRecipient {
  id: string;
  name: string;
  email: string;
}

const recipientSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});
type RecipientFormValues = z.infer<typeof recipientSchema>;

const envelopeSchema = z.object({
  title: z.string().min(1, 'Required').max(500),
  message: z.string().max(5000).optional(),
  signingOrder: z.enum(['SEQUENTIAL', 'PARALLEL']),
});
type EnvelopeFormValues = z.infer<typeof envelopeSchema>;

export function EnvelopeComposer() {
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<DraftRecipient[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const docQuery = useDocument(documentId ?? undefined);
  const document = docQuery.data;
  const docReady = document?.status === 'READY';
  const docFailed = document?.status === 'FAILED';

  const envelopeForm = useForm<EnvelopeFormValues>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: { title: '', message: '', signingOrder: 'SEQUENTIAL' },
  });

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
  const canSubmit =
    docReady &&
    recipients.length > 0 &&
    !!envelopeForm.watch('title') &&
    !submitting;

  const onSubmit = envelopeForm.handleSubmit(async (values) => {
    if (!documentId || !docReady) {
      setSubmitError('Upload and wait for document to finish processing.');
      return;
    }
    if (recipients.length === 0) {
      setSubmitError('Add at least one recipient.');
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const envelope = await createEnvelope.mutateAsync({
        documentId,
        title: values.title,
        message: values.message?.trim() || undefined,
        signingOrder: values.signingOrder as SigningOrder,
      });

      const { envelopeService } = await import('@/services/envelope.service');
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        await envelopeService.addRecipient(envelope.id, {
          name: r.name,
          email: r.email,
          orderIndex: i,
        });
      }

      toast.success('Envelope created');
      router.push(`/envelopes/${envelope.id}/prepare`);
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-12 max-w-[640px]">
      {/* Document */}
      <Field label="Document">
        {!documentId ? (
          <DocumentDropzone onUploaded={(id) => setDocumentId(id)} />
        ) : (
          <DocumentLine
            filename={document?.filename ?? 'Loading…'}
            pageCount={document?.pageCount ?? 0}
            status={document?.status ?? 'PENDING'}
            errorMessage={docFailed ? document?.errorMessage ?? null : null}
            onReplace={() => setDocumentId(null)}
          />
        )}
      </Field>

      {/* Recipients */}
      <Field label="Recipients">
        <RecipientAddForm
          onAdd={(v) =>
            setRecipients((rs) => [
              ...rs,
              { id: tempId(), name: v.name, email: v.email },
            ])
          }
        />
        {recipients.length > 0 ? (
          <ul className="mt-2 divide-y divide-border-soft">
            {recipients.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center gap-2.5 py-2 group"
              >
                <span className="font-mono text-[10.5px] text-muted w-5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink truncate">{r.name}</p>
                  <p className="text-[11.5px] text-muted truncate">{r.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setRecipients((rs) => rs.filter((x) => x.id !== r.id))
                  }
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded-sm text-muted hover:text-danger hover:bg-danger/5 transition-opacity"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Field>

      {/* Title */}
      <Field label="Title">
        <Input
          placeholder="Q4 vendor agreement"
          {...envelopeForm.register('title')}
        />
        {envelopeForm.formState.errors.title ? (
          <p className="mt-1 text-[11.5px] text-danger">
            {envelopeForm.formState.errors.title.message}
          </p>
        ) : null}
      </Field>

      {/* Message */}
      <Field label="Message" optional>
        <Textarea
          rows={3}
          placeholder="Please review and sign."
          {...envelopeForm.register('message')}
        />
      </Field>

      {/* Signing order */}
      <Field label="Signing order">
        <SigningOrderPicker
          value={envelopeForm.watch('signingOrder')}
          onChange={(v) => envelopeForm.setValue('signingOrder', v)}
        />
      </Field>

      {submitError ? (
        <div className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">
          {submitError}
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-3 border-t border-border-soft">
        <ReadyState
          docReady={docReady}
          docPending={!!documentId && !docReady && !docFailed}
          recipientCount={recipients.length}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={submitting}
          disabled={!canSubmit}
        >
          {submitting ? 'Creating…' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}

/* ────────── Field row ────────── */

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {optional ? (
          <span className="ml-1.5 text-muted-2 font-normal">optional</span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

/* ────────── Document dropzone ────────── */

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
        'relative cursor-pointer rounded-sm bg-paper border border-dashed transition-colors',
        'flex items-center gap-3 p-4',
        dragging
          ? 'border-accent bg-accent/8'
          : 'border-border-strong hover:border-accent hover:bg-ivory-2/40',
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
      <div className="h-8 w-8 grid place-items-center rounded-sm bg-ivory-2 text-muted shrink-0">
        <UploadCloud className={cn('h-3.5 w-3.5', upload.isPending && 'animate-pulse')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink">
          {upload.isPending ? 'Uploading…' : 'Drop a file or click to browse'}
        </p>
        <p className="text-[11.5px] text-muted">PDF or image, max 50 MB</p>
      </div>
    </div>
  );
}

/* ────────── Document line (uploaded) ────────── */

function DocumentLine({
  filename,
  pageCount,
  status,
  errorMessage,
  onReplace,
}: {
  filename: string;
  pageCount: number;
  status: string;
  errorMessage: string | null;
  onReplace: () => void;
}) {
  const isProcessing = status === 'PENDING' || status === 'PROCESSING';
  const isReady = status === 'READY';
  const isFailed = status === 'FAILED';

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-sm bg-paper border border-border">
      <div className="h-8 w-8 grid place-items-center rounded-sm bg-ivory-2 text-ink-3 shrink-0">
        <FileText className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink truncate">{filename}</p>
        <p className="text-[11.5px] text-muted">
          {isProcessing
            ? 'Processing…'
            : isReady
              ? `${pageCount} page${pageCount === 1 ? '' : 's'}`
              : isFailed
                ? errorMessage ?? 'Failed'
                : status.toLowerCase()}
        </p>
      </div>
      <StatusPill status={status} />
      <button
        type="button"
        onClick={onReplace}
        className="h-6 w-6 grid place-items-center rounded-sm text-muted hover:text-ink hover:bg-ivory-2"
        aria-label="Replace document"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    PENDING: { tone: 'text-muted bg-ivory-2', label: 'queued' },
    PROCESSING: { tone: 'text-warn bg-warn/10', label: 'processing' },
    READY: { tone: 'text-success bg-success/10', label: 'ready' },
    FAILED: { tone: 'text-danger bg-danger/10', label: 'failed' },
  };
  const m = map[status] ?? map.PENDING;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10.5px] uppercase tracking-[0.06em] font-medium',
        m.tone,
      )}
    >
      {m.label}
    </span>
  );
}

/* ────────── Recipient add form ────────── */

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
      className="flex flex-col sm:flex-row gap-2"
    >
      <div className="flex-1">
        <Input placeholder="Name" autoComplete="off" {...form.register('name')} />
        {form.formState.errors.name ? (
          <p className="mt-1 text-[11px] text-danger">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>
      <div className="flex-1">
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
        <Plus className="h-3 w-3" /> Add
      </Button>
    </div>
  );
}

/* ────────── Signing order picker ────────── */

function SigningOrderPicker({
  value,
  onChange,
}: {
  value: SigningOrder;
  onChange: (v: SigningOrder) => void;
}) {
  const opts: { value: SigningOrder; label: string; hint: string }[] = [
    { value: 'SEQUENTIAL', label: 'Sequential', hint: 'One at a time, in order' },
    { value: 'PARALLEL', label: 'Parallel', hint: 'Everyone at once' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'text-left rounded-sm bg-paper border px-3 py-2 transition-all duration-[120ms]',
              active
                ? 'border-ink shadow-[inset_0_0_0_1px_hsl(var(--ink))]'
                : 'border-border-strong hover:border-ink-3',
            )}
          >
            <p className="text-[12.5px] font-medium text-ink">{o.label}</p>
            <p className="text-[11px] text-muted mt-0.5">{o.hint}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ────────── Ready state pip ────────── */

function ReadyState({
  docReady,
  docPending,
  recipientCount,
}: {
  docReady: boolean;
  docPending: boolean;
  recipientCount: number;
}) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
      <span className="flex items-center gap-1">
        <Dot ok={docReady} pending={docPending} />
        Doc
      </span>
      <span className="flex items-center gap-1">
        <Dot ok={recipientCount > 0} />
        {recipientCount} signer{recipientCount === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function Dot({ ok, pending }: { ok: boolean; pending?: boolean }) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-pill grid place-items-center',
        ok
          ? 'bg-success/15'
          : pending
            ? 'bg-warn/15 animate-pulse-soft'
            : 'bg-ivory-2',
      )}
    >
      {ok ? (
        <Check className="h-1.5 w-1.5 text-success" strokeWidth={4} />
      ) : null}
    </span>
  );
}

function tempId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

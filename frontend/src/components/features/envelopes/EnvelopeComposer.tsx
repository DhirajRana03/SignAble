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
      setSubmitError('Upload and wait for the document to finish processing.');
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
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 pb-12">
      {/* Main column */}
      <div className="space-y-6">
        {/* Document section */}
        <Section
          step="1"
          title="Document"
          hint="Upload the file you want signed."
        >
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
        </Section>

        {/* Recipients section */}
        <Section
          step="2"
          title="Recipients"
          hint="Add everyone who needs to sign. They will receive a personal signing link via email."
        >
          <RecipientAddForm
            onAdd={(v) =>
              setRecipients((rs) => [
                ...rs,
                { id: tempId(), name: v.name, email: v.email },
              ])
            }
          />
          {recipients.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {recipients.map((r, i) => (
                <RecipientItem
                  key={r.id}
                  index={i}
                  recipient={r}
                  onRemove={() =>
                    setRecipients((rs) => rs.filter((x) => x.id !== r.id))
                  }
                />
              ))}
            </ul>
          ) : null}
        </Section>

        {/* Details section */}
        <Section
          step="3"
          title="Details"
          hint="What signers will see in their email and on the signing page."
        >
          <div className="space-y-5">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Q4 vendor agreement"
                {...envelopeForm.register('title')}
              />
              {envelopeForm.formState.errors.title ? (
                <p className="mt-1.5 text-[11.5px] text-danger">
                  {envelopeForm.formState.errors.title.message}
                </p>
              ) : null}
            </div>

            <div>
              <Label>
                Message <span className="text-ink-4 font-normal">optional</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="A short note that appears in every signing email."
                {...envelopeForm.register('message')}
              />
            </div>

            <div>
              <Label>Signing order</Label>
              <SigningOrderPicker
                value={envelopeForm.watch('signingOrder')}
                onChange={(v) => envelopeForm.setValue('signingOrder', v)}
              />
            </div>
          </div>
        </Section>

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
          <h2 className="mt-2 text-[18px]">Almost there</h2>
          <p className="text-[13px] text-ink-3 mt-1.5 leading-relaxed">
            We will create your envelope, then take you to place signature
            fields on the document.
          </p>

          <div className="mt-5 space-y-2.5">
            <ReviewRow
              label="Document"
              value={docReady ? document!.filename : documentId ? 'Processing…' : 'Not uploaded'}
              state={docReady ? 'ok' : documentId ? 'pending' : 'todo'}
            />
            <ReviewRow
              label="Recipients"
              value={`${recipients.length} signer${recipients.length === 1 ? '' : 's'}`}
              state={recipients.length > 0 ? 'ok' : 'todo'}
            />
            <ReviewRow
              label="Title"
              value={envelopeForm.watch('title') || 'Untitled'}
              state={envelopeForm.watch('title') ? 'ok' : 'todo'}
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

/* ─────────────── Section wrapper ─────────────── */

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass p-5 lg:p-6 animate-fade-up">
      <header className="flex items-start gap-3 mb-5">
        <span className="h-7 w-7 grid place-items-center rounded-pill bg-accent-soft text-accent-deep text-[12px] font-semibold shrink-0">
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-semibold tracking-[-0.022em] leading-tight">
            {title}
          </h3>
          {hint ? (
            <p className="text-[13px] text-ink-3 mt-0.5 leading-relaxed">{hint}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

/* ─────────────── Dropzone ─────────────── */

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
        'relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-150',
        'flex flex-col items-center justify-center gap-3 py-12 px-6 text-center',
        dragging
          ? 'border-accent bg-accent-soft/40 scale-[1.01]'
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
          'h-12 w-12 grid place-items-center rounded-pill transition-all',
          dragging
            ? 'bg-accent text-white scale-110'
            : 'bg-accent-soft text-accent-deep',
        )}
      >
        <UploadCloud
          className={cn('h-5 w-5', upload.isPending && 'animate-pulse')}
          strokeWidth={2}
        />
      </div>
      <div>
        <p className="text-[14px] font-medium text-ink">
          {upload.isPending ? 'Uploading…' : 'Drop your file here'}
        </p>
        <p className="text-[12.5px] text-ink-3 mt-1">
          or <span className="text-accent-deep font-medium">click to browse</span>
          {' '}— PDF or image, up to 50 MB
        </p>
      </div>
    </div>
  );
}

/* ─────────────── Document line ─────────────── */

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
    <div className="flex items-center gap-3 p-3 rounded-md sunken">
      <div className="h-10 w-10 grid place-items-center rounded-md bg-accent-soft text-accent-deep shrink-0">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink truncate">{filename}</p>
        <p className="text-[12px] text-ink-3 mt-0.5">
          {isProcessing
            ? 'Processing pages…'
            : isReady
              ? `${pageCount} page${pageCount === 1 ? '' : 's'} · ready to send`
              : isFailed
                ? errorMessage ?? 'Failed'
                : status.toLowerCase()}
        </p>
      </div>
      <StatusChip status={status} />
      <button
        type="button"
        onClick={onReplace}
        className="h-8 w-8 grid place-items-center rounded-md text-ink-3 hover:text-ink hover:bg-surface-2"
        aria-label="Replace document"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
        <Label>Name</Label>
        <Input
          placeholder="Ada Lovelace"
          autoComplete="off"
          {...form.register('name')}
        />
        {form.formState.errors.name ? (
          <p className="mt-1.5 text-[11px] text-danger">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          placeholder="ada@analytical.engine"
          autoComplete="off"
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <p className="mt-1.5 text-[11px] text-danger">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="sm:pt-[30px]">
        <Button type="button" variant="secondary" size="md" onClick={submit}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

/* ─────────────── Recipient list item ─────────────── */

function RecipientItem({
  index,
  recipient,
  onRemove,
}: {
  index: number;
  recipient: DraftRecipient;
  onRemove: () => void;
}) {
  // Soft pastel rotation per signer
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
          'h-8 w-8 grid place-items-center rounded-pill bg-gradient-to-br text-[12px] font-semibold uppercase',
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
      <span className="font-mono text-[10.5px] text-ink-4 mr-1">
        {String(index + 1).padStart(2, '0')}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="h-7 w-7 grid place-items-center rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove recipient"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

/* ─────────────── Signing order picker ─────────────── */

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
    <div className="grid grid-cols-2 gap-3">
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'relative text-left rounded-md p-4 transition-all duration-150',
              active
                ? 'bg-accent-soft border border-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.12)]'
                : 'sunken border border-border-soft hover:border-border-strong',
            )}
          >
            <p className={cn('text-[13.5px] font-medium', active ? 'text-accent-deep' : 'text-ink')}>
              {o.label}
            </p>
            <p className="text-[11.5px] text-ink-3 mt-0.5">{o.hint}</p>
            {active ? (
              <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-pill bg-accent" />
            ) : null}
          </button>
        );
      })}
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
        <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">{label}</p>
        <p className="text-[13px] text-ink truncate">{value}</p>
      </div>
    </div>
  );
}

function tempId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

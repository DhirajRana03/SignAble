'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import {
  useAddRecipient,
  useCreateEnvelope,
  useDeleteRecipient,
  useEnvelope,
  useUpdateRecipient,
} from '@/hooks/useEnvelopes';
import { cn, recipientColor } from '@/lib/utils';
import type { Document } from '@/types/document.types';
import type { Recipient, SigningOrder } from '@/types/envelope.types';

const envelopeSchema = z.object({
  title: z.string().min(1, 'Title required'),
  message: z.string().max(5000).optional(),
  signingOrder: z.enum(['SEQUENTIAL', 'PARALLEL']),
});
type EnvelopeForm = z.infer<typeof envelopeSchema>;

const recipientSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
});
type RecipientForm = z.infer<typeof recipientSchema>;

/**
 * Two-stage envelope creation wizard.
 *   Step 1: title + message + signing order → create draft envelope
 *   Step 2: add + order recipients → navigate to /prepare for field placement
 * All API calls flow through dedicated mutation hooks.
 */
export function EnvelopeWizard({
  document,
  existingEnvelopeId,
}: {
  document: Document;
  existingEnvelopeId?: string;
}) {
  const router = useRouter();
  const [envelopeId, setEnvelopeId] = useState<string | null>(
    existingEnvelopeId ?? null,
  );

  return (
    <div className="space-y-12 lg:space-y-16 pb-16">
      <StepRail current={envelopeId ? 2 : 1} />

      {!envelopeId ? (
        <EnvelopeStep
          document={document}
          onCreated={(id) => setEnvelopeId(id)}
        />
      ) : (
        <RecipientsStep
          envelopeId={envelopeId}
          onContinue={() => router.push(`/envelopes/${envelopeId}/prepare`)}
          onBack={() => setEnvelopeId(null)}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Step indicator ───────────────────────── */

function StepRail({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Envelope' },
    { n: 2, label: 'Recipients' },
    { n: 3, label: 'Fields' },
  ] as const;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-pill border text-[10px] font-mono transition-colors',
                  done && 'border-accent bg-accent text-accent-fg',
                  active && 'border-accent bg-accent-tint text-accent-deep',
                  !done && !active && 'border-border text-ink-mute',
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  String(s.n).padStart(2, '0')
                )}
              </span>
              <span
                className={cn(
                  'font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
                  active ? 'text-ink' : done ? 'text-ink-soft' : 'text-ink-mute',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  'h-px w-12 transition-colors',
                  done ? 'bg-accent' : 'bg-border',
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Step 1 — envelope ───────────────────────── */

function EnvelopeStep({
  document,
  onCreated,
}: {
  document: Document;
  onCreated: (id: string) => void;
}) {
  const create = useCreateEnvelope();
  const form = useForm<EnvelopeForm>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: {
      title: document.filename.replace(/\.(pdf|png|jpe?g|tiff?|bmp|gif|heic)$/i, ''),
      message: '',
      signingOrder: 'SEQUENTIAL',
    },
  });

  const onCreate = form.handleSubmit((values) => {
    create.mutate(
      {
        documentId: document.id,
        title: values.title,
        message: values.message?.trim() || undefined,
        signingOrder: values.signingOrder as SigningOrder,
      },
      { onSuccess: (env) => onCreated(env.id) },
    );
  });

  return (
    <form onSubmit={onCreate} className="space-y-12 max-w-3xl animate-fade-up">
      <DocumentLine document={document} />

      <div className="space-y-10">
        <div className="space-y-2">
          <span className="eyebrow">Step one</span>
          <h2 className="font-display tracking-tight">
            Title this envelope.{' '}
            <em className="italic-accent">Set the tone.</em>
          </h2>
          <p className="lede mt-3">
            Choose what signers see in their email and how the document
            should be routed.
          </p>
        </div>

        <div className="rule" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 py-2">
          <div>
            <p className="font-display text-lg tracking-tight">Title</p>
            <p className="text-sm text-ink-soft mt-1">
              Shown in the recipient's inbox.
            </p>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="title">Envelope title</Label>
            <Input
              id="title"
              autoFocus
              placeholder="Q4 vendor agreement"
              {...form.register('title')}
            />
            {form.formState.errors.title ? (
              <p className="mt-2 text-xs text-danger">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rule" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 py-2">
          <div>
            <p className="font-display text-lg tracking-tight">Message</p>
            <p className="text-sm text-ink-soft mt-1">
              Optional note appears in every signing email.
            </p>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="message">Message to signers</Label>
            <Textarea
              id="message"
              rows={4}
              placeholder="Please review and sign at your convenience. Thank you."
              {...form.register('message')}
            />
          </div>
        </div>

        <div className="rule" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 py-2">
          <div>
            <p className="font-display text-lg tracking-tight">Signing order</p>
            <p className="text-sm text-ink-soft mt-1">
              Sequential routes one signer at a time; parallel notifies
              everyone at once.
            </p>
          </div>
          <div className="lg:col-span-2">
            <SigningOrderPicker
              value={form.watch('signingOrder')}
              onChange={(v) => form.setValue('signingOrder', v)}
            />
          </div>
        </div>
      </div>

      <div className="rule" />

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" loading={create.isPending}>
          Continue
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}

/* ───────────────────────── Document line ───────────────────────── */

function DocumentLine({ document }: { document: Document }) {
  return (
    <div className="flex items-center gap-4 py-4 -mx-2 px-2">
      <div className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xs bg-accent-tint text-accent-deep">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
          Source document
        </span>
        <p className="font-display text-xl tracking-tight truncate mt-0.5">
          {document.filename}
        </p>
        <p className="text-xs text-ink-soft">
          {document.pageCount} page{document.pageCount === 1 ? '' : 's'} ·
          ready
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Signing order picker ───────────────────────── */

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
      desc: 'One signer at a time, in order. Recommended.',
    },
    {
      value: 'PARALLEL',
      title: 'Parallel',
      desc: 'Notify all signers at once.',
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

/* ───────────────────────── Step 2 — recipients ───────────────────────── */

function RecipientsStep({
  envelopeId,
  onContinue,
  onBack,
}: {
  envelopeId: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  const envelope = useEnvelope(envelopeId);
  const recipients = envelope.data?.recipients ?? [];

  return (
    <div className="space-y-10 max-w-3xl animate-fade-up">
      <div className="space-y-2">
        <span className="eyebrow">Step two</span>
        <h2 className="font-display tracking-tight">
          Who needs to sign?{' '}
          <em className="italic-accent">Order matters.</em>
        </h2>
        <p className="lede mt-3">
          Add every recipient. In sequential mode, signing happens top-to-bottom.
          Reorder by nudging arrows.
        </p>
      </div>

      <div className="rule" />

      <RecipientForm envelopeId={envelopeId} nextIndex={recipients.length} />

      <RecipientList envelopeId={envelopeId} recipients={recipients} />

      <div className="rule" />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft hover:text-ink transition-colors"
        >
          ← Back
        </button>
        <Button
          variant="primary"
          size="lg"
          disabled={recipients.length === 0}
          onClick={onContinue}
        >
          Place fields
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Recipient inline form ───────────────────────── */

function RecipientForm({
  envelopeId,
  nextIndex,
}: {
  envelopeId: string;
  nextIndex: number;
}) {
  const add = useAddRecipient(envelopeId);
  const form = useForm<RecipientForm>({
    resolver: zodResolver(recipientSchema),
    defaultValues: { name: '', email: '' },
  });

  const onAdd = form.handleSubmit((values) => {
    add.mutate(
      { name: values.name, email: values.email, orderIndex: nextIndex },
      { onSuccess: () => form.reset({ name: '', email: '' }) },
    );
  });

  return (
    <form
      onSubmit={onAdd}
      className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-start"
    >
      <div className="sm:col-span-5">
        <Label htmlFor="r-name">Full name</Label>
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
          type="submit"
          variant="primary"
          loading={add.isPending}
          className="w-full"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </form>
  );
}

/* ───────────────────────── Recipient list ───────────────────────── */

function RecipientList({
  envelopeId,
  recipients,
}: {
  envelopeId: string;
  recipients: Recipient[];
}) {
  if (recipients.length === 0) {
    return (
      <div className="py-14 text-center">
        <div className="mx-auto w-fit rounded-pill bg-paper-dim p-3 text-ink-mute">
          <UserRound className="h-5 w-5" />
        </div>
        <p className="mt-4 font-display text-xl tracking-tight">
          No signers yet
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Add the first recipient above.
        </p>
      </div>
    );
  }

  // Pre-sort so the displayed index matches orderIndex
  const sorted = [...recipients].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Signers</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
          {recipients.length} total
        </span>
      </div>

      <div>
        <div className="rule" />
        {sorted.map((r, i) => (
          <RecipientRow
            key={r.id}
            envelopeId={envelopeId}
            recipient={r}
            index={i}
            total={sorted.length}
            siblings={sorted}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Single recipient row ───────────────────────── */

function RecipientRow({
  envelopeId,
  recipient,
  index,
  total,
  siblings,
}: {
  envelopeId: string;
  recipient: Recipient;
  index: number;
  total: number;
  siblings: Recipient[];
}) {
  const del = useDeleteRecipient(envelopeId);
  const update = useUpdateRecipient(envelopeId);
  const color = recipientColor(index);

  const move = (direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= total) return;
    const swap = siblings[targetIndex];
    // Swap orderIndex via two updates
    update.mutate({
      recipientId: recipient.id,
      input: { orderIndex: swap.orderIndex },
    });
    update.mutate({
      recipientId: swap.id,
      input: { orderIndex: recipient.orderIndex },
    });
  };

  return (
    <>
      <div className="group flex items-center gap-4 py-5 px-2 -mx-2 rounded-sm hover:bg-paper-dim/50 transition-colors">
        {/* Order number + color chip */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute w-6">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            className={cn(
              'h-9 w-9 rounded-pill border flex items-center justify-center text-xs font-mono uppercase font-medium',
              color.bg,
              color.fg,
              'border-current',
            )}
          >
            {recipient.name[0]?.toUpperCase()}
          </span>
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg tracking-tight truncate">
            {recipient.name}
          </p>
          <p className="text-xs text-ink-soft truncate">{recipient.email}</p>
        </div>

        {/* Reorder + delete */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={index === 0 || update.isPending}
            className="p-1.5 rounded-pill text-ink-mute hover:text-ink hover:bg-paper-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={index === total - 1 || update.isPending}
            className="p-1.5 rounded-pill text-ink-mute hover:text-ink hover:bg-paper-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => del.mutate(recipient.id)}
            disabled={del.isPending}
            className="p-1.5 rounded-pill text-ink-mute hover:text-danger hover:bg-danger/5 transition-colors"
            aria-label="Remove signer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="rule" />
    </>
  );
}

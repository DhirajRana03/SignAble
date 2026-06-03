'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Mail, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  useAddRecipient,
  useCreateEnvelope,
  useDeleteRecipient,
  useEnvelope,
} from '@/hooks/useEnvelopes';
import { cn, recipientColor } from '@/lib/utils';
import type { Document } from '@/types/document.types';
import type { SigningOrder } from '@/types/envelope.types';

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
 * Two-stage envelope creation wizard:
 *   1. Pick title + message + signing order → create draft → redirect to step 2
 *   2. Add recipients → "Continue" → /envelopes/:id/prepare (field placement)
 *
 * Logic delegated to mutation hooks. Component decides only what to render.
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
  const create = useCreateEnvelope();

  const envelopeForm = useForm<EnvelopeForm>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: {
      title: document.filename.replace(/\.pdf$/i, ''),
      message: '',
      signingOrder: 'SEQUENTIAL',
    },
  });

  const onCreate = envelopeForm.handleSubmit((values) => {
    create.mutate(
      {
        documentId: document.id,
        title: values.title,
        message: values.message?.trim() || undefined,
        signingOrder: values.signingOrder as SigningOrder,
      },
      { onSuccess: (env) => setEnvelopeId(env.id) },
    );
  });

  if (!envelopeId) {
    return (
      <form onSubmit={onCreate} className="space-y-8 max-w-2xl">
        <DocumentPreview document={document} />

        <div className="sheet p-6 space-y-5">
          <h2 className="font-display text-xl tracking-tight">Envelope</h2>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...envelopeForm.register('title')} />
            {envelopeForm.formState.errors.title ? (
              <p className="mt-1 text-xs text-danger">
                {envelopeForm.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="message">Message to signers (optional)</Label>
            <Textarea
              id="message"
              rows={3}
              placeholder="Please review the attached document and sign at your convenience."
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

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="accent"
            loading={create.isPending}
          >
            Continue → Recipients
          </Button>
        </div>
      </form>
    );
  }

  return (
    <RecipientsStep
      envelopeId={envelopeId}
      onContinue={() => router.push(`/envelopes/${envelopeId}/prepare`)}
    />
  );
}

function DocumentPreview({ document }: { document: Document }) {
  return (
    <div className="sheet flex items-center gap-4 p-4">
      <div className="flex h-12 w-10 items-center justify-center rounded-sm border border-border bg-paper-dim">
        <FileText className="h-5 w-5 text-ink-faint" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{document.filename}</p>
        <p className="text-xs text-ink-soft">
          {document.pageCount} page{document.pageCount === 1 ? '' : 's'} ·
          ready
        </p>
      </div>
      <StatusBadge status={document.status} />
    </div>
  );
}

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
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'relative text-left rounded-md border p-4 transition-all overflow-hidden',
            value === o.value
              ? 'border-accent bg-accent-tint/40 shadow-paper'
              : 'border-border hover:border-accent-soft hover:bg-paper-dim/40',
          )}
        >
          {value === o.value ? (
            <span
              aria-hidden
              className="absolute right-3 top-3 inline-flex h-1.5 w-1.5 rounded-pill bg-accent animate-pulse-coral"
            />
          ) : null}
          <p className="font-display text-base tracking-tight">{o.title}</p>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed">{o.desc}</p>
        </button>
      ))}
    </div>
  );
}

function RecipientsStep({
  envelopeId,
  onContinue,
}: {
  envelopeId: string;
  onContinue: () => void;
}) {
  const envelope = useEnvelope(envelopeId);
  const add = useAddRecipient(envelopeId);
  const del = useDeleteRecipient(envelopeId);

  const form = useForm<RecipientForm>({
    resolver: zodResolver(recipientSchema),
    defaultValues: { name: '', email: '' },
  });

  const onAdd = form.handleSubmit((values) => {
    add.mutate(
      {
        name: values.name,
        email: values.email,
        orderIndex: envelope.data?.recipients?.length ?? 0,
      },
      { onSuccess: () => form.reset() },
    );
  });

  const recipients = envelope.data?.recipients ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="sheet p-6 space-y-5">
        <div>
          <h2 className="font-display text-xl tracking-tight">Recipients</h2>
          <p className="text-sm text-ink-soft mt-1">
            Add everyone who needs to sign.
          </p>
        </div>

        <form onSubmit={onAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <Label htmlFor="r-name">Name</Label>
            <Input id="r-name" placeholder="Ada Lovelace" {...form.register('name')} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="r-email">Email</Label>
            <Input id="r-email" type="email" placeholder="ada@analytical.engine" {...form.register('email')} />
          </div>
          <Button type="submit" loading={add.isPending}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </form>
        {form.formState.errors.email ? (
          <p className="text-xs text-danger">{form.formState.errors.email.message}</p>
        ) : null}

        {recipients.length === 0 ? (
          <div className="text-center py-6 text-sm text-ink-faint border border-dashed border-border rounded-sm">
            No recipients added yet.
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-sm">
            {recipients.map((r, i) => {
              const color = recipientColor(i);
              return (
                <li key={r.id} className="flex items-center gap-3 p-3">
                  <span
                    className={cn(
                      'h-7 w-7 rounded-sm border flex items-center justify-center text-xs font-mono uppercase',
                      color.bg,
                      color.fg,
                      'border-current',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{r.name}</p>
                    <p className="text-xs text-ink-soft truncate">
                      {r.email}
                    </p>
                  </div>
                  <button
                    onClick={() => del.mutate(r.id)}
                    className="p-1.5 text-ink-faint hover:text-danger rounded-sm hover:bg-danger/5"
                    aria-label="Remove recipient"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          variant="accent"
          disabled={recipients.length === 0}
          onClick={onContinue}
        >
          <Mail className="h-3.5 w-3.5" /> Continue → Place fields
        </Button>
      </div>
    </div>
  );
}

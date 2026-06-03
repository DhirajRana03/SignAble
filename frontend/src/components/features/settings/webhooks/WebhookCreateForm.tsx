'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useCreateWebhook } from '@/hooks/useWebhooks';
import { cn } from '@/lib/utils';
import {
  WEBHOOK_EVENT_TYPES,
  type WebhookEventType,
} from '@/types/webhook.types';

const schema = z.object({
  url: z
    .string()
    .url('Provide a fully-qualified https:// URL')
    .refine((v) => v.startsWith('https://') || v.startsWith('http://'), {
      message: 'URL must start with http:// or https://',
    }),
});

type FormValues = z.infer<typeof schema>;

const EVENT_LABEL: Record<WebhookEventType, string> = {
  ENVELOPE_CREATED: 'Envelope created',
  ENVELOPE_SENT: 'Envelope sent',
  DOCUMENT_VIEWED: 'Document viewed',
  RECIPIENT_SIGNED: 'Recipient signed',
  RECIPIENT_DECLINED: 'Recipient declined',
  ENVELOPE_COMPLETED: 'Envelope completed',
  ENVELOPE_VOIDED: 'Envelope voided',
};

export function WebhookCreateForm() {
  const create = useCreateWebhook();
  const [selected, setSelected] = useState<Set<WebhookEventType>>(new Set());
  const allSelected = selected.size === 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: '' },
  });

  const toggleEvent = (e: WebhookEventType) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        url: values.url,
        events: allSelected ? undefined : [...selected],
      },
      {
        onSuccess: () => {
          form.reset();
          setSelected(new Set());
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} className="sheet p-5 space-y-5" noValidate>
      <div>
        <Label htmlFor="url">Endpoint URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://yourapp.com/webhooks/sinable"
          {...form.register('url')}
        />
        {form.formState.errors.url ? (
          <p className="mt-1 text-xs text-danger">
            {form.formState.errors.url.message}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <Label className="mb-0">Subscribed events</Label>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-faint hover:text-accent"
          >
            All events
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {WEBHOOK_EVENT_TYPES.map((e) => {
            const isOn = allSelected || selected.has(e);
            return (
              <button
                type="button"
                key={e}
                onClick={() => toggleEvent(e)}
                className={cn(
                  'flex items-center gap-2.5 rounded-sm border px-3 py-2 text-left transition-colors',
                  isOn
                    ? 'border-accent/40 bg-accent/5 text-ink'
                    : 'border-border text-ink-soft hover:border-ink-faint',
                )}
                aria-pressed={isOn}
              >
                <span
                  className={cn(
                    'h-3.5 w-3.5 rounded-sm border flex items-center justify-center transition-colors',
                    isOn
                      ? 'border-accent bg-accent text-paper'
                      : 'border-ink-faint',
                  )}
                  aria-hidden
                >
                  {isOn ? (
                    <svg
                      viewBox="0 0 12 12"
                      className="h-2.5 w-2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M2 6l3 3 5-6" strokeLinecap="round" />
                    </svg>
                  ) : null}
                </span>
                <span className="text-xs">{EVENT_LABEL[e]}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-ink-faint mt-2">
          {allSelected
            ? 'Receiving every event. Pick specific events to narrow.'
            : `Receiving ${selected.size} of ${WEBHOOK_EVENT_TYPES.length}.`}
        </p>
      </div>

      <div className="flex justify-end pt-3 border-t border-border">
        <Button type="submit" variant="accent" loading={create.isPending}>
          <Plus className="h-3.5 w-3.5" />
          Register endpoint
        </Button>
      </div>
    </form>
  );
}

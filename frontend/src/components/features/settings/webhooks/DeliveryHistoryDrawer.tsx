'use client';

import { Check, ChevronDown, X, XCircle } from 'lucide-react';
import { useState } from 'react';

import { useWebhookDeliveries } from '@/hooks/useWebhooks';
import { cn, formatDate } from '@/lib/utils';
import type { WebhookDelivery, WebhookSubscription } from '@/types/webhook.types';

interface Props {
  hook: WebhookSubscription | null;
  onClose: () => void;
}

export function DeliveryHistoryDrawer({ hook, onClose }: Props) {
  const { data, isLoading } = useWebhookDeliveries(hook?.id ?? null);

  if (!hook) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-2xl bg-paper border-l border-border shadow-sheet flex flex-col animate-fade-up">
        {/* Header */}
        <header className="border-b border-border px-6 py-5 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <p className="label-mono mb-1">Delivery log</p>
            <h2 className="font-display text-2xl tracking-tight truncate">
              {hook.url}
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              Last 100 attempts, refreshing every 5 seconds.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-sm text-ink-faint hover:bg-paper-dim hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="px-6 py-12 text-center label-mono animate-pulse">
              loading deliveries…
            </div>
          ) : !data?.length ? (
            <div className="px-6 py-16 text-center">
              <p className="font-display text-xl mb-2">No deliveries yet</p>
              <p className="text-sm text-ink-soft">
                When an event fires, attempts will appear here in real time.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((d) => (
                <DeliveryRow key={d.id} delivery={d} />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-paper-dim/40 text-left"
        aria-expanded={open}
      >
        <span
          className={cn(
            'shrink-0 h-7 w-7 rounded-sm flex items-center justify-center',
            delivery.succeeded
              ? 'bg-success/10 text-success'
              : 'bg-danger/10 text-danger',
          )}
          aria-hidden
        >
          {delivery.succeeded ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-ink truncate">
            {delivery.eventType.toLowerCase().replace(/_/g, ' ')}
          </p>
          <p className="text-[11px] text-ink-soft mt-0.5">
            {formatDate(delivery.createdAt)}
          </p>
        </div>

        <span
          className={cn(
            'shrink-0 font-mono text-xs',
            delivery.responseStatus && delivery.responseStatus >= 200 && delivery.responseStatus < 300
              ? 'text-success'
              : delivery.responseStatus
                ? 'text-danger'
                : 'text-ink-faint',
          )}
        >
          {delivery.responseStatus ?? 'no response'}
        </span>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-ink-faint shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="px-6 pb-5 space-y-3 bg-paper-dim/30 animate-fade-up">
          <DetailBlock label="Payload">
            <pre className="font-mono text-[10.5px] leading-relaxed text-ink-soft whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
              {JSON.stringify(delivery.payload, null, 2)}
            </pre>
          </DetailBlock>
          {delivery.responseBody ? (
            <DetailBlock label="Response">
              <pre className="font-mono text-[10.5px] leading-relaxed text-ink-soft whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {delivery.responseBody}
              </pre>
            </DetailBlock>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border bg-paper p-3">
      <p className="label-mono mb-2">{label}</p>
      {children}
    </div>
  );
}

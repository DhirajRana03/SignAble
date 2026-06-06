'use client';

import {
  Activity,
  Check,
  Copy,
  Eye,
  EyeOff,
  Power,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeleteWebhook, useUpdateWebhook } from '@/hooks/useWebhooks';
import { cn, formatRelative } from '@/lib/utils';
import type { WebhookSubscription } from '@/types/webhook.types';

interface Props {
  hook: WebhookSubscription;
  onViewDeliveries: () => void;
}

export function WebhookCard({ hook, onViewDeliveries }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const update = useUpdateWebhook();
  const del = useDeleteWebhook();

  const allEvents = hook.events.length === 0;

  const copySecret = async () => {
    await navigator.clipboard.writeText(hook.secret);
    setCopied(true);
    toast.success('Signing secret copied');
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleActive = () => {
    update.mutate({ id: hook.id, input: { isActive: !hook.isActive } });
  };

  return (
    <article
      className={cn(
        'sheet relative p-5 animate-fade-up transition-opacity',
        !hook.isActive && 'opacity-60',
      )}
    >
      {/* Top: URL + status */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm truncate text-ink" title={hook.url}>
            {hook.url}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono uppercase tracking-[0.15em]">
            <span
              className={cn(
                'flex items-center gap-1',
                hook.isActive ? 'text-success' : 'text-ink-faint',
              )}
            >
              <span
                className={cn(
                  'inline-block h-1 w-1 rounded-full',
                  hook.isActive ? 'bg-success animate-pulse' : 'bg-ink-faint',
                )}
              />
              {hook.isActive ? 'live' : 'paused'}
            </span>
            <span className="text-ink-faint">·</span>
            <span className="text-ink-faint">
              last fired {formatRelative(hook.lastFiredAt)}
            </span>
            {hook.failureCount > 0 ? (
              <>
                <span className="text-ink-faint">·</span>
                <span className="text-danger">
                  {hook.failureCount} failures
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {allEvents ? (
          <span className="label-mono px-2 py-1 rounded-sm border border-border bg-paper-dim text-ink-soft">
            all events
          </span>
        ) : (
          hook.events.map((e) => (
            <span
              key={e}
              className="text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-1 rounded-sm border border-border bg-paper-dim text-ink-soft"
            >
              {e.toLowerCase().replace(/_/g, ' ')}
            </span>
          ))
        )}
      </div>

      {/* Signing secret */}
      <div className="mt-4 rounded-sm border border-border bg-paper-dim/40 p-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="label-mono">Signing secret</span>
          <button
            onClick={() => setRevealed((r) => !r)}
            className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-faint hover:text-accent flex items-center gap-1"
          >
            {revealed ? (
              <>
                <EyeOff className="h-3 w-3" /> Hide
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" /> Reveal
              </>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs flex-1 min-w-0 truncate select-all">
            {revealed ? hook.secret : '•'.repeat(40)}
          </code>
          <button
            onClick={copySecret}
            className="shrink-0 p-1.5 rounded-sm text-ink-faint hover:text-ink hover:bg-paper-dim"
            aria-label="Copy signing secret"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-ink-faint mt-2 leading-relaxed">
          Verify HMAC-SHA256 of raw body using this secret. Header:{' '}
          <code className="font-mono">X-SignAble-Signature</code>.
        </p>
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDeliveries}
        >
          <Activity className="h-3.5 w-3.5" />
          Deliveries
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleActive}
            loading={update.isPending}
            title={hook.isActive ? 'Pause delivery' : 'Resume delivery'}
          >
            <Power className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {hook.isActive ? 'Pause' : 'Resume'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            loading={del.isPending}
            className="text-danger hover:bg-danger/5"
            title="Delete webhook"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete webhook?"
        confirmLabel="Delete"
        busy={del.isPending}
        onClose={() => {
          if (!del.isPending) setDeleteOpen(false);
        }}
        onConfirm={() =>
          del.mutate(hook.id, {
            onSuccess: () => setDeleteOpen(false),
          })
        }
      >
        <p>
          Stops all future deliveries to{' '}
          <code className="font-mono text-ink">{hook.url}</code>. The
          signing secret is destroyed and cannot be recovered.
        </p>
      </ConfirmDialog>
    </article>
  );
}

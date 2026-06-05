'use client';

import { Eye, FileText, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import type { Envelope } from '@/types/envelope.types';

/**
 * Shared row layout used by Sent, Inbox, Archive, Completed buckets.
 * Mirrors DraftRow structure so envelope lists share visual rhythm:
 * document icon, title, signer progress, status, sent/modified dates,
 * action button on right. Action defaults to View.
 */
export function EnvelopeRow({
  envelope,
  index,
  actionHref,
  actionLabel = 'View',
  actionIcon: ActionIcon = Eye,
  dateLabel = 'Date & Time',
}: {
  envelope: Envelope;
  index: number;
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  dateLabel?: string;
}) {
  const recipients = envelope.recipients ?? [];
  const signed = recipients.filter((r) => r.status === 'SIGNED').length;
  const href = actionHref ?? `/envelopes/${envelope.id}`;
  const hasDocument = !!envelope.documentId;
  const recipientLabel =
    recipients.length > 0 ? recipients.map((r) => r.name).join(', ') : '—';

  return (
    <article
      className={cn(
        'glass px-4 py-3 flex items-center gap-4 animate-fade-up',
        'transition-all duration-200',
        'hover:border-accent/40 hover:shadow-lifted',
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Doc status icon */}
      <span
        className={cn(
          'h-9 w-9 grid place-items-center rounded-full shrink-0 border-2 transition-colors',
          hasDocument
            ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
            : 'border-border-strong text-ink-4 bg-surface-sunken',
        )}
        aria-label={hasDocument ? 'Document uploaded' : 'No document'}
        title={hasDocument ? 'Document uploaded' : 'No document'}
      >
        <FileText className="h-4 w-4" strokeWidth={2} />
      </span>

      {/* Title */}
      <div className="min-w-0 flex-1 basis-0 flex items-center gap-2.5">
        <h3 className="text-[13.5px] font-semibold text-ink truncate leading-tight">
          {envelope.title || 'Untitled envelope'}
        </h3>
      </div>

      {/* Status */}
      <div className="hidden md:flex flex-col flex-1 basis-0 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">
          Status
        </span>
        <div className="mt-0.5">
          <StatusBadge status={envelope.status} />
        </div>
      </div>

      {/* Signers + progress */}
      <div className="hidden md:flex flex-col flex-[2_2_0%] min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">
          Signers
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1 text-[11.5px] text-ink-3 shrink-0">
            <Users className="h-3 w-3" />
            <span>
              <span className="text-ink font-medium">{signed}</span>
              <span className="text-ink-4">/{recipients.length}</span>
            </span>
          </div>
          <span
            className={cn('text-[11.5px] text-ink-3 truncate min-w-0')}
            title={recipientLabel}
          >
            {recipientLabel}
          </span>
        </div>
      </div>

      {/* Date & Time */}
      <div className="hidden lg:flex flex-col flex-1 basis-0 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">
          {dateLabel}
        </span>
        <span className="text-[12px] text-ink-3 truncate">
          {formatDate(envelope.createdAt)}
        </span>
      </div>

      {/* Modified */}
      <div className="hidden lg:flex flex-col flex-1 basis-0 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3">
          Modified
        </span>
        <span className="text-[12px] text-ink-3 truncate">
          {formatRelative(envelope.createdAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link href={href}>
          <Button variant="accent" size="sm" className="!rounded-full px-4">
            <ActionIcon className="h-3 w-3" /> {actionLabel}
          </Button>
        </Link>
      </div>
    </article>
  );
}

'use client';

import { FileText, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useDeleteEnvelope } from '@/hooks/useEnvelopes';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import type { Envelope } from '@/types/envelope.types';

/**
 * Compact draft envelope card. Document icon turns green when an
 * envelope has a primary document attached, signalling upload state at
 * a glance. Clicking Edit routes to the composer where the user
 * finalizes documents, recipients, and metadata before sending.
 */
export function DraftCard({
  envelope,
  index,
}: {
  envelope: Envelope;
  index: number;
}) {
  const recipients = envelope.recipients ?? [];
  const editHref = `/envelopes/${envelope.id}/edit`;
  const del = useDeleteEnvelope();
  const [confirming, setConfirming] = useState(false);

  const hasDocument = !!envelope.documentId;
  const recipientLabel =
    recipients.length > 0 ? recipients.map((r) => r.name).join(', ') : '—';

  return (
    <article
      className={cn(
        'glass p-4 flex flex-col gap-2.5 animate-fade-up',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lifted hover:border-accent/40',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Title row */}
      <header className="flex items-center gap-2.5">
        <span
          className={cn(
            'h-8 w-8 grid place-items-center rounded-full shrink-0 border-2 transition-colors',
            hasDocument
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
              : 'border-border-strong text-ink-4 bg-surface-sunken',
          )}
          aria-label={hasDocument ? 'Document uploaded' : 'No document'}
          title={hasDocument ? 'Document uploaded' : 'No document'}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <h3 className="text-[13.5px] font-semibold text-ink truncate flex-1 leading-tight">
          {envelope.title || 'Untitled draft'}
        </h3>
        <span className="text-[9.5px] font-mono uppercase tracking-[0.08em] text-accent-deep bg-accent-soft px-1.5 py-0.5 rounded-pill shrink-0">
          Draft
        </span>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-[11.5px]">
        <dt className="font-semibold text-ink-2">Signers</dt>
        <dd
          className={cn(
            'truncate',
            recipients.length > 0 ? 'text-ink-2' : 'text-ink-4',
          )}
        >
          {recipientLabel}
        </dd>
        <dt className="font-semibold text-ink-2">Created</dt>
        <dd className="text-ink-3">{formatDate(envelope.createdAt)}</dd>
        <dt className="font-semibold text-ink-2">Modified</dt>
        <dd className="text-ink-3">{formatRelative(envelope.createdAt)}</dd>
      </dl>

      <div className="flex items-center gap-2 pt-1.5 mt-auto">
        <Link href={editHref} className="flex-1">
          <Button variant="accent" size="sm" className="w-full">
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        </Link>
        {!confirming ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setConfirming(true)}
            aria-label="Delete draft"
            className="border border-red-500 text-red-600 bg-transparent hover:bg-red-50 hover:text-red-700 hover:border-red-600"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => del.mutate(envelope.id)}
              loading={del.isPending}
              className="border border-red-500 text-red-600 bg-transparent hover:bg-red-50 hover:text-red-700 hover:border-red-600"
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

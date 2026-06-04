'use client';

import { FileText, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useDeleteEnvelope } from '@/hooks/useEnvelopes';
import { cn, formatDate, formatRelative } from '@/lib/utils';
import type { Envelope } from '@/types/envelope.types';

/**
 * Draft envelope card. Clicking opens the edit composer where the
 * user can finalize documents, recipients, and metadata before sending.
 * Missing values render as em-dash.
 */
export function DraftCard({
  envelope,
  index,
}: {
  envelope: Envelope;
  index: number;
}) {
  const recipients = envelope.recipients ?? [];
  const fields = envelope.fields ?? [];
  const fieldCount = fields.length;
  const signedCount = fields.filter((f) => !!f.value).length;
  const progressPct =
    fieldCount > 0 ? Math.round((signedCount / fieldCount) * 100) : 0;
  const editHref = `/envelopes/${envelope.id}/edit`;
  const del = useDeleteEnvelope();
  const [confirming, setConfirming] = useState(false);

  const dash = '—';
  const recipientLabel =
    recipients.length > 0
      ? recipients.map((r) => r.name).join(', ')
      : dash;
  const fieldsLabel = fieldCount > 0 ? `${fieldCount} signature fields` : dash;
  const progressLabel = fieldCount > 0 ? `${progressPct}% complete` : dash;
  const pagesLabel = dash; // page count not yet exposed on Envelope DTO

  return (
    <article
      className={cn(
        'glass p-5 flex flex-col gap-3 animate-fade-up',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lifted hover:border-accent/40',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Title row */}
      <header className="flex items-start gap-3">
        <span className="h-9 w-9 grid place-items-center rounded-md bg-accent-soft text-accent-deep shrink-0">
          <FileText className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
          <h3 className="text-[14.5px] font-semibold text-ink truncate leading-tight">
            {envelope.title || 'Untitled draft'}
          </h3>
          <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-accent-deep bg-accent-soft px-2 py-0.5 rounded-pill shrink-0">
            Draft
          </span>
        </div>
      </header>

      {/* Recipients */}
      <p className="text-[12px] text-ink-3 truncate">
        <span className="text-ink-4">Signers · </span>
        <span className={recipients.length > 0 ? 'text-ink-2' : 'text-ink-4'}>
          {recipientLabel}
        </span>
      </p>

      {/* Dates */}
      <p className="text-[11.5px] text-ink-4">
        Created {formatDate(envelope.createdAt)}
        <span className="px-1.5">·</span>
        Modified {formatRelative(envelope.createdAt)}
      </p>

      {/* Stats */}
      <p className="text-[11.5px] text-ink-3 flex flex-wrap gap-x-3 gap-y-1">
        <span>{fieldsLabel}</span>
        <span className="text-ink-5">·</span>
        <span>{progressLabel}</span>
        <span className="text-ink-5">·</span>
        <span>{pagesLabel}</span>
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 mt-auto">
        <Link href={editHref} className="flex-1">
          <Button variant="accent" size="sm" className="w-full">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </Link>
        {!confirming ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(true)}
            aria-label="Delete draft"
            className="text-ink-3 hover:text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="danger"
              onClick={() => del.mutate(envelope.id)}
              loading={del.isPending}
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

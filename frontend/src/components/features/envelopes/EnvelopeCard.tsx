'use client';

import { ChevronRight, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDeleteEnvelope } from '@/hooks/useEnvelopes';
import { cn, formatRelative, recipientColor } from '@/lib/utils';
import type { Envelope } from '@/types/envelope.types';

export function EnvelopeCard({
  envelope,
  index,
}: {
  envelope: Envelope;
  index: number;
}) {
  const recipients = envelope.recipients ?? [];
  const signed = recipients.filter((r) => r.status === 'SIGNED').length;
  const isLast = false;
  const isDraft = envelope.status === 'DRAFT';
  const del = useDeleteEnvelope();
  const [confirming, setConfirming] = useState(false);
  const href = isDraft
    ? `/envelopes/${envelope.id}/edit`
    : `/envelopes/${envelope.id}`;

  return (
    <>
      <div
        className="group relative animate-fade-up"
        style={{ animationDelay: `${index * 24}ms` }}
      >
        <Link
          href={href}
          className="block px-4 lg:px-5 py-3.5 hover:bg-surface-sunken/60 transition-colors duration-150"
        >
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 md:col-span-5 min-w-0">
            <p className="text-[14px] font-medium text-ink truncate tracking-[-0.005em]">
              {envelope.title}
            </p>
            {envelope.message ? (
              <p className="text-[12px] text-ink-3 truncate mt-0.5">
                {envelope.message}
              </p>
            ) : null}
          </div>

          <div className="col-span-7 md:col-span-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <Users className="h-3 w-3" />
              <span>
                <span className="text-ink font-medium">{signed}</span>
                <span className="text-ink-4">/{recipients.length}</span>
              </span>
            </div>

            <div className="flex -space-x-1.5">
              {recipients.slice(0, 4).map((r, i) => {
                const color = recipientColor(i);
                return (
                  <span
                    key={r.id}
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-pill text-[9px] font-semibold uppercase ring-2 ring-surface-0',
                      color.bg,
                      color.fg,
                    )}
                    title={`${r.name} · ${r.status}`}
                  >
                    {r.name[0]}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="hidden md:flex md:col-span-2 justify-end">
            <StatusBadge status={envelope.status} />
          </div>

          <div className="col-span-5 md:col-span-1 flex items-center justify-end gap-1.5 text-[11px] text-ink-4">
            <span className="hidden lg:inline whitespace-nowrap">
              {formatRelative(envelope.createdAt)}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-ink-4 group-hover:text-accent-deep group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between md:hidden">
          <StatusBadge status={envelope.status} />
          <span className="text-[11px] text-ink-4">
            {formatRelative(envelope.createdAt)}
          </span>
        </div>
        </Link>

        {isDraft ? (
          <div className="absolute top-2 right-2 z-10">
            {!confirming ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirming(true);
                }}
                aria-label="Delete draft"
                title="Delete draft"
                className="h-7 w-7 grid place-items-center rounded-md text-ink-4 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger hover:bg-danger/10 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            ) : (
              <div
                className="flex items-center gap-1 bg-paper border border-border-strong rounded-md shadow-sheet px-1.5 py-1"
                onClick={(e) => e.preventDefault()}
              >
                <span className="text-[11px] text-ink-2 px-1">Delete?</span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    del.mutate(envelope.id);
                  }}
                  loading={del.isPending}
                  className="h-6 px-2 text-[11px]"
                >
                  Yes
                </Button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirming(false);
                  }}
                  className="text-[11px] text-ink-3 hover:text-ink px-1.5 h-6"
                >
                  No
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
      {!isLast ? <div className="rule-soft" /> : null}
    </>
  );
}

'use client';

import { ArrowUpRight, Users } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn, formatRelative, recipientColor } from '@/lib/utils';
import type { Envelope } from '@/types/envelope.types';

/**
 * Row pattern — no border-card box. Hairline separator below.
 * Hover surfaces a subtle paper-dim wash + coral arrow translate.
 */
export function EnvelopeCard({
  envelope,
  index,
}: {
  envelope: Envelope;
  index: number;
}) {
  const recipients = envelope.recipients ?? [];
  const signed = recipients.filter((r) => r.status === 'SIGNED').length;

  return (
    <>
      <Link
        href={`/envelopes/${envelope.id}`}
        className="group block relative py-7 transition-colors animate-fade-up hover:bg-paper-dim/50 -mx-4 px-4 lg:-mx-6 lg:px-6 rounded-sm"
        style={{ animationDelay: `${index * 28}ms` }}
      >
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Title + message */}
          <div className="col-span-12 md:col-span-5 min-w-0">
            <h3 className="font-display text-xl tracking-tight truncate text-ink">
              {envelope.title}
            </h3>
            {envelope.message ? (
              <p className="mt-1 text-sm text-ink-soft line-clamp-1">
                {envelope.message}
              </p>
            ) : null}
          </div>

          {/* Signers + status */}
          <div className="col-span-7 md:col-span-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Users className="h-3.5 w-3.5 text-ink-mute" />
              <span>
                <span className="font-mono font-medium text-ink">
                  {signed}
                </span>
                <span className="text-ink-mute"> / {recipients.length}</span>
              </span>
            </div>

            <div className="flex -space-x-1.5">
              {recipients.slice(0, 4).map((r, i) => {
                const color = recipientColor(i);
                return (
                  <span
                    key={r.id}
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-pill border text-[9px] font-mono uppercase',
                      color.bg,
                      color.fg,
                      'border-current',
                      r.status === 'SIGNED' && 'ring-2 ring-success ring-offset-1 ring-offset-paper',
                    )}
                    title={`${r.name} · ${r.status}`}
                  >
                    {r.name[0]}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Status badge */}
          <div className="hidden md:flex md:col-span-2 justify-end">
            <StatusBadge status={envelope.status} />
          </div>

          {/* Date + arrow */}
          <div className="col-span-5 md:col-span-1 flex items-center justify-end gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
            <span className="hidden lg:inline whitespace-nowrap">
              {formatRelative(envelope.createdAt)}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-ink-faint group-hover:text-accent-deep group-hover:translate-x-px group-hover:-translate-y-px transition-all" />
          </div>
        </div>

        {/* Mobile status row */}
        <div className="mt-3 flex items-center justify-between md:hidden">
          <StatusBadge status={envelope.status} />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute">
            {formatRelative(envelope.createdAt)}
          </span>
        </div>
      </Link>
      <div className="rule" />
    </>
  );
}

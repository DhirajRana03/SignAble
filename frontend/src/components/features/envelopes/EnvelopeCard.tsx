'use client';

import { ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/components/ui/StatusBadge';
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

  return (
    <Link
      href={`/envelopes/${envelope.id}`}
      className="sheet group block p-5 transition-all hover:shadow-sheet hover:-translate-y-0.5 animate-fade-up"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg tracking-tight truncate">
            {envelope.title}
          </h3>
          {envelope.message ? (
            <p className="mt-1 text-sm text-ink-soft line-clamp-2">
              {envelope.message}
            </p>
          ) : null}
        </div>
        <StatusBadge status={envelope.status} />
      </div>

      <div className="rule my-4" />

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-ink-soft">
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            <span>
              <span className="font-mono font-medium text-ink">
                {signed}/{recipients.length}
              </span>{' '}
              signed
            </span>
          </div>

          <div className="flex -space-x-1.5">
            {recipients.slice(0, 4).map((r, i) => {
              const color = recipientColor(i);
              return (
                <span
                  key={r.id}
                  className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-sm border text-[9px] font-mono uppercase',
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

        <div className="flex items-center gap-2 text-ink-soft">
          <span>{formatRelative(envelope.createdAt)}</span>
          <ArrowRight className="h-3 w-3 text-ink-faint group-hover:text-accent transition-colors" />
        </div>
      </div>
    </Link>
  );
}

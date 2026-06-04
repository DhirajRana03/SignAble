'use client';

import { ChevronRight, Users } from 'lucide-react';
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
    <>
      <Link
        href={`/envelopes/${envelope.id}`}
        className="group block py-3 px-2 -mx-2 rounded-sm hover:bg-ivory-2 transition-colors duration-[120ms] animate-fade-up"
        style={{ animationDelay: `${index * 20}ms` }}
      >
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 md:col-span-5 min-w-0">
            <p className="text-[13.5px] font-medium text-ink truncate">
              {envelope.title}
            </p>
            {envelope.message ? (
              <p className="text-[11.5px] text-muted truncate mt-0.5">
                {envelope.message}
              </p>
            ) : null}
          </div>

          <div className="col-span-7 md:col-span-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <Users className="h-3 w-3" />
              <span>
                <span className="text-ink font-medium">{signed}</span>
                <span>/{recipients.length}</span>
              </span>
            </div>

            <div className="flex -space-x-1">
              {recipients.slice(0, 4).map((r, i) => {
                const color = recipientColor(i);
                return (
                  <span
                    key={r.id}
                    className={cn(
                      'inline-flex h-4 w-4 items-center justify-center rounded-pill text-[8.5px] font-medium uppercase ring-1 ring-paper',
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

          <div className="col-span-5 md:col-span-1 flex items-center justify-end gap-1.5 text-[10.5px] text-muted-2">
            <span className="hidden lg:inline whitespace-nowrap">
              {formatRelative(envelope.createdAt)}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-2 group-hover:text-muted transition-colors" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between md:hidden">
          <StatusBadge status={envelope.status} />
          <span className="text-[10.5px] text-muted-2">
            {formatRelative(envelope.createdAt)}
          </span>
        </div>
      </Link>
      <div className="rule" />
    </>
  );
}

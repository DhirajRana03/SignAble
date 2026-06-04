'use client';

import { ArrowRight, FileText, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useDeleteEnvelope } from '@/hooks/useEnvelopes';
import { cn, formatRelative, recipientColor } from '@/lib/utils';
import type { Envelope } from '@/types/envelope.types';

/**
 * Draft envelope card. Clicking opens prepare workspace where user
 * places fields and sends. Trash icon deletes draft inline with
 * confirm gate.
 */
export function DraftCard({
  envelope,
  index,
}: {
  envelope: Envelope;
  index: number;
}) {
  const recipients = envelope.recipients ?? [];
  const del = useDeleteEnvelope();
  const [confirming, setConfirming] = useState(false);

  return (
    <Link
      href={`/envelopes/${envelope.id}/prepare`}
      className="group relative block animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <article
        className={cn(
          'glass p-5 h-full flex flex-col gap-4',
          'transition-all duration-200',
          'hover:-translate-y-0.5 hover:shadow-lifted hover:border-accent/40',
        )}
      >
        <header className="flex items-start gap-3">
          <span className="h-10 w-10 grid place-items-center rounded-md bg-accent-soft text-accent-deep shrink-0">
            <FileText className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold text-ink truncate leading-tight">
              {envelope.title || 'Untitled draft'}
            </h3>
            <p className="text-[11px] text-ink-4 mt-1">
              Updated {formatRelative(envelope.createdAt)}
            </p>
          </div>
        </header>

        <div className="flex items-center gap-2 text-[12px] text-ink-3">
          <Users className="h-3.5 w-3.5" />
          {recipients.length > 0 ? (
            <>
              <span>
                <span className="text-ink font-medium">
                  {recipients.length}
                </span>{' '}
                signer{recipients.length === 1 ? '' : 's'}
              </span>
              <div className="flex -space-x-1.5 ml-1">
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
                      title={r.name}
                    >
                      {r.name[0]}
                    </span>
                  );
                })}
              </div>
            </>
          ) : (
            <span className="text-ink-4">No signers yet</span>
          )}
        </div>

        <footer className="mt-auto flex items-center justify-between pt-2">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.08em] text-accent-deep bg-accent-soft px-2 py-0.5 rounded-pill">
            Draft
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-deep group-hover:gap-2 transition-all">
            Continue
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </footer>
      </article>

      {/* Delete affordance */}
      <div className="absolute top-3 right-3 z-10">
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
    </Link>
  );
}

'use client';

import { ArrowUpRight, FileText, Mail, MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDeleteDocument } from '@/hooks/useDocuments';
import { cn, formatRelative } from '@/lib/utils';
import type { Document } from '@/types/document.types';

export function DocumentCard({
  doc,
  index,
}: {
  doc: Document;
  index: number;
}) {
  const del = useDeleteDocument();
  const [menuOpen, setMenuOpen] = useState(false);
  const ready = doc.status === 'READY';

  return (
    <>
      <article
        className="group relative py-6 transition-colors animate-fade-up hover:bg-paper-dim/50 -mx-4 px-4 lg:-mx-6 lg:px-6 rounded-sm"
        style={{ animationDelay: `${index * 28}ms` }}
      >
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* File icon + name */}
          <div className="col-span-12 md:col-span-6 flex items-start gap-4 min-w-0">
            <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xs bg-accent-tint/60 text-accent-deep">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="font-display text-lg tracking-tight truncate text-ink"
                title={doc.filename}
              >
                {doc.filename}
              </h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                {ready ? (
                  <>
                    {doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}
                  </>
                ) : (
                  'Processing…'
                )}
                <span className="mx-1.5 text-ink-mute">·</span>
                {formatRelative(doc.createdAt)}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="col-span-6 md:col-span-3 flex items-center">
            <StatusBadge status={doc.status} />
          </div>

          {/* Actions */}
          <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-2">
            {ready ? (
              <Link href={`/envelopes/new?documentId=${doc.id}`}>
                <Button size="sm" variant="secondary">
                  <Mail className="h-3 w-3" /> Send
                </Button>
              </Link>
            ) : null}

            <div className="relative">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="p-1.5 rounded-pill text-ink-mute hover:text-ink hover:bg-paper-deep transition-colors"
                aria-label="Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-9 z-20 w-44 bg-paper-deep border border-border rounded-md shadow-lifted animate-scale-in p-1">
                    <button
                      onClick={() => del.mutate(doc.id)}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <ArrowUpRight
              className={cn(
                'h-3.5 w-3.5 text-ink-mute transition-all',
                ready
                  ? 'group-hover:text-accent-deep group-hover:translate-x-px group-hover:-translate-y-px'
                  : '',
              )}
            />
          </div>
        </div>

        {doc.errorMessage ? (
          <p className="mt-3 text-xs text-danger pl-13">{doc.errorMessage}</p>
        ) : null}
      </article>
      <div className="rule" />
    </>
  );
}

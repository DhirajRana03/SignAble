'use client';

import { FileText, Mail, MoreVertical, Trash2 } from 'lucide-react';
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
    <article
      className="sheet group relative flex flex-col rounded-md p-5 transition-all hover:-translate-y-0.5 hover:shadow-sheet hover:border-accent-soft animate-fade-up"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      <div className="absolute top-3 right-3">
        <button
          onClick={() => setMenuOpen((s) => !s)}
          className="p-1 rounded-md hover:bg-paper-dim text-ink-faint transition-colors"
          aria-label="Actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-7 z-20 w-44 sheet rounded-md animate-scale-in p-1">
              <button
                onClick={() => del.mutate(doc.id)}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-danger hover:bg-danger/5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-14 w-12 shrink-0 items-center justify-center rounded-sm border border-border bg-accent-tint/40',
            'relative overflow-hidden transition-colors',
            'group-hover:border-accent-soft group-hover:bg-accent-tint',
          )}
        >
          <FileText className="h-5 w-5 text-accent-deep" />
          {/* Hairline page-fold ornament */}
          <div className="absolute top-0 right-0 h-3 w-3 border-l border-b border-border bg-paper-deep" />
        </div>

        <div className="min-w-0 flex-1 pr-6">
          <h3
            className="truncate font-display text-base tracking-tight"
            title={doc.filename}
          >
            {doc.filename}
          </h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            {ready ? `${doc.pageCount} page${doc.pageCount === 1 ? '' : 's'}` : 'Processing…'}
            <span className="mx-1.5 text-ink-faint">·</span>
            {formatRelative(doc.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={doc.status} />

        {ready ? (
          <Link href={`/envelopes/new?documentId=${doc.id}`}>
            <Button size="sm" variant="secondary">
              <Mail className="h-3 w-3" /> Send
            </Button>
          </Link>
        ) : null}
      </div>

      {doc.errorMessage ? (
        <p className="mt-3 text-xs text-danger border-t border-danger/20 pt-2">
          {doc.errorMessage}
        </p>
      ) : null}
    </article>
  );
}

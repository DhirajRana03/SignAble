'use client';

import { ChevronRight, FileText, MoreHorizontal, Send, Trash2 } from 'lucide-react';
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
        className="group relative px-4 lg:px-5 py-4 hover:bg-surface-sunken/60 transition-colors duration-150 animate-fade-up"
        style={{ animationDelay: `${index * 24}ms` }}
      >
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 md:col-span-6 flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 grid place-items-center rounded-md bg-accent-soft text-accent-deep shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink truncate tracking-[-0.005em]" title={doc.filename}>
                {doc.filename}
              </p>
              <p className="text-[12px] text-ink-3 mt-0.5">
                {ready ? `${doc.pageCount} page${doc.pageCount === 1 ? '' : 's'}` : 'Processing…'}
                <span className="mx-1.5 text-ink-4">·</span>
                {formatRelative(doc.createdAt)}
              </p>
            </div>
          </div>

          <div className="col-span-6 md:col-span-3 flex items-center">
            <StatusBadge status={doc.status} />
          </div>

          <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-1.5">
            {ready ? (
              <Link href={`/envelopes/new?documentId=${doc.id}`}>
                <Button size="sm" variant="secondary">
                  <Send className="h-3 w-3" /> Send
                </Button>
              </Link>
            ) : null}

            <div className="relative">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="h-8 w-8 grid place-items-center rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
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
                  <div className="absolute right-0 top-10 z-20 w-44 glass-strong shadow-popover animate-scale-in p-1">
                    <button
                      onClick={() => del.mutate(doc.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-danger hover:bg-danger/8 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <ChevronRight className={cn(
              'h-3.5 w-3.5 text-ink-4',
              ready && 'group-hover:text-accent-deep group-hover:translate-x-0.5 transition-all',
            )} />
          </div>
        </div>

        {doc.errorMessage ? (
          <p className="mt-2 text-[12px] text-danger pl-13">{doc.errorMessage}</p>
        ) : null}
      </article>
      {index < 999 ? <div className="rule-soft" /> : null}
    </>
  );
}

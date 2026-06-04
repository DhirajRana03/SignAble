'use client';

import { ArrowUpRight, FileText } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { EnvelopeWizard } from '@/components/features/envelopes/EnvelopeWizard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocument, useDocuments } from '@/hooks/useDocuments';
import { formatRelative } from '@/lib/utils';

export default function NewEnvelopePage() {
  const params = useSearchParams();
  const documentId = params?.get('documentId') ?? undefined;
  const { data: doc, isLoading } = useDocument(documentId);
  const docs = useDocuments();

  return (
    <DashboardShell eyebrow="New envelope" title="Create envelope">
      {!documentId ? (
        <DocumentPicker docs={docs.data ?? []} loading={docs.isLoading} />
      ) : isLoading || !doc ? (
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute animate-pulse">
          Loading document…
        </div>
      ) : doc.status !== 'READY' ? (
        <EmptyState
          title="Document not ready yet"
          description="The document is still being processed. Try again in a moment."
          action={
            <Link href="/documents">
              <Button variant="secondary">Back to documents</Button>
            </Link>
          }
        />
      ) : (
        <EnvelopeWizard document={doc} />
      )}
    </DashboardShell>
  );
}

function DocumentPicker({
  docs,
  loading,
}: {
  docs: { id: string; filename: string; status: string; pageCount: number; createdAt: string }[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute animate-pulse">
        Loading documents…
      </div>
    );
  }

  const ready = docs.filter((d) => d.status === 'READY');

  if (!ready.length) {
    return (
      <EmptyState
        title="No documents ready"
        description="Upload a file first to build an envelope from it."
        action={
          <Link href="/documents">
            <Button variant="primary">Upload a document</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-10 max-w-3xl animate-fade-up pb-16">
      <div className="space-y-2">
        <span className="eyebrow">First, choose a source</span>
        <h2 className="font-display tracking-tight">
          Pick a document to{' '}
          <em className="italic-accent">put in motion.</em>
        </h2>
        <p className="lede mt-3">
          Only fully processed documents can be sent for signature.
        </p>
      </div>

      <div>
        <div className="rule" />
        {ready.map((d, i) => (
          <DocPickRow doc={d} key={d.id} index={i} />
        ))}
      </div>
    </div>
  );
}

function DocPickRow({
  doc,
  index,
}: {
  doc: { id: string; filename: string; pageCount: number; createdAt: string };
  index: number;
}) {
  return (
    <>
      <Link
        href={`/envelopes/new?documentId=${doc.id}`}
        className="group flex items-center gap-4 py-5 px-2 -mx-2 rounded-sm hover:bg-paper-dim/50 transition-colors animate-fade-up"
        style={{ animationDelay: `${index * 28}ms` }}
      >
        <div className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xs bg-accent-tint text-accent-deep">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg tracking-tight truncate">
            {doc.filename}
          </p>
          <p className="text-xs text-ink-soft mt-0.5">
            {doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}
            <span className="mx-1.5 text-ink-mute">·</span>
            {formatRelative(doc.createdAt)}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-ink-mute group-hover:text-accent-deep group-hover:translate-x-px group-hover:-translate-y-px transition-all" />
      </Link>
      <div className="rule" />
    </>
  );
}

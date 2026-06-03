'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { EnvelopeWizard } from '@/components/features/envelopes/EnvelopeWizard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocument, useDocuments } from '@/hooks/useDocuments';

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
        <div className="label-mono">loading document…</div>
      ) : doc.status !== 'READY' ? (
        <EmptyState
          title="Document not ready yet"
          description="Your document is still being processed. Try again in a moment."
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
  docs: { id: string; filename: string; status: string; pageCount: number }[];
  loading: boolean;
}) {
  if (loading) return <div className="label-mono">loading…</div>;
  const ready = docs.filter((d) => d.status === 'READY');
  if (!ready.length) {
    return (
      <EmptyState
        title="No documents ready"
        description="Upload a PDF first to build an envelope from it."
        action={
          <Link href="/documents">
            <Button variant="accent">Upload a document</Button>
          </Link>
        }
      />
    );
  }
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-ink-soft">
        Pick a document to send for signature.
      </p>
      {ready.map((d) => (
        <Link
          key={d.id}
          href={`/envelopes/new?documentId=${d.id}`}
          className="sheet flex items-center justify-between p-4 hover:shadow-sheet"
        >
          <div>
            <p className="font-medium">{d.filename}</p>
            <p className="text-xs text-ink-soft">
              {d.pageCount} page{d.pageCount === 1 ? '' : 's'}
            </p>
          </div>
          <Button size="sm" variant="secondary">
            Choose →
          </Button>
        </Link>
      ))}
    </div>
  );
}

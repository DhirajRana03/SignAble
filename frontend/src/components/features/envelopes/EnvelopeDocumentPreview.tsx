'use client';

import { DocumentViewer } from '@/components/features/document-viewer/DocumentViewer';
import { ReadOnlyFieldOverlay } from '@/components/features/envelopes/ReadOnlyFieldOverlay';
import {
  useDocument,
  useDocumentPagesMeta,
} from '@/hooks/useDocuments';
import type { Envelope } from '@/types/envelope.types';

/**
 * Read-only document preview with placed fields. Used in envelope detail
 * view to show signers what document looks like with field positions.
 */
export function EnvelopeDocumentPreview({ envelope }: { envelope: Envelope }) {
  const pagesMeta = useDocumentPagesMeta(envelope.documentId);
  const docQuery = useDocument(envelope.documentId);
  const fields = envelope.fields ?? [];
  const recipients = envelope.recipients ?? [];

  if (pagesMeta.isLoading || docQuery.isLoading) {
    return (
      <div className="glass p-6 grid place-items-center min-h-[400px]">
        <p className="label-mono">loading document…</p>
      </div>
    );
  }

  const pageUrls = (pagesMeta.data ?? []).map((p) => p.imageUrl);

  if (!pageUrls.length) {
    return (
      <div className="glass p-6 grid place-items-center min-h-[200px]">
        <p className="text-sm text-ink-3">Document unavailable</p>
      </div>
    );
  }

  return (
    <section className="glass overflow-hidden">
      <header className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="min-w-0">
          <p className="label-mono mb-0.5">Document</p>
          <p
            className="text-[13.5px] font-medium text-ink truncate"
            title={docQuery.data?.filename ?? envelope.title}
          >
            {docQuery.data?.filename ?? envelope.title}
          </p>
        </div>
        <span className="text-[11px] text-ink-3 font-mono shrink-0">
          {pageUrls.length} page{pageUrls.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="bg-slate-100 max-h-[80vh] overflow-y-auto">
        <DocumentViewer
          pageUrls={pageUrls}
          authed
          renderOverlay={(pageIndex, pageRef) => (
            <ReadOnlyFieldOverlay
              pageIndex={pageIndex}
              pageRef={pageRef}
              fields={fields}
              recipients={recipients}
            />
          )}
        />
      </div>
    </section>
  );
}

'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentCard } from './DocumentCard';

export function DocumentGrid() {
  const { data, isLoading, error } = useDocuments();

  if (isLoading) {
    return (
      <div>
        <div className="rule" />
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="py-6 animate-pulse">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-6 flex items-center gap-4">
                  <div className="h-10 w-9 bg-paper-dim rounded-xs" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 bg-paper-dim rounded-pill" />
                    <div className="h-3 w-1/3 bg-paper-dim rounded-pill" />
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="h-5 w-20 bg-paper-dim rounded-pill" />
                </div>
              </div>
            </div>
            <div className="rule" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="We couldn't load your documents"
        description="Check your connection and try again."
      />
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        title="No documents yet"
        description="Upload a PDF above to begin. We render it page by page so you can place signature fields."
      />
    );
  }

  return (
    <div>
      <div className="rule" />
      {data.map((doc, i) => (
        <DocumentCard key={doc.id} doc={doc} index={i} />
      ))}
    </div>
  );
}

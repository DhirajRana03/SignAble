'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentCard } from './DocumentCard';

export function DocumentGrid() {
  const { data, isLoading, error } = useDocuments();

  if (isLoading) {
    return (
      <div className="glass overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-5 py-4 animate-pulse">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-6 flex items-center gap-3">
                <div className="h-10 w-10 bg-surface-sunken rounded-md" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-1/2 bg-surface-sunken rounded-pill" />
                  <div className="h-2.5 w-1/3 bg-surface-sunken rounded-pill" />
                </div>
              </div>
              <div className="col-span-3">
                <div className="h-5 w-20 bg-surface-sunken rounded-pill" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load documents"
        description="Check your connection and try again."
      />
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        title="No documents yet"
        description="Upload a file above to begin. We render every page so you can place signature fields."
      />
    );
  }

  return (
    <div className="glass overflow-hidden">
      {data.map((doc, i) => (
        <DocumentCard key={doc.id} doc={doc} index={i} />
      ))}
    </div>
  );
}

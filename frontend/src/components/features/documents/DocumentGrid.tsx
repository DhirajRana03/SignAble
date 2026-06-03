'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentCard } from './DocumentCard';

export function DocumentGrid() {
  const { data, isLoading, error } = useDocuments();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <CardSkeleton key={i} />
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
        description="Upload a PDF above to begin. We'll render it page by page so you can place signature fields."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((doc, i) => (
        <DocumentCard key={doc.id} doc={doc} index={i} />
      ))}
    </div>
  );
}

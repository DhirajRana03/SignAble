'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { DraftCard } from '@/components/features/envelopes/DraftCard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEnvelopes } from '@/hooks/useEnvelopes';

export default function DraftsPage() {
  const { data, isLoading } = useEnvelopes('DRAFT');

  return (
    <DashboardShell
      eyebrow="In progress"
      title="Drafts"
      actions={
        <Link href="/envelopes/new">
          <Button variant="accent" size="sm">
            <Plus className="h-3.5 w-3.5" /> New envelope
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="glass p-5 h-44 animate-pulse flex flex-col gap-3"
            >
              <div className="h-10 w-10 rounded-md bg-surface-sunken" />
              <div className="h-4 w-2/3 bg-surface-sunken rounded-pill" />
              <div className="h-3 w-1/2 bg-surface-sunken rounded-pill" />
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          title="No drafts"
          description="Envelopes started but not yet sent appear here. Pick up where you left off anytime."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((e, i) => (
            <DraftCard key={e.id} envelope={e} index={i} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

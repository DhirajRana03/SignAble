'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { DraftRow } from '@/components/features/envelopes/DraftCard';
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
      wide
      actions={
        <Link href="/envelopes/new">
          <Button variant="accent" size="sm">
            <Plus className="h-3.5 w-3.5" /> New envelope
          </Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="glass px-4 py-3 h-16 animate-pulse flex items-center gap-4"
            >
              <div className="h-9 w-9 rounded-full bg-surface-sunken shrink-0" />
              <div className="h-4 w-1/3 bg-surface-sunken rounded-pill" />
              <div className="h-3 w-24 bg-surface-sunken rounded-pill ml-auto" />
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          title="No drafts"
          description="Envelopes started but not yet sent appear here. Pick up where you left off anytime."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((e, i) => (
            <DraftRow key={e.id} envelope={e} index={i} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types/document.types';
import type { EnvelopeStatus, RecipientStatus } from '@/types/envelope.types';

type AnyStatus = DocumentStatus | EnvelopeStatus | RecipientStatus | string;

const PALETTE: Record<string, string> = {
  // documents
  PENDING: 'border-ink-faint/40 text-ink-faint',
  PROCESSING: 'border-warn/40 text-warn bg-warn/5 animate-pulse',
  READY: 'border-success/40 text-success bg-success/5',
  FAILED: 'border-danger/40 text-danger bg-danger/5',
  // envelopes
  DRAFT: 'border-ink-faint/40 text-ink-soft',
  SENT: 'border-accent/40 text-accent bg-accent/5',
  IN_PROGRESS: 'border-warn/50 text-warn bg-warn/5',
  COMPLETED: 'border-success/50 text-success bg-success/5',
  VOIDED: 'border-ink-faint/40 text-ink-faint line-through',
  EXPIRED: 'border-ink-faint/40 text-ink-faint',
  // recipients
  VIEWED: 'border-accent/40 text-accent',
  SIGNED: 'border-success/40 text-success bg-success/5',
  DECLINED: 'border-danger/40 text-danger',
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  const palette = PALETTE[status] ?? 'border-ink-faint/40 text-ink-faint';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]',
        palette,
        className,
      )}
    >
      <span className="inline-block h-1 w-1 rounded-full bg-current" />
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}

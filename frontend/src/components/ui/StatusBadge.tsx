import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types/document.types';
import type { EnvelopeStatus, RecipientStatus } from '@/types/envelope.types';

type AnyStatus = DocumentStatus | EnvelopeStatus | RecipientStatus | string;

const PALETTE: Record<string, string> = {
  PENDING: 'text-muted bg-ivory-2',
  PROCESSING: 'text-warn bg-warn/10',
  READY: 'text-success bg-success/10',
  FAILED: 'text-danger bg-danger/10',
  DRAFT: 'text-muted bg-ivory-2',
  SENT: 'text-accent-ink bg-accent/10',
  IN_PROGRESS: 'text-warn bg-warn/10',
  COMPLETED: 'text-success bg-success/10',
  VOIDED: 'text-muted-2 bg-ivory-2',
  EXPIRED: 'text-muted-2 bg-ivory-2',
  VIEWED: 'text-accent-ink bg-accent/10',
  SIGNED: 'text-success bg-success/10',
  DECLINED: 'text-danger bg-danger/10',
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  const palette = PALETTE[status] ?? 'text-muted bg-ivory-2';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10.5px] uppercase tracking-[0.06em] font-medium',
        palette,
        className,
      )}
    >
      {String(status).replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

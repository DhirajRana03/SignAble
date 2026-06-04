import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types/document.types';
import type { EnvelopeStatus, RecipientStatus } from '@/types/envelope.types';

type AnyStatus = DocumentStatus | EnvelopeStatus | RecipientStatus | string;

const PALETTE: Record<string, string> = {
  PENDING: 'bg-surface-sunken text-ink-3',
  PROCESSING: 'bg-warn/12 text-warn',
  READY: 'bg-success/12 text-success',
  FAILED: 'bg-danger/12 text-danger',
  DRAFT: 'bg-surface-sunken text-ink-3',
  SENT: 'bg-accent-soft text-accent-deep',
  IN_PROGRESS: 'bg-warn/12 text-warn',
  COMPLETED: 'bg-success/12 text-success',
  VOIDED: 'bg-surface-sunken text-ink-4',
  EXPIRED: 'bg-surface-sunken text-ink-4',
  VIEWED: 'bg-accent-soft text-accent-deep',
  SIGNED: 'bg-success/12 text-success',
  DECLINED: 'bg-danger/12 text-danger',
};

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  const palette = PALETTE[status] ?? 'bg-surface-sunken text-ink-3';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em]',
        palette,
        className,
      )}
    >
      {String(status).replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

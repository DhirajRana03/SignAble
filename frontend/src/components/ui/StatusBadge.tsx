import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types/document.types';
import type { EnvelopeStatus, RecipientStatus } from '@/types/envelope.types';

type AnyStatus = DocumentStatus | EnvelopeStatus | RecipientStatus | string;

const PALETTE: Record<string, string> = {
  // documents
  PENDING: 'border-ink-faint/40 text-ink-mute bg-paper-dim',
  PROCESSING: 'border-accent/40 text-accent-deep bg-accent-tint',
  READY: 'border-success/40 text-success bg-success/5',
  FAILED: 'border-danger/40 text-danger bg-danger/5',
  // envelopes
  DRAFT: 'border-ink-faint/40 text-ink-soft bg-paper-dim/60',
  SENT: 'border-accent/40 text-accent-deep bg-accent-tint',
  IN_PROGRESS: 'border-accent/50 text-accent-deep bg-accent-tint',
  COMPLETED: 'border-success/50 text-success bg-success/5',
  VOIDED: 'border-ink-faint/40 text-ink-mute line-through',
  EXPIRED: 'border-ink-faint/40 text-ink-mute',
  // recipients
  VIEWED: 'border-accent/40 text-accent-deep bg-accent-tint',
  SIGNED: 'border-success/40 text-success bg-success/5',
  DECLINED: 'border-danger/40 text-danger bg-danger/5',
};

// Status that should pulse with the live coral animation
const LIVE_STATUSES = new Set(['PROCESSING', 'SENT', 'IN_PROGRESS']);

export function StatusBadge({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  const palette = PALETTE[status] ?? 'border-ink-faint/40 text-ink-mute';
  const isLive = LIVE_STATUSES.has(String(status));

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]',
        palette,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full bg-current',
          isLive && 'animate-pulse-coral',
        )}
      />
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}

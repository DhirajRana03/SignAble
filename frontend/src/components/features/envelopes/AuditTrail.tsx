'use client';

import { Activity } from 'lucide-react';

import { useEnvelopeAudit } from '@/hooks/useEnvelopes';
import { formatDate } from '@/lib/utils';

const EVENT_LABEL: Record<string, string> = {
  ENVELOPE_CREATED: 'Envelope created',
  ENVELOPE_SENT: 'Envelope sent',
  DOCUMENT_VIEWED: 'Document viewed',
  RECIPIENT_SIGNED: 'Recipient signed',
  RECIPIENT_DECLINED: 'Recipient declined',
  ENVELOPE_COMPLETED: 'Envelope completed',
  ENVELOPE_VOIDED: 'Envelope voided',
};

export function AuditTrail({ envelopeId }: { envelopeId: string }) {
  const { data, isLoading } = useEnvelopeAudit(envelopeId);

  if (isLoading) {
    return (
      <div className="glass p-5 space-y-3 animate-pulse">
        <div className="h-3 w-1/3 bg-paper-dim rounded" />
        <div className="h-3 w-1/2 bg-paper-dim rounded" />
      </div>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="glass p-5 text-sm text-ink-soft">
        No events yet.
      </div>
    );
  }

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-3.5 w-3.5 text-accent" />
        <h3 className="label-mono">Audit trail</h3>
      </div>

      <ol className="space-y-3 relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
        {items.map((e) => {
          const reason =
            typeof e.metadata === 'object' &&
            e.metadata !== null &&
            'reason' in e.metadata
              ? String((e.metadata as { reason?: unknown }).reason ?? '')
              : '';
          return (
            <li key={e.id} className="relative flex items-start gap-4 pl-6">
              <span className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-accent bg-paper" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {EVENT_LABEL[e.eventType] ?? e.eventType}
                </p>
                <p className="text-xs text-ink-soft">
                  {e.actorEmail}
                  {e.ipAddress ? ` · ${e.ipAddress}` : ''}
                </p>
                {reason ? (
                  <p className="mt-1 text-xs text-ink-2 italic">
                    Reason: {reason}
                  </p>
                ) : null}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint shrink-0">
                {formatDate(e.createdAt)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

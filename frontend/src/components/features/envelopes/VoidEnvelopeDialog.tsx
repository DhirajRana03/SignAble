'use client';

import { useEffect, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * Void confirmation dialog. Wraps the generic ConfirmDialog with a
 * required-reason textarea. Replaces the native window.prompt() call
 * that previously gated the void action — prompt() blocks the
 * renderer thread, deadlocks browser-automation transports (CDP), and
 * is unstylable.
 *
 * Caller owns lifecycle: render when `open`, hide on `onClose`. The
 * mutation runs from the caller via `onConfirm(reason)`; `busy`
 * surfaces the pending state on the confirm button.
 */
export function VoidEnvelopeDialog({
  open,
  busy = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  // Reset the textarea every time the dialog closes so the next void
  // attempt starts from a clean slate.
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0;

  return (
    <ConfirmDialog
      open={open}
      title="Void envelope"
      confirmLabel="Void envelope"
      busy={busy}
      disabled={!canSubmit}
      onClose={onClose}
      onConfirm={() => onConfirm(trimmed)}
    >
      <p className="mb-3">
        Voiding cancels the envelope and notifies all recipients. This
        cannot be undone. The reason is recorded on the audit trail.
      </p>
      <label htmlFor="void-reason" className="label-mono block mb-2">
        Reason
      </label>
      <textarea
        id="void-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        autoFocus
        placeholder="e.g. Sent to wrong recipient"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[14px] text-ink resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
      />
    </ConfirmDialog>
  );
}

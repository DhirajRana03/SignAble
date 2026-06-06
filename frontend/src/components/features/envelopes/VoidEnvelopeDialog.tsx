'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * Void confirmation modal. Replaces the native window.prompt() call
 * that previously gated the void action — prompt() blocks the renderer
 * thread, deadlocks browser-automation transports (CDP), and is
 * unstylable. This dialog is keyboard-accessible, themable, and
 * non-blocking.
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

  if (!open) return null;

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !busy;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-default"
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] border border-border overflow-hidden">
        <header className="flex items-start justify-between px-7 pt-6 pb-2">
          <h2
            id="void-dialog-title"
            className="text-[20px] font-semibold text-ink leading-tight"
          >
            Void envelope
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-8 w-8 grid place-items-center rounded-md text-ink-3 hover:text-ink hover:bg-surface-sunken transition-colors -mr-2"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-7 pb-2">
          <p className="text-[13px] text-ink-2">
            Voiding cancels the envelope and notifies all recipients.
            This cannot be undone. The reason is recorded on the audit
            trail.
          </p>
        </div>

        <div className="px-7 py-4">
          <label
            htmlFor="void-reason"
            className="label-mono block mb-2"
          >
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
        </div>

        <footer className="flex items-center justify-end gap-2 px-7 py-4 bg-surface-sunken/50 border-t border-border-soft">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            disabled={!canSubmit}
            loading={busy}
            onClick={() => onConfirm(trimmed)}
          >
            Void envelope
          </Button>
        </footer>
      </div>
    </div>
  );
}

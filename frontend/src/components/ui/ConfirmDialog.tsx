'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/Button';

/**
 * Generic confirmation dialog for irreversible actions.
 *
 * Replaces `window.confirm()` calls — the native dialog blocks the
 * renderer thread, deadlocks CDP-driven automation, and cannot be
 * styled or made accessible. This component is keyboard-friendly,
 * themable, and surfaces a `busy` state so the caller's mutation
 * pending flag is visible on the confirm button.
 *
 * Caller owns lifecycle: render only while `open`. Body content is
 * passed via children so callers can add custom warnings, lists of
 * affected items, or input fields.
 */
export function ConfirmDialog({
  open,
  title,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  busy = false,
  disabled = false,
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary' | 'accent';
  busy?: boolean;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
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
            id="confirm-dialog-title"
            className="text-[20px] font-semibold text-ink leading-tight"
          >
            {title}
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
        {children ? (
          <div className="px-7 pb-2 text-[13px] text-ink-2">{children}</div>
        ) : null}
        <footer className="flex items-center justify-end gap-2 px-7 py-5 bg-surface-sunken/50 border-t border-border-soft">
          <Button variant="secondary" size="md" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="md"
            loading={busy}
            disabled={disabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </div>
  );
}

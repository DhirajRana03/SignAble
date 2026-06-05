'use client';

import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * Download selection modal — DocuSign-style.
 *
 * Lets the user pick which artifacts to download (signed Document,
 * Certificate of Completion, or both) and whether to combine them into
 * a single PDF. Caller decides how to fetch each piece.
 *
 * `onDownload` receives the selected set + combine flag. The dialog
 * does not close itself on success; caller controls lifecycle via
 * `busy` (shows spinner) and explicit `onClose`.
 */
export function DownloadDialog({
  title = 'Download files',
  busy = false,
  onClose,
  onDownload,
}: {
  title?: string;
  busy?: boolean;
  onClose: () => void;
  onDownload: (selection: {
    document: boolean;
    certificate: boolean;
    combine: boolean;
  }) => void;
}) {
  const [document, setDocument] = useState(true);
  const [certificate, setCertificate] = useState(true);
  const [combine, setCombine] = useState(false);

  const all = document && certificate;
  const count = (document ? 1 : 0) + (certificate ? 1 : 0);
  const canDownload = count > 0 && !busy;

  const toggleAll = () => {
    const next = !all;
    setDocument(next);
    setCertificate(next);
  };

  // Combine only makes sense when both files are selected; auto-clear
  // when the user deselects one.
  const combineEffective = useMemo(() => combine && all, [combine, all]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-default"
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] border border-border overflow-hidden">
        {/* Header */}
        <header className="flex items-start justify-between px-7 pt-6 pb-4">
          <h2
            id="download-dialog-title"
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

        <div className="px-7 pb-2">
          <p className="text-[13px] text-ink-2">
            Select which files you want to download:
          </p>
        </div>

        {/* Selection list */}
        <div className="px-7 py-4 space-y-3">
          <SelectionRow
            checked={all}
            onChange={toggleAll}
            label="All"
            meta={`${count} ${count === 1 ? 'file' : 'files'}`}
          />
          <SelectionRow
            checked={document}
            onChange={() => setDocument((v) => !v)}
            label="Document"
            meta="1 PDF"
            indent
          />
          <SelectionRow
            checked={certificate}
            onChange={() => setCertificate((v) => !v)}
            label="Certificate of Completion"
            meta="1 PDF"
            indent
          />
        </div>

        <div className="h-px bg-border-soft mx-7" />

        {/* Combine toggle */}
        <div className="px-7 py-4">
          <SelectionRow
            checked={combineEffective}
            onChange={() => setCombine((v) => !v)}
            label="Combine all PDFs into a single file"
            disabled={!all}
            variant="plain"
          />
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2 px-7 py-4 bg-surface-sunken/50 border-t border-border-soft">
          <Button
            variant="primary"
            size="md"
            disabled={!canDownload}
            loading={busy}
            onClick={() =>
              onDownload({
                document,
                certificate,
                combine: combineEffective,
              })
            }
          >
            Download
          </Button>
        </footer>
      </div>
    </div>
  );
}

function SelectionRow({
  checked,
  onChange,
  label,
  meta,
  indent = false,
  disabled = false,
  variant = 'default',
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  meta?: string;
  indent?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'plain';
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        onChange();
      }}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 text-left transition-opacity',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 h-5 w-5 grid place-items-center rounded-md border-2 shrink-0 transition-colors',
          checked
            ? 'bg-accent-deep border-accent-deep text-white'
            : 'bg-white border-border',
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
      <span className={cn('min-w-0', indent && variant === 'default' && 'pl-0')}>
        <span className="block text-[15px] font-medium text-ink leading-tight">
          {label}
        </span>
        {meta ? (
          <span className="block text-[12.5px] text-ink-3 mt-0.5">{meta}</span>
        ) : null}
      </span>
    </button>
  );
}

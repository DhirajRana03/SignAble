'use client';

import { UploadCloud } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { useUploadDocument } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

/**
 * Drag-drop + click upload. Single-file, PDF only for v1.
 * Logic delegated to useUploadDocument hook.
 */
export function DocumentUploader() {
  const upload = useUploadDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      upload.mutate(file);
    },
    [upload],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'sheet relative cursor-pointer p-8 transition-all',
        'flex items-center gap-5 group',
        dragging
          ? 'border-accent shadow-sheet -translate-y-0.5'
          : 'hover:border-ink-faint',
        upload.isPending && 'pointer-events-none opacity-70',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.gif,.heic,.heif,application/pdf,image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        className={cn(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-border bg-paper-dim transition-all',
          dragging && 'border-accent bg-accent/5 scale-105',
        )}
      >
        <UploadCloud
          className={cn(
            'h-6 w-6 text-ink-soft transition-colors',
            dragging && 'text-accent',
            upload.isPending && 'animate-pulse',
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-display text-lg tracking-tight">
          {upload.isPending ? 'Uploading…' : 'Drop a file, or click to browse'}
        </p>
        <p className="text-xs text-ink-soft mt-0.5">
          Max 50&nbsp;MB · processed locally on our service
        </p>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1">
        <span className="label-mono">supported</span>
        <span className="font-mono text-xs text-ink-faint">pdf · images</span>
      </div>
    </div>
  );
}

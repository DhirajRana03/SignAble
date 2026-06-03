'use client';

import { UploadCloud } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { useUploadDocument } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

/**
 * Borderless drop zone with dashed inner hairline. Definable-style:
 * generous padding, minimal chrome, accent activates only on interaction.
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
        'relative cursor-pointer rounded-md p-10 lg:p-14 transition-all group',
        'flex items-center gap-6',
        'border border-dashed',
        dragging
          ? 'border-accent bg-accent-tint/30'
          : 'border-border hover:border-accent-soft hover:bg-paper-dim/30',
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
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-pill transition-all',
          dragging
            ? 'bg-accent text-accent-fg'
            : 'bg-paper-dim text-ink-soft group-hover:bg-accent-tint group-hover:text-accent-deep',
        )}
      >
        <UploadCloud
          className={cn('h-5 w-5', upload.isPending && 'animate-pulse')}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-display text-2xl tracking-tight">
          {upload.isPending ? 'Uploading…' : 'Drop a file, or click to browse'}
        </p>
        <p className="text-sm text-ink-soft mt-1">
          Max 50&nbsp;MB · PDF and common image formats
        </p>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
          Supported
        </span>
        <span className="font-mono text-xs text-ink-faint">pdf · img</span>
      </div>
    </div>
  );
}

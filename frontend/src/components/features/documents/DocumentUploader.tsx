'use client';

import { UploadCloud } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { useUploadDocument } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

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
        'relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-150',
        'flex items-center gap-4 p-6',
        dragging
          ? 'border-accent bg-accent-soft/40'
          : 'border-border-strong bg-surface-1/40 hover:border-accent hover:bg-accent-soft/20',
        upload.isPending && 'pointer-events-none opacity-60',
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
          'h-11 w-11 grid place-items-center rounded-md transition-all',
          dragging ? 'bg-accent text-white' : 'bg-accent-soft text-accent-deep',
        )}
      >
        <UploadCloud
          className={cn('h-5 w-5', upload.isPending && 'animate-pulse')}
          strokeWidth={2}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink">
          {upload.isPending ? 'Uploading…' : 'Drop a file or click to browse'}
        </p>
        <p className="text-[12.5px] text-ink-3 mt-0.5">
          PDF or image · up to 50 MB
        </p>
      </div>
    </div>
  );
}

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
        'cursor-pointer rounded-sm bg-paper border border-dashed transition-colors',
        'flex items-center gap-3 p-4',
        dragging
          ? 'border-accent bg-accent/8'
          : 'border-border-strong hover:border-accent hover:bg-ivory-2/40',
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
      <div className="h-8 w-8 grid place-items-center rounded-sm bg-ivory-2 text-muted shrink-0">
        <UploadCloud className={cn('h-3.5 w-3.5', upload.isPending && 'animate-pulse')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink">
          {upload.isPending ? 'Uploading…' : 'Drop a file or click to browse'}
        </p>
        <p className="text-[11.5px] text-muted">PDF or image, max 50 MB</p>
      </div>
    </div>
  );
}

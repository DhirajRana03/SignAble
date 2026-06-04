'use client';

import { forwardRef } from 'react';

import { useAuthedImage } from '@/hooks/useAuthedImage';
import { cn } from '@/lib/utils';

interface Props {
  url: string;
  pageNumber: number;
  overlay?: React.ReactNode;
  authed?: boolean;
  zoom?: number;
}

/**
 * Single page image with optional overlay slot. Outer ref provides
 * stable target for coordinate math + scroll-into-view. zoom scales
 * the page width; max-width preserves the natural A4/Letter aspect.
 */
export const PageImage = forwardRef<HTMLDivElement, Props>(function PageImage(
  { url, pageNumber, overlay, authed = true, zoom = 1 },
  ref,
) {
  const { src, loading } = useAuthedImage(authed ? url : undefined);
  const finalSrc = authed ? src : url;
  const width = Math.round(860 * zoom);

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-3 mb-1.5">
        Page {pageNumber}
      </div>
      <div
        ref={ref}
        style={{ width: `${width}px` }}
        className={cn(
          'relative bg-paper border border-border shadow-md rounded-sm',
          'overflow-hidden transition-[width] duration-150',
        )}
      >
        {loading || !finalSrc ? (
          <div
            className="w-full aspect-[8.5/11] animate-pulse bg-gradient-to-br from-paper-dim via-paper to-paper-dim"
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={finalSrc}
              alt={`Page ${pageNumber}`}
              className="block w-full select-none"
              draggable={false}
            />
            {overlay}
          </>
        )}
      </div>
    </div>
  );
});

'use client';

import { forwardRef } from 'react';

import { useAuthedImage } from '@/hooks/useAuthedImage';
import { cn } from '@/lib/utils';

interface Props {
  url: string;
  pageNumber: number;
  overlay?: React.ReactNode;
  /**
   * If true, fetch via authed client (dashboard).
   * If false, use raw <img src=url> (public signing routes use server-rendered URLs).
   */
  authed?: boolean;
}

/**
 * Single page image with optional overlay slot for field placement / signing.
 * Uses Refs at outer container so coordinate math has stable target.
 */
export const PageImage = forwardRef<HTMLDivElement, Props>(function PageImage(
  { url, pageNumber, overlay, authed = true },
  ref,
) {
  const { src, loading } = useAuthedImage(authed ? url : undefined);
  const finalSrc = authed ? src : url;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="label-mono mb-1.5">page · {pageNumber}</div>
      <div
        ref={ref}
        className={cn(
          'relative w-full max-w-[860px] bg-paper border border-border shadow-sheet',
          'overflow-hidden',
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

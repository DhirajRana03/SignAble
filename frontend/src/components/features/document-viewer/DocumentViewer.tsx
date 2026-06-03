'use client';

import { type MutableRefObject, useRef, useEffect } from 'react';

import { PageImage } from './PageImage';

interface Props {
  pageUrls: string[];
  authed?: boolean;
  renderOverlay?: (
    pageIndex: number,
    pageRef: MutableRefObject<HTMLDivElement | null>,
  ) => React.ReactNode;
  onPageRefsReady?: (refs: MutableRefObject<HTMLDivElement | null>[]) => void;
}

/**
 * Image-based PDF viewer.
 *
 * Why image-based instead of react-pdf:
 * - Predictable coordinate mapping (% of <img> dimensions)
 * - Server pre-renders pages; client only displays
 * - No PDF.js bundle bloat
 */
export function DocumentViewer({
  pageUrls,
  authed = true,
  renderOverlay,
  onPageRefsReady,
}: Props) {
  const refs = useRef<MutableRefObject<HTMLDivElement | null>[]>([]);

  if (refs.current.length !== pageUrls.length) {
    refs.current = pageUrls.map(() => ({ current: null }));
  }

  useEffect(() => {
    onPageRefsReady?.(refs.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrls.length]);

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      {pageUrls.map((url, i) => (
        <PageImage
          key={i}
          url={url}
          pageNumber={i + 1}
          authed={authed}
          overlay={renderOverlay?.(i, refs.current[i])}
          ref={(el) => {
            if (refs.current[i]) refs.current[i].current = el;
          }}
        />
      ))}
    </div>
  );
}

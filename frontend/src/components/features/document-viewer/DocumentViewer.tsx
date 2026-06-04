'use client';

import { type MutableRefObject, useRef, useEffect } from 'react';

import { PageImage } from './PageImage';

interface Props {
  pageUrls: string[];
  authed?: boolean;
  zoom?: number;
  renderOverlay?: (
    pageIndex: number,
    pageRef: MutableRefObject<HTMLDivElement | null>,
  ) => React.ReactNode;
  onPageRefsReady?: (refs: MutableRefObject<HTMLDivElement | null>[]) => void;
}

/**
 * Image-based PDF viewer.
 *
 * - Predictable coordinate mapping (% of <img> dimensions)
 * - Server pre-renders pages; client only displays
 * - Zoom scales each page width via prop; layout preserved.
 */
export function DocumentViewer({
  pageUrls,
  authed = true,
  zoom = 1,
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
    <div className="flex flex-col items-center gap-6 py-6 px-6">
      {pageUrls.map((url, i) => (
        <PageImage
          key={i}
          url={url}
          pageNumber={i + 1}
          authed={authed}
          zoom={zoom}
          overlay={renderOverlay?.(i, refs.current[i])}
          ref={(el) => {
            if (refs.current[i]) refs.current[i].current = el;
          }}
        />
      ))}
    </div>
  );
}

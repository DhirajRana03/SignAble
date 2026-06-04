'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { useAuthedImage } from '@/hooks/useAuthedImage';
import { cn } from '@/lib/utils';

/**
 * Collapsible page thumbnail strip. Sticky to left of viewport. Click
 * thumbnail scrolls main viewer to corresponding page. Collapses to a
 * thin handle when toggled.
 */
export function ThumbnailStrip({
  pageUrls,
  activePage,
  onJump,
}: {
  pageUrls: string[];
  activePage: number;
  onJump: (pageIndex: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (pageUrls.length <= 1) return null;

  return (
    <aside
      className={cn(
        'sticky top-20 self-start shrink-0 transition-all duration-200',
        collapsed ? 'w-8' : 'w-24',
      )}
    >
      <div
        className={cn(
          'rounded-lg bg-surface-1 border border-border shadow-sm overflow-hidden',
          'flex flex-col',
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="h-7 w-full grid place-items-center text-ink-3 hover:text-ink hover:bg-surface-sunken transition-colors border-b border-border"
          aria-label={collapsed ? 'Expand thumbnails' : 'Collapse thumbnails'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
        {!collapsed ? (
          <div className="overflow-y-auto max-h-[calc(100vh-8rem)] p-2 space-y-2">
            {pageUrls.map((url, i) => (
              <Thumbnail
                key={i}
                url={url}
                pageNumber={i + 1}
                active={i + 1 === activePage}
                onClick={() => onJump(i)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Thumbnail({
  url,
  pageNumber,
  active,
  onClick,
}: {
  url: string;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
}) {
  const { src } = useAuthedImage(url);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full block rounded-md overflow-hidden transition-all',
        'border-2',
        active
          ? 'border-accent shadow-md'
          : 'border-border hover:border-accent/50',
      )}
    >
      <div className="bg-paper aspect-[8.5/11] relative">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Page ${pageNumber}`}
            className="block w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full animate-pulse bg-surface-sunken" />
        )}
      </div>
      <div
        className={cn(
          'py-1 text-center text-[10px] font-mono',
          active ? 'bg-accent-soft text-accent-deep' : 'text-ink-3',
        )}
      >
        {pageNumber}
      </div>
    </button>
  );
}

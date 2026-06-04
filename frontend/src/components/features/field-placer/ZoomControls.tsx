'use client';

import { Maximize2, Minus, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

/**
 * Floating zoom pill. Fixed bottom-right of viewport. Steps through
 * preset zoom levels via plus/minus buttons; current percent displayed
 * inline; reset returns to 100%.
 */
export function ZoomControls({
  zoom,
  onChange,
}: {
  zoom: number;
  onChange: (z: number) => void;
}) {
  const stepIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
  const safeIndex = stepIndex === -1 ? ZOOM_LEVELS.length - 1 : stepIndex;

  const dec = () => {
    const next = Math.max(safeIndex - 1, 0);
    onChange(ZOOM_LEVELS[next]);
  };
  const inc = () => {
    const next = Math.min(safeIndex + 1, ZOOM_LEVELS.length - 1);
    onChange(ZOOM_LEVELS[next]);
  };

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-30',
        'flex items-center gap-0.5 p-1 rounded-pill',
        'bg-surface-1 border border-border shadow-lg',
      )}
    >
      <ZoomButton onClick={dec} aria-label="Zoom out" disabled={safeIndex === 0}>
        <Minus className="h-3.5 w-3.5" />
      </ZoomButton>
      <div className="px-3 text-[11.5px] font-mono text-ink-2 tabular-nums min-w-[3.5rem] text-center">
        {Math.round(zoom * 100)}%
      </div>
      <ZoomButton
        onClick={inc}
        aria-label="Zoom in"
        disabled={safeIndex === ZOOM_LEVELS.length - 1}
      >
        <Plus className="h-3.5 w-3.5" />
      </ZoomButton>
      <div className="w-px h-5 bg-border mx-0.5" />
      <ZoomButton onClick={() => onChange(1)} aria-label="Reset zoom">
        <Maximize2 className="h-3 w-3" />
      </ZoomButton>
    </div>
  );
}

function ZoomButton({
  children,
  onClick,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 w-7 grid place-items-center rounded-full text-ink-2',
        'hover:bg-surface-sunken hover:text-ink transition-colors',
        'disabled:opacity-30 disabled:cursor-not-allowed',
      )}
      {...props}
    >
      {children}
    </button>
  );
}

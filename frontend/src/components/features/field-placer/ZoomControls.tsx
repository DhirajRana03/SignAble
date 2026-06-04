'use client';

import { Grid3x3, Maximize2, Minus, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

/**
 * Floating glass pill anchored bottom-right. Zoom presets, reset, and
 * grid-snap toggle.
 */
export function ZoomControls({
  zoom,
  onChange,
  snap,
  onToggleSnap,
}: {
  zoom: number;
  onChange: (z: number) => void;
  snap: boolean;
  onToggleSnap: () => void;
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
        'bg-white/70 backdrop-blur-md border border-white/60 shadow-lg',
      )}
    >
      <ZoomButton
        onClick={onToggleSnap}
        aria-label={snap ? 'Disable grid snap' : 'Enable grid snap'}
        title={snap ? 'Grid snap on' : 'Grid snap off'}
        active={snap}
      >
        <Grid3x3 className="h-3.5 w-3.5" />
      </ZoomButton>
      <div className="w-px h-5 bg-border mx-0.5" />
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
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 w-7 grid place-items-center rounded-full transition-colors',
        active
          ? 'bg-accent text-white'
          : 'text-ink-2 hover:bg-white/80 hover:text-ink',
        'disabled:opacity-30 disabled:cursor-not-allowed',
      )}
      {...props}
    >
      {children}
    </button>
  );
}

'use client';

import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Edit3,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import { type CSSProperties, useEffect, useRef } from 'react';

import { useEnvelopeEditorStore, type EditorField } from '@/store/envelopeEditorStore';
import { cn, recipientColor } from '@/lib/utils';
import { isTextOptions, type FieldType } from '@/types/envelope.types';

import { findPageAtPoint } from './dragUtils';

const FIELD_LABEL: Record<FieldType, string> = {
  SIGNATURE: 'Sign',
  INITIALS: 'Initial',
  DATE: 'Date',
  TEXT: 'Text',
  DROPDOWN: 'Dropdown',
  CHECKBOX: 'Check',
};

/**
 * Icon shown inside a placed chip. `null` types render the label only —
 * the generic `T` glyph was noisy on identity/data text fields where
 * the label itself ("Name", "Company", etc.) is already self-explanatory.
 */
const FIELD_ICON: Record<FieldType, typeof TypeIcon | null> = {
  SIGNATURE: Edit3,
  INITIALS: null,
  DATE: null,
  TEXT: null,
  DROPDOWN: ChevronDown,
  CHECKBOX: CheckSquare,
};

interface Props {
  field: EditorField;
  recipientIndex: number;
  recipientName?: string;
  style: CSSProperties;
  pageWidth: number;
  pageHeight: number;
  /**
   * Dim + disable pointer interactions when this chip's recipient is
   * not the current visibility filter target. Keeps spatial context
   * without letting the user accidentally select a hidden chip.
   */
  dimmed?: boolean;
}

/**
 * DocuSign-style draggable/resizable field chip.
 *
 * Drag performance: every pointermove writes directly to the chip DOM
 * via `requestAnimationFrame` (transform for move, width/height for
 * resize). The Zustand store is only updated on pointerup. This avoids
 * a full React reconciliation per frame and removes the visible lag
 * caused by `transition-all` easing on each store-driven position
 * change.
 */
export function FieldChip({
  field,
  recipientIndex,
  recipientName,
  style,
  pageWidth,
  pageHeight,
  dimmed = false,
}: Props) {
  const select = useEnvelopeEditorStore((s) => s.select);
  const update = useEnvelopeEditorStore((s) => s.updateField);
  const remove = useEnvelopeEditorStore((s) => s.removeField);
  const selected = useEnvelopeEditorStore(
    (s) => s.selectedTempId === field.tempId,
  );

  const chipRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<{
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    startXPct: number;
    startYPct: number;
    startWPct: number;
    startHPct: number;
    pointerId: number;
    captureEl: Element | null;
    rafId: number | null;
    pendingX: number;
    pendingY: number;
    pendingW: number;
    pendingH: number;
    // Final percentages flushed to the store on pointerup.
    finalXPct: number;
    finalYPct: number;
    finalWPct: number;
    finalHPct: number;
  } | null>(null);

  // Latest field/page geometry — refs avoid re-binding listeners on
  // every render while still reading the newest values mid-drag.
  const fieldRef = useRef(field);
  fieldRef.current = field;
  const pageSizeRef = useRef({ pageWidth, pageHeight });
  pageSizeRef.current = { pageWidth, pageHeight };

  const color = recipientColor(recipientIndex);
  const Icon = FIELD_ICON[field.fieldType];

  // Window-level pointer listeners. Pure imperative — touch DOM only,
  // never the store, until drag completes.
  useEffect(() => {
    const applyFrame = () => {
      const drag = dragRef.current;
      const el = chipRef.current;
      if (!drag || !el) return;
      drag.rafId = null;
      if (drag.type === 'move') {
        // Translate from the chip's base left/top (set via style prop
        // from the store snapshot at drag start). Sub-pixel transforms
        // are GPU-cheap and don't trigger layout.
        el.style.transform = `translate3d(${drag.pendingX}px, ${drag.pendingY}px, 0)`;
      } else {
        el.style.width = `${drag.pendingW}px`;
        el.style.height = `${drag.pendingH}px`;
      }
    };

    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      const { pageWidth: pw, pageHeight: ph } = pageSizeRef.current;
      if (!pw || !ph) return;
      const f = fieldRef.current;
      const dxPx = e.clientX - drag.startX;
      const dyPx = e.clientY - drag.startY;

      if (drag.type === 'move') {
        // Allow the chip to translate freely past its origin page so
        // the user can drag onto adjacent pages. The release handler
        // clamps to whichever page the pointer lands on. Same-page
        // clamping happens at drop time too — see `handleUp`.
        const baseLeftPx = drag.startXPct * pw;
        const baseTopPx = drag.startYPct * ph;
        drag.pendingX = dxPx;
        drag.pendingY = dyPx;
        const nextLeftPx = baseLeftPx + dxPx;
        const nextTopPx = baseTopPx + dyPx;
        const widthPx = f.widthPct * pw;
        const heightPx = f.heightPct * ph;
        const maxLeftPx = pw - widthPx;
        const maxTopPx = ph - heightPx;
        // Store a clamped same-page fallback in case the drop lands on
        // the origin page (so it doesn't slip off the edge).
        drag.finalXPct =
          Math.min(Math.max(nextLeftPx, 0), Math.max(0, maxLeftPx)) / pw;
        drag.finalYPct =
          Math.min(Math.max(nextTopPx, 0), Math.max(0, maxTopPx)) / ph;
      } else {
        const baseWPx = drag.startWPct * pw;
        const baseHPx = drag.startHPct * ph;
        const minWPx = 0.02 * pw;
        const minHPx = 0.015 * ph;
        const maxWPx = (1 - f.xPct) * pw;
        const maxHPx = (1 - f.yPct) * ph;
        const nextWPx = Math.min(Math.max(baseWPx + dxPx, minWPx), maxWPx);
        const nextHPx = Math.min(Math.max(baseHPx + dyPx, minHPx), maxHPx);
        drag.pendingW = nextWPx;
        drag.pendingH = nextHPx;
        drag.finalWPct = nextWPx / pw;
        drag.finalHPct = nextHPx / ph;
      }

      if (drag.rafId == null) {
        drag.rafId = requestAnimationFrame(applyFrame);
      }
    };

    const handleUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      if (drag.rafId != null) {
        cancelAnimationFrame(drag.rafId);
        drag.rafId = null;
      }
      // Release pointer capture so subsequent clicks aren't trapped.
      try {
        drag.captureEl?.releasePointerCapture(drag.pointerId);
      } catch {
        /* noop */
      }
      // Clear any imperative transform/size — React will re-render
      // from the new store state and own the layout again.
      const el = chipRef.current;
      if (el) {
        el.style.transform = '';
        if (drag.type === 'resize') {
          el.style.width = '';
          el.style.height = '';
        }
        el.dataset.dragging = 'false';
      }
      const f = fieldRef.current;
      if (drag.type === 'move') {
        // Cross-page drop: if the pointer landed inside a different
        // page than the chip's current one, reassign pageNumber and
        // recompute xPct/yPct relative to that page's bounding box.
        const target = findPageAtPoint(e.clientX, e.clientY);
        if (target && target.pageNumber !== f.pageNumber) {
          // Clamp drop position so the chip's full footprint fits the
          // new page. Anchor on top-left of cursor since the user
          // intent is to drop where the pointer lands.
          const xPct = Math.min(
            Math.max((e.clientX - target.rect.left) / target.rect.width, 0),
            Math.max(0, 1 - f.widthPct),
          );
          const yPct = Math.min(
            Math.max((e.clientY - target.rect.top) / target.rect.height, 0),
            Math.max(0, 1 - f.heightPct),
          );
          update(f.tempId, {
            pageNumber: target.pageNumber,
            xPct,
            yPct,
          });
        } else {
          update(f.tempId, { xPct: drag.finalXPct, yPct: drag.finalYPct });
        }
      } else {
        update(f.tempId, {
          widthPct: drag.finalWPct,
          heightPct: drag.finalHPct,
        });
      }
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [update]);

  const beginDrag = (e: React.PointerEvent, type: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    let captureEl: Element | null = null;
    try {
      captureEl = e.currentTarget as Element;
      captureEl.setPointerCapture(e.pointerId);
    } catch {
      captureEl = null;
    }
    select(field.tempId);
    if (chipRef.current) {
      chipRef.current.dataset.dragging = 'true';
    }
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startXPct: field.xPct,
      startYPct: field.yPct,
      startWPct: field.widthPct,
      startHPct: field.heightPct,
      pointerId: e.pointerId,
      captureEl,
      rafId: null,
      pendingX: 0,
      pendingY: 0,
      pendingW: field.widthPct * pageWidth,
      pendingH: field.heightPct * pageHeight,
      finalXPct: field.xPct,
      finalYPct: field.yPct,
      finalWPct: field.widthPct,
      finalHPct: field.heightPct,
    };
  };

  const tooltip = recipientName
    ? `${recipientName} \u00b7 ${field.label ?? FIELD_LABEL[field.fieldType]}`
    : (field.label ?? FIELD_LABEL[field.fieldType]);

  return (
    <div
      ref={chipRef}
      style={{ ...style, touchAction: 'none' }}
      title={tooltip}
      onPointerDown={(e) => {
        if (dimmed) return;
        beginDrag(e, 'move');
      }}
      className={cn(
        'absolute select-none group',
        'rounded-md flex items-center justify-center',
        // Animate appearance + visual states, but never the position/
        // size properties driven by drag. `transition-all duration-150`
        // on left/top/width/height caused per-frame easing that read as
        // input lag during a drag.
        'transition-[box-shadow,border-color,opacity] duration-150 animate-fade-up',
        'data-[dragging=true]:transition-none',
        color.bg,
        color.fg,
        `border-l-4 ${color.bar}`,
        dimmed
          ? 'opacity-25 pointer-events-none cursor-default'
          : 'cursor-move',
        selected
          ? 'border-2 border-solid border-accent ring-2 ring-accent/30 shadow-lg z-20'
          : 'border border-dashed border-current/60 hover:shadow-md z-10',
      )}
    >
      {(() => {
        // TEXT fields: display the user-entered Add Text value when present.
        // Other types + empty TEXT: render the icon + label badge.
        const textValue = isTextOptions(field.options)
          ? (field.options.placeholder ?? '')
          : '';
        if (textValue) {
          return (
            <div className="pointer-events-none w-full h-full px-1.5 py-1 flex items-center overflow-hidden">
              <span className="text-[11px] font-normal normal-case tracking-normal text-ink truncate w-full">
                {textValue}
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1 pointer-events-none px-1.5 min-w-0">
            {Icon ? (
              <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            ) : null}
            <span className="text-[10px] font-semibold uppercase tracking-wider truncate">
              {field.label ?? FIELD_LABEL[field.fieldType]}
            </span>
            {field.required ? (
              <span className="text-current opacity-80">*</span>
            ) : null}
          </div>
        );
      })()}

      {selected ? (
        <>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => remove(field.tempId)}
            className="absolute -top-2 -right-2 z-30 h-5 w-5 rounded-full bg-danger text-white shadow-md ring-2 ring-paper flex items-center justify-center hover:bg-red-700 transition-colors"
            aria-label="Remove field"
          >
            <X className="h-2.5 w-2.5" strokeWidth={3} />
          </button>
          <div
            onPointerDown={(e) => beginDrag(e, 'resize')}
            style={{ touchAction: 'none' }}
            className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm bg-accent border-2 border-paper z-30"
          />
        </>
      ) : null}
    </div>
  );
}

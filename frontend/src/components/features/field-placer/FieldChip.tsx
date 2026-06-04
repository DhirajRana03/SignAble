'use client';

import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Edit3,
  GripVertical,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import { type CSSProperties, useRef } from 'react';

import { useEnvelopeEditorStore, type EditorField } from '@/store/envelopeEditorStore';
import { cn, recipientColor } from '@/lib/utils';
import type { FieldType } from '@/types/envelope.types';

const FIELD_LABEL: Record<FieldType, string> = {
  SIGNATURE: 'Signature',
  INITIALS: 'Initials',
  DATE: 'Date',
  TEXT: 'Text',
  DROPDOWN: 'Dropdown',
  CHECKBOX: 'Checkbox',
};

const FIELD_ICON: Record<FieldType, typeof TypeIcon> = {
  SIGNATURE: Edit3,
  INITIALS: TypeIcon,
  DATE: Calendar,
  TEXT: TypeIcon,
  DROPDOWN: ChevronDown,
  CHECKBOX: CheckSquare,
};

interface Props {
  field: EditorField;
  recipientIndex: number;
  style: CSSProperties;
  pageWidth: number;
  pageHeight: number;
}

/**
 * Draggable + resizable signature field chip overlaid on a page.
 * Uses pointer events for portability (mouse + touch).
 */
export function FieldChip({
  field,
  recipientIndex,
  style,
  pageWidth,
  pageHeight,
}: Props) {
  const select = useEnvelopeEditorStore((s) => s.select);
  const update = useEnvelopeEditorStore((s) => s.updateField);
  const remove = useEnvelopeEditorStore((s) => s.removeField);
  const selected = useEnvelopeEditorStore((s) => s.selectedTempId === field.tempId);

  const dragRef = useRef<{
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    startXPct: number;
    startYPct: number;
    startWPct: number;
    startHPct: number;
  } | null>(null);

  const color = recipientColor(recipientIndex);
  const Icon = FIELD_ICON[field.fieldType];

  const onPointerDown = (e: React.PointerEvent, type: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    select(field.tempId);
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startXPct: field.xPct,
      startYPct: field.yPct,
      startWPct: field.widthPct,
      startHPct: field.heightPct,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / pageWidth;
    const dy = (e.clientY - drag.startY) / pageHeight;
    if (drag.type === 'move') {
      const xPct = Math.min(
        Math.max(drag.startXPct + dx, 0),
        1 - field.widthPct,
      );
      const yPct = Math.min(
        Math.max(drag.startYPct + dy, 0),
        1 - field.heightPct,
      );
      update(field.tempId, { xPct, yPct });
    } else {
      const widthPct = Math.min(
        Math.max(drag.startWPct + dx, 0.04),
        1 - field.xPct,
      );
      const heightPct = Math.min(
        Math.max(drag.startHPct + dy, 0.025),
        1 - field.yPct,
      );
      update(field.tempId, { widthPct, heightPct });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      style={style}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={cn(
        'absolute cursor-move select-none transition-shadow group',
        'border-2 rounded-sm flex items-center justify-center',
        'ring-offset-2 ring-offset-paper',
        color.bg,
        color.fg,
        'border-current',
        selected ? 'ring-2 ring-current shadow-sheet z-20' : 'z-10',
      )}
    >
      <div className="flex items-center gap-1.5 pointer-events-none px-2 min-w-0">
        <GripVertical className="h-3 w-3 opacity-50 shrink-0" />
        <Icon className="h-3 w-3 shrink-0" />
        <span className="font-mono text-[10px] uppercase tracking-wider truncate">
          {FIELD_LABEL[field.fieldType]}
        </span>
        {field.required ? <span className="text-current">*</span> : null}
      </div>

      {selected ? (
        <>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => remove(field.tempId)}
            className="absolute -top-2 -right-2 z-30 h-5 w-5 rounded-sm bg-paper border border-current flex items-center justify-center hover:bg-danger hover:text-paper"
            aria-label="Remove field"
          >
            <X className="h-3 w-3" />
          </button>
          <div
            onPointerDown={(e) => onPointerDown(e, 'resize')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm bg-paper border border-current z-30"
          />
        </>
      ) : null}
    </div>
  );
}

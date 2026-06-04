'use client';

import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Edit3,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import { type CSSProperties, useRef } from 'react';

import { useEnvelopeEditorStore, type EditorField } from '@/store/envelopeEditorStore';
import { cn, recipientColor } from '@/lib/utils';
import type { FieldType } from '@/types/envelope.types';

const FIELD_LABEL: Record<FieldType, string> = {
  SIGNATURE: 'Sign',
  INITIALS: 'Initial',
  DATE: 'Date',
  TEXT: 'Text',
  DROPDOWN: 'Dropdown',
  CHECKBOX: 'Check',
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
 * DocuSign-style draggable/resizable field chip. Filled recipient color
 * with dashed border at rest; accent ring + corner handle when selected.
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
  const selected = useEnvelopeEditorStore(
    (s) => s.selectedTempId === field.tempId,
  );

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
        'absolute cursor-move select-none group',
        'rounded-md flex items-center justify-center',
        'transition-shadow duration-100',
        color.bg,
        color.fg,
        selected
          ? 'border-2 border-solid border-accent ring-2 ring-accent/30 shadow-lg z-20'
          : 'border border-dashed border-current/60 hover:shadow-md z-10',
      )}
    >
      {(() => {
        // TEXT fields: display the user-entered Add Text value when present.
        // Other types + empty TEXT: render the icon + label badge.
        const textValue =
          field.fieldType === 'TEXT' &&
          field.options &&
          'placeholder' in field.options
            ? ((field.options as { placeholder?: string }).placeholder ?? '')
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
            <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
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
            onPointerDown={(e) => onPointerDown(e, 'resize')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm bg-accent border-2 border-paper z-30"
          />
        </>
      ) : null}
    </div>
  );
}

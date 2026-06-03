'use client';

import { type RefObject } from 'react';

import { useElementSize } from '@/hooks/useElementSize';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import type { Recipient } from '@/types/envelope.types';

import { FieldChip } from './FieldChip';

/**
 * Renders all editor fields for a single page as absolute-positioned chips.
 * Pure presentation — coordinate math lives in FieldChip + useFieldEditor.
 */
export function FieldOverlay({
  pageIndex,
  pageRef,
  recipients,
  onPagePointerDown,
}: {
  pageIndex: number;
  pageRef: RefObject<HTMLDivElement>;
  recipients: Recipient[];
  onPagePointerDown: (e: React.PointerEvent, pageRef: RefObject<HTMLDivElement>) => void;
}) {
  const fields = useEnvelopeEditorStore((s) =>
    s.fields.filter((f) => f.pageNumber === pageIndex + 1),
  );
  const select = useEnvelopeEditorStore((s) => s.select);
  const { width, height } = useElementSize(pageRef);

  const recipientIndex = (id: string) =>
    recipients.findIndex((r) => r.id === id);

  return (
    <div
      onPointerDown={(e) => {
        // Deselect when clicking blank area
        if (e.target === e.currentTarget) select(null);
        onPagePointerDown(e, pageRef);
      }}
      className="absolute inset-0"
    >
      {fields.map((f) => (
        <FieldChip
          key={f.tempId}
          field={f}
          recipientIndex={Math.max(0, recipientIndex(f.recipientId))}
          pageWidth={width || 1}
          pageHeight={height || 1}
          style={{
            left: f.xPct * (width || 0),
            top: f.yPct * (height || 0),
            width: f.widthPct * (width || 0),
            height: f.heightPct * (height || 0),
          }}
        />
      ))}
    </div>
  );
}

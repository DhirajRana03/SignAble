'use client';

import { type RefObject, useMemo, useState } from 'react';

import { useElementSize } from '@/hooks/useElementSize';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import type { Recipient } from '@/types/envelope.types';

import { FieldChip } from './FieldChip';

/**
 * Renders editor fields for one page as absolute-positioned chips.
 * Accepts drag-drop from palette; raises drop event with page-relative
 * percent coords. Optional grid overlay when snap enabled.
 */
export function FieldOverlay({
  pageIndex,
  pageRef,
  recipients,
  snap,
  onDrop,
}: {
  pageIndex: number;
  pageRef: RefObject<HTMLDivElement>;
  recipients: Recipient[];
  snap: boolean;
  onDrop: (
    pageIndex: number,
    pageRef: RefObject<HTMLDivElement>,
    xPct: number,
    yPct: number,
  ) => void;
}) {
  const allFields = useEnvelopeEditorStore((s) => s.fields);
  const fields = useMemo(
    () => allFields.filter((f) => f.pageNumber === pageIndex + 1),
    [allFields, pageIndex],
  );
  const select = useEnvelopeEditorStore((s) => s.select);
  const { width, height } = useElementSize(pageRef);
  const [dragOver, setDragOver] = useState(false);

  const recipientIndex = (id: string) =>
    recipients.findIndex((r) => r.id === id);

  return (
    <div
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) select(null);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.target === e.currentTarget) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const el = pageRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width;
        const yPct = (e.clientY - rect.top) / rect.height;
        onDrop(pageIndex, pageRef, xPct, yPct);
      }}
      className="absolute inset-0"
    >
      {/* Grid overlay */}
      {snap ? (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.15) 1px, transparent 1px)',
            backgroundSize: '5% 5%',
          }}
        />
      ) : null}

      {/* Drop highlight */}
      {dragOver ? (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none border-2 border-dashed border-accent rounded-sm bg-accent/5"
        />
      ) : null}

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

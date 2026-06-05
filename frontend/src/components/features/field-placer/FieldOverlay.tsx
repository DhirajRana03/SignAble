'use client';

import { type RefObject, useMemo } from 'react';

import { useElementSize } from '@/hooks/useElementSize';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import type { Recipient } from '@/types/envelope.types';

import { FieldChip } from './FieldChip';

/**
 * Renders editor fields for one page as absolute-positioned chips.
 *
 * Palette drag-drop is handled by FieldToolbar with a pointer-driven
 * ghost (see PaletteDragGhost in FieldToolbar.tsx); this overlay only
 * owns placed chips and the optional snap grid.
 */
export function FieldOverlay({
  pageIndex,
  pageRef,
  recipients,
  snap,
}: {
  pageIndex: number;
  pageRef: RefObject<HTMLDivElement>;
  recipients: Recipient[];
  snap: boolean;
}) {
  const allFields = useEnvelopeEditorStore((s) => s.fields);
  const fields = useMemo(
    () => allFields.filter((f) => f.pageNumber === pageIndex + 1),
    [allFields, pageIndex],
  );
  const select = useEnvelopeEditorStore((s) => s.select);
  const filterRecipientId = useEnvelopeEditorStore(
    (s) => s.filterRecipientId,
  );
  const { width, height } = useElementSize(pageRef);

  const recipientIndex = (id: string) =>
    recipients.findIndex((r) => r.id === id);

  const recipientName = (id: string) =>
    recipients.find((r) => r.id === id)?.name ?? '';

  return (
    <div
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) select(null);
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

      {fields.map((f) => {
        const dimmed =
          !!filterRecipientId && filterRecipientId !== f.recipientId;
        return (
          <FieldChip
            key={f.tempId}
            field={f}
            recipientIndex={Math.max(0, recipientIndex(f.recipientId))}
            recipientName={recipientName(f.recipientId)}
            pageWidth={width || 1}
            pageHeight={height || 1}
            dimmed={dimmed}
            style={{
              left: f.xPct * (width || 0),
              top: f.yPct * (height || 0),
              width: f.widthPct * (width || 0),
              height: f.heightPct * (height || 0),
            }}
          />
        );
      })}
    </div>
  );
}

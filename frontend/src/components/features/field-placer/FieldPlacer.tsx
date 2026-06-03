'use client';

import { type RefObject, useEffect, useState } from 'react';

import { DocumentViewer } from '@/components/features/document-viewer/DocumentViewer';
import { useDocumentPages } from '@/hooks/useDocuments';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import type { Envelope, FieldType } from '@/types/envelope.types';

import { FieldOverlay } from './FieldOverlay';
import { FieldToolbar } from './FieldToolbar';

/**
 * Wires DocumentViewer + FieldOverlay + FieldToolbar into the field-placement experience.
 * Hosts the click-to-drop logic which converts pixel coordinates → percentages.
 */
export function FieldPlacer({ envelope }: { envelope: Envelope }) {
  const pages = useDocumentPages(envelope.documentId);
  const init = useEnvelopeEditorStore((s) => s.init);
  const addField = useEnvelopeEditorStore((s) => s.addField);
  const setActiveRecipient = useEnvelopeEditorStore(
    (s) => s.setActiveRecipient,
  );
  const activeRecipientId = useEnvelopeEditorStore((s) => s.activeRecipientId);
  const [pendingFieldType, setPendingFieldType] = useState<FieldType | null>(
    null,
  );

  // Initialize editor store with existing fields whenever the envelope changes
  useEffect(() => {
    init(envelope.id, envelope.fields ?? []);
    if (envelope.recipients?.length && !activeRecipientId) {
      setActiveRecipient(envelope.recipients[0].id);
    }
  }, [envelope.id, envelope.fields, envelope.recipients, init, setActiveRecipient, activeRecipientId]);

  const handlePagePointerDown = (
    e: React.PointerEvent,
    pageRef: RefObject<HTMLDivElement>,
    pageIndex: number,
  ) => {
    if (!pendingFieldType || !activeRecipientId) return;
    if (e.target !== e.currentTarget) return; // only drop on blank area
    const el = pageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    const widthPct = 0.22;
    const heightPct = pendingFieldType === 'SIGNATURE' ? 0.07 : 0.04;
    addField({
      recipientId: activeRecipientId,
      pageNumber: pageIndex + 1,
      xPct: Math.min(Math.max(xPct, 0), 1 - widthPct),
      yPct: Math.min(Math.max(yPct, 0), 1 - heightPct),
      widthPct,
      heightPct,
      fieldType: pendingFieldType,
      required: true,
    });
    setPendingFieldType(null);
  };

  if (pages.isLoading) {
    return (
      <div className="flex items-center justify-center p-20 label-mono">
        loading document…
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">
      <FieldToolbar
        envelopeId={envelope.id}
        recipients={envelope.recipients ?? []}
        pendingFieldType={pendingFieldType}
        setPendingFieldType={setPendingFieldType}
      />

      <div className="flex-1 min-w-0">
        <DocumentViewer
          pageUrls={pages.data ?? []}
          authed
          renderOverlay={(pageIndex, pageRef) => (
            <FieldOverlay
              pageIndex={pageIndex}
              pageRef={pageRef}
              recipients={envelope.recipients ?? []}
              onPagePointerDown={(e, ref) =>
                handlePagePointerDown(e, ref, pageIndex)
              }
            />
          )}
        />
      </div>
    </div>
  );
}

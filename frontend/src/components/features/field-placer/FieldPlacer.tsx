'use client';

import { type RefObject, useEffect, useState } from 'react';

import { DocumentViewer } from '@/components/features/document-viewer/DocumentViewer';
import { useDocumentPagesMeta } from '@/hooks/useDocuments';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import type { Envelope, FieldOptions, FieldType } from '@/types/envelope.types';

import { FieldOverlay } from './FieldOverlay';
import { FieldToolbar } from './FieldToolbar';

/**
 * Default options for newly-dropped fields. DROPDOWN starts with two
 * placeholder choices so the field is valid the moment it's placed.
 */
function defaultOptionsFor(type: FieldType): FieldOptions {
  if (type === 'DROPDOWN') return { choices: ['Option 1', 'Option 2'] };
  if (type === 'CHECKBOX') return { label: '' };
  return null;
}

function defaultSizeFor(type: FieldType): { widthPct: number; heightPct: number } {
  switch (type) {
    case 'SIGNATURE':
      return { widthPct: 0.22, heightPct: 0.07 };
    case 'INITIALS':
      return { widthPct: 0.1, heightPct: 0.05 };
    case 'CHECKBOX':
      return { widthPct: 0.03, heightPct: 0.025 };
    case 'DROPDOWN':
      return { widthPct: 0.22, heightPct: 0.04 };
    default:
      return { widthPct: 0.22, heightPct: 0.04 };
  }
}

/**
 * Wires DocumentViewer + FieldOverlay + FieldToolbar into the field-placement experience.
 * Hosts the click-to-drop logic which converts pixel coordinates → percentages.
 */
export function FieldPlacer({ envelope }: { envelope: Envelope }) {
  const pagesMeta = useDocumentPagesMeta(envelope.documentId);
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
    const { widthPct, heightPct } = defaultSizeFor(pendingFieldType);
    addField({
      recipientId: activeRecipientId,
      pageNumber: pageIndex + 1,
      xPct: Math.min(Math.max(xPct, 0), 1 - widthPct),
      yPct: Math.min(Math.max(yPct, 0), 1 - heightPct),
      widthPct,
      heightPct,
      fieldType: pendingFieldType,
      required: true,
      options: defaultOptionsFor(pendingFieldType),
    });
    setPendingFieldType(null);
  };

  if (pagesMeta.isLoading) {
    return (
      <div className="flex items-center justify-center p-20 label-mono">
        loading document…
      </div>
    );
  }

  const pageUrls = (pagesMeta.data ?? []).map((p) => p.imageUrl);

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
          pageUrls={pageUrls}
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

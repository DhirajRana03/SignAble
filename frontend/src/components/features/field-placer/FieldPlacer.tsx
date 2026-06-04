'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

import { DocumentViewer } from '@/components/features/document-viewer/DocumentViewer';
import { useDocumentPagesMeta } from '@/hooks/useDocuments';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import type { Envelope, FieldOptions, FieldType } from '@/types/envelope.types';

import { FieldOverlay } from './FieldOverlay';
import { FieldToolbar } from './FieldToolbar';
import { ThumbnailStrip } from './ThumbnailStrip';
import { ZoomControls } from './ZoomControls';

/**
 * Default options for newly-dropped fields. DROPDOWN starts with two
 * placeholder choices so the field is valid the moment it's placed.
 */
function defaultOptionsFor(type: FieldType): FieldOptions {
  if (type === 'DROPDOWN') return { choices: ['Option 1', 'Option 2'] };
  if (type === 'CHECKBOX') return { label: '' };
  return null;
}

function defaultSizeFor(type: FieldType): {
  widthPct: number;
  heightPct: number;
} {
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
 * Wires DocumentViewer + FieldOverlay + FieldToolbar + ThumbnailStrip +
 * ZoomControls into the DocuSign-style field-placement experience.
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
  const [zoom, setZoom] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const pageRefsRef = useRef<RefObject<HTMLDivElement | null>[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    init(envelope.id, envelope.fields ?? []);
    if (envelope.recipients?.length) {
      setActiveRecipient(envelope.recipients[0].id);
    }
  }, [envelope.id]);

  const handlePagePointerDown = (
    e: React.PointerEvent,
    pageRef: RefObject<HTMLDivElement>,
    pageIndex: number,
  ) => {
    if (!pendingFieldType || !activeRecipientId) return;
    if (e.target !== e.currentTarget) return;
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

  const jumpToPage = (pageIndex: number) => {
    const ref = pageRefsRef.current[pageIndex]?.current;
    if (!ref) return;
    ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActivePage(pageIndex + 1);
  };

  // Track active page via IntersectionObserver as user scrolls.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const el = visible[0].target as HTMLElement;
          const idx = Number(el.dataset.pageIndex);
          if (!Number.isNaN(idx)) setActivePage(idx + 1);
        }
      },
      { threshold: [0.3, 0.6] },
    );
    pageRefsRef.current.forEach((r, i) => {
      if (r.current) {
        r.current.dataset.pageIndex = String(i);
        observer.observe(r.current);
      }
    });
    return () => observer.disconnect();
  }, [pagesMeta.data]);

  if (pagesMeta.isLoading) {
    return (
      <div className="flex items-center justify-center p-20 label-mono">
        loading document…
      </div>
    );
  }

  const pageUrls = (pagesMeta.data ?? []).map((p) => p.imageUrl);

  return (
    <>
      <div className="flex gap-4 items-start">
        <ThumbnailStrip
          pageUrls={pageUrls}
          activePage={activePage}
          onJump={jumpToPage}
        />

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
            zoom={zoom}
            onPageRefsReady={(refs) => {
              pageRefsRef.current = refs;
            }}
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

      <ZoomControls zoom={zoom} onChange={setZoom} />
    </>
  );
}

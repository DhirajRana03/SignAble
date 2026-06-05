'use client';

import { FileSignature, MoveDownLeft } from 'lucide-react';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { DocumentViewer } from '@/components/features/document-viewer/DocumentViewer';
import { useDocument, useDocumentPagesMeta } from '@/hooks/useDocuments';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import { cn } from '@/lib/utils';
import type { Envelope, FieldOptions } from '@/types/envelope.types';

import { FieldInspector } from './FieldInspector';
import { FieldOverlay } from './FieldOverlay';
import {
  FieldToolbar,
  type FieldDef,
  type PaletteDropPayload,
} from './FieldToolbar';

function defaultOptionsFor(def: FieldDef): FieldOptions {
  if (def.type === 'DROPDOWN')
    return { choices: ['Option 1', 'Option 2'] };
  if (def.type === 'CHECKBOX') return { label: '' };
  return null;
}

/**
 * Snap value to nearest 5% grid step. Returns the original value when
 * snap disabled.
 */
function maybeSnap(value: number, snap: boolean): number {
  if (!snap) return value;
  return Math.round(value / 0.05) * 0.05;
}

export function FieldPlacer({
  envelope,
  zoom,
  snap,
}: {
  envelope: Envelope;
  zoom: number;
  snap: boolean;
}) {
  const pagesMeta = useDocumentPagesMeta(envelope.documentId);
  const docQuery = useDocument(envelope.documentId);
  const init = useEnvelopeEditorStore((s) => s.init);
  const addField = useEnvelopeEditorStore((s) => s.addField);
  const setActiveRecipient = useEnvelopeEditorStore(
    (s) => s.setActiveRecipient,
  );
  const activeRecipientId = useEnvelopeEditorStore((s) => s.activeRecipientId);
  const selectedTempId = useEnvelopeEditorStore((s) => s.selectedTempId);
  const removeField = useEnvelopeEditorStore((s) => s.removeField);
  const fieldCount = useEnvelopeEditorStore((s) => s.fields.length);

  const [activePage, setActivePage] = useState(1);
  const pageRefsRef = useRef<RefObject<HTMLDivElement | null>[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    init(envelope.id, envelope.fields ?? []);
    if (envelope.recipients?.length) {
      setActiveRecipient(envelope.recipients[0].id);
    }
  }, [envelope.id]);

  /**
   * Palette-driven drop. FieldToolbar runs its own pointer drag (DocuSign
   * style — blurred ghost in flight, full-scale preview over a page),
   * then hands the resolved page + percentage coordinates here. We only
   * apply snap and clamp once before committing to the store.
   */
  const handlePaletteDrop = ({ def, pageNumber, xPct, yPct }: PaletteDropPayload) => {
    if (!activeRecipientId) return;
    const { widthPct, heightPct } = def.defaultSize;
    const clampedX = Math.min(Math.max(maybeSnap(xPct, snap), 0), 1 - widthPct);
    const clampedY = Math.min(Math.max(maybeSnap(yPct, snap), 0), 1 - heightPct);
    addField({
      recipientId: activeRecipientId,
      pageNumber,
      xPct: clampedX,
      yPct: clampedY,
      widthPct,
      heightPct,
      fieldType: def.type,
      label: def.label,
      required: true,
      options: defaultOptionsFor(def),
    });
  };

  const jumpToPage = (pageIndex: number) => {
    const ref = pageRefsRef.current[pageIndex]?.current;
    if (!ref) return;
    ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActivePage(pageIndex + 1);
  };

  /**
   * Keyboard shortcut: Delete / Backspace removes the selected chip.
   * Skipped when focus is inside an editable control so the user can
   * still backspace through property-panel inputs without losing the
   * chip itself.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!selectedTempId) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      removeField(selectedTempId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedTempId, removeField]);

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
    <div className="h-full flex gap-3 px-3 pb-3">
      <FieldToolbar
        recipients={envelope.recipients ?? []}
        onPaletteDrop={handlePaletteDrop}
      />

      {/* Doc column — scrollable canvas. Recipient filter and zoom
          controls now live in the page header above this region. */}
      <div className="flex-1 min-w-0 h-full flex flex-col bg-slate-100 rounded-lg overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto relative">
          <div className="relative">
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
                  snap={snap}
                />
              )}
            />

            {fieldCount === 0 ? <EmptyHint /> : null}
          </div>
        </div>
      </div>

      <FieldInspector
        filename={docQuery.data?.filename ?? 'Document'}
        pageUrls={pageUrls}
        activePage={activePage}
        totalPages={pageUrls.length}
        onJumpToPage={jumpToPage}
      />
    </div>
  );
}

/* ─────────────── Empty illustration ─────────────── */

function EmptyHint() {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-6 right-6 z-10',
        'rounded-xl bg-white/80 backdrop-blur-md border border-white/60 shadow-lg',
        'px-5 py-4 flex items-center gap-3 max-w-xs',
      )}
    >
      <span className="h-9 w-9 grid place-items-center rounded-md bg-accent-soft text-accent-deep shrink-0">
        <FileSignature className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-ink leading-tight">
          Drag a field onto the document
        </p>
        <p className="text-[10.5px] text-ink-3 mt-1 flex items-center gap-1">
          <MoveDownLeft className="h-3 w-3" />
          Start with a Signature field for your first signer.
        </p>
      </div>
    </div>
  );
}

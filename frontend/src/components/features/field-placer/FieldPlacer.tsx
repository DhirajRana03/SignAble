'use client';

import { FileSignature, MoveDownLeft } from 'lucide-react';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { DocumentViewer } from '@/components/features/document-viewer/DocumentViewer';
import { useDocument, useDocumentPagesMeta } from '@/hooks/useDocuments';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import { cn, recipientColor } from '@/lib/utils';
import type { Envelope, FieldOptions, Recipient } from '@/types/envelope.types';

import { FieldInspector } from './FieldInspector';
import { FieldOverlay } from './FieldOverlay';
import { FieldToolbar, type FieldDef } from './FieldToolbar';
import { ZoomControls } from './ZoomControls';

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

export function FieldPlacer({ envelope }: { envelope: Envelope }) {
  const pagesMeta = useDocumentPagesMeta(envelope.documentId);
  const docQuery = useDocument(envelope.documentId);
  const init = useEnvelopeEditorStore((s) => s.init);
  const addField = useEnvelopeEditorStore((s) => s.addField);
  const setActiveRecipient = useEnvelopeEditorStore(
    (s) => s.setActiveRecipient,
  );
  const activeRecipientId = useEnvelopeEditorStore((s) => s.activeRecipientId);
  const filterRecipientId = useEnvelopeEditorStore(
    (s) => s.filterRecipientId,
  );
  const setFilterRecipient = useEnvelopeEditorStore(
    (s) => s.setFilterRecipient,
  );
  const fieldCount = useEnvelopeEditorStore((s) => s.fields.length);

  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const draggingDefRef = useRef<FieldDef | null>(null);
  const pageRefsRef = useRef<RefObject<HTMLDivElement | null>[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    init(envelope.id, envelope.fields ?? []);
    if (envelope.recipients?.length) {
      setActiveRecipient(envelope.recipients[0].id);
    }
  }, [envelope.id]);

  const handleDrop = (
    pageIndex: number,
    _pageRef: RefObject<HTMLDivElement | null>,
    xPctRaw: number,
    yPctRaw: number,
  ) => {
    const def = draggingDefRef.current;
    if (!def || !activeRecipientId) return;
    const { widthPct, heightPct } = def.defaultSize;
    const xPct = Math.min(Math.max(maybeSnap(xPctRaw, snap), 0), 1 - widthPct);
    const yPct = Math.min(Math.max(maybeSnap(yPctRaw, snap), 0), 1 - heightPct);
    addField({
      recipientId: activeRecipientId,
      pageNumber: pageIndex + 1,
      xPct,
      yPct,
      widthPct,
      heightPct,
      fieldType: def.type,
      label: def.label,
      required: true,
      options: defaultOptionsFor(def),
    });
    draggingDefRef.current = null;
  };

  const jumpToPage = (pageIndex: number) => {
    const ref = pageRefsRef.current[pageIndex]?.current;
    if (!ref) return;
    ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActivePage(pageIndex + 1);
  };

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
        onDragStart={(def) => {
          draggingDefRef.current = def;
        }}
      />

      {/* Doc column — filter strip on top, scrollable canvas below */}
      <div className="flex-1 min-w-0 h-full flex flex-col bg-slate-100 rounded-lg overflow-hidden">
        <RecipientFilterStrip
          recipients={envelope.recipients ?? []}
          activeId={filterRecipientId}
          onChange={setFilterRecipient}
        />
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
                onDrop={handleDrop}
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

      <ZoomControls
        zoom={zoom}
        onChange={setZoom}
        snap={snap}
        onToggleSnap={() => setSnap((s) => !s)}
      />
    </div>
  );
}

/* ─────────────── Recipient filter strip ─────────────── */

/**
 * Pill-tab strip rendered above the document canvas. Clicking a pill
 * narrows visible chips to a single recipient; All restores the
 * default view. Driven entirely from the editor store so the
 * setting persists across page jumps and zoom changes.
 */
function RecipientFilterStrip({
  recipients,
  activeId,
  onChange,
}: {
  recipients: Recipient[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}) {
  if (recipients.length <= 1) return null;
  return (
    <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-white/60 bg-white/50 backdrop-blur-md overflow-x-auto">
      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-3 mr-1 shrink-0">
        View
      </span>
      <FilterTab
        active={activeId === null}
        onClick={() => onChange(null)}
        label="All"
      />
      {recipients.map((r, i) => {
        const c = recipientColor(i);
        return (
          <FilterTab
            key={r.id}
            active={activeId === r.id}
            onClick={() => onChange(r.id)}
            label={r.name}
            dotClass={c.bg}
          />
        );
      })}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  dotClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dotClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors shrink-0',
        active
          ? 'bg-accent text-white shadow-glow'
          : 'bg-white/70 text-ink-2 border border-border hover:border-accent/40 hover:text-ink',
      )}
    >
      {dotClass ? (
        <span
          aria-hidden
          className={cn('h-2 w-2 rounded-full', dotClass)}
        />
      ) : null}
      <span className="max-w-[10ch] truncate">{label}</span>
    </button>
  );
}

/* ─────────────── Empty illustration ─────────────── */

function EmptyHint() {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-10',
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



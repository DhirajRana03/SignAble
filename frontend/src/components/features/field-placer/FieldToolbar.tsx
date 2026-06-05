'use client';

import {
  AtSign,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  Hash,
  Home,
  IdCard,
  Lock,
  type LucideIcon,
  PenLine,
  Phone,
  Search,
  StickyNote,
  Type,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn, initials, recipientColor } from '@/lib/utils';
import {
  useEnvelopeEditorStore,
  type EditorField,
} from '@/store/envelopeEditorStore';
import type { FieldType, Recipient } from '@/types/envelope.types';

import { findPageAtPoint } from './dragUtils';

export interface FieldDef {
  id: string;
  type: FieldType;
  label: string;
  icon: LucideIcon;
  group: 'signing' | 'identity' | 'data' | 'advanced';
  disabled?: boolean;
  /** Hover hint surfaced via `title` on the field tile. */
  hint?: string;
  defaultSize: { widthPct: number; heightPct: number };
}

const GROUP_LABEL: Record<FieldDef['group'], string> = {
  signing: 'Signing',
  identity: 'Identity',
  data: 'Data',
  advanced: 'Advanced',
};

export const FIELDS: FieldDef[] = [
  // Signing
  { id: 'signature', type: 'SIGNATURE', label: 'Signature', icon: PenLine, group: 'signing', hint: 'Signer draws or types their signature', defaultSize: { widthPct: 0.2, heightPct: 0.06 } },
  { id: 'initial', type: 'INITIALS', label: 'Initial', icon: IdCard, group: 'signing', hint: 'Signer initials this spot', defaultSize: { widthPct: 0.09, heightPct: 0.05 } },
  { id: 'date', type: 'DATE', label: 'Date Signed', icon: Calendar, group: 'signing', hint: 'Auto-fills with signing date', defaultSize: { widthPct: 0.117, heightPct: 0.026 } },
  // Identity
  { id: 'name', type: 'TEXT', label: 'Name', icon: User, group: 'identity', hint: 'Signer types or auto-fills their name', defaultSize: { widthPct: 0.156, heightPct: 0.026 } },
  { id: 'email', type: 'TEXT', label: 'Email', icon: AtSign, group: 'identity', disabled: true, hint: 'Auto-filled from recipient', defaultSize: { widthPct: 0.182, heightPct: 0.026 } },
  { id: 'company', type: 'TEXT', label: 'Company', icon: Building2, group: 'identity', hint: 'Signer types their company', defaultSize: { widthPct: 0.156, heightPct: 0.026 } },
  { id: 'title', type: 'TEXT', label: 'Title', icon: Briefcase, group: 'identity', hint: 'Signer types their job title', defaultSize: { widthPct: 0.143, heightPct: 0.026 } },
  { id: 'phone', type: 'TEXT', label: 'Phone', icon: Phone, group: 'identity', hint: 'Signer types a phone number', defaultSize: { widthPct: 0.13, heightPct: 0.026 } },
  { id: 'address', type: 'TEXT', label: 'Address', icon: Home, group: 'identity', hint: 'Signer types a mailing address', defaultSize: { widthPct: 0.195, heightPct: 0.0325 } },
  // Data
  { id: 'text', type: 'TEXT', label: 'Text', icon: Type, group: 'data', hint: 'Free-form text input', defaultSize: { widthPct: 0.143, heightPct: 0.026 } },
  { id: 'number', type: 'TEXT', label: 'Number', icon: Hash, group: 'data', hint: 'Numeric input', defaultSize: { widthPct: 0.091, heightPct: 0.026 } },
  { id: 'checkbox', type: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare, group: 'data', hint: 'Yes/no checkbox', defaultSize: { widthPct: 0.039, heightPct: 0.0325 } },
  { id: 'dropdown', type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown, group: 'data', hint: 'Pick from a list of choices', defaultSize: { widthPct: 0.143, heightPct: 0.026 } },
  // Advanced
  { id: 'note', type: 'TEXT', label: 'Note', icon: StickyNote, group: 'advanced', hint: 'Long-form note from the signer', defaultSize: { widthPct: 0.169, heightPct: 0.039 } },
  { id: 'decline', type: 'CHECKBOX', label: 'Decline', icon: XCircle, group: 'advanced', hint: 'Signer can opt out of this section', defaultSize: { widthPct: 0.052, heightPct: 0.039 } },
];

/**
 * DocuSign-style left rail. Recipient dropdown on top, field search,
 * vertical list of field rows grouped by purpose with divider lines.
 */
/**
 * Pointer-driven palette drop callback.
 *
 * Fires once on pointer release when the cursor is inside a page. Caller
 * receives the chosen field def, the destination 1-based page number,
 * and percent coordinates relative to that page so it can hand off to
 * the editor store without re-measuring.
 */
export interface PaletteDropPayload {
  def: FieldDef;
  pageNumber: number;
  xPct: number;
  yPct: number;
}

export function FieldToolbar({
  recipients,
  onPaletteDrop,
}: {
  recipients: Recipient[];
  onPaletteDrop: (payload: PaletteDropPayload) => void;
}) {
  const activeRecipientId = useEnvelopeEditorStore((s) => s.activeRecipientId);
  const setActiveRecipient = useEnvelopeEditorStore(
    (s) => s.setActiveRecipient,
  );
  const fields = useEnvelopeEditorStore((s) => s.fields);
  const [query, setQuery] = useState('');
  const [drag, setDrag] = useState<PaletteDragState | null>(null);

  const activeIdx = recipients.findIndex((r) => r.id === activeRecipientId);
  const activeColor = recipientColor(Math.max(0, activeIdx));

  const q = query.trim().toLowerCase();
  const filtered = q
    ? FIELDS.filter((f) => f.label.toLowerCase().includes(q))
    : FIELDS;

  const groups: { id: FieldDef['group']; items: FieldDef[] }[] = [
    { id: 'signing', items: filtered.filter((f) => f.group === 'signing') },
    { id: 'identity', items: filtered.filter((f) => f.group === 'identity') },
    { id: 'data', items: filtered.filter((f) => f.group === 'data') },
    { id: 'advanced', items: filtered.filter((f) => f.group === 'advanced') },
  ];

  return (
    <aside className="self-start w-56 shrink-0 flex flex-col gap-3 h-full overflow-y-auto pr-1 py-2">
      <RecipientDropdown
        recipients={recipients}
        activeRecipientId={activeRecipientId}
        setActiveRecipient={setActiveRecipient}
        fields={fields}
      />

      <section className="rounded-xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
        <div className="px-3 py-2.5 border-b border-white/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fields"
              className="w-full h-8 pl-8 pr-2 text-[12px] rounded-md bg-white/70 border border-white/60 text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-accent/40 focus:bg-white"
            />
          </div>
        </div>

        {groups.map((g, idx) =>
          g.items.length === 0 ? null : (
            <div
              key={g.id}
              className={cn(
                'px-1.5 pb-1.5',
                idx > 0 && 'border-t border-white/40 pt-1.5 mt-0.5',
              )}
            >
              <p className="px-2 pt-1.5 pb-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
                {GROUP_LABEL[g.id]}
              </p>
              {g.items.map((f) => (
                <FieldRow
                  key={f.id}
                  def={f}
                  disabled={!activeRecipientId || !!f.disabled}
                  locked={!!f.disabled}
                  bgClass={activeColor.bg}
                  fgClass={activeColor.fg}
                  barClass={activeColor.bar}
                  onBeginDrag={(payload) => setDrag(payload)}
                />
              ))}
            </div>
          ),
        )}
      </section>

      {drag ? (
        <PaletteDragGhost
          state={drag}
          color={activeColor}
          onDrop={(payload) => {
            setDrag(null);
            if (payload) onPaletteDrop(payload);
          }}
        />
      ) : null}
    </aside>
  );
}

/* ─────────────── Recipient dropdown ─────────────── */

function RecipientDropdown({
  recipients,
  activeRecipientId,
  setActiveRecipient,
  fields,
}: {
  recipients: Recipient[];
  activeRecipientId: string | null;
  setActiveRecipient: (id: string) => void;
  fields: EditorField[];
}) {
  const [open, setOpen] = useState(false);
  const active = recipients.find((r) => r.id === activeRecipientId);
  const activeIdx = recipients.findIndex((r) => r.id === activeRecipientId);
  const activeColor = recipientColor(Math.max(0, activeIdx));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-xl bg-white/70 backdrop-blur-md',
          'border border-white/60 shadow-sm px-3 py-2.5',
          'hover:bg-white/85 transition-colors',
        )}
      >
        {active ? (
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full shrink-0',
              activeColor.bg,
            )}
          />
        ) : (
          <Users className="h-3.5 w-3.5 text-ink-3" />
        )}
        <span className="flex-1 text-left text-[13px] font-medium text-ink truncate">
          {active?.name ?? 'Select recipient'}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-ink-3 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1.5 z-20 rounded-xl bg-white/95 backdrop-blur-md border border-white/60 shadow-lg overflow-hidden">
            {recipients.map((r, i) => {
              const color = recipientColor(i);
              const count = fields.filter((f) => f.recipientId === r.id).length;
              const isActive = r.id === activeRecipientId;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveRecipient(r.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-left',
                    'hover:bg-accent-soft/50 transition-colors',
                    isActive && 'bg-accent-soft/30',
                  )}
                >
                  <span
                    className={cn(
                      'h-7 w-7 grid place-items-center rounded-full text-[10px] font-semibold uppercase shrink-0',
                      color.bg,
                      color.fg,
                    )}
                  >
                    {initials(r.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-ink truncate leading-tight">
                      {r.name}
                    </span>
                    <span className="block text-[10.5px] text-ink-4 truncate mt-0.5">
                      {count} field{count === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ─────────────── Field row ─────────────── */

/**
 * Snapshot of the row geometry at pointerdown, plus live pointer state.
 * Mirrors DocuSign's behaviour: the palette tile lifts in place as a
 * blurred mini ghost while travelling, then snaps to a full-scale
 * preview the moment the cursor enters a page.
 */
interface PaletteDragState {
  def: FieldDef;
  pointerId: number;
  /** Pointer position now (viewport coords). Drives ghost translate. */
  pointerX: number;
  pointerY: number;
  /** Pointer offset inside the source tile so the ghost picks up exactly under the cursor. */
  offsetX: number;
  offsetY: number;
  /** Source tile pixel size — used for the in-flight blurred preview. */
  tileWidth: number;
  tileHeight: number;
}

function FieldRow({
  def,
  disabled,
  locked,
  bgClass,
  fgClass,
  barClass,
  onBeginDrag,
}: {
  def: FieldDef;
  disabled: boolean;
  locked: boolean;
  bgClass: string;
  fgClass: string;
  barClass: string;
  onBeginDrag: (state: PaletteDragState) => void;
}) {
  const Icon = def.icon;
  const rootRef = useRef<HTMLButtonElement | null>(null);
  return (
    <button
      ref={rootRef}
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        if (disabled) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const el = rootRef.current;
        if (!el) return;
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        onBeginDrag({
          def,
          pointerId: e.pointerId,
          pointerX: e.clientX,
          pointerY: e.clientY,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          tileWidth: rect.width,
          tileHeight: rect.height,
        });
      }}
      title={
        locked
          ? `${def.label} - ${def.hint ?? 'unavailable'}`
          : (def.hint ?? def.label)
      }
      data-bar-class={barClass}
      style={{ touchAction: 'none' }}
      className={cn(
        'w-full flex items-center gap-2 rounded-lg px-1.5 py-1.5',
        'transition-colors duration-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !disabled &&
          'hover:bg-white/60 cursor-grab active:cursor-grabbing',
        locked && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'h-7 w-7 grid place-items-center rounded-md shrink-0 border border-current/20',
          bgClass,
          fgClass,
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <span className="flex-1 text-left text-[12px] font-medium text-ink-2 truncate">
        {def.label}
      </span>
      {locked ? (
        <Lock className="h-3 w-3 text-ink-4 shrink-0" />
      ) : null}
    </button>
  );
}

/* ─────────────── Palette drag ghost ─────────────── */

/**
 * Floating ghost mirroring DocuSign palette drag:
 *   - In flight: blurred mini badge tracking pointer, no commit.
 *   - Over a page: snaps to a full-scale, recipient-tinted preview at
 *     the same pixel size the dropped chip will use, anchored at the
 *     pointer offset.
 *   - Release: invokes onDrop with destination page + clamped pct
 *     coordinates, or null if released outside any page.
 */
function PaletteDragGhost({
  state,
  color,
  onDrop,
}: {
  state: PaletteDragState;
  color: { bg: string; fg: string; bar: string };
  onDrop: (payload: PaletteDropPayload | null) => void;
}) {
  // `live` tracks pointer + the currently-hovered page, recomputed on
  // every pointermove. Mutating refs keeps re-renders cheap (60Hz drag).
  const [live, setLive] = useState<{
    x: number;
    y: number;
    pageWidth: number | null;
    pageRect: DOMRect | null;
  }>({
    x: state.pointerX,
    y: state.pointerY,
    pageWidth: null,
    pageRect: null,
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== state.pointerId) return;
      e.preventDefault();
      const hit = findPageAtPoint(e.clientX, e.clientY);
      setLive({
        x: e.clientX,
        y: e.clientY,
        pageWidth: hit ? hit.rect.width : null,
        pageRect: hit ? hit.rect : null,
      });
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== state.pointerId) return;
      const hit = findPageAtPoint(e.clientX, e.clientY);
      if (!hit) {
        onDrop(null);
        return;
      }
      // Anchor at top-left of cursor — matches the chip preview the
      // user just released. Clamp so the chip fits the page.
      const { widthPct, heightPct } = state.def.defaultSize;
      const xPct = Math.min(
        Math.max((e.clientX - hit.rect.left) / hit.rect.width, 0),
        Math.max(0, 1 - widthPct),
      );
      const yPct = Math.min(
        Math.max((e.clientY - hit.rect.top) / hit.rect.height, 0),
        Math.max(0, 1 - heightPct),
      );
      onDrop({
        def: state.def,
        pageNumber: hit.pageNumber,
        xPct,
        yPct,
      });
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== state.pointerId) return;
      onDrop(null);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [state, onDrop]);

  if (typeof document === 'undefined') return null;

  const Icon = state.def.icon;
  const overPage = live.pageWidth != null;

  // Full-scale chip preview matches the eventual placed-chip width
  // exactly, so the drop position is WYSIWYG.
  const previewWidthPx =
    overPage && live.pageWidth ? state.def.defaultSize.widthPct * live.pageWidth : 0;
  const previewHeightPx =
    overPage && live.pageRect
      ? state.def.defaultSize.heightPct * live.pageRect.height
      : 0;

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
    >
      {overPage ? (
        <div
          // Full-scale preview, anchored at the cursor's top-left so
          // pointer position == future chip top-left.
          style={{
            position: 'absolute',
            left: live.x,
            top: live.y,
            width: Math.max(previewWidthPx, 28),
            height: Math.max(previewHeightPx, 18),
            transition: 'opacity 90ms ease-out',
          }}
          className={cn(
            'rounded-md flex items-center justify-center',
            'border-2 border-solid border-accent ring-2 ring-accent/30 shadow-lg',
            color.bg,
            color.fg,
            `border-l-4 ${color.bar}`,
          )}
        >
          <div className="flex items-center gap-1 px-1.5 min-w-0">
            <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            <span className="text-[10px] font-semibold uppercase tracking-wider truncate">
              {state.def.label}
            </span>
          </div>
        </div>
      ) : (
        <div
          // Mini blurred badge tracking the pointer between palette
          // and page. Slightly translucent + blur filter to read as
          // "in flight" rather than placed.
          style={{
            position: 'absolute',
            left: live.x - state.offsetX,
            top: live.y - state.offsetY,
            width: state.tileWidth,
            height: state.tileHeight,
            filter: 'blur(0.4px)',
            opacity: 0.85,
          }}
          className={cn(
            'rounded-lg flex items-center gap-2 px-1.5 py-1.5',
            'bg-white/80 backdrop-blur-md border border-white/70 shadow-lg',
          )}
        >
          <span
            className={cn(
              'h-7 w-7 grid place-items-center rounded-md shrink-0 border border-current/20',
              color.bg,
              color.fg,
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="flex-1 text-left text-[12px] font-medium text-ink-2 truncate">
            {state.def.label}
          </span>
        </div>
      )}
    </div>,
    document.body,
  );
}



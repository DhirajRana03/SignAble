'use client';

import {
  AtSign,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
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
  Stamp,
  StickyNote,
  Type,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { cn, initials, recipientColor } from '@/lib/utils';
import {
  useEnvelopeEditorStore,
  type EditorField,
} from '@/store/envelopeEditorStore';
import type { FieldType, Recipient } from '@/types/envelope.types';

export interface FieldDef {
  id: string;
  type: FieldType;
  label: string;
  icon: LucideIcon;
  group: 'signing' | 'identity' | 'data' | 'advanced';
  disabled?: boolean;
  defaultSize: { widthPct: number; heightPct: number };
}

export const FIELDS: FieldDef[] = [
  // Signing
  { id: 'signature', type: 'SIGNATURE', label: 'Signature', icon: PenLine, group: 'signing', defaultSize: { widthPct: 0.22, heightPct: 0.07 } },
  { id: 'initial', type: 'INITIALS', label: 'Initial', icon: IdCard, group: 'signing', defaultSize: { widthPct: 0.1, heightPct: 0.05 } },
  { id: 'stamp', type: 'SIGNATURE', label: 'Stamp', icon: Stamp, group: 'signing', defaultSize: { widthPct: 0.18, heightPct: 0.07 } },
  { id: 'date', type: 'DATE', label: 'Date Signed', icon: Calendar, group: 'signing', defaultSize: { widthPct: 0.18, heightPct: 0.04 } },
  // Identity
  { id: 'name', type: 'TEXT', label: 'Name', icon: User, group: 'identity', defaultSize: { widthPct: 0.24, heightPct: 0.04 } },
  { id: 'email', type: 'TEXT', label: 'Email', icon: AtSign, group: 'identity', disabled: true, defaultSize: { widthPct: 0.28, heightPct: 0.04 } },
  { id: 'company', type: 'TEXT', label: 'Company', icon: Building2, group: 'identity', defaultSize: { widthPct: 0.24, heightPct: 0.04 } },
  { id: 'title', type: 'TEXT', label: 'Title', icon: Briefcase, group: 'identity', defaultSize: { widthPct: 0.22, heightPct: 0.04 } },
  { id: 'phone', type: 'TEXT', label: 'Phone', icon: Phone, group: 'identity', defaultSize: { widthPct: 0.2, heightPct: 0.04 } },
  { id: 'address', type: 'TEXT', label: 'Address', icon: Home, group: 'identity', defaultSize: { widthPct: 0.3, heightPct: 0.05 } },
  // Data
  { id: 'text', type: 'TEXT', label: 'Text', icon: Type, group: 'data', defaultSize: { widthPct: 0.22, heightPct: 0.04 } },
  { id: 'number', type: 'TEXT', label: 'Number', icon: Hash, group: 'data', defaultSize: { widthPct: 0.14, heightPct: 0.04 } },
  { id: 'checkbox', type: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare, group: 'data', defaultSize: { widthPct: 0.03, heightPct: 0.025 } },
  { id: 'dropdown', type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown, group: 'data', defaultSize: { widthPct: 0.22, heightPct: 0.04 } },
  // Advanced
  { id: 'note', type: 'TEXT', label: 'Note', icon: StickyNote, group: 'advanced', defaultSize: { widthPct: 0.26, heightPct: 0.06 } },
  { id: 'approve', type: 'CHECKBOX', label: 'Approve', icon: CheckCircle2, group: 'advanced', defaultSize: { widthPct: 0.04, heightPct: 0.03 } },
  { id: 'decline', type: 'CHECKBOX', label: 'Decline', icon: XCircle, group: 'advanced', defaultSize: { widthPct: 0.04, heightPct: 0.03 } },
];

/**
 * DocuSign-style left rail. Recipient dropdown on top, field search,
 * vertical list of field rows grouped by purpose with divider lines.
 */
export function FieldToolbar({
  recipients,
  onDragStart,
}: {
  recipients: Recipient[];
  onDragStart: (def: FieldDef) => void;
}) {
  const activeRecipientId = useEnvelopeEditorStore((s) => s.activeRecipientId);
  const setActiveRecipient = useEnvelopeEditorStore(
    (s) => s.setActiveRecipient,
  );
  const fields = useEnvelopeEditorStore((s) => s.fields);
  const [query, setQuery] = useState('');

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
    <aside className="sticky top-20 self-start w-64 shrink-0 flex flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pb-2">
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

        <div className="px-3 pt-2.5 pb-1.5">
          <p className="text-[10.5px] font-semibold text-ink-2">
            Standard Fields
          </p>
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
              {g.items.map((f) => (
                <FieldRow
                  key={f.id}
                  def={f}
                  disabled={!activeRecipientId || !!f.disabled}
                  locked={!!f.disabled}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          ),
        )}
      </section>

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

function FieldRow({
  def,
  disabled,
  locked,
  onDragStart,
}: {
  def: FieldDef;
  disabled: boolean;
  locked: boolean;
  onDragStart: (def: FieldDef) => void;
}) {
  const Icon = def.icon;
  return (
    <button
      type="button"
      disabled={disabled}
      draggable={!disabled}
      onDragStart={(e) => {
        if (disabled) return;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', def.id);
        const img = new Image();
        img.src =
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
        onDragStart(def);
      }}
      title={locked ? `${def.label} (unavailable)` : def.label}
      className={cn(
        'w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5',
        'transition-colors duration-100',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !disabled &&
          'hover:bg-accent-soft/40 cursor-grab active:cursor-grabbing',
        locked && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'h-8 w-8 grid place-items-center rounded-md shrink-0',
          'bg-sky-100 text-sky-700 border border-sky-200/60',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="flex-1 text-left text-[12.5px] font-medium text-ink-2 truncate">
        {def.label}
      </span>
      {locked ? (
        <Lock className="h-3 w-3 text-ink-4 shrink-0" />
      ) : null}
    </button>
  );
}



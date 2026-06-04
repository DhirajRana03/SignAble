'use client';

import {
  AtSign,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronDown,
  Hash,
  Home,
  IdCard,
  Image as ImageIcon,
  type LucideIcon,
  PenLine,
  Phone,
  Plus,
  Save,
  Trash2,
  Type,
  User,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useBulkSaveFields } from '@/hooks/useEnvelopes';
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
  group: 'signing' | 'identity' | 'data';
  defaultSize: { widthPct: number; heightPct: number };
}

export const FIELDS: FieldDef[] = [
  // Signing block
  {
    id: 'signature',
    type: 'SIGNATURE',
    label: 'Signature',
    icon: PenLine,
    group: 'signing',
    defaultSize: { widthPct: 0.22, heightPct: 0.07 },
  },
  {
    id: 'initials',
    type: 'INITIALS',
    label: 'Initials',
    icon: IdCard,
    group: 'signing',
    defaultSize: { widthPct: 0.1, heightPct: 0.05 },
  },
  {
    id: 'date',
    type: 'DATE',
    label: 'Date',
    icon: Calendar,
    group: 'signing',
    defaultSize: { widthPct: 0.18, heightPct: 0.04 },
  },
  // Identity block
  {
    id: 'name',
    type: 'TEXT',
    label: 'Name',
    icon: User,
    group: 'identity',
    defaultSize: { widthPct: 0.24, heightPct: 0.04 },
  },
  {
    id: 'email',
    type: 'TEXT',
    label: 'Email',
    icon: AtSign,
    group: 'identity',
    defaultSize: { widthPct: 0.28, heightPct: 0.04 },
  },
  {
    id: 'title',
    type: 'TEXT',
    label: 'Title',
    icon: Briefcase,
    group: 'identity',
    defaultSize: { widthPct: 0.22, heightPct: 0.04 },
  },
  {
    id: 'company',
    type: 'TEXT',
    label: 'Company',
    icon: ImageIcon,
    group: 'identity',
    defaultSize: { widthPct: 0.24, heightPct: 0.04 },
  },
  {
    id: 'phone',
    type: 'TEXT',
    label: 'Phone',
    icon: Phone,
    group: 'identity',
    defaultSize: { widthPct: 0.2, heightPct: 0.04 },
  },
  {
    id: 'address',
    type: 'TEXT',
    label: 'Address',
    icon: Home,
    group: 'identity',
    defaultSize: { widthPct: 0.3, heightPct: 0.05 },
  },
  // Data block
  {
    id: 'text',
    type: 'TEXT',
    label: 'Text',
    icon: Type,
    group: 'data',
    defaultSize: { widthPct: 0.22, heightPct: 0.04 },
  },
  {
    id: 'number',
    type: 'TEXT',
    label: 'Number',
    icon: Hash,
    group: 'data',
    defaultSize: { widthPct: 0.14, heightPct: 0.04 },
  },
  {
    id: 'dropdown',
    type: 'DROPDOWN',
    label: 'Dropdown',
    icon: ChevronDown,
    group: 'data',
    defaultSize: { widthPct: 0.22, heightPct: 0.04 },
  },
  {
    id: 'checkbox',
    type: 'CHECKBOX',
    label: 'Checkbox',
    icon: CheckSquare,
    group: 'data',
    defaultSize: { widthPct: 0.03, heightPct: 0.025 },
  },
];

/**
 * Glassmorphic field toolbar. Recipient picker with validation badges,
 * draggable field palette grouped by purpose, inline properties
 * inspector, save bar.
 */
export function FieldToolbar({
  envelopeId,
  recipients,
  onDragStart,
}: {
  envelopeId: string;
  recipients: Recipient[];
  onDragStart: (def: FieldDef) => void;
}) {
  const activeRecipientId = useEnvelopeEditorStore((s) => s.activeRecipientId);
  const setActiveRecipient = useEnvelopeEditorStore(
    (s) => s.setActiveRecipient,
  );
  const fields = useEnvelopeEditorStore((s) => s.fields);
  const selectedTempId = useEnvelopeEditorStore((s) => s.selectedTempId);
  const updateField = useEnvelopeEditorStore((s) => s.updateField);
  const removeField = useEnvelopeEditorStore((s) => s.removeField);
  const dirty = useEnvelopeEditorStore((s) => s.dirty);
  const markClean = useEnvelopeEditorStore((s) => s.markClean);

  const selected = fields.find((f) => f.tempId === selectedTempId) ?? null;
  const save = useBulkSaveFields(envelopeId);

  const onSave = () => {
    save.mutate(
      fields.map((f) => ({
        recipientId: f.recipientId,
        pageNumber: f.pageNumber,
        xPct: f.xPct,
        yPct: f.yPct,
        widthPct: f.widthPct,
        heightPct: f.heightPct,
        fieldType: f.fieldType,
        required: f.required,
        options: f.options ?? undefined,
      })),
      { onSuccess: () => markClean() },
    );
  };

  const activeRecipientIndex = Math.max(
    0,
    recipients.findIndex((r) => r.id === activeRecipientId),
  );
  const activeColor = recipientColor(activeRecipientIndex);

  return (
    <aside className="sticky top-20 self-start w-72 shrink-0 flex flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pb-2">
      <RecipientCard
        recipients={recipients}
        activeRecipientId={activeRecipientId}
        setActiveRecipient={setActiveRecipient}
        fields={fields}
      />

      <PaletteCard
        activeRecipientId={activeRecipientId}
        activeColor={activeColor}
        onDragStart={onDragStart}
      />

      {selected ? (
        <FieldPropertiesPanel
          field={selected}
          onUpdate={(patch) => updateField(selected.tempId, patch)}
          onRemove={() => removeField(selected.tempId)}
        />
      ) : null}

      <section className="rounded-xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm p-3">
        <div className="flex items-center justify-between text-[11px] mb-2">
          <span className="text-ink-3 uppercase tracking-[0.06em] font-semibold">
            Fields placed
          </span>
          <span className="font-mono text-ink text-[12px]">
            {fields.length}
          </span>
        </div>
        <Button
          variant="accent"
          size="sm"
          className="w-full"
          loading={save.isPending}
          disabled={!dirty}
          onClick={onSave}
        >
          <Save className="h-3.5 w-3.5" />
          {dirty ? 'Save fields' : 'All saved'}
        </Button>
      </section>
    </aside>
  );
}

/* ─────────────── Recipient card ─────────────── */

function RecipientCard({
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
  return (
    <section className="rounded-xl bg-white/55 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-white/40 bg-white/30">
        <Users className="h-3.5 w-3.5 text-ink-3" strokeWidth={2} />
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-2">
          Recipients
        </p>
        <span className="ml-auto text-[11px] text-ink-4 font-mono tabular-nums">
          {recipients.length}
        </span>
      </header>
      <div className="p-1.5 space-y-0.5">
        {recipients.map((r, i) => {
          const color = recipientColor(i);
          const active = r.id === activeRecipientId;
          const userFields = fields.filter((f) => f.recipientId === r.id);
          const hasSigning = userFields.some(
            (f) => f.fieldType === 'SIGNATURE' || f.fieldType === 'INITIALS',
          );
          const incomplete = userFields.length === 0 || !hasSigning;
          return (
            <button
              key={r.id}
              onClick={() => setActiveRecipient(r.id)}
              className={cn(
                'group relative w-full flex items-center gap-2.5 rounded-lg pl-2.5 pr-2 py-1.5 text-left',
                'transition-all duration-150',
                active
                  ? 'bg-accent-soft/70'
                  : 'hover:bg-white/60',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-pill bg-accent',
                  'origin-center transition-transform duration-200',
                  active ? 'scale-y-100' : 'scale-y-0',
                )}
              />
              <span className="relative shrink-0">
                <span
                  className={cn(
                    'h-7 w-7 grid place-items-center rounded-full text-[10px] font-semibold uppercase tracking-tight',
                    color.bg,
                    color.fg,
                  )}
                >
                  {initials(r.name)}
                </span>
                {incomplete ? (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                    title="Recipient needs at least one signature field"
                  />
                ) : (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                    title="All required fields placed"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-[12.5px] font-medium truncate leading-tight',
                    active ? 'text-ink' : 'text-ink-2',
                  )}
                >
                  {r.name}
                </span>
                <span className="block text-[10px] text-ink-4 truncate mt-0.5">
                  {userFields.length === 0
                    ? 'No fields'
                    : `${userFields.length} field${userFields.length === 1 ? '' : 's'}${hasSigning ? '' : ' · needs signature'}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────── Palette card ─────────────── */

function PaletteCard({
  activeRecipientId,
  activeColor,
  onDragStart,
}: {
  activeRecipientId: string | null;
  activeColor: ReturnType<typeof recipientColor>;
  onDragStart: (def: FieldDef) => void;
}) {
  const groups: { id: string; title: string; items: FieldDef[] }[] = [
    {
      id: 'signing',
      title: 'Signing',
      items: FIELDS.filter((f) => f.group === 'signing'),
    },
    {
      id: 'identity',
      title: 'Identity',
      items: FIELDS.filter((f) => f.group === 'identity'),
    },
    {
      id: 'data',
      title: 'Data',
      items: FIELDS.filter((f) => f.group === 'data'),
    },
  ];

  return (
    <section className="rounded-xl bg-white/55 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
      {groups.map((g, idx) => (
        <div key={g.id}>
          <header
            className={cn(
              'px-3 py-2 bg-white/30',
              idx > 0 ? 'border-t border-white/40' : 'border-b border-white/40',
            )}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-2">
              {g.title}
            </p>
          </header>
          <div className="p-2 grid grid-cols-3 gap-1.5">
            {g.items.map((f) => (
              <FieldTile
                key={f.id}
                def={f}
                disabled={!activeRecipientId}
                bgClass={activeColor.bg}
                fgClass={activeColor.fg}
                onDragStart={onDragStart}
              />
            ))}
          </div>
        </div>
      ))}
      <p className="px-3 py-2 text-[10.5px] text-ink-4 leading-snug bg-white/30 border-t border-white/40">
        {activeRecipientId
          ? 'Drag tile onto document to place field.'
          : 'Select recipient above to start.'}
      </p>
    </section>
  );
}

/* ─────────────── Field tile (draggable) ─────────────── */

function FieldTile({
  def,
  disabled,
  bgClass,
  fgClass,
  onDragStart,
}: {
  def: FieldDef;
  disabled: boolean;
  bgClass: string;
  fgClass: string;
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
      title={def.label}
      className={cn(
        'group/tile relative flex flex-col items-center justify-center gap-1.5 rounded-lg py-2.5 px-1.5',
        'border border-white/60 backdrop-blur-sm',
        'transition-all duration-150',
        bgClass,
        'disabled:opacity-40 disabled:cursor-not-allowed',
        !disabled &&
          'hover:border-current/50 hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing',
      )}
    >
      <span
        className={cn(
          'h-9 w-9 grid place-items-center rounded-lg bg-white/85 border border-white/70 shadow-sm',
          fgClass,
        )}
      >
        <Icon strokeWidth={2.2} style={{ width: 18, height: 18 }} />
      </span>
      <span
        className={cn(
          'text-[11px] font-medium leading-tight truncate w-full text-center',
          fgClass,
        )}
      >
        {def.label}
      </span>
    </button>
  );
}

/* ─────────────── Properties panel ─────────────── */

function FieldPropertiesPanel({
  field,
  onUpdate,
  onRemove,
}: {
  field: EditorField;
  onUpdate: (patch: Partial<EditorField>) => void;
  onRemove: () => void;
}) {
  return (
    <section className="rounded-xl bg-white/70 backdrop-blur-md border border-accent/30 shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-3 py-2 border-b border-accent/20 bg-accent-soft/50">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent-deep">
          Field properties
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="h-6 w-6 grid place-items-center rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 transition-colors"
          aria-label="Delete field"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </header>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-ink-3">Type</span>
          <span className="font-mono text-ink-2">{field.fieldType}</span>
        </div>

        <label className="flex items-center justify-between cursor-pointer text-[12px] text-ink-2">
          <span>Required</span>
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="h-3.5 w-3.5 accent-accent"
          />
        </label>

        {field.fieldType === 'DROPDOWN' ? (
          <DropdownChoicesEditor
            choices={
              (field.options && 'choices' in field.options
                ? field.options.choices
                : undefined) ?? []
            }
            onChange={(choices) => onUpdate({ options: { choices } })}
          />
        ) : null}

        {field.fieldType === 'CHECKBOX' ? (
          <div>
            <Label htmlFor="cb-label">Checkbox label</Label>
            <Input
              id="cb-label"
              placeholder="Agree to terms"
              value={
                (field.options && 'label' in field.options
                  ? field.options.label
                  : '') ?? ''
              }
              onChange={(e) => onUpdate({ options: { label: e.target.value } })}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ─────────────── Dropdown choices editor ─────────────── */

function DropdownChoicesEditor({
  choices,
  onChange,
}: {
  choices: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <Label>Choices</Label>
      <div className="space-y-1.5 mt-1">
        {choices.map((c, i) => (
          <div key={i} className="flex gap-1.5">
            <Input
              value={c}
              onChange={(e) => {
                const next = [...choices];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="text-[12.5px]"
            />
            <button
              type="button"
              onClick={() => onChange(choices.filter((_, idx) => idx !== i))}
              disabled={choices.length <= 1}
              className="h-9 w-9 grid place-items-center rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Remove choice"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...choices, `Option ${choices.length + 1}`])}
        className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-accent hover:text-accent-deep transition-colors"
      >
        <Plus className="h-3 w-3" /> Add choice
      </button>
      {choices.length === 0 ? (
        <p className="mt-1.5 text-[11px] text-danger">
          Dropdown requires at least one choice.
        </p>
      ) : null}
    </div>
  );
}

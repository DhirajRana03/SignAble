'use client';

import {
  AtSign,
  Calendar,
  CheckSquare,
  ChevronDown,
  Edit3,
  Hash,
  type LucideIcon,
  PenLine,
  Plus,
  Save,
  Trash2,
  Type,
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

interface FieldDef {
  type: FieldType;
  label: string;
  icon: LucideIcon;
  group: 'signing' | 'data';
  hint?: string;
}

const FIELDS: FieldDef[] = [
  { type: 'SIGNATURE', label: 'Signature', icon: PenLine, group: 'signing' },
  { type: 'INITIALS', label: 'Initials', icon: Edit3, group: 'signing' },
  { type: 'DATE', label: 'Date signed', icon: Calendar, group: 'signing' },
  { type: 'TEXT', label: 'Text', icon: Type, group: 'data' },
  { type: 'TEXT', label: 'Name', icon: Users, group: 'data', hint: 'name' },
  { type: 'TEXT', label: 'Email', icon: AtSign, group: 'data', hint: 'email' },
  { type: 'TEXT', label: 'Number', icon: Hash, group: 'data', hint: 'number' },
  { type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown, group: 'data' },
  { type: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare, group: 'data' },
];

/**
 * Field toolbar. Linear/Notion-inspired card stack: recipient picker,
 * grouped field palette (Standard / Data), inline properties panel,
 * pinned save bar.
 */
export function FieldToolbar({
  envelopeId,
  recipients,
  pendingFieldType,
  setPendingFieldType,
}: {
  envelopeId: string;
  recipients: Recipient[];
  pendingFieldType: FieldType | null;
  setPendingFieldType: (t: FieldType | null) => void;
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
  const signingFields = FIELDS.filter((f) => f.group === 'signing');
  const dataFields = FIELDS.filter((f) => f.group === 'data');

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

  return (
    <aside className="sticky top-20 self-start w-72 shrink-0 flex flex-col gap-3 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
      <RecipientCard
        recipients={recipients}
        activeRecipientId={activeRecipientId}
        setActiveRecipient={setActiveRecipient}
        fields={fields}
      />

      <PaletteCard
        signingFields={signingFields}
        dataFields={dataFields}
        activeRecipientId={activeRecipientId}
        pendingFieldType={pendingFieldType}
        setPendingFieldType={setPendingFieldType}
      />

      {selected ? (
        <FieldPropertiesPanel
          field={selected}
          onUpdate={(patch) => updateField(selected.tempId, patch)}
          onRemove={() => removeField(selected.tempId)}
        />
      ) : null}

      <section className="rounded-xl bg-white border border-border/80 shadow-sm p-3">
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
    <section className="rounded-xl bg-white border border-border/80 shadow-sm overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60 bg-surface-sunken/30">
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
          const count = fields.filter((f) => f.recipientId === r.id).length;
          return (
            <button
              key={r.id}
              onClick={() => setActiveRecipient(r.id)}
              className={cn(
                'group relative w-full flex items-center gap-2.5 rounded-lg pl-2.5 pr-2 py-2 text-left',
                'transition-all duration-150',
                active
                  ? 'bg-accent-soft'
                  : 'hover:bg-surface-sunken/60',
              )}
            >
              {/* Active accent rail */}
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-2 bottom-2 w-[3px] rounded-r-pill bg-accent',
                  'origin-center transition-transform duration-200',
                  active ? 'scale-y-100' : 'scale-y-0',
                )}
              />
              <span
                className={cn(
                  'h-8 w-8 grid place-items-center rounded-full shrink-0 text-[10.5px] font-semibold uppercase tracking-tight',
                  color.bg,
                  color.fg,
                )}
              >
                {initials(r.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-[13px] font-medium truncate leading-tight',
                    active ? 'text-ink' : 'text-ink-2',
                  )}
                >
                  {r.name}
                </span>
                <span className="block text-[10.5px] text-ink-4 truncate mt-0.5">
                  {count === 0
                    ? 'No fields'
                    : `${count} field${count === 1 ? '' : 's'}`}
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
  signingFields,
  dataFields,
  activeRecipientId,
  pendingFieldType,
  setPendingFieldType,
}: {
  signingFields: FieldDef[];
  dataFields: FieldDef[];
  activeRecipientId: string | null;
  pendingFieldType: FieldType | null;
  setPendingFieldType: (t: FieldType | null) => void;
}) {
  return (
    <section className="rounded-xl bg-white border border-border/80 shadow-sm overflow-hidden">
      <header className="px-3 py-2.5 border-b border-border/60 bg-surface-sunken/30">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-2">
          Standard fields
        </p>
      </header>
      <div className="p-2.5">
        <FieldPalette
          fields={signingFields}
          activeRecipientId={activeRecipientId}
          pendingFieldType={pendingFieldType}
          onPick={setPendingFieldType}
        />
      </div>

      <header className="px-3 py-2.5 border-y border-border/60 bg-surface-sunken/30">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-2">
          Data fields
        </p>
      </header>
      <div className="p-2.5 pb-3">
        <FieldPalette
          fields={dataFields}
          activeRecipientId={activeRecipientId}
          pendingFieldType={pendingFieldType}
          onPick={setPendingFieldType}
        />
        <p className="mt-2.5 text-[10.5px] text-ink-4 leading-snug">
          {pendingFieldType
            ? 'Click anywhere on document to drop field.'
            : activeRecipientId
              ? 'Tap a field type, then click document.'
              : 'Select recipient above to start.'}
        </p>
      </div>
    </section>
  );
}

/* ─────────────── Palette grid ─────────────── */

function FieldPalette({
  fields,
  activeRecipientId,
  pendingFieldType,
  onPick,
}: {
  fields: FieldDef[];
  activeRecipientId: string | null;
  pendingFieldType: FieldType | null;
  onPick: (t: FieldType | null) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {fields.map((f) => {
        const Icon = f.icon;
        const isSelected = pendingFieldType === f.type;
        const disabled = !activeRecipientId;
        return (
          <button
            key={`${f.type}-${f.label}`}
            disabled={disabled}
            onClick={() => onPick(isSelected ? null : f.type)}
            title={f.label}
            className={cn(
              'group/tile relative flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 px-1.5',
              'border transition-all duration-150',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isSelected
                ? 'border-accent bg-gradient-to-b from-accent-soft to-accent-soft/30 text-accent-deep shadow-inner'
                : 'border-border/70 text-ink-2 hover:border-accent/40 hover:bg-accent-soft/30 hover:text-accent-deep hover:-translate-y-0.5',
            )}
          >
            <span
              className={cn(
                'h-7 w-7 grid place-items-center rounded-md transition-colors',
                isSelected
                  ? 'bg-accent text-white'
                  : 'bg-surface-sunken text-ink-3 group-hover/tile:bg-accent-soft group-hover/tile:text-accent-deep',
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <span className="text-[10.5px] font-medium leading-tight truncate w-full text-center">
              {f.label}
            </span>
          </button>
        );
      })}
    </div>
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
    <section className="rounded-xl bg-white border border-accent/40 shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 bg-accent-soft/40">
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

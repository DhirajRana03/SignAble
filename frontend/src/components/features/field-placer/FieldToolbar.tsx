'use client';

import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Edit3,
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
  icon: typeof Type;
  group: 'signing' | 'data';
}

const FIELDS: FieldDef[] = [
  { type: 'SIGNATURE', label: 'Signature', icon: Edit3, group: 'signing' },
  { type: 'INITIALS', label: 'Initials', icon: Type, group: 'signing' },
  { type: 'DATE', label: 'Date signed', icon: Calendar, group: 'signing' },
  { type: 'TEXT', label: 'Text', icon: Type, group: 'data' },
  { type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown, group: 'data' },
  { type: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare, group: 'data' },
];

/**
 * Field toolbar. DocuSign-style three-section panel: recipient picker
 * cards, grouped field palette (Standard / Data), inline properties
 * panel for the selected field, and a sticky save action at the bottom.
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
    <aside className="sticky top-24 self-start w-72 shrink-0 flex flex-col gap-4">
      {/* Recipient picker */}
      <section className="rounded-lg bg-surface-1 border border-border shadow-sm p-3.5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-3.5 w-3.5 text-ink-3" strokeWidth={2} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2">
            Recipients
          </p>
          <span className="ml-auto text-[10.5px] text-ink-4 font-mono">
            {recipients.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {recipients.map((r, i) => {
            const color = recipientColor(i);
            const active = r.id === activeRecipientId;
            const count = fields.filter((f) => f.recipientId === r.id).length;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRecipient(r.id)}
                className={cn(
                  'group w-full flex items-center gap-2.5 rounded-md p-2 text-left',
                  'transition-all duration-150',
                  active
                    ? 'bg-accent-soft ring-1 ring-accent/30'
                    : 'hover:bg-surface-sunken',
                )}
              >
                <span
                  className={cn(
                    'h-7 w-7 grid place-items-center rounded-full shrink-0',
                    'text-[10px] font-semibold uppercase tracking-tight',
                    color.bg,
                    color.fg,
                  )}
                >
                  {initials(r.name)}
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
                  <span className="block text-[10.5px] text-ink-3 truncate">
                    {count} field{count === 1 ? '' : 's'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Field palette */}
      <section className="rounded-lg bg-surface-1 border border-border shadow-sm p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2 mb-3">
          Standard fields
        </p>
        <FieldPalette
          fields={signingFields}
          activeRecipientId={activeRecipientId}
          pendingFieldType={pendingFieldType}
          onPick={setPendingFieldType}
        />

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2 mb-3">
          Data fields
        </p>
        <FieldPalette
          fields={dataFields}
          activeRecipientId={activeRecipientId}
          pendingFieldType={pendingFieldType}
          onPick={setPendingFieldType}
        />

        <p className="mt-3 text-[10.5px] text-ink-3 leading-snug">
          {pendingFieldType
            ? 'Click anywhere on document to drop field.'
            : activeRecipientId
              ? 'Pick field type then click document.'
              : 'Pick recipient first.'}
        </p>
      </section>

      {/* Selected field properties */}
      {selected ? (
        <FieldPropertiesPanel
          field={selected}
          onUpdate={(patch) => updateField(selected.tempId, patch)}
          onRemove={() => removeField(selected.tempId)}
        />
      ) : null}

      {/* Save bar */}
      <section className="rounded-lg bg-surface-1 border border-border shadow-sm p-3.5">
        <div className="flex items-center justify-between text-[11px] mb-2.5">
          <span className="text-ink-3 uppercase tracking-[0.06em] font-semibold">
            Fields placed
          </span>
          <span className="font-mono text-ink">{fields.length}</span>
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
            key={f.type}
            disabled={disabled}
            onClick={() => onPick(isSelected ? null : f.type)}
            title={f.label}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-md py-2.5 px-1',
              'border transition-all duration-150',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isSelected
                ? 'border-accent bg-accent-soft text-accent-deep shadow-sm'
                : 'border-border text-ink-2 hover:border-accent/50 hover:bg-surface-sunken hover:text-ink',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                isSelected ? 'text-accent-deep' : 'text-ink-3',
              )}
              strokeWidth={2}
            />
            <span className="text-[10.5px] leading-tight truncate w-full text-center">
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
    <section className="rounded-lg bg-surface-1 border border-accent/30 shadow-sm p-3.5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-deep">
          Field properties
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 grid place-items-center rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 transition-colors"
          aria-label="Delete field"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

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

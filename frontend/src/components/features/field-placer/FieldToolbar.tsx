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
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useBulkSaveFields } from '@/hooks/useEnvelopes';
import { cn, recipientColor } from '@/lib/utils';
import {
  useEnvelopeEditorStore,
  type EditorField,
} from '@/store/envelopeEditorStore';
import type { FieldType, Recipient } from '@/types/envelope.types';

const FIELDS: { type: FieldType; label: string; icon: typeof Type }[] = [
  { type: 'SIGNATURE', label: 'Signature', icon: Edit3 },
  { type: 'INITIALS', label: 'Initials', icon: Type },
  { type: 'DATE', label: 'Date', icon: Calendar },
  { type: 'TEXT', label: 'Text', icon: Type },
  { type: 'DROPDOWN', label: 'Dropdown', icon: ChevronDown },
  { type: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare },
];

/**
 * Side panel: signers list + add-field palette + properties panel for the
 * currently-selected field (dropdown choices, checkbox label, required
 * toggle). Save button persists all fields atomically via bulkSave.
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
    <aside className="sheet sticky top-24 self-start w-72 shrink-0 p-5 space-y-6">
      <div>
        <p className="label-mono mb-3">Signers</p>
        <div className="space-y-1.5">
          {recipients.map((r, i) => {
            const color = recipientColor(i);
            const active = r.id === activeRecipientId;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRecipient(r.id)}
                className={cn(
                  'w-full text-left flex items-center gap-3 rounded-sm p-2 border transition-colors',
                  active
                    ? `${color.bg} border-current ${color.fg}`
                    : 'border-transparent hover:bg-paper-dim',
                )}
              >
                <span
                  className={cn(
                    'h-6 w-6 rounded-sm border flex items-center justify-center text-[10px] font-mono uppercase tracking-wider',
                    color.bg,
                    color.fg,
                    'border-current',
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-sm truncate flex-1">{r.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label-mono mb-3">Add field</p>
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((f) => {
            const Icon = f.icon;
            const isSelected = pendingFieldType === f.type;
            return (
              <button
                key={f.type}
                disabled={!activeRecipientId}
                onClick={() =>
                  setPendingFieldType(isSelected ? null : f.type)
                }
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border p-3 transition-all',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  isSelected
                    ? 'border-accent bg-accent-tint text-accent-deep shadow-paper'
                    : 'border-border text-ink-soft hover:border-accent-soft hover:bg-paper-dim/40 hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{f.label}</span>
              </button>
            );
          })}
        </div>
        {pendingFieldType ? (
          <p className="mt-3 text-xs text-ink-soft">
            Click anywhere on the document to place the field.
          </p>
        ) : (
          <p className="mt-3 text-xs text-ink-faint">
            {activeRecipientId
              ? 'Pick a field type to place.'
              : 'Pick a signer first.'}
          </p>
        )}
      </div>

      {selected ? (
        <FieldPropertiesPanel
          field={selected}
          onUpdate={(patch) => updateField(selected.tempId, patch)}
          onRemove={() => removeField(selected.tempId)}
        />
      ) : null}

      <div className="pt-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="label-mono">Total fields</span>
          <span className="font-mono">{fields.length}</span>
        </div>
        <Button
          variant="accent"
          className="w-full"
          loading={save.isPending}
          disabled={!dirty}
          onClick={onSave}
        >
          <Save className="h-3.5 w-3.5" />
          {dirty ? 'Save fields' : 'Saved'}
        </Button>
      </div>
    </aside>
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
    <div className="pt-4 border-t border-border space-y-4">
      <div className="flex items-center justify-between">
        <p className="label-mono">Selected field</p>
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 grid place-items-center rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 transition-colors"
          aria-label="Delete field"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="text-[12px] text-ink-3">
        Type:{' '}
        <span className="font-mono text-ink-2">{field.fieldType}</span>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-ink-2 cursor-pointer">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          className="h-3.5 w-3.5 accent-accent"
        />
        Required
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
            onChange={(e) =>
              onUpdate({ options: { label: e.target.value } })
            }
          />
        </div>
      ) : null}
    </div>
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

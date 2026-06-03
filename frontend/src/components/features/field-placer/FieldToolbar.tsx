'use client';

import { Calendar, Edit3, Save, Type } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useEnvelopeEditorStore } from '@/store/envelopeEditorStore';
import { useBulkSaveFields } from '@/hooks/useEnvelopes';
import { cn, recipientColor } from '@/lib/utils';
import type { FieldType, Recipient } from '@/types/envelope.types';

const FIELDS: { type: FieldType; label: string; icon: typeof Type }[] = [
  { type: 'SIGNATURE', label: 'Signature', icon: Edit3 },
  { type: 'INITIALS', label: 'Initials', icon: Type },
  { type: 'DATE', label: 'Date', icon: Calendar },
  { type: 'TEXT', label: 'Text', icon: Type },
];

/**
 * Side panel: pick recipient → click a field type → click anywhere on the
 * document to drop it. Save button persists all fields atomically.
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
  const dirty = useEnvelopeEditorStore((s) => s.dirty);
  const markClean = useEnvelopeEditorStore((s) => s.markClean);

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
            const selected = pendingFieldType === f.type;
            return (
              <button
                key={f.type}
                disabled={!activeRecipientId}
                onClick={() =>
                  setPendingFieldType(selected ? null : f.type)
                }
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border p-3 transition-all',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  selected
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

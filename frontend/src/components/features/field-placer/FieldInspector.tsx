'use client';

import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus,
  Trash2,
  Type as TypeIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Input, Label } from '@/components/ui/Input';
import { useAuthedImage } from '@/hooks/useAuthedImage';
import { cn } from '@/lib/utils';
import {
  useEnvelopeEditorStore,
  type EditorField,
} from '@/store/envelopeEditorStore';
import {
  isCheckboxOptions,
  isDropdownOptions,
  isTextOptions,
  type FieldType,
} from '@/types/envelope.types';

const FIELD_LABEL: Record<FieldType, string> = {
  SIGNATURE: 'Signature',
  INITIALS: 'Initial',
  DATE: 'Date Signed',
  TEXT: 'Text',
  DROPDOWN: 'Dropdown',
  CHECKBOX: 'Checkbox',
};

const FIELD_ICON: Record<FieldType, typeof TypeIcon> = {
  SIGNATURE: Edit3,
  INITIALS: Edit3,
  DATE: Calendar,
  TEXT: TypeIcon,
  DROPDOWN: ChevronDown,
  CHECKBOX: CheckSquare,
};

/**
 * Right-rail field inspector. Page preview card by default; switches to
 * field editor when a chip is active. Mirrors DocuSign right panel.
 */
export function FieldInspector({
  filename,
  pageUrls,
  activePage,
  totalPages,
  onJumpToPage,
}: {
  filename: string;
  pageUrls: string[];
  activePage: number;
  totalPages: number;
  onJumpToPage?: (pageIndex: number) => void;
}) {
  const fields = useEnvelopeEditorStore((s) => s.fields);
  const selectedTempId = useEnvelopeEditorStore((s) => s.selectedTempId);
  const updateField = useEnvelopeEditorStore((s) => s.updateField);
  const removeField = useEnvelopeEditorStore((s) => s.removeField);

  const selected = fields.find((f) => f.tempId === selectedTempId) ?? null;

  return (
    <aside className="self-start w-56 shrink-0 h-full overflow-y-auto pr-1 py-2">
      {selected ? (
        <FieldEditor
          field={selected}
          onUpdate={(patch) => updateField(selected.tempId, patch)}
          onRemove={() => removeField(selected.tempId)}
        />
      ) : (
        <PagePreview
          filename={filename}
          pageUrls={pageUrls}
          activePage={activePage}
          totalPages={totalPages}
          onJumpToPage={onJumpToPage}
        />
      )}
    </aside>
  );
}

/* ─────────────── Page preview ─────────────── */

function PagePreview({
  filename,
  pageUrls,
  activePage,
  totalPages,
  onJumpToPage,
}: {
  filename: string;
  pageUrls: string[];
  activePage: number;
  totalPages: number;
  onJumpToPage?: (pageIndex: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="rounded-xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-3 py-2.5 border-b border-white/50">
        <p
          className="text-[12.5px] font-semibold text-ink truncate"
          title={filename}
        >
          {filename}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="h-6 w-6 grid place-items-center rounded-md text-ink-3 hover:text-ink hover:bg-white/60 transition-colors shrink-0"
          aria-label={collapsed ? 'Expand preview' : 'Collapse preview'}
        >
          <ChevronUp
            className={cn(
              'h-3 w-3 transition-transform',
              collapsed && 'rotate-180',
            )}
          />
        </button>
      </header>

      {!collapsed ? (
        <div className="p-3">
          <p className="text-[11px] text-ink-3 mb-2">Pages: {totalPages}</p>
          <div className="space-y-2">
            {pageUrls.map((url, i) => (
              <PageThumb
                key={i}
                url={url}
                pageNumber={i + 1}
                active={i + 1 === activePage}
                onClick={() => onJumpToPage?.(i)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PageThumb({
  url,
  pageNumber,
  active,
  onClick,
}: {
  url: string;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
}) {
  const { src } = useAuthedImage(url);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full block rounded-md overflow-hidden transition-all border-2',
        active
          ? 'border-accent shadow-md'
          : 'border-border hover:border-accent/50',
      )}
    >
      <div className="bg-paper aspect-[8.5/11] relative">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Page ${pageNumber}`}
            className="block w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full animate-pulse bg-surface-sunken" />
        )}
      </div>
      <div
        className={cn(
          'py-1 text-center text-[10px] font-mono',
          active ? 'bg-accent-soft text-accent-deep' : 'text-ink-3',
        )}
      >
        {pageNumber}
      </div>
    </button>
  );
}

/* ─────────────── Editor ─────────────── */

function FieldEditor({
  field,
  onUpdate,
  onRemove,
}: {
  field: EditorField;
  onUpdate: (patch: Partial<EditorField>) => void;
  onRemove: () => void;
}) {
  const Icon = FIELD_ICON[field.fieldType];
  const label = FIELD_LABEL[field.fieldType];

  return (
    <section className="rounded-xl bg-white/80 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 grid place-items-center rounded-md bg-sky-100 text-sky-700 border border-sky-200/60 shrink-0">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <p className="text-[14px] font-semibold text-ink truncate">
            {label}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 grid place-items-center rounded-md text-ink-4 hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
          aria-label="Delete field"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="p-4 space-y-4">
        <BoolRow
          label="Required Field"
          checked={field.required}
          onChange={(v) => onUpdate({ required: v })}
        />
        <BoolRow
          label="Read Only"
          checked={!!field.readOnly}
          onChange={(v) => onUpdate({ readOnly: v })}
        />

        {field.fieldType === 'TEXT' ? (
          <Accordion title="Add Text" defaultOpen>
            <textarea
              value={
                isTextOptions(field.options)
                  ? (field.options.placeholder ?? '')
                  : ''
              }
              onChange={(e) =>
                onUpdate({ options: { placeholder: e.target.value } })
              }
              placeholder="Add Text"
              rows={4}
              className="w-full rounded-md border border-border bg-white/80 px-3 py-2 text-[12.5px] text-ink-2 placeholder:text-ink-4 focus:outline-none focus:border-accent/40 resize-y"
            />
          </Accordion>
        ) : null}

        {field.fieldType === 'DROPDOWN' ? (
          <DropdownChoicesEditor
            choices={
              isDropdownOptions(field.options) ? field.options.choices : []
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
                isCheckboxOptions(field.options)
                  ? (field.options.label ?? '')
                  : ''
              }
              onChange={(e) => onUpdate({ options: { label: e.target.value } })}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ─────────────── Bool row (DocuSign-style checkbox) ─────────────── */

function BoolRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <span
        className={cn(
          'h-5 w-5 rounded-md border-2 grid place-items-center transition-colors shrink-0',
          checked
            ? 'bg-accent border-accent text-white'
            : 'bg-white border-ink-4 text-transparent hover:border-accent/60',
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
    </label>
  );
}

/* ─────────────── Accordion ─────────────── */

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <ChevronUp
          className={cn(
            'h-3.5 w-3.5 text-ink-3 transition-transform',
            !open && 'rotate-180',
          )}
        />
      </button>
      {open ? <div className="mt-2.5">{children}</div> : null}
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

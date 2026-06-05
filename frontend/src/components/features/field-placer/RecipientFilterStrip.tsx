'use client';

import { cn, recipientColor } from '@/lib/utils';
import type { Recipient } from '@/types/envelope.types';

/**
 * Pill-tab strip that narrows visible chips to a single recipient.
 * `All` restores the default view. Driven from the editor store via
 * the parent so the setting persists across page jumps and zoom
 * changes. Inline variant — designed to sit in the prepare-envelope
 * header bar; hides itself when only one recipient exists.
 */
export function RecipientFilterStrip({
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
    <div className="flex items-center gap-1.5 overflow-x-auto">
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
            dotClass={c.dot}
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

'use client';

import { cn } from '@/lib/utils';

export interface SettingsSection {
  id: string;
  label: string;
  roman: string;
  description?: string;
}

interface Props {
  sections: SettingsSection[];
  active: string;
  onSelect: (id: string) => void;
}

/**
 * Vertical chapter-rail nav. Roman numeral + serif title.
 * Active section gets oxblood vertical accent bar.
 */
export function SettingsNav({ sections, active, onSelect }: Props) {
  return (
    <nav aria-label="Settings sections" className="space-y-1">
      {sections.map((s, i) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative flex w-full items-baseline gap-4 rounded-sm py-3 pl-5 pr-3 text-left transition-colors',
              isActive
                ? 'bg-paper-dim/60'
                : 'hover:bg-paper-dim/40',
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span
              aria-hidden
              className={cn(
                'absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-colors',
                isActive ? 'bg-accent' : 'bg-transparent group-hover:bg-border',
              )}
            />
            <span
              className={cn(
                'font-display italic text-xs tracking-tight shrink-0 w-7',
                isActive ? 'text-accent' : 'text-ink-faint',
              )}
            >
              {s.roman}
            </span>
            <span className="flex-1 min-w-0">
              <span
                className={cn(
                  'font-display block tracking-tight text-base',
                  isActive ? 'text-ink' : 'text-ink-soft',
                )}
              >
                {s.label}
              </span>
              {s.description ? (
                <span className="block text-[11px] text-ink-faint mt-0.5 line-clamp-1">
                  {s.description}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

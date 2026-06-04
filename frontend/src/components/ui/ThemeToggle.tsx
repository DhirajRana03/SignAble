'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center rounded-sm bg-paper border border-border p-[2px]"
    >
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            className={cn(
              'h-5 w-5 grid place-items-center rounded-[3px] transition-colors duration-[120ms]',
              active
                ? 'bg-ivory-2 text-ink shadow-[inset_0_0_0_1px_hsl(var(--line))]'
                : 'text-muted hover:text-ink',
            )}
            title={o.label}
            aria-label={o.label}
            aria-pressed={active}
          >
            <Icon className="h-3 w-3" />
          </button>
        );
      })}
    </div>
  );
}

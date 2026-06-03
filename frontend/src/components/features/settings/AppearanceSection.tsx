'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

import { SettingsRow, SettingsSection } from './SettingsSection';

const THEME_OPTIONS = [
  {
    value: 'light' as const,
    icon: Sun,
    label: 'Daylight',
    description: 'Warm paper background. Best for legal review.',
  },
  {
    value: 'dark' as const,
    icon: Moon,
    label: 'Vellum at dusk',
    description: 'Reduced glare for long signing sessions.',
  },
  {
    value: 'system' as const,
    icon: Monitor,
    label: 'Follow system',
    description: 'Switches with your operating system preference.',
  },
];

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsSection
      roman="III"
      eyebrow="Appearance"
      title="A surface that suits you."
      description="Adjust the tone of your workspace. The signing experience for recipients always uses light mode."
    >
      <SettingsRow
        label="Theme"
        description="Persisted to this browser only."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                aria-pressed={active}
                className={cn(
                  'sheet relative p-4 text-left transition-all flex flex-col gap-2',
                  active
                    ? 'border-accent shadow-paper -translate-y-0.5'
                    : 'hover:border-ink-faint',
                )}
              >
                <span
                  className={cn(
                    'h-9 w-9 rounded-sm border border-border flex items-center justify-center',
                    active ? 'bg-accent text-accent-fg border-accent' : 'bg-paper-dim text-ink-soft',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-display tracking-tight text-base">
                  {opt.label}
                </span>
                <span className="text-[11px] text-ink-soft leading-relaxed">
                  {opt.description}
                </span>
                {active ? (
                  <span className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}

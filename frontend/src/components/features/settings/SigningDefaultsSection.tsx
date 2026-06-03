'use client';

import { Clock, ListOrdered, MessageSquareQuote } from 'lucide-react';

import { Input, Label, Textarea } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

import { SettingsRow, SettingsSection } from './SettingsSection';

const COMING_SOON_PILL = (
  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-faint px-2 py-0.5 rounded-sm border border-border bg-paper-dim">
    Coming soon
  </span>
);

/**
 * Read-only preview of upcoming signing-default controls.
 * Inputs are disabled until backend ships envelope template defaults.
 */
export function SigningDefaultsSection() {
  return (
    <SettingsSection
      roman="IV"
      eyebrow="Signing defaults"
      title="Set the tone, once."
      description="Pre-fill every new envelope with your preferred message, order, and expiry."
    >
      <SettingsRow
        label="Default message"
        description="Appears in the recipient signing request email."
        action={COMING_SOON_PILL}
      >
        <div className="opacity-60 pointer-events-none">
          <Label htmlFor="default-message">Message</Label>
          <Textarea
            id="default-message"
            disabled
            placeholder="Please review and sign at your convenience. Thank you."
            rows={3}
          />
        </div>
      </SettingsRow>

      <SettingsRow
        label="Signing order"
        description="Sequential routes signers in order; parallel notifies everyone at once."
        action={COMING_SOON_PILL}
      >
        <div className="grid grid-cols-2 gap-3 opacity-60 pointer-events-none">
          <DefaultOption
            icon={ListOrdered}
            title="Sequential"
            description="Default."
            active
          />
          <DefaultOption
            icon={ListOrdered}
            title="Parallel"
            description="Faster, less control."
          />
        </div>
      </SettingsRow>

      <SettingsRow
        label="Expiry window"
        description="Envelopes are voided automatically after this many days."
        action={COMING_SOON_PILL}
      >
        <div className="opacity-60 pointer-events-none flex items-center gap-2">
          <Clock className="h-4 w-4 text-ink-faint" />
          <Input
            type="number"
            disabled
            defaultValue={30}
            min={1}
            max={365}
            className="w-24"
          />
          <span className="text-sm text-ink-soft">days</span>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Brand voice"
        description="Decorative quote shown at the bottom of every signing page."
        action={COMING_SOON_PILL}
      >
        <div className="opacity-60 pointer-events-none flex items-start gap-3 sheet p-4">
          <MessageSquareQuote className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="font-display italic text-sm tracking-tight text-ink-soft">
            A signature is consent made visible.
          </p>
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}

function DefaultOption({
  icon: Icon,
  title,
  description,
  active,
}: {
  icon: typeof Clock;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'border rounded-sm p-3',
        active ? 'border-accent bg-accent/5' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-display tracking-tight text-sm">{title}</span>
      </div>
      <p className="text-[11px] text-ink-soft">{description}</p>
    </div>
  );
}

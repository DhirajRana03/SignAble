'use client';

import { Mail, ShieldCheck, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, initials } from '@/lib/utils';

import { SettingsRow, SettingsSection } from './SettingsSection';

/**
 * Account read-only profile + sign-out. Edit endpoints not yet shipped backend-side.
 */
export function AccountSection() {
  const { user, logout } = useAuth();

  return (
    <SettingsSection
      roman="I"
      eyebrow="Account"
      title="Your file."
      description="The identity attached to every envelope you send. Editing coming soon."
    >
      <SettingsRow
        label="Identity"
        description="How signers see you on their request."
      >
        <div className="flex items-center gap-4 p-4 sheet">
          <div className="h-14 w-14 rounded-sm border border-border bg-paper-dim flex items-center justify-center font-display italic text-2xl text-accent">
            {user ? initials(user.name) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg tracking-tight truncate">
              {user?.name ?? 'Unknown'}
            </p>
            <p className="text-xs text-ink-soft flex items-center gap-1.5 mt-0.5 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              {user?.email}
            </p>
          </div>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Joined"
        description="Day your workspace was opened."
      >
        <div className="flex items-center gap-3 px-4 py-3 sheet">
          <UserRound className="h-4 w-4 text-ink-faint" />
          <span className="font-mono text-sm">
            {user?.createdAt ? formatDate(user.createdAt) : '—'}
          </span>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Session"
        description="Sign out of this device."
        action={
          <Button variant="danger" onClick={logout}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Sign out of all
          </Button>
        }
      />
    </SettingsSection>
  );
}

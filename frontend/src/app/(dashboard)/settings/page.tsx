'use client';

import { useEffect, useState } from 'react';

import { AccountSection } from '@/components/features/settings/AccountSection';
import { AppearanceSection } from '@/components/features/settings/AppearanceSection';
import {
  type SettingsSection as Section,
  SettingsNav,
} from '@/components/features/settings/SettingsNav';
import { SigningDefaultsSection } from '@/components/features/settings/SigningDefaultsSection';
import { WebhooksSection } from '@/components/features/settings/WebhooksSection';
import { DashboardShell } from '@/components/layout/DashboardShell';

const SECTIONS: Section[] = [
  {
    id: 'account',
    label: 'Account',
    roman: 'I',
    description: 'Your identity on every envelope.',
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    roman: 'II',
    description: 'Listen for envelope events.',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    roman: 'III',
    description: 'Workspace tone & theme.',
  },
  {
    id: 'signing',
    label: 'Signing defaults',
    roman: 'IV',
    description: 'Pre-fill new envelopes.',
  },
];

export default function SettingsPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  // Sync from hash so /settings#webhooks deep links work
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      const h = window.location.hash.replace(/^#/, '');
      if (SECTIONS.some((s) => s.id === h)) setActive(h);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const select = (id: string) => {
    setActive(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <DashboardShell eyebrow="Workspace" title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] xl:grid-cols-[18rem_1fr] gap-8 lg:gap-12 max-w-6xl">
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          <p className="label-mono px-5">Index</p>
          <SettingsNav
            sections={SECTIONS}
            active={active}
            onSelect={select}
          />
        </aside>

        <div className="min-w-0">
          {active === 'account' && <AccountSection />}
          {active === 'webhooks' && <WebhooksSection />}
          {active === 'appearance' && <AppearanceSection />}
          {active === 'signing' && <SigningDefaultsSection />}
        </div>
      </div>
    </DashboardShell>
  );
}

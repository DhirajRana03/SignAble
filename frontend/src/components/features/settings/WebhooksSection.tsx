'use client';

import { useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useWebhooks } from '@/hooks/useWebhooks';
import type { WebhookSubscription } from '@/types/webhook.types';

import { SettingsRow, SettingsSection } from './SettingsSection';
import { DeliveryHistoryDrawer } from './webhooks/DeliveryHistoryDrawer';
import { WebhookCard } from './webhooks/WebhookCard';
import { WebhookCreateForm } from './webhooks/WebhookCreateForm';

export function WebhooksSection() {
  const { data, isLoading } = useWebhooks();
  const [active, setActive] = useState<WebhookSubscription | null>(null);

  return (
    <SettingsSection
      roman="II"
      eyebrow="Webhooks"
      title="Listen for envelope events."
      description="Receive signed POST requests to your endpoint each time something happens. Verify with HMAC-SHA256 + the signing secret."
    >
      <SettingsRow
        label="New endpoint"
        description="URL must be reachable from the public internet. Use ngrok or a staging URL for local testing."
      >
        <WebhookCreateForm />
      </SettingsRow>

      <SettingsRow
        label="Registered endpoints"
        description="Pause to stop deliveries without losing config. Failures accumulate per endpoint."
      >
        {isLoading ? (
          <div className="grid gap-3">
            {[...Array(2)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState
            title="No endpoints yet"
            description="Register one above to start receiving events."
          />
        ) : (
          <div className="grid gap-3">
            {data.map((hook) => (
              <WebhookCard
                key={hook.id}
                hook={hook}
                onViewDeliveries={() => setActive(hook)}
              />
            ))}
          </div>
        )}
      </SettingsRow>

      <DeliveryHistoryDrawer hook={active} onClose={() => setActive(null)} />
    </SettingsSection>
  );
}

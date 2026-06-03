import type {
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookDelivery,
  WebhookSubscription,
} from '@/types/webhook.types';
import { apiClient } from './api-client';

export const webhookService = {
  async list(): Promise<WebhookSubscription[]> {
    const { data } = await apiClient.get<WebhookSubscription[]>('/webhooks');
    return data;
  },
  async get(id: string): Promise<WebhookSubscription> {
    const { data } = await apiClient.get<WebhookSubscription>(`/webhooks/${id}`);
    return data;
  },
  async create(input: CreateWebhookInput): Promise<WebhookSubscription> {
    const { data } = await apiClient.post<WebhookSubscription>('/webhooks', input);
    return data;
  },
  async update(id: string, input: UpdateWebhookInput): Promise<WebhookSubscription> {
    const { data } = await apiClient.patch<WebhookSubscription>(`/webhooks/${id}`, input);
    return data;
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/webhooks/${id}`);
  },
  async listDeliveries(id: string): Promise<WebhookDelivery[]> {
    const { data } = await apiClient.get<WebhookDelivery[]>(`/webhooks/${id}/deliveries`);
    return data;
  },
};

import type { SigningView } from '@/types/signing.types';
import { apiClient } from './api-client';

export const signingService = {
  async getView(token: string): Promise<SigningView> {
    const { data } = await apiClient.get<SigningView>(`/sign/${token}`);
    return data;
  },
  async markViewed(token: string): Promise<void> {
    await apiClient.post(`/sign/${token}/viewed`);
  },
  async submit(token: string, fieldValues: Record<string, string>): Promise<void> {
    await apiClient.post(`/sign/${token}/submit`, { fieldValues });
  },
  async decline(token: string, reason: string): Promise<void> {
    await apiClient.post(`/sign/${token}/decline`, { reason });
  },
};

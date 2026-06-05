import type {
  AdoptedSignature,
  AdoptSignaturePayload,
  SigningCompletionView,
  SigningView,
} from '@/types/signing.types';
import { apiClient } from './api-client';

export const signingService = {
  async getView(token: string): Promise<SigningView> {
    const { data } = await apiClient.get<SigningView>(`/sign/${token}`);
    return data;
  },
  async getCompletion(token: string): Promise<SigningCompletionView> {
    const { data } = await apiClient.get<SigningCompletionView>(
      `/sign/${token}/completion`,
    );
    return data;
  },
  async markViewed(token: string): Promise<void> {
    await apiClient.post(`/sign/${token}/viewed`);
  },
  async adopt(
    token: string,
    payload: AdoptSignaturePayload,
  ): Promise<AdoptedSignature> {
    const { data } = await apiClient.post<AdoptedSignature>(
      `/sign/${token}/adopt`,
      payload,
    );
    return data;
  },
  async submit(token: string, fieldValues: Record<string, string>): Promise<void> {
    await apiClient.post(`/sign/${token}/submit`, { fieldValues });
  },
  async decline(token: string, reason: string): Promise<void> {
    await apiClient.post(`/sign/${token}/decline`, { reason });
  },
};

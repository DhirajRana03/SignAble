import type {
  AuditEvent,
  Envelope,
  Recipient,
  RecipientRole,
  SignatureField,
  SigningOrder,
} from '@/types/envelope.types';
import { apiClient } from './api-client';

export interface CreateEnvelopeInput {
  documentId: string;
  title: string;
  message?: string;
  signingOrder?: SigningOrder;
}

export interface RecipientInput {
  email: string;
  name: string;
  orderIndex: number;
  role?: RecipientRole;
}

export interface FieldInput {
  recipientId: string;
  pageNumber: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  fieldType: SignatureField['fieldType'];
  required?: boolean;
}

export const envelopeService = {
  async create(input: CreateEnvelopeInput): Promise<Envelope> {
    const { data } = await apiClient.post<Envelope>('/envelopes', input);
    return data;
  },
  async list(): Promise<Envelope[]> {
    const { data } = await apiClient.get<Envelope[]>('/envelopes');
    return data;
  },
  async get(id: string): Promise<Envelope> {
    const { data } = await apiClient.get<Envelope>(`/envelopes/${id}`);
    return data;
  },
  async send(id: string): Promise<Envelope> {
    const { data } = await apiClient.post<Envelope>(`/envelopes/${id}/send`);
    return data;
  },
  async void(id: string, reason: string): Promise<Envelope> {
    const { data } = await apiClient.post<Envelope>(`/envelopes/${id}/void`, {
      reason,
    });
    return data;
  },
  async getAudit(id: string): Promise<AuditEvent[]> {
    const { data } = await apiClient.get<AuditEvent[]>(`/envelopes/${id}/audit`);
    return data;
  },
  async download(id: string): Promise<Blob> {
    const { data } = await apiClient.get(`/envelopes/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },
  async addRecipient(
    envelopeId: string,
    input: RecipientInput,
  ): Promise<Recipient> {
    const { data } = await apiClient.post<Recipient>(
      `/envelopes/${envelopeId}/recipients`,
      input,
    );
    return data;
  },
  async listRecipients(envelopeId: string): Promise<Recipient[]> {
    const { data } = await apiClient.get<Recipient[]>(
      `/envelopes/${envelopeId}/recipients`,
    );
    return data;
  },
  async updateRecipient(
    envelopeId: string,
    recipientId: string,
    input: Partial<RecipientInput>,
  ): Promise<Recipient> {
    const { data } = await apiClient.put<Recipient>(
      `/envelopes/${envelopeId}/recipients/${recipientId}`,
      input,
    );
    return data;
  },
  async deleteRecipient(
    envelopeId: string,
    recipientId: string,
  ): Promise<void> {
    await apiClient.delete(
      `/envelopes/${envelopeId}/recipients/${recipientId}`,
    );
  },
  async bulkSaveFields(
    envelopeId: string,
    fields: FieldInput[],
  ): Promise<SignatureField[]> {
    const { data } = await apiClient.put<SignatureField[]>(
      `/envelopes/${envelopeId}/fields/bulk`,
      { fields },
    );
    return data;
  },
  async listFields(envelopeId: string): Promise<SignatureField[]> {
    const { data } = await apiClient.get<SignatureField[]>(
      `/envelopes/${envelopeId}/fields`,
    );
    return data;
  },
};

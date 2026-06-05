import type {
  ActivityItem,
  AuditEvent,
  AuditEventType,
  Envelope,
  FieldOptions,
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
  options?: FieldOptions;
}

/**
 * PATCH payload for single-field auto-save. All fields optional —
 * server validates type/options pairing.
 */
export type FieldPatchInput = Partial<FieldInput>;

export interface AuditQueryInput {
  cursor?: string;
  limit?: number;
  eventType?: AuditEventType;
}

export interface AuditPage {
  items: AuditEvent[];
  nextCursor: string | null;
}

export const envelopeService = {
  async create(input: CreateEnvelopeInput): Promise<Envelope> {
    const { data } = await apiClient.post<Envelope>('/envelopes', input);
    return data;
  },
  async list(status?: string | string[]): Promise<Envelope[]> {
    const params: Record<string, string> = {};
    if (status) {
      params.status = Array.isArray(status) ? status.join(',') : status;
    }
    const { data } = await apiClient.get<Envelope[]>('/envelopes', { params });
    return data;
  },
  async get(id: string): Promise<Envelope> {
    const { data } = await apiClient.get<Envelope>(`/envelopes/${id}`);
    return data;
  },
  async update(
    id: string,
    input: {
      title?: string;
      message?: string;
      signingOrder?: SigningOrder;
      documentId?: string;
    },
  ): Promise<Envelope> {
    const { data } = await apiClient.patch<Envelope>(
      `/envelopes/${id}`,
      input,
    );
    return data;
  },
  async send(id: string): Promise<Envelope> {
    const { data } = await apiClient.post<Envelope>(`/envelopes/${id}/send`);
    return data;
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/envelopes/${id}`);
  },
  async inbox(): Promise<Envelope[]> {
    const { data } = await apiClient.get<Envelope[]>('/envelopes/inbox');
    return data;
  },
  async recentActivity(limit = 10): Promise<ActivityItem[]> {
    const { data } = await apiClient.get<ActivityItem[]>(
      '/envelopes/activity/recent',
      { params: { limit } },
    );
    return data;
  },
  async void(id: string, reason: string): Promise<Envelope> {
    const { data } = await apiClient.post<Envelope>(`/envelopes/${id}/void`, {
      reason,
    });
    return data;
  },
  async getAudit(id: string, query: AuditQueryInput = {}): Promise<AuditPage> {
    const params: Record<string, string | number> = {};
    if (query.cursor) params.cursor = query.cursor;
    if (query.limit !== undefined) params.limit = query.limit;
    if (query.eventType) params.eventType = query.eventType;
    const { data } = await apiClient.get<AuditPage>(
      `/envelopes/${id}/audit`,
      { params },
    );
    return data;
  },
  async download(
    id: string,
    type: 'document' | 'certificate' | 'combined' = 'document',
  ): Promise<Blob> {
    const { data } = await apiClient.get(`/envelopes/${id}/download`, {
      responseType: 'blob',
      params: { type },
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
  async patchField(
    envelopeId: string,
    fieldId: string,
    input: FieldPatchInput,
  ): Promise<SignatureField> {
    const { data } = await apiClient.patch<SignatureField>(
      `/envelopes/${envelopeId}/fields/${fieldId}`,
      input,
    );
    return data;
  },
  async deleteField(envelopeId: string, fieldId: string): Promise<void> {
    await apiClient.delete(`/envelopes/${envelopeId}/fields/${fieldId}`);
  },
  async attachDocument(
    envelopeId: string,
    documentId: string,
  ): Promise<{ envelopeId: string; documentId: string; orderIndex: number }> {
    const { data } = await apiClient.post<{
      envelopeId: string;
      documentId: string;
      orderIndex: number;
    }>(`/envelopes/${envelopeId}/documents/${documentId}`);
    return data;
  },
  async detachDocument(
    envelopeId: string,
    documentId: string,
  ): Promise<void> {
    await apiClient.delete(
      `/envelopes/${envelopeId}/documents/${documentId}`,
    );
  },
  async listAttachedDocuments(envelopeId: string): Promise<
    Array<{
      documentId: string;
      orderIndex: number;
      attachedAt: string;
      filename: string;
      pageCount: number;
      status: string;
    }>
  > {
    const { data } = await apiClient.get<
      Array<{
        documentId: string;
        orderIndex: number;
        attachedAt: string;
        filename: string;
        pageCount: number;
        status: string;
      }>
    >(`/envelopes/${envelopeId}/documents`);
    return data;
  },
};

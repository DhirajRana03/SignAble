import type {
  PdfVerifyResponse,
  VerifyResponse,
} from '@/types/verify.types';

import { apiClient } from './api-client';

/**
 * Public verification API. No auth — envelope IDs are treated as
 * shareable verification identifiers (same model as DocuSign).
 */
export const verifyService = {
  async getEnvelope(envelopeId: string): Promise<VerifyResponse> {
    const { data } = await apiClient.get<VerifyResponse>(
      `/verify/${envelopeId}`,
    );
    return data;
  },

  async verifyUploadedPdf(
    envelopeId: string,
    file: File,
  ): Promise<PdfVerifyResponse> {
    const form = new FormData();
    form.append('pdf', file);
    const { data } = await apiClient.post<PdfVerifyResponse>(
      `/verify/${envelopeId}/pdf`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  auditCertUrl(envelopeId: string): string {
    const base =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
    return `${base}/verify/${envelopeId}/audit-certificate`;
  },
};

import type { Document } from '@/types/document.types';
import type { PageMeta } from '@/types/envelope.types';
import { apiClient } from './api-client';

export const documentService = {
  async upload(
    file: File,
    options: {
      signal?: AbortSignal;
      onProgress?: (pct: number) => void;
    } = {},
  ): Promise<Document> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<Document>('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options.signal,
      onUploadProgress: (e) => {
        if (!options.onProgress || !e.total) return;
        options.onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data;
  },

  async list(): Promise<Document[]> {
    const { data } = await apiClient.get<Document[]>('/documents');
    return data;
  },

  async get(id: string): Promise<Document> {
    const { data } = await apiClient.get<Document>(`/documents/${id}`);
    return data;
  },

  async getPageUrls(id: string): Promise<string[]> {
    const { data } = await apiClient.get<string[]>(`/documents/${id}/pages`);
    return data;
  },

  /**
   * Per-page metadata for prepare workspace: width, height (PDF points),
   * imageUrl. Drives accurate aspect-ratio rendering of pages.
   */
  async getPagesMeta(id: string): Promise<PageMeta[]> {
    const { data } = await apiClient.get<PageMeta[]>(
      `/documents/${id}/pages-meta`,
    );
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};

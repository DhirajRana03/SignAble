import type { Document } from '@/types/document.types';
import { apiClient } from './api-client';

export const documentService = {
  async upload(file: File): Promise<Document> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<Document>('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
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

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};

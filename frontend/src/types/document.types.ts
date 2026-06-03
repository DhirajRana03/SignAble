export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface Document {
  id: string;
  filename: string;
  pageCount: number;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
}

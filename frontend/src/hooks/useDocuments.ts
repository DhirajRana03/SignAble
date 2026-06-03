'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { extractErrorMessage } from '@/services/api-client';
import { documentService } from '@/services/document.service';

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentService.list(),
    refetchInterval: (q) => {
      // Poll while any document is still processing
      const data = q.state.data;
      if (!data) return false;
      return data.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING')
        ? 2000
        : false;
    },
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentService.get(id as string),
    enabled: !!id,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return false;
      return d.status === 'PENDING' || d.status === 'PROCESSING' ? 1500 : false;
    },
  });
}

export function useDocumentPages(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['documents', id, 'pages'],
    queryFn: () => documentService.getPageUrls(id as string),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => documentService.upload(file),
    onSuccess: () => {
      toast.success('Upload complete — processing');
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentService.delete(id),
    onSuccess: () => {
      toast.success('Document deleted');
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

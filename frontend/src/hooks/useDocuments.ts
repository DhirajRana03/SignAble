'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useCallback, useRef, useState } from 'react';
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

/**
 * Per-page metadata for the prepare workspace. Cached for 5 min — the
 * dimensions never change after processing completes.
 */
export function useDocumentPagesMeta(
  id: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['documents', id, 'pages-meta'],
    queryFn: () => documentService.getPagesMeta(id as string),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Upload with cancel + progress. Returns mutation + progress state +
 * cancel handle. `cancel()` aborts in-flight request; useMutation receives
 * `CanceledError` and onError branch ignores it (cancellation is intent,
 * not failure).
 */
export function useUploadDocument() {
  const qc = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);
  const lastProgressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  /**
   * Quantize to 2% steps. axios fires onUploadProgress per chunk
   * (50+/sec on fast pipes); without throttle each tick triggers a
   * full re-render of the dropzone + progress ring. Quantizing cuts
   * updates ~25x while staying visually smooth.
   */
  const handleProgress = useCallback((pct: number) => {
    const stepped = Math.min(100, Math.round(pct / 2) * 2);
    if (stepped !== lastProgressRef.current) {
      lastProgressRef.current = stepped;
      setProgress(stepped);
    }
  }, []);

  const mutation = useMutation({
    mutationFn: (file: File) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      lastProgressRef.current = 0;
      setProgress(0);
      return documentService.upload(file, {
        signal: controller.signal,
        onProgress: handleProgress,
      });
    },
    onSuccess: () => {
      lastProgressRef.current = 0;
      setProgress(0);
      controllerRef.current = null;
      toast.success('Upload complete — processing');
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => {
      controllerRef.current = null;
      lastProgressRef.current = 0;
      setProgress(0);
      if (axios.isCancel(err)) return; // user-initiated, silent
      toast.error(extractErrorMessage(err));
    },
  });

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  return Object.assign(mutation, { progress, cancel });
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

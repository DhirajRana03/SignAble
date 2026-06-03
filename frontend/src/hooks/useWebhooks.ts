'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { extractErrorMessage } from '@/services/api-client';
import { webhookService } from '@/services/webhook.service';
import type {
  CreateWebhookInput,
  UpdateWebhookInput,
} from '@/types/webhook.types';

const KEY = ['webhooks'];

export function useWebhooks() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => webhookService.list(),
  });
}

export function useWebhookDeliveries(id: string | null) {
  return useQuery({
    queryKey: ['webhooks', id, 'deliveries'],
    queryFn: () => webhookService.listDeliveries(id as string),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWebhookInput) => webhookService.create(input),
    onSuccess: () => {
      toast.success('Webhook created');
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWebhookInput }) =>
      webhookService.update(id, input),
    onSuccess: () => {
      toast.success('Webhook updated');
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => webhookService.delete(id),
    onSuccess: () => {
      toast.success('Webhook deleted');
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { extractErrorMessage } from '@/services/api-client';
import {
  type CreateEnvelopeInput,
  type FieldInput,
  type RecipientInput,
  envelopeService,
} from '@/services/envelope.service';

export function useEnvelopes() {
  return useQuery({
    queryKey: ['envelopes'],
    queryFn: () => envelopeService.list(),
  });
}

export function useEnvelope(id: string | undefined) {
  return useQuery({
    queryKey: ['envelopes', id],
    queryFn: () => envelopeService.get(id as string),
    enabled: !!id,
  });
}

export function useEnvelopeAudit(id: string | undefined) {
  return useQuery({
    queryKey: ['envelopes', id, 'audit'],
    queryFn: () => envelopeService.getAudit(id as string),
    enabled: !!id,
  });
}

export function useEnvelopeFields(id: string | undefined) {
  return useQuery({
    queryKey: ['envelopes', id, 'fields'],
    queryFn: () => envelopeService.listFields(id as string),
    enabled: !!id,
  });
}

export function useCreateEnvelope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEnvelopeInput) => envelopeService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['envelopes'] }),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useSendEnvelope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => envelopeService.send(id),
    onSuccess: (_, id) => {
      toast.success('Envelope sent');
      qc.invalidateQueries({ queryKey: ['envelopes'] });
      qc.invalidateQueries({ queryKey: ['envelopes', id] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useVoidEnvelope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      envelopeService.void(id, reason),
    onSuccess: (_, vars) => {
      toast.success('Envelope voided');
      qc.invalidateQueries({ queryKey: ['envelopes'] });
      qc.invalidateQueries({ queryKey: ['envelopes', vars.id] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useAddRecipient(envelopeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecipientInput) =>
      envelopeService.addRecipient(envelopeId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['envelopes', envelopeId] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useDeleteRecipient(envelopeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipientId: string) =>
      envelopeService.deleteRecipient(envelopeId, recipientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['envelopes', envelopeId] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useUpdateRecipient(envelopeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipientId,
      input,
    }: {
      recipientId: string;
      input: Partial<RecipientInput>;
    }) => envelopeService.updateRecipient(envelopeId, recipientId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['envelopes', envelopeId] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useBulkSaveFields(envelopeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: FieldInput[]) =>
      envelopeService.bulkSaveFields(envelopeId, fields),
    onSuccess: () => {
      toast.success('Fields saved');
      qc.invalidateQueries({ queryKey: ['envelopes', envelopeId] });
      qc.invalidateQueries({ queryKey: ['envelopes', envelopeId, 'fields'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { extractErrorMessage } from '@/services/api-client';
import {
  type AuditQueryInput,
  type CreateEnvelopeInput,
  type FieldInput,
  type FieldPatchInput,
  type RecipientInput,
  envelopeService,
} from '@/services/envelope.service';

export function useEnvelopes(status?: string | string[]) {
  return useQuery({
    queryKey: ['envelopes', { status: status ?? null }],
    queryFn: () => envelopeService.list(status),
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['envelopes', 'activity', limit],
    queryFn: () => envelopeService.recentActivity(limit),
    refetchInterval: 30_000,
  });
}

export function useEnvelope(id: string | undefined) {
  return useQuery({
    queryKey: ['envelopes', id],
    queryFn: () => envelopeService.get(id as string),
    enabled: !!id,
  });
}

export function useEnvelopeAudit(
  id: string | undefined,
  query: AuditQueryInput = {},
) {
  return useQuery({
    queryKey: ['envelopes', id, 'audit', query],
    queryFn: () => envelopeService.getAudit(id as string, query),
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

export function useDeleteEnvelope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => envelopeService.delete(id),
    onSuccess: (_, id) => {
      toast.success('Draft deleted');
      qc.invalidateQueries({ queryKey: ['envelopes'] });
      qc.removeQueries({ queryKey: ['envelopes', id] });
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

export function usePatchField(envelopeId: string) {
  return useMutation({
    mutationFn: ({
      fieldId,
      input,
    }: {
      fieldId: string;
      input: FieldPatchInput;
    }) => envelopeService.patchField(envelopeId, fieldId, input),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useDeleteField(envelopeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: string) =>
      envelopeService.deleteField(envelopeId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['envelopes', envelopeId, 'fields'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

/**
 * Debounced field-level auto-save. Returns a `schedule(fieldId, patch)`
 * function. Successive calls within `delay` for the same field coalesce
 * into one PATCH carrying the latest patch state.
 */
export function useFieldAutoSave(envelopeId: string, delay = 600) {
  const patch = usePatchField(envelopeId);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pending = useRef<Map<string, FieldPatchInput>>(new Map());

  // Cancel timers on unmount to avoid memory leaks
  useEffect(() => {
    const timersAtMount = timers.current;
    return () => {
      timersAtMount.forEach((t) => clearTimeout(t));
      timersAtMount.clear();
    };
  }, []);

  const schedule = useCallback(
    (fieldId: string, input: FieldPatchInput) => {
      pending.current.set(fieldId, {
        ...(pending.current.get(fieldId) ?? {}),
        ...input,
      });
      const existing = timers.current.get(fieldId);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(() => {
        const payload = pending.current.get(fieldId);
        pending.current.delete(fieldId);
        timers.current.delete(fieldId);
        if (payload && Object.keys(payload).length > 0) {
          patch.mutate({ fieldId, input: payload });
        }
      }, delay);
      timers.current.set(fieldId, handle);
    },
    [delay, patch],
  );

  const flush = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    pending.current.forEach((input, fieldId) => {
      patch.mutate({ fieldId, input });
    });
    pending.current.clear();
  }, [patch]);

  return { schedule, flush, isSaving: patch.isPending };
}

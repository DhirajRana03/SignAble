'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { extractErrorMessage } from '@/services/api-client';
import { signingService } from '@/services/signing.service';
import type {
  AdoptedSignature,
  AdoptSignaturePayload,
  SigningView,
} from '@/types/signing.types';

export function useSigning(token: string) {
  const viewedOnce = useRef(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['signing', token],
    queryFn: () => signingService.getView(token),
  });

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Mark viewed once data loads
  useEffect(() => {
    if (query.isSuccess && !viewedOnce.current) {
      viewedOnce.current = true;
      void signingService.markViewed(token).catch(() => undefined);
    }
  }, [query.isSuccess, token]);

  const allRequiredFilled = useMemo(() => {
    const fields = query.data?.fields ?? [];
    const required = fields.filter((f) => f.required);
    return required.length > 0 && required.every((f) => fieldValues[f.id]);
  }, [query.data, fieldValues]);

  const setFieldValue = (fieldId: string, value: string) => {
    setFieldValues((v) => ({ ...v, [fieldId]: value }));
  };

  /**
   * Apply the recipient's adopted signature/initials to every matching
   * field that is still empty. Idempotent — already-filled fields are
   * preserved so the user can re-adopt a new style without losing
   * other field types' values.
   */
  const applyAdoptedToFields = (
    adopted: AdoptedSignature,
    fields: SigningView['fields'],
  ) => {
    setFieldValues((current) => {
      const next = { ...current };
      for (const f of fields) {
        if (f.fieldType === 'SIGNATURE' && adopted.signature) {
          next[f.id] = adopted.signature;
        } else if (f.fieldType === 'INITIALS' && adopted.initials) {
          next[f.id] = adopted.initials;
        }
      }
      return next;
    });
  };

  const adopt = useMutation({
    mutationFn: (payload: AdoptSignaturePayload) =>
      signingService.adopt(token, payload),
    onSuccess: (adopted) => {
      // Patch the cached view with the new adopted style so the modal
      // stays in sync if the user re-opens it without a hard refetch.
      queryClient.setQueryData<SigningView | undefined>(
        ['signing', token],
        (prev) => (prev ? { ...prev, adopted } : prev),
      );
      const fields = query.data?.fields ?? [];
      applyAdoptedToFields(adopted, fields);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const submit = useMutation({
    mutationFn: () => signingService.submit(token, fieldValues),
    onSuccess: () => {
      toast.success('Signature submitted');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const decline = useMutation({
    mutationFn: (reason: string) => signingService.decline(token, reason),
    onSuccess: () => toast('Signing declined'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return {
    query,
    fieldValues,
    setFieldValue,
    allRequiredFilled,
    submit,
    decline,
    adopt,
    applyAdoptedToFields,
  };
}

/**
 * Public completion view query for the standalone signed-document page.
 * Polls once envelope still in-progress so signers see signed PDF as
 * soon as last signer finishes.
 */
export function useSigningCompletion(token: string | undefined) {
  return useQuery({
    queryKey: ['signing', token, 'completion'],
    queryFn: () => signingService.getCompletion(token as string),
    enabled: !!token,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;
      // Keep polling while pending so signed PDF appears automatically.
      return data.envelopeStatus === 'COMPLETED' ||
        data.envelopeStatus === 'VOIDED'
        ? false
        : 5000;
    },
  });
}

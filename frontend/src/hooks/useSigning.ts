'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { extractErrorMessage } from '@/services/api-client';
import { signingService } from '@/services/signing.service';

export function useSigning(token: string) {
  const viewedOnce = useRef(false);

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

'use client';

import { useQuery } from '@tanstack/react-query';

import { verifyService } from '@/services/verify.service';

/**
 * Fetch envelope integrity status. Public — no auth header sent.
 * Refetches every 10s while envelope incomplete so the UI updates
 * automatically once the last signer finishes.
 */
export function useVerifyEnvelope(envelopeId: string | undefined) {
  return useQuery({
    queryKey: ['verify', envelopeId],
    queryFn: () => verifyService.getEnvelope(envelopeId as string),
    enabled: !!envelopeId,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;
      return data.status === 'COMPLETED' || data.status === 'VOIDED'
        ? false
        : 10_000;
    },
  });
}

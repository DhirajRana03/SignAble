'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '@/services/api-client';

/**
 * Fetch an image via the authed api-client and expose it as a blob: URL.
 * Required because page PNGs are served behind JWT auth.
 */
export function useAuthedImage(url: string | undefined): {
  src: string | null;
  loading: boolean;
} {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      setLoading(false);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    setLoading(true);

    const path = url.replace(/^.*\/api\/v1/, '');

    apiClient
      .get(path, { responseType: 'blob' })
      .then((res) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setSrc(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { src, loading };
}

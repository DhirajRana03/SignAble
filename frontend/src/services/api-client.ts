/**
 * Single axios instance for the app.
 *
 * Responsibility: HTTP transport + token injection + 401 surfacing.
 * No business logic, no error UI — that belongs in hooks / services.
 */
import axios from 'axios';

let tokenGetter: () => string | null = () => null;
let onUnauthorized: () => void = () => undefined;

export function configureApiClient(opts: {
  getToken?: () => string | null;
  onUnauthorized?: () => void;
}) {
  if (opts.getToken) tokenGetter = opts.getToken;
  if (opts.onUnauthorized) onUnauthorized = opts.onUnauthorized;
}

export const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenGetter();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      onUnauthorized();
    }
    return Promise.reject(err);
  },
);

export type ApiError = { statusCode: number; error?: string; message: string };

export function extractErrorMessage(err: unknown): string {
  const ax = err as { response?: { data?: ApiError } };
  return (
    ax?.response?.data?.message ??
    (err as Error)?.message ??
    'Something went wrong'
  );
}

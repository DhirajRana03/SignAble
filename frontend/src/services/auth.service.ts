import type { AuthUser, TokenResponse } from '@/types/auth.types';
import { apiClient } from './api-client';

export const authService = {
  async register(email: string, name: string, password: string): Promise<AuthUser> {
    const { data } = await apiClient.post<AuthUser>('/auth/register', {
      email,
      name,
      password,
    });
    return data;
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>('/auth/me');
    return data;
  },
};

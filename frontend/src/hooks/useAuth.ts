'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/services/api-client';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

/**
 * Bridge hook between auth UI components and auth service/store.
 * Components import THIS — never the service directly.
 */
export function useAuth() {
  const router = useRouter();
  const { setAuth, logout, user, isAuthenticated } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const tokens = await authService.login(input.email, input.password);
      // Temporarily prime the token so /me succeeds
      useAuthStore.setState({ accessToken: tokens.access_token });
      const me = await authService.me();
      return { tokens, me };
    },
    onSuccess: ({ tokens, me }) => {
      setAuth(me, tokens.access_token, tokens.refresh_token);
      toast.success('Welcome back');
      router.push('/');
    },
    onError: (err) => {
      useAuthStore.setState({ accessToken: null });
      toast.error(extractErrorMessage(err));
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      await authService.register(input.email, input.name, input.password);
      const tokens = await authService.login(input.email, input.password);
      useAuthStore.setState({ accessToken: tokens.access_token });
      const me = await authService.me();
      return { tokens, me };
    },
    onSuccess: ({ tokens, me }) => {
      setAuth(me, tokens.access_token, tokens.refresh_token);
      toast.success('Account created');
      router.push('/');
    },
    onError: (err) => {
      useAuthStore.setState({ accessToken: null });
      toast.error(extractErrorMessage(err));
    },
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return {
    user,
    isAuthenticated,
    loginMutation,
    registerMutation,
    logout: handleLogout,
  };
}

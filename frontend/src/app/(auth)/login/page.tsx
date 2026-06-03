import Link from 'next/link';

import { LoginForm } from '@/components/features/auth/LoginForm';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back."
      subtitle="Sign in to send, track, and seal documents with intent."
      footer={
        <>
          New here?{' '}
          <Link
            href="/register"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}

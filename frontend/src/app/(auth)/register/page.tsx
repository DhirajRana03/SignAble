import Link from 'next/link';

import { RegisterForm } from '@/components/features/auth/RegisterForm';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Begin signing."
      subtitle="An account takes seconds. Your first envelope is on us."
      footer={
        <>
          Already with us?{' '}
          <Link
            href="/login"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}

'use client';

import { useParams } from 'next/navigation';

import { SigningView } from '@/components/features/signing/SigningView';

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  if (!token) return null;
  return <SigningView token={token} />;
}

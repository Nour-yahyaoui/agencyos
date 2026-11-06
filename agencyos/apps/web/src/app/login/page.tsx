import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/safe-next';
import { AuthPanel } from '@/components/layout/auth-panel';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

/** Mirrors the middleware check so a direct server render can't show the form to a signed-in user. */
function hasLiveAccessToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const json = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof json.exp === 'number' && json.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const store = await cookies();
  if (hasLiveAccessToken(store.get('agencyos_access')?.value)) redirect(next);

  return (
    <AuthPanel>
      <Suspense>
        <LoginForm next={next} />
      </Suspense>
    </AuthPanel>
  );
}

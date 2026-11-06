'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/form-field';
import { AuthPanel } from '@/components/layout/auth-panel';
import { useHydrated } from '@/lib/use-hydrated';

const schema = z.object({
  name: z.string().min(2, 'Enter your name').max(80),
  password: z.string().min(10, 'At least 10 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/[0-9]/, 'Include a number'),
});

function AcceptForm() {
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const { refresh } = useAuth();
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success'>('idle');
  const hydrated = useHydrated();
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (status !== 'idle') return;
    setStatus('submitting');
    setFormError(null);
    try {
      await authApi.accept({ token, ...data });
      setStatus('success');
      await refresh();
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      setStatus('idle');
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'This invitation is no longer valid. Ask the workspace owner to send a new one.',
      );
    }
  };

  if (status === 'success') {
    return (
      <div role="status" aria-live="polite" className="grid place-items-center gap-3 py-16 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
        <p className="text-base font-medium">Invitation accepted</p>
        <p className="text-sm text-ink-muted">Opening your workspace…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Accept invitation</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Create your account to join the workspace. If this email already has an account, enter its password to confirm
        ownership.
      </p>
      {!token ? (
        <p className="mt-6 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm">
          This link is missing its invitation token. Ask the workspace owner to resend the invitation.
        </p>
      ) : (
        <>
          {formError && (
            <div role="alert" className="mt-5 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm">
              {formError}
            </div>
          )}
          <form method="post" onSubmit={handleSubmit(onSubmit)} aria-busy={status === 'submitting'} className="mt-6 space-y-4" noValidate>
            <FormField label="Your name" error={errors.name?.message}>
              <Input autoComplete="name" disabled={status === 'submitting'} {...register('name')} />
            </FormField>
            <FormField label="Password" error={errors.password?.message} hint="At least 10 characters, with a letter and a number.">
              <Input type="password" autoComplete="new-password" disabled={status === 'submitting'} {...register('password')} />
            </FormField>
            <Button type="submit" className="h-11 w-full" disabled={!hydrated} loading={status === 'submitting'}>
              {status === 'submitting' ? 'Joining workspace…' : 'Join workspace'}
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-sm text-ink-muted">
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Already have an account? Sign in
        </Link>
      </p>
    </div>
  );
}

export default function AcceptPage() {
  return (
    <AuthPanel>
      <Suspense>
        <AcceptForm />
      </Suspense>
    </AuthPanel>
  );
}

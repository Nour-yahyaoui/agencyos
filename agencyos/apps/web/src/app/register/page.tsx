'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { ApiError, authApi } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/form-field';
import { AuthPanel } from '@/components/layout/auth-panel';
import { useHydrated } from '@/lib/use-hydrated';

const schema = z.object({
  name: z.string().min(2, 'Enter your name').max(80),
  organizationName: z.string().min(2, 'Enter a workspace name').max(80),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(10, 'At least 10 characters')
    .regex(/[A-Za-z]/, 'Include a letter')
    .regex(/[0-9]/, 'Include a number'),
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success'>('idle');
  const hydrated = useHydrated();
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, setError, setFocus, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    if (status !== 'idle') return;
    setStatus('submitting');
    setFormError(null);
    try {
      await authApi.register(data);
      setStatus('success');
      await refresh();
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      setStatus('idle');
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { message: 'An account already uses this email. Sign in instead.' });
        setFocus('email');
      } else {
        setFormError(error instanceof Error ? error.message : 'Could not create the workspace. Try again.');
      }
    }
  };

  return (
    <AuthPanel>
      {status === 'success' ? (
        <div role="status" aria-live="polite" className="grid place-items-center gap-3 py-16 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
          <p className="text-base font-medium">Workspace created</p>
          <p className="text-sm text-ink-muted">Opening your workspace…</p>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
          <p className="mt-1.5 text-sm text-ink-muted">You will be the owner. Invite your team and clients after setup.</p>
          {formError && (
            <div role="alert" className="mt-5 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm">
              {formError}
            </div>
          )}
          <form method="post" onSubmit={handleSubmit(onSubmit)} aria-busy={status === 'submitting'} className="mt-6 space-y-4" noValidate>
            <FormField label="Your name" error={errors.name?.message}>
              <Input autoComplete="name" disabled={status === 'submitting'} {...register('name')} />
            </FormField>
            <FormField label="Workspace name" error={errors.organizationName?.message}>
              <Input placeholder="Northstar Studio" disabled={status === 'submitting'} {...register('organizationName')} />
            </FormField>
            <FormField label="Work email" error={errors.email?.message}>
              <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" disabled={status === 'submitting'} {...register('email')} />
            </FormField>
            <FormField label="Password" error={errors.password?.message} hint="At least 10 characters, with a letter and a number.">
              <Input type="password" autoComplete="new-password" disabled={status === 'submitting'} {...register('password')} />
            </FormField>
            <Button type="submit" className="h-11 w-full" disabled={!hydrated} loading={status === 'submitting'}>
              {status === 'submitting' ? 'Creating workspace…' : 'Create workspace'}
            </Button>
          </form>
          <p className="mt-6 text-sm text-ink-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </AuthPanel>
  );
}

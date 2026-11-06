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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/form-field';
import { AuthPanel } from '@/components/layout/auth-panel';
import { useHydrated } from '@/lib/use-hydrated';

const schema = z
  .object({
    password: z.string().min(10, 'At least 10 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/[0-9]/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

function ResetForm() {
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const [done, setDone] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const hydrated = useHydrated();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setFormError(null);
    try {
      await authApi.reset(token, data.password);
      setDone(true);
      // replace, so Back from the dashboard doesn't return to a spent recovery link
      window.setTimeout(() => router.replace('/login'), 1200);
    } catch (error) {
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'This recovery link is no longer valid. Request a new one.',
      );
    }
  };

  if (done) {
    return (
      <div role="status" aria-live="polite" className="grid place-items-center gap-3 py-16 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
        <p className="text-base font-medium">Password updated</p>
        <p className="text-sm text-ink-muted">Taking you to sign in…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Recovery links expire after one hour and can be used once.</p>
      {!token ? (
        <p className="mt-6 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm">
          This link is missing its recovery token.{' '}
          <Link href="/forgot-password" className="font-medium text-accent underline-offset-4 hover:underline">
            Request a new link
          </Link>
          .
        </p>
      ) : (
        <>
          {formError && (
            <div role="alert" className="mt-5 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm">
              {formError}
            </div>
          )}
          <form method="post" onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <FormField label="New password" error={errors.password?.message} hint="At least 10 characters, with a letter and a number.">
              <Input type="password" autoComplete="new-password" {...register('password')} />
            </FormField>
            <FormField label="Confirm password" error={errors.confirm?.message}>
              <Input type="password" autoComplete="new-password" {...register('confirm')} />
            </FormField>
            <Button type="submit" className="h-11 w-full" disabled={!hydrated} loading={isSubmitting}>
              {isSubmitting ? 'Updating password…' : 'Update password'}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPage() {
  return (
    <AuthPanel>
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthPanel>
  );
}

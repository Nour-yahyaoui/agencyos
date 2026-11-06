'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/form-field';
import { AuthPanel } from '@/components/layout/auth-panel';
import { useHydrated } from '@/lib/use-hydrated';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type Result = { message: string; developmentResetUrl?: string; emailDelivered: boolean };

export default function ForgotPage() {
  const [result, setResult] = React.useState<Result | null>(null);
  const [failed, setFailed] = React.useState(false);
  const hydrated = useHydrated();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setFailed(false);
    try {
      setResult(await authApi.forgot(data.email));
    } catch {
      setFailed(true);
    }
  };

  return (
    <AuthPanel>
      {result ? (
        <div role="status" aria-live="polite" className="space-y-4">
          <MailCheck className="h-7 w-7 text-accent" strokeWidth={1.5} aria-hidden />
          <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-ink-muted">{result.message}</p>
          {!result.emailDelivered && (
            <p className="rounded-md border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm text-warning">
              Email delivery is not configured on this deployment, so no message was sent.
            </p>
          )}
          {result.developmentResetUrl && (
            <div className="rounded-md border border-border bg-sunken/60 p-3.5 text-sm">
              <p className="font-medium">Development recovery link</p>
              <Link
                className="mt-1 block break-all font-mono text-xs text-accent underline-offset-4 hover:underline"
                href={result.developmentResetUrl.replace(/^https?:\/\/[^/]+/, '')}
              >
                {result.developmentResetUrl}
              </Link>
            </div>
          )}
          <Link href="/login" className="inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Enter your email and we will send a recovery link if the account exists.
          </p>
          {failed && (
            <div role="alert" className="mt-5 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm">
              Could not reach the recovery service. Check your connection and try again.
            </div>
          )}
          <form method="post" onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <FormField label="Email" error={errors.email?.message}>
              <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" {...register('email')} />
            </FormField>
            <Button type="submit" className="h-11 w-full" disabled={!hydrated} loading={isSubmitting}>
              {isSubmitting ? 'Sending link…' : 'Send recovery link'}
            </Button>
          </form>
          <Link href="/login" className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      )}
    </AuthPanel>
  );
}

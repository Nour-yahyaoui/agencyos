'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ApiError, authApi } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useHydrated } from '@/lib/use-hydrated';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/form-field';

const schema = z.object({
  email: z.string().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
type Form = z.infer<typeof schema>;

const DEMO_ACCOUNTS: [string, string][] = [
  ['owner@agencyos.dev', 'Owner'],
  ['manager@agencyos.dev', 'Manager'],
  ['dev@agencyos.dev', 'Developer'],
  ['client@agencyos.dev', 'Client'],
  ['admin@agencyos.dev', 'Super admin'],
];
const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type Status = 'idle' | 'submitting' | 'success';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();
  const [status, setStatus] = React.useState<Status>('idle');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  // Until React has attached onSubmit, a click would trigger a native form submit. The button
  // stays disabled for that first paint so the only possible submit is the handled one.
  const hydrated = useHydrated();
  const passwordRef = React.useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, setValue, setFocus, setError, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Covers the case the server can't see: the access cookie expired but the refresh cookie is
  // still good, so `me` succeeds after a silent refresh.
  React.useEffect(() => {
    if (!isLoading && user && status === 'idle') router.replace(next);
  }, [isLoading, user, next, router, status]);

  const onSubmit = async (data: Form) => {
    if (status !== 'idle') return; // block double submits
    setStatus('submitting');
    setFormError(null);
    try {
      await authApi.login(data.email, data.password);
      // The form is replaced the moment the credentials are accepted — before the session
      // query resolves, so the auto-redirect effect can't navigate away from under it.
      setStatus('success');
      await refresh();
      router.replace(next);
      router.refresh();
    } catch (error) {
      setStatus('idle');
      setValue('password', '');
      if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
        setError('password', { message: 'That email and password do not match an account.' });
        setFocus('password');
      } else if (error instanceof ApiError && error.status === 429) {
        setFormError('Too many attempts. Wait a minute before trying again.');
        setFocus('email');
      } else {
        setFormError('Could not reach the sign-in service. Check your connection and try again.');
        setFocus('email');
      }
    }
  };

  if (status === 'success') {
    return (
      <div role="status" aria-live="polite" className="grid place-items-center gap-3 py-16 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
        <p className="text-base font-medium">Signed in</p>
        <p className="text-sm text-ink-muted">Opening your workspace…</p>
      </div>
    );
  }

  const { ref: passwordRegisterRef, ...passwordField } = register('password');

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Access your agency workspace or client portal.</p>

      {formError && (
        <div role="alert" className="mt-5 rounded-md border border-danger/30 bg-danger/5 px-3.5 py-3 text-sm text-ink">
          {formError}
        </div>
      )}

      <form method="post" onSubmit={handleSubmit(onSubmit)} aria-busy={status === 'submitting'} className="mt-6 space-y-4" noValidate>
        <FormField label="Email" error={errors.email?.message} htmlFor="email">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="you@agency.com"
            disabled={status === 'submitting'}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
        </FormField>

        <FormField label="Password" error={errors.password?.message} htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="go"
              disabled={status === 'submitting'}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="pe-11"
              {...passwordField}
              ref={(node) => {
                passwordRegisterRef(node);
                passwordRef.current = node;
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 end-0 inline-flex w-11 items-center justify-center rounded-sm text-ink-muted transition-colors duration-fast hover:text-ink"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </FormField>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-accent underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="h-11 w-full" disabled={!hydrated || status === 'submitting'}>
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      {demoEnabled && (
        <section className="mt-7 rounded-md border border-border bg-sunken/60 p-3.5">
          <h2 className="text-xs font-medium text-ink">Demo accounts</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Password <code className="font-mono text-[11px] text-ink">DemoPass123!</code> — seeded data, resets on reseed.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map(([email, label]) => (
              <Button
                key={email}
                type="button"
                variant="outline"
                size="sm"
                disabled={status === 'submitting'}
                onClick={() => {
                  setValue('email', email);
                  setValue('password', 'DemoPass123!');
                  setFormError(null);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-sm text-ink-muted">
        No account?{' '}
        <Link href="/register" className="font-medium text-accent underline-offset-4 hover:underline">
          Create a workspace
        </Link>
      </p>
    </div>
  );
}

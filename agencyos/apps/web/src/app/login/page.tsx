'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/form-field';
const schema = z.object({ email: z.string().email(), password: z.string().min(1, 'Password is required') });
type Form = z.infer<typeof schema>;
const demo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
function LoginForm() {
  const router = useRouter(); const params = useSearchParams(); const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const onSubmit = async (data: Form) => { setLoading(true); try { await authApi.login(data.email, data.password); await refresh(); toast.success('Welcome back'); router.replace(params.get('next') || '/dashboard'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Sign in failed'); } finally { setLoading(false); } };
  const fill = (email: string) => { setValue('email', email); setValue('password', 'DemoPass123!'); };
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_hsl(243_75%_95%),_transparent_60%)] p-4">
      <Card className="w-full max-w-md"><CardHeader><Link href="/" className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white">A</span>AgencyOS</Link><CardTitle className="text-2xl">Sign in</CardTitle><CardDescription>Access your agency workspace or client portal.</CardDescription></CardHeader>
        <CardContent><form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><FormField label="Email" required error={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></FormField><FormField label="Password" required error={errors.password?.message}><Input type="password" autoComplete="current-password" {...register('password')} /></FormField><div className="flex justify-end"><Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link></div><Button type="submit" className="w-full" loading={loading}>Sign in</Button></form>
          {demo && <div className="mt-5 rounded-md border bg-muted/40 p-3 text-xs"><p className="font-medium text-foreground">Development demo accounts (password: DemoPass123!)</p><div className="mt-2 grid grid-cols-2 gap-1.5">{[['owner@agencyos.dev', 'Owner'], ['manager@agencyos.dev', 'Manager'], ['dev@agencyos.dev', 'Developer'], ['client@agencyos.dev', 'Client'], ['admin@agencyos.dev', 'Super admin']].map(([email, label]) => <Button key={email} type="button" variant="outline" size="sm" onClick={() => fill(email)}>{label}</Button>)}</div></div>}
          <p className="mt-5 text-center text-sm text-muted-foreground">No account? <Link href="/register" className="font-medium text-primary hover:underline">Create an agency</Link></p>
        </CardContent></Card>
    </div>
  );
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }

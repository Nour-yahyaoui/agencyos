'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/form-field';
const schema = z.object({ password: z.string().min(10).regex(/[A-Za-z]/).regex(/[0-9]/), confirm: z.string() }).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
function ResetForm() {
  const token = useSearchParams().get('token') || ''; const router = useRouter(); const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const onSubmit = async (d: { password: string }) => { try { await authApi.reset(token, d.password); setDone(true); toast.success('Password updated'); setTimeout(() => router.push('/login'), 1200); } catch (e) { toast.error(e instanceof Error ? e.message : 'Reset failed'); } };
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle className="text-2xl">Choose a new password</CardTitle><CardDescription>Recovery links expire after one hour and can be used once.</CardDescription></CardHeader><CardContent>{done ? <p className="text-sm text-emerald-700">Password updated. Redirecting to sign in…</p> : !token ? <p className="text-sm text-destructive">Missing recovery token. <Link href="/forgot-password" className="text-primary underline">Request a new link</Link>.</p> : <form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><FormField label="New password" required error={errors.password?.message}><Input type="password" autoComplete="new-password" {...register('password')} /></FormField><FormField label="Confirm password" required error={errors.confirm?.message}><Input type="password" autoComplete="new-password" {...register('confirm')} /></FormField><Button type="submit" className="w-full" loading={isSubmitting}>Update password</Button></form>}</CardContent></Card></div>;
}
export default function ResetPage() { return <Suspense><ResetForm /></Suspense>; }

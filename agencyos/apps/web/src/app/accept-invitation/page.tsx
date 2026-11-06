'use client';
import { Suspense } from 'react';
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
const schema = z.object({ name: z.string().min(2).max(80), password: z.string().min(10).regex(/[A-Za-z]/).regex(/[0-9]/) });
function AcceptForm() {
  const token = useSearchParams().get('token') || ''; const router = useRouter(); const { refresh } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const onSubmit = async (d: z.infer<typeof schema>) => { try { await authApi.accept({ token, ...d }); await refresh(); toast.success('Invitation accepted'); router.replace('/dashboard'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Invitation failed'); } };
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle className="text-2xl">Accept invitation</CardTitle><CardDescription>Create your account to join the workspace. If this email already has an account, enter its password to confirm ownership.</CardDescription></CardHeader><CardContent>{!token ? <p className="text-sm text-destructive">Missing invitation token.</p> : <form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><FormField label="Your name" required error={errors.name?.message}><Input {...register('name')} /></FormField><FormField label="Password" required error={errors.password?.message}><Input type="password" {...register('password')} /></FormField><Button type="submit" className="w-full" loading={isSubmitting}>Join workspace</Button></form>}<p className="mt-4 text-center text-sm"><Link href="/login" className="text-primary hover:underline">Already have an account? Sign in</Link></p></CardContent></Card></div>;
}
export default function AcceptPage() { return <Suspense><AcceptForm /></Suspense>; }

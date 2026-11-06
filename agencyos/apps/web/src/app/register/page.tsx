'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
const schema = z.object({ name: z.string().min(2, 'Enter your name').max(80), organizationName: z.string().min(2, 'Enter an organization name').max(80), email: z.string().email(), password: z.string().min(10, 'At least 10 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/[0-9]/, 'Include a number') });
type Form = z.infer<typeof schema>;
export default function RegisterPage() {
  const router = useRouter(); const { refresh } = useAuth(); const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });
  const onSubmit = async (data: Form) => { setLoading(true); try { await authApi.register(data); await refresh(); toast.success('Workspace created'); router.replace('/dashboard'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Registration failed'); } finally { setLoading(false); } };
  return <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_hsl(243_75%_95%),_transparent_60%)] p-4"><Card className="w-full max-w-md"><CardHeader><Link href="/" className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white">A</span>AgencyOS</Link><CardTitle className="text-2xl">Create your agency workspace</CardTitle><CardDescription>You will be the owner. Invite your team and clients after setup.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit(onSubmit)} className="space-y-4"><FormField label="Your name" required error={errors.name?.message}><Input autoComplete="name" {...register('name')} /></FormField><FormField label="Agency name" required error={errors.organizationName?.message}><Input placeholder="Northstar Studio" {...register('organizationName')} /></FormField><FormField label="Work email" required error={errors.email?.message}><Input type="email" autoComplete="email" {...register('email')} /></FormField><FormField label="Password" required error={errors.password?.message} hint="Minimum 10 characters with a letter and a number."><Input type="password" autoComplete="new-password" {...register('password')} /></FormField><Button type="submit" className="w-full" loading={loading}>Create workspace</Button></form><p className="mt-5 text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></p></CardContent></Card></div>;
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/form-field';
const schema = z.object({ email: z.string().email() });
export default function ForgotPage() {
  const [result, setResult] = useState<{ message: string; developmentResetUrl?: string; emailDelivered: boolean } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle className="text-2xl">Reset password</CardTitle><CardDescription>Enter your email and we will send a recovery link if the account exists.</CardDescription></CardHeader><CardContent>{result ? <div className="space-y-3 text-sm"><p>{result.message}</p>{!result.emailDelivered && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">Email delivery is not configured (RESEND_API_KEY missing). No email was sent.</p>}{result.developmentResetUrl && <div className="rounded-md border bg-muted/40 p-3"><p className="font-medium">Development-only recovery link</p><Link className="break-all text-primary hover:underline" href={result.developmentResetUrl.replace(/^https?:\/\/[^/]+/, '')}>{result.developmentResetUrl}</Link></div>}<Link href="/login" className="inline-block text-primary hover:underline">Back to sign in</Link></div> : <form onSubmit={handleSubmit(async (d) => setResult(await authApi.forgot(d.email)))} className="space-y-4"><FormField label="Email" required error={errors.email?.message}><Input type="email" {...register('email')} /></FormField><Button type="submit" className="w-full" loading={isSubmitting}>Send recovery link</Button><Link href="/login" className="block text-center text-sm text-primary hover:underline">Back to sign in</Link></form>}</CardContent></Card></div>;
}

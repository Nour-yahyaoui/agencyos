'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Client, Paginated, Membership } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { DataPagination } from '@/components/shared/data-pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
const schema = z.object({ name: z.string().min(2), company: z.string().optional(), website: z.string().url().regex(/^https?:\/\//i, 'Use an http(s) URL').optional().or(z.literal('')), notes: z.string().optional(), accountManagerId: z.string().optional(), contactName: z.string().optional(), contactEmail: z.string().email().optional().or(z.literal('')) });
type Form = z.infer<typeof schema>;
export default function ClientsPage() {
  const { org, isManagement, isClient } = useAuth();
  const [page, setPage] = useState(1); const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ['clients', org?.id, page, q, status], queryFn: () => api<Paginated<Client>>(`/clients?page=${page}&limit=15&q=${encodeURIComponent(q)}${status !== 'all' ? `&status=${status}` : ''}`), enabled: !!org });
  const members = useQuery({ queryKey: ['members', org?.id], queryFn: () => api<Membership[]>('/memberships'), enabled: !!org && isManagement });
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: '', company: '', website: '', notes: '', contactName: '', contactEmail: '' } });
  const create = useToastMutation({ mutationFn: (d: Form) => api<Client>('/clients', { method: 'POST', body: JSON.stringify({ name: d.name, company: d.company || undefined, website: d.website || undefined, notes: d.notes || undefined, accountManagerId: d.accountManagerId || undefined, contacts: d.contactName && d.contactEmail ? [{ name: d.contactName, email: d.contactEmail, isPrimary: true }] : undefined }) }), success: 'Client created', invalidate: [['clients'], ['dashboard']], onSuccess: () => { setOpen(false); form.reset(); } });
  if (isClient) return <EmptyState icon={Users} title="Client directory is internal" description="Your portal shows only your own projects, documents, tickets, and invoices." />;
  return <div>
    <PageHeader title="Clients" description="Client organizations, contacts, onboarding, and account ownership." actions={isManagement && <Button onClick={() => setOpen(true)}><Plus />New client</Button>} />
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, company, contact…" /><Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent>{['all', 'LEAD', 'ONBOARDING', 'ACTIVE', 'ARCHIVED'].map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}</SelectContent></Select></div>
    {query.isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data!.data.length === 0 ? <EmptyState icon={Users} title="No clients found" description={q || status !== 'all' ? 'Try a different search or filter.' : 'Create your first client to start onboarding and delivery.'} action={isManagement && <Button onClick={() => setOpen(true)}><Plus />New client</Button>} /> : <Card><Table hideBelow={{ md: [3, 4, 5, 6] }}><TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead>Account manager</TableHead><TableHead>Projects</TableHead><TableHead>Open tickets</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader><TableBody>{query.data!.data.map((c) => <TableRow key={c.id}><TableCell><Link href={`/clients/${c.id}`} className="flex items-center gap-3 hover:text-primary"><Avatar name={c.name} /><div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.company || c.contacts[0]?.email || '—'}</p></div></Link></TableCell><TableCell><StatusBadge status={c.status} /></TableCell><TableCell className="text-sm">{c.accountManager?.name ?? 'Unassigned'}</TableCell><TableCell>{c._count?.projects ?? 0}</TableCell><TableCell>{c._count?.tickets ?? 0}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</TableCell><TableCell><Button asChild variant="ghost" size="sm"><Link href={`/clients/${c.id}`}>Open <ExternalLink /></Link></Button></TableCell></TableRow>)}</TableBody></Table><div className="px-3 pb-3"><DataPagination page={query.data!.meta.page} totalPages={query.data!.meta.totalPages} total={query.data!.meta.total} onChange={setPage} /></div></Card>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>New client</DialogTitle><DialogDescription>Create a client organization and optional primary contact.</DialogDescription></DialogHeader><form method="post" onSubmit={form.handleSubmit((d) => create.mutate(d))} className="space-y-4"><FormField label="Client name" required error={form.formState.errors.name?.message}><Input {...form.register('name')} placeholder="Acme Robotics" /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField label="Company" error={form.formState.errors.company?.message}><Input {...form.register('company')} /></FormField><FormField label="Website" error={form.formState.errors.website?.message}><Input {...form.register('website')} placeholder="https://" /></FormField></div><FormField label="Account manager"><Select value={form.watch('accountManagerId') || 'none'} onValueChange={(v) => form.setValue('accountManagerId', v === 'none' ? '' : v)}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{members.data?.filter((m) => m.role !== 'CLIENT').map((m) => <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>)}</SelectContent></Select></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField label="Primary contact" error={form.formState.errors.contactName?.message}><Input {...form.register('contactName')} /></FormField><FormField label="Contact email" error={form.formState.errors.contactEmail?.message}><Input type="email" {...form.register('contactEmail')} /></FormField></div><FormField label="Notes"><Textarea {...form.register('notes')} /></FormField><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create client</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

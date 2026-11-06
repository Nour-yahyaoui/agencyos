'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LifeBuoy, Plus, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Client, Paginated, Ticket } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { DataPagination } from '@/components/shared/data-pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
const schema = z.object({ subject: z.string().min(3), description: z.string().min(10), clientId: z.string().optional(), priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) });
export default function SupportPage() {
  const { org, isClient } = useAuth(); const [page, setPage] = useState(1); const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ['tickets', org?.id, page, q, status], queryFn: () => api<Paginated<Ticket>>(`/support/tickets?page=${page}&limit=15&q=${encodeURIComponent(q)}${status !== 'all' ? `&status=${status}` : ''}`), enabled: !!org });
  const clients = useQuery({ queryKey: ['clients-all', org?.id], queryFn: () => api<Paginated<Client>>('/clients?limit=100'), enabled: !!org && !isClient && open });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { priority: 'MEDIUM' } });
  const create = useToastMutation({ mutationFn: (d: z.infer<typeof schema>) => api<Ticket>('/support/tickets', { method: 'POST', body: JSON.stringify(d) }), success: 'Ticket submitted', invalidate: [['tickets'], ['dashboard']], onSuccess: () => { setOpen(false); form.reset(); } });
  return <div><PageHeader title="Support" description={isClient ? 'Submit requests and follow updates from the agency.' : 'Client support queue with assignment and status tracking.'} actions={<Button onClick={() => setOpen(true)}><Plus />New ticket</Button>} />
    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search tickets…" /><Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{['all', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'].map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
    {query.isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data!.data.length === 0 ? <EmptyState icon={LifeBuoy} title="No tickets" description="Support requests will appear here." action={<Button onClick={() => setOpen(true)}><Plus />New ticket</Button>} /> : <Card><Table hideBelow={{ md: [2, 4, 5, 6, 7] }}><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Client</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Assignee</TableHead><TableHead>Comments</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>{query.data!.data.map((t) => <TableRow key={t.id}><TableCell><Link href={`/support/${t.id}`} className="font-medium hover:text-primary">{t.subject}</Link></TableCell><TableCell className="text-sm">{t.client.name}</TableCell><TableCell><StatusBadge status={t.status} /></TableCell><TableCell><StatusBadge status={t.priority} /></TableCell><TableCell className="text-sm">{t.assignee?.name ?? 'Unassigned'}</TableCell><TableCell><span className="flex items-center gap-1 text-sm text-muted-foreground"><MessageSquare className="h-4 w-4" />{t._count?.comments ?? 0}</span></TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell></TableRow>)}</TableBody></Table><div className="px-3 pb-3"><DataPagination page={query.data!.meta.page} totalPages={query.data!.meta.totalPages} total={query.data!.meta.total} onChange={setPage} /></div></Card>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>New support ticket</DialogTitle></DialogHeader><form method="post" onSubmit={form.handleSubmit((d) => { if (!isClient && !d.clientId) { form.setError('clientId', { message: 'Select a client' }); return; } create.mutate(isClient ? { subject: d.subject, description: d.description, priority: d.priority } : d); })} className="space-y-4"><FormField label="Subject" required error={form.formState.errors.subject?.message}><Input {...form.register('subject')} /></FormField><FormField label="Description" required error={form.formState.errors.description?.message} hint="Include steps to reproduce, impact, and urgency."><Textarea rows={5} {...form.register('description')} /></FormField>{!isClient && <FormField label="Client" required error={form.formState.errors.clientId?.message}><Select value={form.watch('clientId') || ''} onValueChange={(v) => form.setValue('clientId', v)}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.data?.data.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormField>}<FormField label="Priority"><Select value={form.watch('priority')} onValueChange={(v) => form.setValue('priority', v as z.infer<typeof schema>['priority'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></FormField><DialogFooter><Button type="submit" loading={create.isPending}>Submit ticket</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

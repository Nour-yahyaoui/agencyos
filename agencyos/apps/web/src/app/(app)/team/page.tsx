'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Trash2, Copy, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Client, Membership, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatDate } from '@/lib/utils';
const inviteSchema = z.object({ email: z.string().email(), role: z.enum(['MANAGER', 'DEVELOPER', 'CLIENT']), clientId: z.string().optional() }).refine((d) => d.role !== 'CLIENT' || !!d.clientId, { message: 'Select a client for portal access', path: ['clientId'] });
export default function TeamPage() {
  const { org, isManagement, user } = useAuth(); const [inviteOpen, setInviteOpen] = useState(false); const [inviteUrl, setInviteUrl] = useState(''); const [removeId, setRemoveId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['members', org?.id], queryFn: () => api<Membership[]>('/memberships'), enabled: !!org });
  const inv = useQuery({ queryKey: ['invitations', org?.id], queryFn: () => api<{ id: string; email: string; role: string; expiresAt: string }[]>('/memberships/invitations'), enabled: !!org && isManagement });
  const clients = useQuery({ queryKey: ['clients-all', org?.id], queryFn: () => api<Paginated<Client>>('/clients?limit=100'), enabled: !!org && isManagement });
  const form = useForm<z.infer<typeof inviteSchema>>({ resolver: zodResolver(inviteSchema), defaultValues: { role: 'DEVELOPER' } });
  const invite = useToastMutation({ mutationFn: (d: z.infer<typeof inviteSchema>) => api<{ invitationUrl: string; emailDelivered: boolean }>('/memberships/invite', { method: 'POST', body: JSON.stringify(d) }), success: 'Invitation created', invalidate: [['invitations']], onSuccess: (r) => { setInviteUrl(r.invitationUrl); if (!r.emailDelivered) toast.info('Email not configured — copy the link below.'); } });
  const updateRole = useToastMutation({ mutationFn: (v: { id: string; role: string }) => api(`/memberships/${v.id}`, { method: 'PATCH', body: JSON.stringify({ role: v.role }) }), success: 'Role updated', invalidate: [['members']] });
  const remove = useToastMutation({ mutationFn: (id: string) => api(`/memberships/${id}`, { method: 'DELETE' }), success: 'Member removed', invalidate: [['members']], onSuccess: () => setRemoveId(null) });
  if (!isManagement) return <div className="text-sm text-muted-foreground">Team management requires a manager or owner role.</div>;
  const role = form.watch('role');
  return <div><PageHeader title="Team" description="Organization memberships, roles, and invitations." actions={<Button onClick={() => { setInviteOpen(true); setInviteUrl(''); }}><UserPlus />Invite member</Button>} />
    {q.isLoading ? <Skeleton className="h-64" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : <Card><Table hideBelow={{ md: [3, 4] }}><TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead>Client scope</TableHead><TableHead>Joined</TableHead><TableHead /></TableRow></TableHeader><TableBody>{q.data!.map((m) => <TableRow key={m.id}><TableCell><div className="flex items-center gap-3"><Avatar name={m.user.name} /><div><p className="font-medium">{m.user.name}{m.user.id === user?.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{m.user.email}</p></div></div></TableCell><TableCell>{org?.role === 'OWNER' && m.user.id !== user?.id ? <Select value={m.role} onValueChange={(v) => updateRole.mutate({ id: m.id, role: v })}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{['OWNER', 'MANAGER', 'DEVELOPER', 'CLIENT'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select> : <StatusBadge status={m.role} />}</TableCell><TableCell className="text-sm">{m.client?.name ?? '—'}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(m.createdAt)}</TableCell><TableCell>{org?.role === 'OWNER' && m.user.id !== user?.id && <Button variant="ghost" size="icon" onClick={() => setRemoveId(m.id)} aria-label="Remove member"><Trash2 /></Button>}</TableCell></TableRow>)}</TableBody></Table></Card>}
    {inv.data && inv.data.length > 0 && <div className="mt-6"><h2 className="mb-2 font-semibold">Pending invitations</h2><Card><Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader><TableBody>{inv.data.map((i) => <TableRow key={i.id}><TableCell>{i.email}</TableCell><TableCell><StatusBadge status={i.role} /></TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(i.expiresAt)}</TableCell></TableRow>)}</TableBody></Table></Card></div>}
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent><DialogHeader><DialogTitle>Invite member</DialogTitle><DialogDescription>Invitations expire after 7 days. CLIENT invitations are scoped to one client.</DialogDescription></DialogHeader>{inviteUrl ? <div className="space-y-3 text-sm"><p className="flex items-center gap-2"><Mail className="h-4 w-4" />Invitation link</p><Input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} /><Button variant="outline" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Copied'); }}><Copy />Copy link</Button><Button variant="ghost" onClick={() => { setInviteUrl(''); form.reset(); }}>Invite another</Button></div> : <form method="post" onSubmit={form.handleSubmit((d) => invite.mutate(d))} className="space-y-4"><FormField label="Email" required error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></FormField><FormField label="Role" required><Select value={role} onValueChange={(v) => form.setValue('role', v as z.infer<typeof inviteSchema>['role'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MANAGER">Manager</SelectItem><SelectItem value="DEVELOPER">Developer</SelectItem><SelectItem value="CLIENT">Client (portal)</SelectItem></SelectContent></Select></FormField>{role === 'CLIENT' && <FormField label="Client" required error={form.formState.errors.clientId?.message}><Select value={form.watch('clientId') || ''} onValueChange={(v) => form.setValue('clientId', v)}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.data?.data.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormField>}<DialogFooter><Button type="submit" loading={invite.isPending}>Send invitation</Button></DialogFooter></form>}</DialogContent></Dialog>
    <ConfirmDialog open={!!removeId} onOpenChange={(v) => !v && setRemoveId(null)} title="Remove member?" description="They lose access to this organization immediately. Their historical comments and audit records remain." confirmLabel="Remove" destructive loading={remove.isPending} onConfirm={() => removeId && remove.mutate(removeId)} />
  </div>;
}

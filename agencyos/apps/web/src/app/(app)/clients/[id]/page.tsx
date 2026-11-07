'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Circle, FileText, FolderKanban, Globe, Mail, Plus, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { AuditEvent, Client, Membership } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';
import { formatDate, formatMoney } from '@/lib/utils';
import { toast } from 'sonner';
const contactSchema = z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().optional(), jobTitle: z.string().optional() });
export default function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { org, isManagement, isClient } = useAuth();
  const [contactOpen, setContactOpen] = useState(false); const [inviteOpen, setInviteOpen] = useState(false); const [inviteUrl, setInviteUrl] = useState(''); const [editNotes, setEditNotes] = useState(false);
  const q = useQuery({ queryKey: ['client', id, org?.id], queryFn: () => api<Client>(`/clients/${id}`), enabled: !!org });
  const activity = useQuery({ queryKey: ['client-activity', id], queryFn: () => api<AuditEvent[]>(`/clients/${id}/activity`), enabled: !!org && !isClient });
  const members = useQuery({ queryKey: ['members', org?.id], queryFn: () => api<Membership[]>('/memberships'), enabled: !!org && isManagement });
  const contactForm = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema) });
  const inviteForm = useForm({ defaultValues: { email: '', role: 'CLIENT' } });
  const addContact = useToastMutation({ mutationFn: (d: z.infer<typeof contactSchema>) => api(`/clients/${id}/contacts`, { method: 'POST', body: JSON.stringify(d) }), success: 'Contact added', invalidate: [['client', id]], onSuccess: () => { setContactOpen(false); contactForm.reset(); } });
  const updateSteps = useToastMutation({ mutationFn: (steps: { key: string; label: string; done: boolean }[]) => api(`/clients/${id}/onboarding`, { method: 'PATCH', body: JSON.stringify({ steps }) }), success: 'Onboarding updated', invalidate: [['client', id]] });
  const updateClient = useToastMutation({ mutationFn: (data: Record<string, unknown>) => api(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }), success: 'Client updated', invalidate: [['client', id], ['clients']] });
  const invite = useToastMutation({ mutationFn: (d: { email: string; role: string }) => api<{ invitationUrl: string; emailDelivered: boolean }>('/memberships/invite', { method: 'POST', body: JSON.stringify({ ...d, clientId: id }) }), success: 'Invitation created', invalidate: [['invitations']], onSuccess: (r) => { setInviteUrl(r.invitationUrl); if (!r.emailDelivered) toast.info('Email not configured — share the invitation link manually.'); } });
  if (q.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64" /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data!; const steps = c.onboardingSteps ?? []; const done = steps.filter((s) => s.done).length;
  return <div>
    <PageHeader title={c.name} description={c.company || 'Client organization'} actions={<><StatusBadge status={c.status} />{isManagement && <><Button variant="outline" onClick={() => setInviteOpen(true)}><UserPlus />Invite to portal</Button><Button asChild><Link href={`/projects?clientId=${c.id}`}><FolderKanban />Projects</Link></Button></>}</>} />
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Tabs defaultValue="overview"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="projects">Projects ({c.projects?.length ?? 0})</TabsTrigger><TabsTrigger value="invoices">Invoices</TabsTrigger>{!isClient && <TabsTrigger value="activity">Activity</TabsTrigger>}</TabsList>
          <TabsContent value="overview" className="space-y-6">
            <Card><CardHeader><CardTitle>Onboarding</CardTitle><CardDescription>{done} of {steps.length} steps complete</CardDescription></CardHeader><CardContent><Progress value={steps.length ? done / steps.length * 100 : 0} className="mb-4" /><div className="space-y-2">{steps.map((s, i) => <button key={s.key} disabled={!isManagement} onClick={() => updateSteps.mutate(steps.map((x, j) => j === i ? { ...x, done: !x.done } : x))} className="flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm hover:bg-muted/40 disabled:cursor-default">{s.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}<span className={s.done ? 'line-through text-muted-foreground' : ''}>{s.label}</span></button>)}</div></CardContent></Card>
            <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Contacts</CardTitle><CardDescription>People at this client</CardDescription></div>{isManagement && <Button size="sm" variant="outline" onClick={() => setContactOpen(true)}><Plus />Add contact</Button>}</CardHeader><CardContent className="space-y-2">{c.contacts.length === 0 ? <p className="text-sm text-muted-foreground">No contacts yet.</p> : c.contacts.map((ct) => <div key={ct.id} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium text-sm">{ct.name} {ct.isPrimary && <span className="ml-1 text-xs text-primary">Primary</span>}</p><p className="text-xs text-muted-foreground">{ct.jobTitle || 'Contact'}</p></div><a href={`mailto:${ct.email}`} className="flex items-center gap-1 text-sm text-primary hover:underline"><Mail className="h-4 w-4" />{ct.email}</a></div>)}</CardContent></Card>
          </TabsContent>
          <TabsContent value="projects"><Card><CardContent className="pt-5 space-y-2">{!c.projects?.length ? <p className="text-sm text-muted-foreground">No projects for this client.</p> : c.projects.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40"><div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">Due {formatDate(p.dueDate)} · {p._count?.tasks ?? 0} tasks</p></div><StatusBadge status={p.status} /></Link>)}</CardContent></Card></TabsContent>
          <TabsContent value="invoices"><Card><CardContent className="pt-5 space-y-2">{!c.invoices?.length ? <p className="text-sm text-muted-foreground">No invoices.</p> : c.invoices.map((i) => <Link key={i.id} href={`/billing/${i.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40"><div><p className="font-medium">{i.number}</p><p className="text-xs text-muted-foreground">Due {formatDate(i.dueDate)}</p></div><div className="flex items-center gap-3"><span className="font-medium">{formatMoney(i.total, i.currency)}</span><StatusBadge status={i.status} /></div></Link>)}</CardContent></Card></TabsContent>
          {!isClient && <TabsContent value="activity"><Card><CardContent className="pt-5 space-y-3">{activity.data?.length ? activity.data.map((a) => <div key={a.id} className="border-l-2 border-primary/30 pl-3 text-sm"><p className="font-medium">{a.action.replace(/[._]/g, ' ')}</p><p className="text-xs text-muted-foreground">{a.actor?.name ?? 'System'} · {new Date(a.createdAt).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No recorded activity.</p>}</CardContent></Card></TabsContent>}
        </Tabs>
      </div>
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Account manager</span><span className="font-medium">{c.accountManager?.name ?? 'Unassigned'}</span></div>{isManagement && <Select value={c.accountManagerId ?? 'none'} onValueChange={(v) => updateClient.mutate({ name: c.name, accountManagerId: v === 'none' ? undefined : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{members.data?.filter((m) => m.role !== 'CLIENT').map((m) => <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>)}</SelectContent></Select>}{c.website && <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="h-4 w-4" />{c.website.replace(/^https?:\/\//, '')}</a>}<div className="grid grid-cols-3 gap-2 pt-2 text-center"><div className="rounded-md bg-muted p-2"><p className="text-lg font-semibold">{c._count?.projects ?? 0}</p><p className="text-xs text-muted-foreground">Projects</p></div><div className="rounded-md bg-muted p-2"><p className="text-lg font-semibold">{c._count?.tickets ?? 0}</p><p className="text-xs text-muted-foreground">Tickets</p></div><div className="rounded-md bg-muted p-2"><p className="text-lg font-semibold">{c._count?.invoices ?? 0}</p><p className="text-xs text-muted-foreground">Invoices</p></div></div></CardContent></Card>
        {!isClient && <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Notes</CardTitle>{isManagement && <Button size="sm" variant="ghost" onClick={() => setEditNotes(!editNotes)}>{editNotes ? 'Cancel' : 'Edit'}</Button>}</CardHeader><CardContent>{editNotes ? <form method="post" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateClient.mutate({ name: c.name, notes: String(fd.get('notes') || '') }, { onSuccess: () => setEditNotes(false) }); }} className="space-y-2"><Textarea name="notes" defaultValue={c.notes ?? ''} /><Button size="sm" type="submit" loading={updateClient.isPending}>Save notes</Button></form> : <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.notes || 'No notes.'}</p>}</CardContent></Card>}
        <Card><CardHeader><CardTitle>Documents</CardTitle></CardHeader><CardContent className="space-y-2">{!c.documents?.length ? <p className="text-sm text-muted-foreground">No documents.</p> : c.documents.slice(0, 5).map((d) => <div key={d.id} className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-muted-foreground" /><span className="truncate">{d.name}</span></div>)}<Button asChild variant="outline" size="sm" className="mt-2"><Link href={`/documents?clientId=${c.id}`}>Manage documents</Link></Button></CardContent></Card>
      </div>
    </div>
    <Dialog open={contactOpen} onOpenChange={setContactOpen}><DialogContent><DialogHeader><DialogTitle>Add contact</DialogTitle></DialogHeader><form method="post" onSubmit={contactForm.handleSubmit((d) => addContact.mutate(d))} className="space-y-4"><FormField label="Name" required><Input {...contactForm.register('name')} /></FormField><FormField label="Email" required><Input type="email" {...contactForm.register('email')} /></FormField><div className="grid grid-cols-2 gap-4"><FormField label="Phone"><Input {...contactForm.register('phone')} /></FormField><FormField label="Job title"><Input {...contactForm.register('jobTitle')} /></FormField></div><DialogFooter><Button type="submit" loading={addContact.isPending}>Add contact</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={inviteOpen} onOpenChange={(v) => { setInviteOpen(v); if (!v) setInviteUrl(''); }}><DialogContent><DialogHeader><DialogTitle>Invite client to portal</DialogTitle></DialogHeader>{inviteUrl ? <div className="space-y-3 text-sm"><p>Share this one-time link (expires in 7 days):</p><Input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} /><Button variant="outline" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Copied'); }}>Copy link</Button></div> : <form method="post" onSubmit={inviteForm.handleSubmit((d) => invite.mutate(d))} className="space-y-4"><FormField label="Email" required><Input type="email" {...inviteForm.register('email')} /></FormField><p className="text-xs text-muted-foreground">The invitee receives CLIENT access scoped to {c.name} only.</p><DialogFooter><Button type="submit" loading={invite.isPending}>Create invitation</Button></DialogFooter></form>}</DialogContent></Dialog>
  </div>;
}

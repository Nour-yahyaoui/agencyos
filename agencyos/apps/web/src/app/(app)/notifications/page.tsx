'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck, CreditCard, Calendar, LifeBuoy, FolderKanban, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Notification } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
const icons: Record<string, typeof Bell> = { PAYMENT: CreditCard, DEADLINE: Calendar, SUPPORT: LifeBuoy, PROJECT_ACTIVITY: FolderKanban, INVITATION: Mail, GENERAL: Bell };
export default function NotificationsPage() {
  const { org } = useAuth();
  const q = useQuery({ queryKey: ['notifications-all', org?.id], queryFn: () => api<Notification[]>('/notifications'), enabled: !!org, refetchInterval: 30000 });
  const readAll = useToastMutation({ mutationFn: () => api('/notifications/read-all', { method: 'PATCH', body: '{}' }), success: 'All marked as read', invalidate: [['notifications-all'], ['notifications']] });
  const read = useToastMutation({ mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'PATCH', body: '{}' }), invalidate: [['notifications-all'], ['notifications']] });
  const unread = q.data?.filter((n) => !n.readAt).length ?? 0;
  return <div><PageHeader title="Notifications" description={`${unread} unread · in-app notifications are stored in PostgreSQL.`} actions={<Button variant="outline" onClick={() => readAll.mutate()} loading={readAll.isPending} disabled={!unread}><CheckCheck />Mark all read</Button>} />
    {q.isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState icon={Bell} title="No notifications" description="Assignments, deadlines, payments, and support updates will appear here." /> : <Card className="divide-y">{q.data.map((n) => { const Icon = icons[n.type] ?? Bell; const body = <div className={cn('flex items-start gap-3 p-4', !n.readAt && 'bg-primary/[0.03]')}><div className={cn('rounded-md p-2', n.readAt ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-medium text-sm">{n.title}</p>{!n.readAt && <Badge>New</Badge>}</div><p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p></div>{!n.readAt && <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); read.mutate(n.id); }}>Mark read</Button>}</div>; return n.link ? <Link key={n.id} href={n.link} className="block hover:bg-muted/30" onClick={() => !n.readAt && read.mutate(n.id)}>{body}</Link> : <div key={n.id}>{body}</div>; })}</Card>}
  </div>;
}

'use client';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Send, Ban, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { IntegrationStatus, Invoice } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatDate, formatMoney } from '@/lib/utils';
export default function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { org, isManagement, isClient } = useAuth(); const [voidOpen, setVoidOpen] = useState(false);
  const q = useQuery({ queryKey: ['invoice', id, org?.id], queryFn: () => api<Invoice>(`/billing/invoices/${id}`), enabled: !!org });
  const status = useQuery({ queryKey: ['integrations', org?.id], queryFn: () => api<IntegrationStatus>('/integrations/status'), enabled: !!org && isManagement, retry: false });
  const invalidate = [['invoice', id], ['invoices'], ['dashboard'], ['notifications']];
  const send = useToastMutation({ mutationFn: () => api(`/billing/invoices/${id}/send`, { method: 'POST', body: '{}' }), success: 'Invoice sent to client portal', invalidate });
  const voidInv = useToastMutation({ mutationFn: () => api(`/billing/invoices/${id}/void`, { method: 'POST', body: '{}' }), success: 'Invoice voided', invalidate, onSuccess: () => setVoidOpen(false) });
  const checkout = useToastMutation({ mutationFn: () => api<{ checkoutUrl: string }>(`/billing/invoices/${id}/checkout`, { method: 'POST', body: '{}' }), invalidate, onSuccess: (r) => { if (r.checkoutUrl) window.location.href = r.checkoutUrl; } });
  if (q.isLoading) return <Skeleton className="h-96" />; if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const i = q.data!; const canPay = ['SENT', 'OVERDUE'].includes(i.status); const stripeConfigured = status.data?.stripe.configured;
  return <div><PageHeader title={i.number} description={`${i.client.name}${i.project ? ` · ${i.project.name}` : ''}`} actions={<><StatusBadge status={i.status} />{isManagement && i.status === 'DRAFT' && <Button onClick={() => send.mutate()} loading={send.isPending}><Send />Send to client</Button>}{isManagement && ['DRAFT', 'SENT', 'OVERDUE'].includes(i.status) && <Button variant="outline" onClick={() => setVoidOpen(true)}><Ban />Void</Button>}{canPay && <Button onClick={() => checkout.mutate()} loading={checkout.isPending} disabled={isManagement && status.isSuccess && !stripeConfigured}><CreditCard />Pay with Stripe</Button>}</>} />
    {canPay && isManagement && status.isSuccess && !stripeConfigured && <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable test checkout. No payment will be simulated.</div>}
    {canPay && isClient && <div className="mb-4 rounded-md border border-info/30 bg-info/10 p-3 text-sm text-info">Payment uses Stripe Checkout. If the agency has not configured Stripe, checkout is unavailable and no charge is made.</div>}
    <div className="grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Line items</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{i.items.map((it, idx) => <TableRow key={idx}><TableCell>{it.description}</TableCell><TableCell className="text-right">{it.quantity}</TableCell><TableCell className="text-right">{formatMoney(it.unitPrice, i.currency)}</TableCell><TableCell className="text-right">{formatMoney(it.amount ?? Number(it.quantity) * Number(it.unitPrice), i.currency)}</TableCell></TableRow>)}</TableBody></Table><div className="mt-4 ml-auto max-w-xs space-y-1 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(i.subtotal, i.currency)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Tax ({Number(i.taxRate)}%)</span><span>{formatMoney(i.taxAmount, i.currency)}</span></div><div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatMoney(i.total, i.currency)}</span></div></div>{i.notes && <p className="mt-6 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{i.notes}</p>}</CardContent></Card>
      <div className="space-y-6"><Card><CardHeader><CardTitle>Details</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span>{formatDate(i.issueDate)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className={i.status === 'OVERDUE' ? 'text-destructive font-medium' : ''}>{formatDate(i.dueDate)}</span></div>{i.paidAt && <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-success font-medium">{formatDate(i.paidAt)}</span></div>}{i.project?.budget && !isClient && <div className="flex justify-between"><span className="text-muted-foreground">Project budget</span><span>{formatMoney(i.project.budget, i.currency)}</span></div>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Payment history</CardTitle></CardHeader><CardContent className="space-y-2">{i.payments?.length ? i.payments.map((p) => <div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><div><p className="font-medium">{formatMoney(p.amount, p.currency)}</p><p className="text-xs text-muted-foreground">{p.provider} · {formatDate(p.createdAt)}{(p.metadata as Record<string, unknown> | null | undefined)?.seed ? ' · seed data' : ''}</p></div><StatusBadge status={p.status} /></div>) : <p className="text-sm text-muted-foreground">No payments recorded.</p>}{i.status === 'PAID' && <div className="flex items-center gap-2 rounded-md bg-success/10 p-3 text-sm text-success"><CheckCircle2 className="h-4 w-4" />Paid in full</div>}</CardContent></Card></div></div>
    <ConfirmDialog open={voidOpen} onOpenChange={setVoidOpen} title="Void invoice?" description="Voided invoices cannot be paid. This does not refund existing payments." confirmLabel="Void invoice" destructive loading={voidInv.isPending} onConfirm={() => voidInv.mutate()} />
  </div>;
}

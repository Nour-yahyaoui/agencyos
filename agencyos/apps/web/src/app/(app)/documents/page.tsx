'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, Upload, Download, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { useToastMutation } from '@/hooks/use-mutation-toast';
import type { Document } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
function DocumentsInner() {
  const { org, isClient, user } = useAuth(); const params = useSearchParams(); const clientId = params.get('clientId') || ''; const [deleteId, setDeleteId] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['documents', org?.id, clientId], queryFn: () => api<Document[]>(`/documents${clientId ? `?clientId=${clientId}` : ''}`), enabled: !!org });
  const upload = useToastMutation({ mutationFn: (file: File) => { const fd = new FormData(); fd.append('file', file); if (clientId) fd.append('clientId', clientId); return api('/documents/upload', { method: 'POST', body: fd }); }, success: 'Uploaded', invalidate: [['documents']] });
  const del = useToastMutation({ mutationFn: (id: string) => api(`/documents/${id}`, { method: 'DELETE' }), success: 'Document deleted', invalidate: [['documents']], onSuccess: () => setDeleteId(null) });
  const download = async (id: string, name: string) => { try { const res = await fetch(`/api/v1/documents/${id}/download`, { credentials: 'include', headers: { 'x-organization-id': org!.id } }); if (!res.ok) throw new Error('Download failed'); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); } catch (e) { toast.error(e instanceof Error ? e.message : 'Download failed'); } };
  return <div><PageHeader title="Documents" description="Secure file management with organization-scoped access and authenticated downloads." actions={<label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"><Upload className="h-4 w-4" />{upload.isPending ? 'Uploading…' : 'Upload file'}<input type="file" className="hidden" disabled={upload.isPending} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} /></label>} />
    {q.isLoading ? <Skeleton className="h-64" /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState icon={FileText} title="No documents" description="Upload PDFs, images, text, CSV, ZIP, or Office files up to 10 MB. Files are stored locally in development or in S3 when configured." /> : <Card><Table hideBelow={{ md: [2, 4, 5, 6] }}><TableHeader><TableRow><TableHead>File</TableHead><TableHead>Scope</TableHead><TableHead>Size</TableHead><TableHead>Storage</TableHead><TableHead>Uploaded by</TableHead><TableHead>Date</TableHead><TableHead /></TableRow></TableHeader><TableBody>{q.data.map((d) => <TableRow key={d.id}><TableCell className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 text-muted-foreground" />{d.name}</TableCell><TableCell className="text-sm text-muted-foreground">{d.project?.name ?? d.client?.name ?? 'Organization'}</TableCell><TableCell>{(d.sizeBytes / 1024).toFixed(1)} KB</TableCell><TableCell><Badge variant={d.provider === 'S3' ? 'info' : 'secondary'}>{d.provider}</Badge></TableCell><TableCell className="text-sm">{d.uploadedBy.name}</TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(d.createdAt)}</TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => download(d.id, d.name)} aria-label="Download"><Download /></Button>{(!isClient || d.uploadedBy.id === user?.id) && <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)} aria-label="Delete"><Trash2 /></Button>}</div></TableCell></TableRow>)}</TableBody></Table></Card>}
    <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Delete document?" description="The file and its metadata will be permanently removed." confirmLabel="Delete" destructive loading={del.isPending} onConfirm={() => deleteId && del.mutate(deleteId)} />
  </div>;
}
export default function DocumentsPage() { return <Suspense><DocumentsInner /></Suspense>; }

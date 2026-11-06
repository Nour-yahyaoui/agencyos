'use client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', destructive, loading, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string; confirmLabel?: string; destructive?: boolean; loading?: boolean; onConfirm: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant={destructive ? 'destructive' : 'default'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></DialogFooter></DialogContent></Dialog>;
}

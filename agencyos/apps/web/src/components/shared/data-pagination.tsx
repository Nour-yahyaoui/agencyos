'use client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export function DataPagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (p: number) => void }) {
  return <div className="flex items-center justify-between px-1 pt-3 text-sm text-muted-foreground"><span>{total} result{total === 1 ? '' : 's'} · Page {page} of {totalPages}</span><div className="flex gap-1"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft />Previous</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next<ChevronRight /></Button></div></div>;
}

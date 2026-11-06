'use client';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"><AlertTriangle className="mb-3 h-8 w-8 text-destructive" /><h3 className="font-semibold">Unable to load data</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>{onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}><RefreshCw />Try again</Button>}</div>;
}

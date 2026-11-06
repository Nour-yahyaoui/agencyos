import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
export function FormField({ label, error, hint, required, children, className }: { label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  const id = React.useId();
  const child = React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>, { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined }) : children;
  return <div className={cn('space-y-1.5', className)}><Label htmlFor={id}>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>{child}{hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}{error && <p id={`${id}-error`} className="text-xs text-destructive" role="alert">{error}</p>}</div>;
}

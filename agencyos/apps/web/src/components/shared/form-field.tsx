import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Label above the field, hint or error below it, wired with `aria-describedby`.
 * Pass `htmlFor` when the control needs a stable id (autofocus, external labels); otherwise one
 * is generated and cloned onto the child.
 */
export function FormField({
  label,
  error,
  hint,
  required,
  optional,
  htmlFor,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const generated = React.useId();
  const id = htmlFor ?? generated;
  // With an explicit `htmlFor` the caller owns the wiring — cloning would put the id on a
  // wrapper element (e.g. a password field with a reveal button) instead of the input.
  const child =
    !htmlFor && React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>, {
          id,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
        })
      : children;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ms-1 font-normal text-ink-faint">(optional)</span>}
        {required && !optional && <span className="ms-0.5 text-danger">*</span>}
      </Label>
      {child}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

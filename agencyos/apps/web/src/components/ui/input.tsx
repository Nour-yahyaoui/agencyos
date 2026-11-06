import * as React from 'react';
import { cn } from '@/lib/utils';

/** 16px on phones so iOS doesn't zoom the viewport on focus; 14px from `sm` up. */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-sm border border-input bg-surface px-3 py-2 text-base transition-colors duration-fast sm:h-9 sm:text-sm',
        'placeholder:text-ink-faint focus-ring disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
export { Input };

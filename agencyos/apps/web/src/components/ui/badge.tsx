import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const badgeVariants = cva('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors', {
  variants: { variant: { default: 'border-transparent bg-primary/10 text-primary', secondary: 'border-transparent bg-secondary text-secondary-foreground', success: 'border-transparent bg-emerald-100 text-emerald-700', warning: 'border-transparent bg-amber-100 text-amber-700', destructive: 'border-transparent bg-red-100 text-red-700', outline: 'text-foreground', info: 'border-transparent bg-sky-100 text-sky-700', purple: 'border-transparent bg-violet-100 text-violet-700' } },
  defaultVariants: { variant: 'default' },
});
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) { return <div className={cn(badgeVariants({ variant }), className)} {...props} />; }
export { Badge, badgeVariants };

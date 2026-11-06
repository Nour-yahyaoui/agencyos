import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** Tinted background + stronger text of the same hue. Never a saturated solid fill. */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-accent/20 bg-accent-soft text-accent',
        secondary: 'border-border bg-sunken text-ink-muted',
        success: 'border-success/20 bg-success/10 text-success',
        warning: 'border-warning/25 bg-warning/10 text-warning',
        destructive: 'border-danger/25 bg-danger/10 text-danger',
        info: 'border-info/20 bg-info/10 text-info',
        outline: 'border-border text-ink-muted',
        purple: 'border-info/20 bg-info/10 text-info',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };

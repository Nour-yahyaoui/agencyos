import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * Three parts: what this is, why it is empty, and the one next action.
 * `variant="filtered"` changes the framing so a filtered-out list never reads like a first use.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'first-use',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: 'first-use' | 'filtered';
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-6',
        variant === 'first-use' && 'border-dashed',
        className,
      )}
    >
      <Icon className="h-5 w-5 text-ink-faint" strokeWidth={1.5} aria-hidden />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mt-1 max-w-prose text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

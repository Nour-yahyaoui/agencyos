import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * A single figure on a plain panel. Kept for the secondary pages; the dashboard uses
 * `MetricLedger` instead, which reads as one strip rather than six competing tiles.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <div className={cn('rounded-md border border-border bg-surface p-4', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-ink-faint" strokeWidth={1.5} aria-hidden />}
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
      <p data-figure className="mt-2 font-mono text-2xl font-medium leading-none tracking-tight">
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            'mt-2 text-xs',
            trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-ink-faint',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

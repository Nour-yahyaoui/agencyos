import { cn } from '@/lib/utils';

/** Decorative by default: the region carrying `aria-busy` is what assistive tech should read. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton', className)} {...props} />;
}

/** Mirrors a real table row so the swap to data causes no layout shift. */
export function RowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex h-12 items-center gap-4 border-b border-border px-4" aria-hidden>
      <div className="skeleton h-4 w-4 rounded-xs" />
      <div className="skeleton h-4 flex-1 max-w-56" />
      {Array.from({ length: Math.max(0, columns - 2) }).map((_, i) => (
        <div key={i} className="skeleton hidden h-4 w-24 sm:block" />
      ))}
      <div className="skeleton ms-auto h-5 w-16 rounded-xs" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div aria-busy="true" className="rounded-md border border-border bg-surface">
      <div className="flex h-10 items-center gap-4 border-b border-border bg-sunken/60 px-4" aria-hidden>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <RowSkeleton key={i} columns={columns} />
      ))}
      <span className="sr-only" role="status">
        Loading rows
      </span>
    </div>
  );
}

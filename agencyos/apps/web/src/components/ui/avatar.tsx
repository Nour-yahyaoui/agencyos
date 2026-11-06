import { cn, initials } from '@/lib/utils';

/** Quiet, deterministic, and readable in both themes — no gradient, no per-user rainbow. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      title={name}
      aria-hidden
      className={cn(
        'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border border-border bg-accent-soft font-mono text-[11px] font-medium text-accent',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

import { cn, initials } from '@/lib/utils';
export function Avatar({ name, className }: { name: string; className?: string }) {
  return <div title={name} className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white', className)}>{initials(name)}</div>;
}

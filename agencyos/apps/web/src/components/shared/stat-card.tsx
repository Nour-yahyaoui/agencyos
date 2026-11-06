import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
export function StatCard({ label, value, hint, icon: Icon, trend, className }: { label: string; value: React.ReactNode; hint?: string; icon: LucideIcon; trend?: 'up' | 'down' | 'neutral'; className?: string }) {
  return <Card className={className}><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>{hint && <p className={cn('mt-1 text-xs', trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground')}>{hint}</p>}</div><div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div></div></CardContent></Card>;
}

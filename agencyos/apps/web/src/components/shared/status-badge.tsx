import { Badge } from '@/components/ui/badge';
import { titleCase } from '@/lib/utils';
const map: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'purple' | 'outline'> = {
  ACTIVE: 'success', COMPLETED: 'success', PAID: 'success', DONE: 'success', RESOLVED: 'success', SUCCEEDED: 'success',
  ONBOARDING: 'info', PLANNED: 'info', SENT: 'info', IN_PROGRESS: 'info', REVIEW: 'purple', WAITING_CLIENT: 'warning', OPEN: 'warning', TRIALING: 'info',
  ON_HOLD: 'warning', OVERDUE: 'destructive', URGENT: 'destructive', HIGH: 'warning', PAST_DUE: 'destructive', FAILED: 'destructive',
  ARCHIVED: 'secondary', VOID: 'secondary', CLOSED: 'secondary', CANCELED: 'secondary', DRAFT: 'secondary', BACKLOG: 'secondary', TODO: 'outline', LEAD: 'purple', LOW: 'secondary', MEDIUM: 'outline',
};
export function StatusBadge({ status, className }: { status: string; className?: string }) { return <Badge variant={map[status] ?? 'secondary'} className={className}>{titleCase(status)}</Badge>; }

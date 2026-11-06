import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface Metric {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Exactly one metric per ledger should be flagged; it gets the accent underline. */
  attention?: boolean;
  href?: string;
}

/**
 * The signature element.
 *
 * A ruled strip of tabular figures rather than a row of shadowed KPI cards: the numbers are the
 * content, so the chrome gets out of the way. Two rules, generous gutters, and one accent
 * underline on the figure that needs attention. Everything else on the page stays quiet.
 */
export function MetricLedger({ metrics, className }: { metrics: Metric[]; className?: string }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-5 sm:grid-cols-3 sm:gap-x-8 xl:grid-cols-6',
        className,
      )}
    >
      {metrics.map((metric) => {
        const body = (
          <>
            <dt className="text-xs text-ink-muted">{metric.label}</dt>
            <dd
              data-figure
              className={cn(
                'mt-1.5 inline-block font-mono text-[21px] font-medium leading-none tracking-tight text-ink sm:text-[25px]',
                metric.attention && 'border-b-2 border-accent pb-1.5',
              )}
            >
              {metric.value}
            </dd>
            {metric.hint && <p className="mt-2 text-xs text-ink-faint">{metric.hint}</p>}
          </>
        );
        return metric.href ? (
          <Link key={metric.label} href={metric.href} className="group block rounded-xs">
            <span className="block transition-colors duration-fast group-hover:[&_dt]:text-ink">{body}</span>
          </Link>
        ) : (
          <div key={metric.label}>{body}</div>
        );
      })}
    </dl>
  );
}

/** Matches the ledger's cell geometry so loading causes no layout shift. */
export function MetricLedgerSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-5 sm:grid-cols-3 sm:gap-x-8 xl:grid-cols-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-7 w-16" />
          <div className="skeleton h-3 w-24" />
        </div>
      ))}
      <span className="sr-only" role="status">
        Loading metrics
      </span>
    </div>
  );
}

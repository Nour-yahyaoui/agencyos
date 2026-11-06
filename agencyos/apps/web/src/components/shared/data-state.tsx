'use client';

import * as React from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState } from '@/components/ui/error-state';

/**
 * One wrapper for the four states every data view owes the user: loading, error, empty, ready.
 *
 * While refetching, the previous data stays on screen (dimmed, with a thin progress rule) rather
 * than blanking to a skeleton — a refresh should never look like a navigation.
 */
export function DataState<T>({
  query,
  skeleton,
  empty,
  isEmpty,
  children,
}: {
  query: Pick<UseQueryResult<T>, 'isPending' | 'isError' | 'isFetching' | 'error' | 'data' | 'refetch'>;
  skeleton: React.ReactNode;
  empty: React.ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending) return <>{skeleton}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data as T;
  const nothing = isEmpty ? isEmpty(data) : Array.isArray(data) ? data.length === 0 : data == null;
  if (nothing) return <>{empty}</>;

  return (
    <div className="relative" aria-busy={query.isFetching || undefined}>
      {query.isFetching && (
        <span aria-hidden className="absolute inset-x-0 -top-px h-0.5 overflow-hidden rounded-full bg-accent/20">
          <span className="block h-full w-1/3 animate-[skeleton-sweep_1.2s_var(--ease-out)_infinite] bg-accent" />
        </span>
      )}
      <div className={query.isFetching ? 'opacity-70 transition-opacity duration-base' : 'transition-opacity duration-base'}>
        {children(data)}
      </div>
    </div>
  );
}

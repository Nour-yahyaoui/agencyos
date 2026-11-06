'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** Turns a thrown error into "what happened + what to do", never a raw code on its own. */
function explain(error: unknown): { title: string; hint: string; offline: boolean; reference?: string } {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { title: 'You are offline', hint: 'Reconnect and try again. Nothing you entered has been lost.', offline: true };
  }
  if (error instanceof ApiError) {
    if (error.status === 403) return { title: 'You do not have access to this', hint: 'Ask a workspace owner to grant you permission, then reload.', offline: false };
    if (error.status === 404) return { title: 'This no longer exists', hint: 'It may have been deleted or moved to another workspace.', offline: false };
    if (error.status === 429) return { title: 'Too many requests', hint: 'Wait a moment before trying again.', offline: false };
    if (error.status >= 500) return { title: 'The server could not complete this', hint: 'This is on our side. Try again in a few seconds.', offline: false, reference: error.code };
    return { title: 'Could not load this', hint: error.message, offline: false, reference: error.code };
  }
  return { title: 'Could not reach the server', hint: 'Check your connection and try again.', offline: true };
}

export function ErrorState({
  error,
  onRetry,
  retrying,
  title,
  hint,
  className,
  compact,
}: {
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  hint?: string;
  className?: string;
  compact?: boolean;
}) {
  const derived = explain(error);
  const Icon = derived.offline ? WifiOff : AlertTriangle;
  const [showDetails, setShowDetails] = React.useState(false);
  const raw = error instanceof Error ? error.message : undefined;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-md border border-border bg-surface',
        compact ? 'p-4' : 'p-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-danger" strokeWidth={1.5} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title ?? derived.title}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{hint ?? derived.hint}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 ps-8">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} loading={retrying}>
            {!retrying && <RefreshCw aria-hidden />}
            {retrying ? 'Retrying…' : 'Try again'}
          </Button>
        )}
        {(derived.reference || raw) && (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-ink-faint underline-offset-4 hover:text-ink-muted hover:underline"
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide details' : 'Details'}
          </button>
        )}
      </div>
      {showDetails && (
        <pre className="ms-8 max-w-full overflow-x-auto rounded-sm bg-sunken px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-muted">
          {derived.reference ? `${derived.reference}\n` : ''}
          {raw}
        </pre>
      )}
    </div>
  );
}

import { cn } from '@/lib/utils';

const GITHUB_URL = 'https://github.com/nour-yahyaoui';

/** Inline mark: lucide deprecated its brand icons, and a footer does not need an icon library. */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * Persistent footer. Quiet by design: one hairline, small type, and the two links a visitor
 * actually wants — who built this, and where the API contract lives.
 */
export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'mt-auto flex flex-col gap-3 border-t border-border px-4 py-5 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8',
        className,
      )}
    >
      <p>
        AgencyOS — built by{' '}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-ink underline-offset-4 hover:text-accent hover:underline"
        >
          Nour Yahyaoui
        </a>
      </p>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-8 items-center gap-2 underline-offset-4 transition-colors duration-fast hover:text-accent hover:underline"
        >
          <GitHubMark className="h-4 w-4" />
          GitHub profile
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <a
          href="https://agencyos-api-kappa.vercel.app/api/docs"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-8 items-center underline-offset-4 transition-colors duration-fast hover:text-accent hover:underline"
        >
          API reference
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </nav>
    </footer>
  );
}

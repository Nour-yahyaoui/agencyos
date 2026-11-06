import Link from 'next/link';
import { AppFooter } from '@/components/layout/app-footer';
import { ThemeToggle } from '@/components/theme/theme';

/**
 * Shared frame for sign-in, registration, and password recovery.
 *
 * An ink panel carries the identity and three facts about what the product tracks; the form
 * sits on paper beside it. On a phone the panel collapses to a compact header so the form is
 * above the fold with the keyboard open.
 */
export function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="relative flex shrink-0 flex-col justify-between gap-8 bg-rail px-6 py-6 [color-scheme:dark] lg:w-[42%] lg:max-w-xl lg:px-12 lg:py-12">
        <Link href="/" className="inline-flex items-center gap-2.5 self-start">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent font-mono text-sm font-semibold text-accent-contrast">
            A
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">AgencyOS</span>
        </Link>

        <div className="hidden lg:block">
          <h2 className="max-w-sm text-2xl font-semibold leading-snug text-white">
            What is late, and what is unpaid.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-rail-muted">
            One workspace for client delivery, project tracking, and invoicing — scoped per organisation, with a
            separate portal for your clients.
          </p>
          <dl className="mt-10 max-w-sm border-t border-rail-border">
            {[
              ['Delivery', 'Kanban, dependencies, milestones, overdue detection'],
              ['Finance', 'Invoices, Stripe payments, outstanding balances'],
              ['Access', 'Role-scoped teams and a read-mostly client portal'],
            ].map(([term, detail]) => (
              <div key={term} className="flex gap-6 border-b border-rail-border py-3">
                <dt className="w-20 shrink-0 text-sm font-medium text-white">{term}</dt>
                <dd className="text-sm leading-relaxed text-rail-muted">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="hidden text-xs text-rail-muted lg:block">
          Built by{' '}
          <a href="https://github.com/nour-yahyaoui" target="_blank" rel="noreferrer noopener" className="text-rail-text underline-offset-4 hover:text-accent hover:underline">
            Nour Yahyaoui
          </a>
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end px-4 pt-4 sm:px-6">
          <ThemeToggle />
        </div>
        <main id="main" className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
        <AppFooter />
      </div>
    </div>
  );
}

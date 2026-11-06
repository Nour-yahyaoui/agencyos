import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AppFooter } from '@/components/layout/app-footer';
import { ThemeToggle } from '@/components/theme/theme';

const LEDGER = [
  ['Active projects', '2', '4 total'],
  ['Completion', '29%', 'Tasks completed'],
  ['Overdue', '2', 'Past their due date'],
  ['Outstanding', '$38,880', 'Unpaid invoices'],
];

const CAPABILITIES: [string, string][] = [
  ['Client delivery', 'Kanban boards, task dependencies, milestones, and automatic overdue detection across every project.'],
  ['Finance', 'Invoices with line items, Stripe payments with signature verification, subscriptions, and outstanding balances.'],
  ['Scoped access', 'Organisation-scoped queries, role-based permissions, and a separate portal where clients see only their own work.'],
  ['Analytics', 'Dashboard figures computed from live records: workload per member, completion rate, revenue by month.'],
];

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent font-mono text-sm font-semibold text-accent-contrast">
            A
          </span>
          <span className="text-[15px] font-semibold tracking-tight">AgencyOS</span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <ThemeToggle compact className="hidden sm:inline-flex" />
          <Link href="/login" className="inline-flex h-9 items-center rounded-sm px-3 text-sm font-medium text-ink-muted transition-colors duration-fast hover:bg-sunken hover:text-ink">
            Sign in
          </Link>
          <Link href="/register" className="inline-flex h-9 items-center rounded-sm bg-accent px-3.5 text-sm font-medium text-accent-contrast transition-colors duration-fast hover:bg-accent-hover">
            Create workspace
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        {/* Asymmetric: the claim on the left, the product's own figures on the right. */}
        <section className="grid gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
          <div className="max-w-xl">
            <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[42px]">
              What is late, and what is unpaid.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-ink-muted">
              AgencyOS keeps client delivery, project tracking, invoicing, and support in one workspace — with a
              separate portal so clients see their own projects and nothing else.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-sm bg-accent px-5 text-sm font-medium text-accent-contrast transition-colors duration-fast hover:bg-accent-hover"
              >
                Explore the demo
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/register"
                className="inline-flex h-11 items-center rounded-sm border border-border-strong bg-surface px-5 text-sm font-medium transition-colors duration-fast hover:bg-sunken"
              >
                Create a workspace
              </Link>
            </div>
            <p className="mt-5 text-xs text-ink-faint">
              Seeded demo data. Sign in as owner, manager, developer, client, or platform admin.
            </p>
          </div>

          {/* The signature, shown before sign-in so the product explains itself. */}
          <div className="rounded-md border border-border bg-surface p-5 sm:p-7">
            <p className="text-xs text-ink-muted">Northstar Studio · live workspace</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-5">
              {LEDGER.map(([label, value, hint], i) => (
                <div key={label}>
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd
                    data-figure
                    className={`mt-1.5 inline-block font-mono text-[21px] font-medium leading-none tracking-tight sm:text-[25px] ${i === 2 ? 'border-b-2 border-accent pb-1.5' : ''}`}
                  >
                    {value}
                  </dd>
                  <p className="mt-2 text-xs text-ink-faint">{hint}</p>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-ink-faint">
              Every figure is computed from the database, not hardcoded in the page.
            </p>
          </div>
        </section>

        {/* A definition list, not four icon cards. */}
        <section className="border-t border-border px-4 py-12 sm:px-8 sm:py-16">
          <h2 className="text-lg font-semibold tracking-tight">What it covers</h2>
          <dl className="mt-6 max-w-3xl divide-y divide-border border-t border-border">
            {CAPABILITIES.map(([term, detail]) => (
              <div key={term} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-8">
                <dt className="text-sm font-medium">{term}</dt>
                <dd className="text-sm leading-relaxed text-ink-muted">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-border px-4 py-10 sm:px-8">
          <h2 className="text-lg font-semibold tracking-tight">Under the hood</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
            Next.js App Router on the front, NestJS on the API, PostgreSQL via Prisma with row-level organisation
            scoping. Refresh-token rotation, CSRF protection on every mutation, and an OpenAPI contract generated
            from the running server. Deployed on Vercel against Neon.
          </p>
          <a
            href="https://agencyos-api-kappa.vercel.app/api/docs"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Read the API reference
            <ArrowUpRight className="h-4 w-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

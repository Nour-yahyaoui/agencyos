# AgencyOS

**One workspace for the business and delivery of digital agency work.** AgencyOS brings clients, projects, tasks, support, documents, billing and reporting together in a multi-tenant platform, with a dedicated client portal.



[Web app](https://agencyos-web-beryl.vercel.app) · [API documentation](https://agencyos-api-kappa.vercel.app/api/docs) · [Detailed project guide](agencyos/README.md) · [Architecture](agencyos/docs/ARCHITECTURE.md)

## What it does

- **Client and project management:** organize client relationships, projects and milestones.
- **Delivery:** track tasks and priorities with a Kanban workflow.
- **Client portal and support:** give clients a scoped view of their work and support requests.
- **Documents and billing:** manage documents, invoices and Stripe-backed payment flows when configured.
- **Team operations:** manage members, invitations, notifications and deadline reminders.
- **Insights and assistance:** review analytics and use the assistant when its provider is configured.

Integration-dependent features can be unavailable without their corresponding credentials. The assistant and billing integrations are designed to report that they are unavailable rather than fabricate results.

## Architecture

AgencyOS uses Next.js and React for the web application, NestJS for the API, and PostgreSQL with Prisma for persistence. The browser calls the same-origin `/api/v1` path; Next.js rewrites requests to the backend using `API_INTERNAL_URL`. The API includes organization scoping, role checks, cookie-based authentication and CSRF protection.

```text
Browser → Next.js web app → /api/v1 rewrite → NestJS API → PostgreSQL
                                               ├─ Stripe (optional)
                                               ├─ OpenAI (optional)
                                               ├─ Email (optional)
                                               └─ S3-compatible storage (optional)
```

The Vercel API variant uses a serverless handler and a scheduled reminder endpoint. Without S3-compatible storage, serverless uploads fall back to ephemeral `/tmp` storage and should not be relied on for durable files.

## Repository layout

| Path | Purpose |
| --- | --- |
| [`agencyos/apps/web`](agencyos/apps/web) | Next.js application. |
| [`agencyos/apps/api`](agencyos/apps/api) | NestJS API and Prisma migrations. |
| [`agencyos/apps/api-serverless`](agencyos/apps/api-serverless) | Vercel serverless API variant. |
| [`agencyos/docs`](agencyos/docs) | Architecture, testing and deployment documentation. |
| `deploy/` | Existing deployment staging snapshots and checksums. |

The application source was recovered from this repository's `main` branch and supplemented with the checked-in deployment snapshots. See the [application README](agencyos/README.md) for the full feature and setup guide. Its historical verification notes describe an earlier environment, not necessarily the current deployment.

## Quick start

Prerequisites: Node.js 20.19 or newer, npm and PostgreSQL. From the repository root:

```bash
cd agencyos
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# Create development and test databases and edit .env with the connection URLs.
# Generate distinct random JWT secrets of at least 32 characters.
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

The web app runs on port 3000 and the API on port 4000 by default. See the [detailed quickstart](agencyos/README.md#4-quickstart-local-no-docker) for database creation and demo setup. Do not point local seed or migration commands at a production database without review.

Useful checks from `agencyos/`:

```bash
npm run lint
npm run build
npm run test
npm run test:integration        # requires a test PostgreSQL database
npm run check:sync -w @agencyos/api-serverless
```

The API serverless source is a committed copy of the domain code in `apps/api`; run `npm run sync -w @agencyos/api-serverless` after changing shared API code, then check the resulting diff.

## Vercel deployment

The existing Vercel projects are `agencyos-web` and `agencyos-api`; the web project's configured backend URL points to the API alias. Their existing deployments are separate from this Git checkout. To connect the recovered source to these projects:

1. In each existing project's **Settings → Git**, connect `Nour-yahyaoui/agencyos` and select the intended production branch.
2. Set the web project's root directory to `agencyos/apps/web`, and the API project's root directory to `agencyos/apps/api-serverless`. Review each directory's `vercel.json` and package configuration, including the API's serverless framework and build settings.
3. Confirm environment variables in Vercel: the web app needs `API_INTERNAL_URL` and `NEXT_PUBLIC_API_URL=/api/v1`; the API needs `DATABASE_URL`, distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values, `COOKIE_SECURE=true` in production, and `WEB_URL` matching the allowed browser origin. Configure `CRON_SECRET` for reminders. Add optional provider credentials only when needed.
4. Test preview deployments before promoting production. Verify sign-in, API requests, database readiness at `/api/v1/health/ready`, CSRF-protected mutations, and enabled integrations. A single fixed `WEB_URL` may not allow mutations from arbitrary preview URLs; configure preview origins and databases deliberately.
5. Review and apply migrations separately; the serverless function does not run them automatically. Configure durable object storage if uploads must persist. Keep credentials out of source control.

The [serverless API notes](agencyos/apps/api-serverless/README.md) provide further details. Connecting Git can cause later commits to trigger deployments; keep working production deployments in place until builds and preview checks pass.

## Security and operations

Use separate development and production credentials and databases, strong unique JWT secrets, HTTPS and secure cookies in production. Back up the database before migrations and review external integrations and webhook configuration before enabling them. Do not expose secrets in issues, logs or pull requests.

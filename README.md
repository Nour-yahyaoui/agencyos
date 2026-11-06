# AgencyOS

**One workspace for the business and delivery of digital agency work.** AgencyOS brings clients, projects, tasks, support, documents, billing and reporting together in a multi-tenant platform, with a dedicated client portal.

[Open the web app](https://agencyos-web-beryl.vercel.app) · [API documentation](https://agencyos-api-kappa.vercel.app/api/docs) · [API health](https://agencyos-api-kappa.vercel.app/api/v1/health/ready)

> **Repository recovery needed:** this checkout is not currently a complete, buildable application. The `agencyos` entry is a Git submodule pointer, but this repository has no `.gitmodules` entry or accessible source for it. `deploy/` contains snapshots of parts of the deployed applications, not a complete development checkout. Restore the original source and build configuration before connecting Git to production deployments or following normal setup instructions.

## What it does

- **Client and project management:** organize agency relationships, project work and milestones.
- **Delivery:** track tasks and priorities, including a Kanban workflow.
- **Client portal and support:** give clients a scoped view of their work and support requests.
- **Documents and billing:** manage documents, invoices and Stripe-backed payment flows when configured.
- **Team operations:** manage members, invitations, notifications and deadline reminders.
- **Insights and assistance:** review analytics and use the assistant when its provider is configured.

Integration-dependent features can be unavailable without their corresponding credentials. The assistant and billing integrations are designed to report that they are unavailable rather than fabricate results.

## Architecture

The application snapshots describe a Next.js web frontend and a NestJS API backed by PostgreSQL through Prisma. The web app sends browser requests to the same-origin `/api/v1` path; Next.js rewrites them to the backend using `API_INTERNAL_URL`. The API includes organization scoping, role checks, cookie-based authentication and CSRF protection.

```text
Browser → Next.js web app → /api/v1 rewrite → NestJS API → PostgreSQL
                                               ├─ Stripe (optional)
                                               ├─ OpenAI (optional)
                                               ├─ Email (optional)
                                               └─ S3-compatible storage (optional)
```

The Vercel API variant uses a serverless handler and a scheduled reminder endpoint instead of a long-running HTTP server and in-process scheduler. Without S3-compatible storage, serverless uploads fall back to ephemeral `/tmp` storage and should not be relied on for durable files.

## Current repository contents

| Path | Purpose |
| --- | --- |
| `agencyos` | Git submodule pointer at `0f777eadf940ec63a20160225619da29cc4c17eb`; its source URL is missing from this repository. |
| `deploy/web-payload.json` | Snapshot of web source files, including the Next.js rewrite configuration. |
| `deploy/source-payload.json` | Snapshot of the serverless API source, Prisma schema and API-specific notes. |
| `deploy/*.csv`, `deploy/*.sha256` | Deployment staging artifacts and checksum files. |

The snapshots do **not** include all files needed to install, run or deploy the app, such as the application package manifests and complete deployment configuration. They should not be treated as a substitute for the original repository or assumed to match the currently deployed artifacts.

## Restore and develop

1. Locate the original application repository containing the commit referenced by the `agencyos` pointer, or obtain a complete source archive. Restore its submodule configuration or bring the complete source into this repository deliberately.
2. Verify that the source includes package manifests and lockfiles, the Prisma migrations, and the Vercel configuration for both applications. Review the recovered code against the deployed snapshots before replacing anything.
3. Follow the recovered project's setup instructions to install dependencies, configure a **non-production** PostgreSQL database and apply migrations. Do not run migrations or seed scripts against production without reviewing them first.
4. Configure local environment variables outside Git. The web snapshot documents `API_INTERNAL_URL`, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DEMO_MODE`; the API requires `DATABASE_URL` and distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values of at least 32 characters. Production also requires `COOKIE_SECURE=true` and the correct `WEB_URL`.
5. Run the recovered project's tests and build commands before deploying. Never commit `.env` files, credentials or database dumps.

## Vercel deployment

The existing Vercel projects are `agencyos-web` and `agencyos-api`. Their current production aliases are linked above; their existing deployments are separate from this incomplete Git checkout. The web project's configured backend URL points to the API alias.

After restoring and validating the complete source:

1. In each existing Vercel project's **Settings → Git**, connect `Nour-yahyaoui/agencyos` and select the intended production branch. Configure the correct project root for each application using the restored source layout. The serverless API snapshot refers to `apps/api-serverless` as its intended root; verify that path exists in the restored repository first.
2. Verify the framework, install/build commands, output settings and required environment variables against the restored deployment configuration. In particular, the API snapshot documents a Vercel-specific configuration rather than the default NestJS preset.
3. Test a **preview** build for each project before promoting a production deployment. Check web sign-in, same-origin API requests, database readiness, CSRF-protected mutations and any enabled integrations. The API readiness endpoint is `/api/v1/health/ready`; OpenAPI JSON is at `/api/docs-json`.
4. Ensure `API_INTERNAL_URL` points to the intended API and `WEB_URL` matches the browser origin allowed by the API. Preview origins need a deliberate configuration: a single fixed `WEB_URL` may not allow mutations from arbitrary preview URLs. Do not point test deployments at production data unless that is intentional.
5. Configure a `CRON_SECRET` for Vercel Cron and durable object storage if uploads must persist. Treat Stripe, OpenAI, email and storage credentials as secrets in Vercel, not source files.

Connecting Git can cause future commits to trigger deployments. Keep the currently working production deployments in place until the recovered source builds and preview checks pass.

## Security and operations

Use separate development and production credentials and databases, strong unique JWT secrets, HTTPS and secure cookies in production. Back up the database before migrations and review external integrations and webhook configuration before enabling them. Do not expose secrets in issues, logs or pull requests.

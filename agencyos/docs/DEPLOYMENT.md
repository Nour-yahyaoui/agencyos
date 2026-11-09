# Deployment checklist

Deployment requires environment-specific review and testing; these notes are not a production-readiness certification. See the [root README](../../README.md#vercel-deployment) and [serverless API README](../apps/api-serverless/README.md) for the repository's Vercel layout and configuration.

1. Use separate environments, databases and provider accounts for development, preview and production. Restrict access, configure secrets through the deployment platform, and never commit credentials.
2. Configure `NODE_ENV=production`, `COOKIE_SECURE=true`, distinct strong JWT secrets, `DATABASE_URL`, and an exact `WEB_URL` origin. Set the web proxy's `API_INTERNAL_URL` and `NEXT_PUBLIC_API_URL=/api/v1`. Configure only the Stripe, email, AI and storage providers you actually use, and verify webhook secrets and endpoints.
3. Back up the database and verify restore procedures. Review Prisma migration SQL and apply migrations deliberately with `npm run db:deploy` from `agencyos/`; serverless deploys do not automatically run them. Do not run demo seed scripts against production.
4. Configure durable object storage before relying on uploads in serverless environments: local `/tmp` storage is ephemeral. Configure `CRON_SECRET` and review the reminder schedule for the serverless deployment.
5. Test a preview with a dedicated database and provider test accounts. Verify health, authentication, authorization and tenant isolation, CSRF-protected mutations, migrations, uploads and downloads, and payment/webhook flows as applicable. Document any tests not run.
6. Promote only after review; monitor application and provider logs without exposing secrets. Have a rollback and database recovery plan. Rolling back code does not automatically reverse a database migration.

Demo login display and seeded accounts are separate concerns: turning off the UI flag does not remove accounts. Verify production configuration and remove or rotate any seeded credentials as appropriate. Review the [security policy](../../SECURITY.md) and [audit notes](security/audit-2026-11-07.md) for additional risks.

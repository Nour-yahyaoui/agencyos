# Security policy

AgencyOS is a portfolio project, not a production service. This document describes the controls that
are **implemented in this repository**, the threats they address, and the gaps that remain. Nothing
here claims an external audit, penetration test or certification.

## Reporting a vulnerability

Do not open a public issue for authentication, authorization or tenant-isolation problems.
Use GitHub private vulnerability reporting (`Security` → `Report a vulnerability`) or contact the
repository owner directly. Include reproduction steps, the role/organization context and the
`requestId` returned by the API error payload. Expected acknowledgement: a few days, best effort.

## Assets and threat model

| Asset | Threat | Control in this repository |
| --- | --- | --- |
| Tenant data (clients, projects, invoices, files) | Cross-tenant read/write via id guessing | `OrgGuard` resolves membership from `x-organization-id`; every Prisma query filters `organizationId`; composite tenant foreign keys; optional links re-checked in services; scoped `projectWhere` for DEVELOPER/CLIENT |
| Accounts | Credential stuffing, weak passwords | bcrypt (cost 12), 10–128 chars with at least one letter and one number, global `ThrottlerGuard` (240 req/min) with stricter per-route limits (login/register 10/min, refresh 20/min, forgot/reset password 5/min), generic responses for password reset |
| Sessions | Token theft, replay, fixation | Short-lived access cookie (15 min) + refresh cookie (7 days) hashed with SHA-256 in the database, family ids, rotation on every refresh, whole family revoked on reuse, logout revokes |
| Cookie-authenticated mutations | CSRF | Double-submit `agencyos_csrf` cookie + `x-csrf-token` header compared with `timingSafeEqual`, plus an `Origin` check against `WEB_URL` (loopback aliases and preview hosts allowed only outside production) |
| Financial data | Forged payment confirmations | Stripe webhook signature verification on the raw body, event id dedupe in a transaction, organization + amount match before marking an invoice paid, `Payment` upsert keyed by provider payment id |
| Card data | PCI scope creep | Never accepted or stored: Stripe Checkout only; the database keeps amounts, currency, status and provider references |
| Files | Malicious upload, path traversal, cross-tenant download | 10 MB limit, MIME allow-list, generated storage keys, authenticated download endpoint re-checking tenant + project access, clients may only delete their own uploads |
| AI context | Data leakage across tenants, hallucinated output | Context assembled server-side from the caller's scoped queries; missing key returns `503 AI_UNAVAILABLE` with no result field |
| Platform administration | Privilege escalation | `SUPER_ADMIN` platform role checked separately from organization roles; admin routes are outside the tenant scope and audited |
| Secrets | Leakage through logs or client bundles | Zod-validated env, production startup refuses example JWT secrets and requires `COOKIE_SECURE=true`, provider keys are server-only (`NEXT_PUBLIC_*` limited to API path and demo flag) |

## Implemented hardening

- Helmet security headers; CORS restricted to `WEB_URL`; `poweredByHeader: false` on Next.js.
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- A single exception filter returns `{ statusCode, code, message, path, timestamp, requestId }` and
  never leaks stack traces or SQL to clients.
- Structured request logs (`method`, `path`, `status`, `durationMs`, `userId`, `organizationId`) with a
  generated request id; passwords, tokens, cookies and card data are never logged.
- Audit log rows for sensitive mutations (client/project/task/invoice/document/membership changes),
  readable by OWNERs at `/api/v1/audit` and by super admins at `/api/v1/admin/audit`.
- Database constraints as defence in depth: unique membership per user+organization, unique invoice
  numbers per organization, and a CHECK constraint requiring a comment to target exactly one parent.
- Paid invoices are immutable; checkout is only allowed for `SENT`/`OVERDUE`; the last OWNER of an
  organization cannot be removed or demoted; seat limits are enforced on invitation.

## Known gaps (deliberate, tracked in the roadmap)

1. **No PostgreSQL row-level security.** Tenancy is enforced in the application layer. A bug in a new
   query could leak data; RLS is the proposed second line of defence.
2. **No MFA, no SSO, no session device list.**
3. **Rate limiting is in-memory** (per instance). A shared Redis store is required before scaling out.
4. **Email delivery is unverified** without a Resend key; password-reset links are returned in the API
   response only when email is not configured *and* `NODE_ENV !== 'production'`.
5. **No automated dependency or container scanning** beyond Dependabot updates.
6. **No backup/restore drill** has been performed; the deployment guide describes the procedure.
7. **Local file storage** is for development only; production must use S3-compatible storage.

## Verification you can run yourself

```bash
npm run test:integration   # includes cross-organization hiding, CSRF, refresh reuse, webhook forgery
npx playwright test        # includes client-portal scoping and the unconfigured-AI path
```

The integration suite deliberately asserts failures: forged Stripe signatures, wrong amounts,
duplicate events, cross-tenant document downloads (404), client attempts to change ticket status
(403), and client attempts to delete another user's upload (403).
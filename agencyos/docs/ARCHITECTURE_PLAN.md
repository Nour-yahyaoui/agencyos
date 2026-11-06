# AgencyOS — Architecture and implementation plan

## Status legend
Implemented = source exists and is exercised locally. Tested = an automated assertion passed. Configured = code/config exists but an external service has not been verified. Proposed = future work. This plan is written before implementation; final status is recorded in docs/VERIFICATION.md after execution.

## Architectural decisions
1. **Modular monolith, not microservices.** A NestJS API with explicit domain modules and a Next.js App Router client. One deployable API and one relational database keep authorization, transactions, and local development understandable. Split services only when measured operational needs justify them.
2. **Shared PostgreSQL, organization-scoped rows.** Every tenant-owned aggregate carries organizationId. Authentication establishes a user; an organization membership establishes the active tenant and role. Services require an explicit tenant scope and verify referenced records. PostgreSQL foreign keys and composite tenant-scoped relationships protect important links. This is application-enforced isolation, not PostgreSQL RLS; the trade-off and future RLS option are documented.
3. **Cookie sessions for the browser, bearer tokens for tests/API clients.** Short-lived signed JWT access sessions and rotating, hashed refresh sessions in PostgreSQL. HTTP-only, SameSite cookies; CSRF protection for cookie-authenticated mutations. Passwords use bcrypt. Organization context is checked against membership on every request, never trusted from a role claim alone.
4. **REST /api/v1 with OpenAPI.** Validation at the HTTP boundary, domain rules in services, Prisma for persistence. Cursor/offset pagination as appropriate; consistent error envelopes; request IDs; audit events for important mutations.
5. **Provider adapters and honest failure.** Stripe Checkout + signed webhooks, OpenAI responses, Resend email, S3-compatible storage. Missing credentials produce explicit unavailable states. Local development stores uploaded files on disk; this is not represented as S3. No fake AI, email delivery, or payment success.
6. **Next.js client with TanStack Query.** Server rendering for public/auth screens, authenticated interactive workspaces with query caching and invalidation. Accessible shadcn-style primitives, Tailwind tokens, React Hook Form + Zod. API calls use relative /api URLs through a Next.js rewrite so the browser never targets sandbox localhost.

## Domain boundaries
- Identity: auth, users, organizations, memberships, invitations/recovery.
- Delivery: clients/contacts, projects/members, tasks/dependencies, milestones, comments/activity.
- Collaboration: documents, support tickets, notifications.
- Finance: invoices/items, payments, subscriptions, Stripe webhooks.
- Insights: analytics (database aggregations), AI (context assembly + provider call).
- Cross-cutting: Prisma, configuration, guards, tenant scope, audit, rate limits, error handling, health.

## Permission model
SUPER_ADMIN: platform-wide administration, explicitly audited.
OWNER: organization settings, membership, all agency operations and finance.
MANAGER: clients, delivery, team assignment, support and finance within organization.
DEVELOPER: assigned projects/tasks, comments/documents; no organization settings or finance administration.
CLIENT: only records linked to their client account; portal projects/milestones/documents/tickets/invoices; no internal team or budget administration.
A membership is unique per (organization,user). CLIENT memberships require clientId. Project membership is distinct from organization membership.

## Data model (normalized)
User 1—N Membership N—1 Organization; Membership optionally references Client.
Organization 1—N Client 1—N Contact; Client 1—N Project.
Project 1—N ProjectMember, Task, Milestone, Document; Task self-referencing N—N TaskDependency.
Task/Ticket 1—N Comment; Client 1—N Ticket, Invoice, Document.
Invoice 1—N InvoiceItem and Payment; Organization 1—1 Subscription.
User 1—N Notification; Organization 1—N AuditEvent; RefreshToken/PasswordResetToken tied to User; WebhookEvent deduplicates provider events.
Money uses Decimal(12,2), currency code, integer quantities; totals are calculated server-side. Delete behavior: restrict clients/projects/invoices with financial or delivery history; archive instead. Cascade only owned children (items, memberships, dependencies, tokens).

## Implementation roadmap
M1 Foundation: workspace, schema/migrations/seed, auth/RBAC/tenant guards, health/OpenAPI, Docker/CI skeletons.
M2 Delivery: clients, projects, tasks/dependencies, milestones, comments, dashboard and Kanban.
M3 Collaboration/finance: portal, documents, support, invoices/payments/subscriptions, notifications.
M4 Insights/integrations: analytics, AI, provider adapters and configuration states.
M5 Quality/delivery: unit/API/database/isolation/webhook tests, Playwright workflows, builds, deployment docs, diagrams, verified technical dossier.

## Acceptance gates
- Real PostgreSQL migrations and seed run successfully.
- Registration → organization → invitation → client → project → task → portal → invoice → signed test webhook → notification can be exercised.
- Cross-tenant and role escalation requests fail server-side.
- Frontend and backend production builds pass; available tests pass with recorded output.
- No claim of live Stripe/OpenAI/Resend/S3/email/deployment verification without credentials and an actual call.

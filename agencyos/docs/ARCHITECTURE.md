# Architecture

Diagrams: [architecture.svg](diagrams/architecture.svg) · [er.svg](diagrams/er.svg)
(editable Mermaid sources next to them). The original planning document, written before implementation,
is kept unchanged at [ARCHITECTURE_PLAN.md](ARCHITECTURE_PLAN.md) so the design intent can be compared
with what was actually built.

## 1. Shape of the system

A **modular monolith** with two deployables and one database:

```
Browser ──same-origin /api/v1──► Next.js (App Router, Vercel-friendly)
                                     │ server-side rewrite (API_INTERNAL_URL)
                                     ▼
                                 NestJS REST API ──► PostgreSQL (Prisma)
                                     │
                                     ├─► Stripe (Checkout + webhooks)
                                     ├─► OpenAI (grounded analyses)
                                     ├─► Resend (transactional email)
                                     └─► S3-compatible storage (or local disk in dev)
```

Why this shape:

- **One API, many modules.** 19 controllers grouped by domain, each with its own service and DTOs. A
  microservice split would add distributed transactions and deployment overhead with zero benefit at
  this scale; the module boundaries make a later extraction possible without a rewrite.
- **Next.js as a thin BFF.** The browser never learns the API host: it calls `/api/v1/...` and Next
  rewrites to `API_INTERNAL_URL`. Cookies stay first-party, there is no CORS preflight in the happy
  path, and the same build works locally, in Docker and on Vercel.
- **PostgreSQL + Prisma.** Relational integrity matters here (invoices → payments, tasks →
  dependencies, memberships → organizations). Prisma gives typed queries and reviewable SQL migrations.
- **Provider adapters, not provider assumptions.** `IntegrationsService` lazily constructs Stripe,
  OpenAI, Resend and S3 clients only when their keys exist, and exposes `status()` so the UI can render
  an honest "not configured" state instead of pretending.

## 2. Module boundaries (API)

| Module | Owns | Depends on |
| --- | --- | --- |
| `auth` | credentials, sessions, refresh families, reset, invitation acceptance | users, memberships, notifications, integrations (email) |
| `users`, `organizations`, `memberships` | identity, tenants, roles, invitations, seat limits | prisma, audit |
| `clients` | client records, contacts, onboarding checklist, activity | audit, notifications |
| `projects` | projects, members, access rules (`projectWhere`, `assertAccess`) | clients, audit |
| `tasks`, `milestones`, `comments` | delivery work, dependency graph, discussion | projects, notifications, audit |
| `support` | tickets and their workflow | clients, notifications, comments |
| `documents` | file metadata + bytes | integrations (storage), projects, audit |
| `billing` | invoices, payments, subscriptions, Stripe webhooks | integrations (Stripe), notifications, audit |
| `notifications` | in-app notifications, reminder cron, email fan-out | integrations (Resend) |
| `analytics` | read-only aggregations | projects (scope), prisma |
| `ai` | grounded analyses | projects/tasks/clients/support reads, integrations (OpenAI) |
| `admin` | platform-wide reads and user flags | prisma, audit |
| `common`, `prisma`, `integrations`, `health` | guards, decorators, filter, interceptor, audit, DB, adapters | — |

Cross-module rule: a module calls another module's **service**, never its tables through a private
query. `ProjectsService.projectWhere(scope)` is the single definition of "which projects can this
caller see", reused by tasks, analytics, documents and AI.

## 3. Request lifecycle

1. **Helmet + CORS + cookie-parser + raw body** (raw body is preserved for Stripe signature checks).
2. **ThrottlerGuard** — 240 req/min globally, tighter on auth endpoints.
3. **JwtAuthGuard (global)** — reads `agencyos_access` cookie or `Authorization: Bearer`; sets
   `req.user` and `req.authMethod`. `@Public()` opts out (login, register, refresh, reset, webhooks,
   health).
4. **CsrfGuard (global)** — for cookie-authenticated mutations: `Origin` must match `WEB_URL` (loopback
   aliases and `*.e2b.app` previews allowed only outside production) and the `x-csrf-token` header must
   equal the `agencyos_csrf` cookie (constant-time compare). Bearer clients skip CSRF.
5. **OrgGuard** — `x-organization-id` (or `:orgId`) must resolve to a membership row; otherwise 403.
6. **RolesGuard** — `@Roles(...)` compared with the membership role.
7. **ValidationPipe** — whitelist + forbidNonWhitelisted + transform.
8. **Controller → Service** — every query includes `organizationId`; role scope narrows it further.
9. **AuditService** — sensitive mutations append an audit row.
10. **LoggingInterceptor + ExceptionFilter** — one structured log line per request and one error shape.

`PlatformAdminGuard` replaces steps 5–6 for `/admin/*`: it checks `user.platformRole === 'SUPER_ADMIN'`,
which is deliberately independent of any organization role.

## 4. Tenancy model

- Every tenant-owned table carries `organizationId`.
- Required relations use **composite foreign keys** (`[organizationId, parentId]`) so the database
  itself rejects a row that points at another tenant's parent. Prisma cannot express optional composite
  relations, so optional links (e.g. `Document.projectId`) use single-column FKs plus a service-level
  tenant check — a documented trade-off, not an oversight.
- Read scope by role:
  - `OWNER`, `MANAGER`: everything in the organization.
  - `DEVELOPER`: projects they are a member of (plus their assigned tasks).
  - `CLIENT`: only rows tied to their `clientId`; drafts are hidden; boards are read-only.
- Cross-tenant access returns **404** for entity reads (no existence oracle) and **403** for
  organization-level access.
- PostgreSQL RLS is **not** used; the roadmap lists it as the next defence-in-depth step.

## 5. Data model

23 models, 12 enums, 45 indexes, 13 unique constraints, 2 migrations.

Core chains:

```
User ─< Membership >─ Organization ─< Client ─< Project ─< Task ─< TaskDependency
                                     │            │        └─< Comment
                                     │            └─< Milestone, ProjectMember, Document
                                     ├─< SupportTicket ─< Comment
                                     ├─< Invoice ─< InvoiceItem, Payment
                                     ├─< Subscription, Notification, AuditEvent, Invitation
                                     └─< WebhookEvent (provider event dedupe)
```

Notable constraints and indexes:

- `Membership @@unique([organizationId, userId])`, `Invitation @@unique([organizationId, email])`,
  `Contact @@unique([clientId, email])`, `ProjectMember @@unique([projectId, userId])`.
- `Invoice @@unique([organizationId, number])`; numbers are generated per organization per year.
- `RefreshSession` stores a SHA-256 token hash plus `familyId`; reuse revokes the family.
- `WebhookEvent @@unique([provider, eventId])` makes Stripe delivery idempotent.
- `Notification @@unique([userId, dedupeKey])` prevents duplicate deadline reminders
  (`deadline:<taskId>:<date>`).
- `Comment_exactly_one_target` CHECK constraint (second migration) enforces task XOR ticket.
- Tenant-owned tables also expose `@@unique([id, organizationId])`, which is what makes the composite
  tenant foreign keys possible.
- Composite indexes follow the actual query shapes, e.g. `[organizationId, status, dueDate]` for task
  boards and `[organizationId, clientId, status]` for portal invoices.

## 6. Frontend architecture

- **Routing:** public marketing + auth pages, and an `(app)` route group wrapped by `AppShell`
  (sidebar, organization switcher, notification bell, user menu). 23 routes.
- **State:** TanStack Query is the only server-state store. Keys always include `org?.id`, so switching
  organization invalidates the world; `agencyos:org-changed` events keep tabs consistent.
- **Auth context:** `useAuth()` exposes `user`, `organizations`, `org`, `role`, and derived flags
  (`isAgency`, `isManagement`, `isClient`, `isSuperAdmin`) used for navigation and affordances only —
  never as the security boundary.
- **API client:** one `fetch` wrapper adds `x-organization-id`, CSRF header and credentials, performs a
  single-flight refresh on 401 (skipping `/auth/*`), and normalises errors into `ApiError`.
- **Forms:** React Hook Form + Zod, shared `FormField` that wires `htmlFor`/`id`/`aria-describedby`
  (this is also what makes the Playwright label selectors work).
- **Mutations:** `useToastMutation` centralises toasts + query invalidation with TanStack v5's four-arg
  callbacks.
- **States:** every list/detail renders loading skeletons, empty state, error state with retry, and
  provider-unavailable notices (Stripe, OpenAI, email, storage).

## 7. Decisions and trade-offs (mini ADRs)

| # | Decision | Alternative | Why |
| --- | --- | --- | --- |
| 1 | Modular monolith | Microservices per domain | One team, one database, transactional invariants (invoice ↔ payment). Cheaper to test and deploy. |
| 2 | Cookie sessions + CSRF, Bearer also supported | LocalStorage JWT | HttpOnly cookies resist XSS token theft; Bearer keeps the API usable by scripts and tests. |
| 3 | Refresh-token families with reuse revocation | Stateless refresh JWT | Stolen refresh tokens must be detectable; a DB row per token is a cheap price. |
| 4 | Application-level tenancy | PostgreSQL RLS | Faster to build and easier to reason about with Prisma; RLS is listed as the next hardening step. |
| 5 | Next.js rewrites as BFF | Direct browser → API with CORS | First-party cookies, no environment-specific API URLs in the bundle, works in previews. |
| 6 | Stripe Checkout | Custom card form | Keeps card data out of the system entirely (no PCI scope), less code to secure. |
| 7 | Webhook dedupe table + transaction | Trust Stripe retries | Retries and replays are normal; `WebhookEvent` + amount/org checks make processing idempotent. |
| 8 | Local disk fallback for files | Require S3 to run | The project must run with zero credentials; the provider is reported honestly in the UI. |
| 9 | Explicit `503 AI_UNAVAILABLE` | Mocked AI responses | Fabricated output would be dishonest and would hide configuration problems. |
| 10 | E2E against production builds | E2E against dev servers | Dev + watch + Chromium exceeded the 2 GB test machine and crashed pages. |
| 11 | Dense one-line API handlers | Conventional formatting | Written for speed; acknowledged as a readability debt in the roadmap. |

## 8. Scaling path (proposed, not implemented)

1. Move throttling and reminder locking to Redis; run the cron in a single worker instance.
2. Add PostgreSQL RLS + a read replica for analytics.
3. Extract `billing` webhooks into a queue consumer (Stripe → queue → idempotent handler).
4. Object storage lifecycle policies + virus scanning for uploads.
5. OpenTelemetry traces and SLO dashboards; the current structured logs are the starting point.
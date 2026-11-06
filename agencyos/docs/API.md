# API reference

- **Base path:** `/api/v1` (versioned in the URL; a breaking change would ship as `/api/v2`).
- **Interactive docs:** `http://localhost:4000/api/docs` (Swagger UI), also proxied at
  `http://localhost:3000/api/docs`.
- **Machine-readable contract:** [`openapi.json`](openapi.json) — generated from the Nest application
  with `npm run openapi`; CI fails if the committed file drifts from the code.
- **Current surface:** 66 paths, 85 operations, 31 schemas, 19 tags.

## 1. Authentication

| Mechanism | How | Notes |
| --- | --- | --- |
| Cookie session (browser) | `POST /auth/login` sets `agencyos_access` (15 min), `agencyos_refresh` (7 days), `agencyos_csrf` | HttpOnly access/refresh, `SameSite=Lax`, `Secure` when `COOKIE_SECURE=true` |
| Bearer token (scripts, tests) | `Authorization: Bearer <accessToken>` from login/register/refresh | Skips CSRF; same authorization rules |

Mutations with a cookie session require **both**:

```
x-csrf-token: <value of the agencyos_csrf cookie>
Origin: <WEB_URL>            # loopback aliases and *.e2b.app previews allowed outside production
```

The CSRF token rotates on refresh — read the new cookie after `POST /auth/refresh`.
Refresh reuse (an already-rotated token presented again) revokes the whole token family and returns 401.

## 2. Tenant context

Every tenant-scoped request needs:

```
x-organization-id: <organization id>
```

`OrgGuard` looks up the caller's membership; a missing header is `400`, a non-membership is `403`.
Platform routes (`/admin/*`, `/auth/*`, `/users/me`, `/organizations` list/create, `/health/*`) do not
take this header. The web client sends `orgId: null` for those.

## 3. Conventions

- **Pagination:** `?page=1&limit=20&q=<search>` (default limit 20) → `{ data: [...], meta: { page, limit, total, totalPages } }`.
  `limit` is capped at 100; `limit=1000` returns `400`.
- **Filtering:** module-specific query params (`status`, `clientId`, `projectId`, `assigneeId`, …).
- **Errors:** one shape from a global filter:

```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "You are not a member of this organization",
  "path": "/api/v1/projects",
  "timestamp": "2026-11-06T00:00:00.000Z",
  "requestId": "8e559c3d-79e7-4d61-8031-2ddddf15beb4"
}
```

  Validation failures add `details`. Provider problems use explicit codes:
  `STRIPE_UNAVAILABLE`, `AI_UNAVAILABLE`, `EMAIL_UNAVAILABLE`, `STORAGE_UNAVAILABLE` (HTTP 503).
- **Cross-tenant entity reads return 404**, not 403, so ids cannot be probed.
- **Money:** Decimal in PostgreSQL, serialised as numbers rounded to 2 decimals; totals are always
  computed server-side from line items, never trusted from the client.
- **Idempotency:** Stripe events are deduplicated by `(provider, eventId)`; deadline notifications by
  `(userId, dedupeKey)`.

## 4. Endpoint groups

| Tag | Routes (prefix `/api/v1`) |
| --- | --- |
| Auth | `POST auth/register`, `auth/login`, `auth/refresh`, `auth/logout`, `auth/forgot-password`, `auth/reset-password`, `auth/accept-invitation`; `GET auth/me` |
| Users | `GET/PATCH users/me` |
| Organizations | `GET/POST organizations`, `GET/PATCH organizations/:orgId` |
| Memberships | `GET memberships`, `GET memberships/invitations`, `POST memberships/invite`, `PATCH/DELETE memberships/:id` |
| Clients | `GET/POST clients`, `GET/PATCH/DELETE clients/:id`, `GET clients/:id/activity`, `PATCH clients/:id/onboarding`, `POST clients/:id/contacts`, `DELETE clients/:id/contacts/:contactId` |
| Projects | `GET/POST projects`, `GET/PATCH projects/:id`, `GET projects/:id/activity`, `POST projects/:id/members`, `DELETE projects/:id/members/:userId` |
| Tasks | `GET/POST tasks`, `GET/PATCH/DELETE tasks/:id`, `PATCH tasks/:id/move`, `POST tasks/:id/dependencies`, `DELETE tasks/:id/dependencies/:prerequisiteId` |
| Milestones | `GET/POST milestones`, `PATCH/DELETE milestones/:id` |
| Comments | `GET/POST comments`, `DELETE comments/:id` (exactly one of `taskId` / `ticketId`) |
| Support | `GET/POST support/tickets`, `GET/PATCH support/tickets/:id` |
| Documents | `GET documents`, `POST documents/upload` (multipart), `GET documents/:id/download`, `DELETE documents/:id` |
| Billing | `GET/POST billing/invoices`, `GET billing/invoices/outstanding`, `GET/PATCH billing/invoices/:id`, `POST billing/invoices/:id/send`, `…/void`, `…/checkout`, `GET billing/subscription`, `POST billing/subscription/checkout`, `POST billing/webhooks/stripe` |
| Notifications | `GET notifications`, `PATCH notifications/:id/read`, `PATCH notifications/read-all`, `POST notifications/run-reminders` |
| Analytics | `GET analytics/dashboard` |
| AI | `GET ai/status`, `POST ai/assist` |
| Audit | `GET audit` (OWNER) |
| Admin | `GET admin/overview`, `admin/organizations`, `admin/users`, `admin/audit`; `PATCH admin/users/:id` |
| Integrations | `GET integrations/status` (OWNER, MANAGER) |
| Health | `GET health/live`, `GET health/ready` |

## 5. RBAC matrix (organization roles)

`✔` allowed · `scoped` allowed but filtered to the caller's projects/client · `—` forbidden (403)

| Capability | OWNER | MANAGER | DEVELOPER | CLIENT |
| --- | --- | --- | --- | --- |
| Read dashboard/analytics | ✔ | ✔ | scoped | scoped |
| Clients: read | ✔ | ✔ | ✔ | own only |
| Clients: create/update/onboarding/contacts | ✔ | ✔ | — | — |
| Clients: archive | ✔ | — | — | — |
| Projects: read | ✔ | ✔ | member projects | own client's projects |
| Projects: create/update/members | ✔ | ✔ | — | — |
| Tasks: read | ✔ | ✔ | member projects | read-only |
| Tasks: create/update/move/dependencies | ✔ | ✔ | ✔ (member projects) | — |
| Tasks: delete | ✔ | ✔ | — | — |
| Milestones: write | ✔ | ✔ | — | — |
| Comments: create | ✔ | ✔ | ✔ | own tickets/tasks |
| Comments: delete | ✔ | ✔ | author only | author only |
| Support tickets: create | ✔ | ✔ | ✔ | ✔ (own client) |
| Support tickets: update status/assignee | ✔ | ✔ | ✔ | — |
| Documents: upload | ✔ | ✔ | ✔ | ✔ (own client) |
| Documents: delete | ✔ | ✔ | ✔ | own uploads only |
| Invoices: read | ✔ | ✔ | — | own, non-draft |
| Invoices: create/update/send/void | ✔ | ✔ | — | — |
| Invoice checkout (Stripe) | ✔ | ✔ | ✔ | ✔ (own invoice) |
| Subscription checkout | ✔ | — | — | — |
| Memberships: list | ✔ | ✔ | ✔ | — |
| Memberships: invite / invitations | ✔ | ✔ | — | — |
| Memberships: change role / remove | ✔ | — | — | — |
| Audit log | ✔ | — | — | — |
| Integration status | ✔ | ✔ | — | — |
| Trigger reminder job | ✔ | ✔ | — | — |
| AI assistant | ✔ | ✔ | ✔ | — |

`SUPER_ADMIN` is a **platform** role, not an organization role: it unlocks `/admin/*` regardless of
membership, and is still subject to `OrgGuard` for tenant routes.

## 6. Business rules enforced by the API

- A task cannot move to `DONE` while any prerequisite is unfinished (`400`).
- Dependencies must be in the same project and must not create a cycle (`400`).
- Assignees must be agency members of the organization **and** members of the project.
- Completing all tasks auto-completes the project; completing onboarding activates the client.
- The last OWNER cannot be removed or demoted; invitations respect the subscription seat limit;
  `CLIENT` invitations must specify a `clientId`.
- Invoice totals, tax and currency are computed server-side; `PAID` invoices are immutable; checkout is
  only offered for `SENT`/`OVERDUE`.
- Stripe webhooks: signature verified on the raw body, event deduplicated, organization and amount must
  match the invoice before it is marked paid; failures are recorded, not silently swallowed.
- Documents: 10 MB max, MIME allow-list, tenant-scoped download and delete.

## 7. Try it with curl

```bash
# login (store cookies)
curl -s -c /tmp/cj -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@agencyos.dev","password":"DemoPass123!"}'

ORG=$(curl -s -b /tmp/cj http://localhost:4000/api/v1/organizations | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
curl -s -b /tmp/cj -H "x-organization-id: $ORG" http://localhost:4000/api/v1/analytics/dashboard

# mutation with a cookie session needs the CSRF header
CSRF=$(awk '/agencyos_csrf/ {print $7}' /tmp/cj)
curl -s -b /tmp/cj -X POST http://localhost:4000/api/v1/clients \
  -H "x-organization-id: $ORG" -H "x-csrf-token: $CSRF" -H 'Origin: http://localhost:3000' \
  -H 'Content-Type: application/json' -d '{"name":"Curl Client"}'
```
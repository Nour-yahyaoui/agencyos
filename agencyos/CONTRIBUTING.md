# Contributing to AgencyOS

This repository is a single-author portfolio project, but it is organised the way a small product team
would work: explicit boundaries, migrations instead of ad-hoc SQL, tests as the definition of done, and
documentation that distinguishes verified from unverified.

## 1. Ground rules

1. **No fabricated evidence.** Never paste expected output as if it were a test run, never invent
   metrics, users, commits or deployment claims. If something was not run, say so.
2. **Tenant isolation is a backend concern.** A hidden button is not access control.
3. **Smallest change that solves the problem.** No new dependency, service or abstraction without a
   written trade-off in the PR description.
4. **Fix failures, do not silence them.** No `test.skip`, no `eslint-disable`, no loosened assertion to
   make a suite green. If a test is wrong, fix the test and explain why in the PR.

## 2. Local setup

Follow the [README quickstart](README.md#4-quickstart-local-no-docker). You need Node >= 20.19, npm 10,
and PostgreSQL 15+ (17 was used here). Two databases are required: `agencyos` (development/e2e) and
`agencyos_test` (integration).

```bash
npm ci
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
npm run db:generate && npm run db:deploy && npm run db:seed
npm run dev
```

## 3. Branch and commit convention

```
feat/tasks-dependency-graph
fix/billing-webhook-idempotency
docs/deployment-runbook
```

Commits use Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), one logical
change per commit, imperative mood, and a body that explains *why* when it is not obvious.

> The delivered working tree contains no commit history. History is not backdated or synthesised; run
> `git add -A && git commit -m "feat: initial AgencyOS implementation"` yourself if you want a starting
> commit.

## 4. Definition of done

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → both workspaces compile
- [ ] `npm run test` → unit tests pass
- [ ] `npm run test:integration` → integration tests pass against real PostgreSQL
- [ ] `npm run build && npx playwright test` → e2e passes when UI or auth flows changed
- [ ] Migration committed for every schema change (`npm run db:migrate -- --name <change>`), with
      indexes for new query patterns
- [ ] `npm run openapi` regenerated when the API surface changed (CI fails on drift)
- [ ] Loading, empty, error and provider-unavailable states handled in the UI
- [ ] Docs updated: README status table, ARCHITECTURE, TESTING, DEPLOYMENT or ROADMAP as relevant

## 5. How to add a feature (worked example)

Adding "task labels":

1. **Schema:** add `Label` + `TaskLabel` models with `organizationId`, composite tenant FK where the
   relation is required, `@@unique([organizationId, name])`, `@@index([organizationId])`.
2. **Migration:** `npm run db:migrate -- --name task_labels`. Review the generated SQL before committing.
3. **API:** new module or extend `tasks`; DTOs with class-validator; `@UseGuards(OrgGuard)`;
   `@Roles(...)` for mutations; scope every query with `s.organizationId`; audit sensitive changes.
4. **Tests:** integration test proving a label from organization B cannot be attached to a task in
   organization A, plus the RBAC boundary (CLIENT cannot create labels).
5. **Web:** typed API call through `lib/api.ts`, TanStack Query key including `org?.id`, mutation via
   `useToastMutation`, optimistic update only if the rollback is implemented.
6. **Docs:** endpoint in `docs/API.md`, regenerate `docs/openapi.json`, note the change in ROADMAP.

## 6. Code style

- TypeScript strict mode in both workspaces. `any` is a warning that should be paid down, not spread.
- API: one module per domain (`clients`, `projects`, `tasks`, `billing`, …); controllers stay thin,
  business rules live in services; cross-module access goes through the exported service, never through
  another module's Prisma queries.
- Web: server components by default, `'use client'` only where interaction requires it; shared UI in
  `components/ui`, domain widgets in `components/shared`; all fetches through `lib/api.ts`.
- Form fields must use `FormField` so labels stay associated with inputs (`htmlFor` + `id`). Playwright
  selects by label; breaking that association breaks the suite and screen readers.
- Existing API handlers are written densely (one line per statement block). Prefer expanding the code
  you touch into readable multi-line form rather than adding new dense code.

## 7. Test placement

| Layer | Location | Use it for |
| --- | --- | --- |
| Unit | `apps/api/src/**/*.spec.ts` | Pure logic: money rounding, token hashing, env validation, origin policy |
| Integration | `apps/api/test/*.integration.spec.ts` | HTTP + database: RBAC, tenancy, workflows, webhooks, constraints |
| E2E | `e2e/*.spec.ts` | Critical user journeys through the real UI |

Integration tests apply migrations themselves and truncate `User`, `Organization` and `WebhookEvent`
(cascading) before each run, so they never touch development data.

## 8. Pull requests

Use the template. Include the commands you ran and their real output, the tenant-isolation reasoning for
new queries, and screenshots for UI changes. Reviewers check correctness and isolation first, style
second.
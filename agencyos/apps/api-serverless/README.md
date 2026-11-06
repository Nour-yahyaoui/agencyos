# AgencyOS API — Vercel serverless variant

This folder deploys the **same NestJS application** as [`apps/api`](../api) to Vercel
serverless functions. It exists so the API can run on a platform that has no long-lived
process, without forking the business logic.

```
apps/api              long-running Node server (Docker, Render, Railway, Fly, a VPS)
apps/api-serverless   the same modules behind a Vercel function (this folder)
```

## What is shared and what is different

`src/` and `prisma/` here are **generated copies** of `apps/api/src` and `apps/api/prisma`.
They are committed so this folder is a self-contained Vercel project (Vercel's file tracing
cannot follow imports outside the project root).

```bash
npm run sync          # refresh the copies from apps/api
npm run check:sync    # CI guard: fails if the copies drifted
```

Only four things differ from the long-running server, and each one is forced by the platform:

| Concern | `apps/api` (long-running) | `apps/api-serverless` |
| --- | --- | --- |
| Socket | `app.listen(4000)` | none — Vercel owns the socket, `api/[...path].ts` exports a handler |
| Scheduled jobs | `@Cron(EVERY_HOUR)` in `NotificationService` | in-process cron is skipped when `VERCEL` is set; Vercel Cron calls `GET /api/cron/reminders` daily at 08:00 UTC with `Authorization: Bearer $CRON_SECRET` |
| File storage | local `./storage` when S3 is unset | `/tmp/agencyos-storage`, and `/integrations/status` reports `storage.ephemeral: true` — **configure S3 for durable uploads** |
| Swagger UI | `SwaggerModule.setup` serves bundled static assets | `/api/docs` loads Swagger UI from a CDN; `/api/docs-json` is always served by the function |

Everything else — guards, tenant scoping, validation, cookies, CSRF, rate limits, error
shape, Stripe webhook verification — is the identical code path.

## The request-body problem (and how it is solved)

Vercel's Node runtime consumes the request stream before your handler runs and exposes a lazy
`req.body` getter that `JSON.parse`s it. Two things break if you ignore that:

* **Stripe** signs the exact bytes. Re-serialising the parsed object changes whitespace and
  key order, so `constructEvent` rejects every delivery.
* **multer** needs a readable stream; the original one is already drained.

`api/[...path].ts` therefore reads the original bytes that the runtime replays through the
`data`/`end` listeners and then:

* for JSON and urlencoded bodies, keeps the platform's real request object, attaches
  `req.rawBody`, and marks the body as already parsed so `body-parser` skips it;
* for `multipart/*`, hands Express a replayed request that owns every HTTP field and a fresh
  readable stream around the same bytes, so multer applies its own limits unchanged.

`npm run smoke` rehearses this locally: it builds the function and serves it through a harness
that reproduces the platform behaviour (drained stream, replayed bytes, lazy JSON getter),
then asserts health, login, cookie auth, CSRF rejection and acceptance, multipart upload and
download, a **valid and a tampered Stripe signature**, cron auth, and the OpenAPI document.

## Deploy

### From a checkout (normal path)

```bash
cd apps/api-serverless
npm install
npx vercel deploy --prod
```

`vercel-build.sh` sees the sources and only runs `prisma generate`.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon **pooled** URL with `?sslmode=require&pgbouncer=true&connection_limit=1` |
| `JWT_ACCESS_SECRET` | yes | ≥ 32 chars, generated (`openssl rand -base64 48`) |
| `JWT_REFRESH_SECRET` | yes | ≥ 32 chars, different from the access secret |
| `COOKIE_SECURE` | yes | `true` — the app refuses to start in production otherwise |
| `WEB_URL` | yes | exact browser origin of the web app; the CSRF guard compares `Origin` against it |
| `CRON_SECRET` | yes | Vercel Cron sends it as a bearer token |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | no | unset → billing endpoints return `503 STRIPE_UNAVAILABLE` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | no | unset → assistant returns `503 AI_UNAVAILABLE` |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | unset → notifications are stored, `emailDelivered: false` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | no | unset → `/tmp` storage, **ephemeral** |

Migrations are **not** run by the function. Apply them from a machine with the direct
(non-pooled) Neon URL:

```bash
DATABASE_URL="<neon direct url>" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

## Honest limitations of this variant

* **Cold starts.** A Nest + Prisma container starts in roughly a second; the first request
  after an idle period pays it. The long-running server does not.
* **`/tmp` uploads disappear** between invocations unless S3 is configured.
* **Cron granularity.** Vercel's Hobby plan allows one trigger per day, so deadline reminders
  run daily here versus hourly on the long-running server.
* **Region.** Functions are pinned to `fra1` to sit next to the Neon database in
  `eu-central-1`; moving the database means moving this setting.
* **Deployment protection.** Vercel Authentication, if enabled on the project, blocks
  anonymous traffic (including Stripe webhooks) on `*.vercel.app` URLs.

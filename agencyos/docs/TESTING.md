# Testing

Run commands from `agencyos/` after installing dependencies and generating the Prisma client. Record the actual result and any skipped checks in your pull request; old results in the application README describe a past environment, not the current commit.

| Layer | Command | What it checks / requirements |
| --- | --- | --- |
| Static checks | `npm run lint` and `npm run build` | API and web lint/build. Build-time environment configuration may be required. |
| Unit | `npm run test` | API unit tests; provider and database behavior may be mocked. |
| Serverless parity | `npm run typecheck -w @agencyos/api-serverless` and `npm run check:sync -w @agencyos/api-serverless` | Typechecks the serverless variant and compares the synced API source. |
| Integration | `npm run test:integration` | HTTP and database workflows; requires PostgreSQL and a dedicated `TEST_DATABASE_URL`. The harness applies migrations and truncates tables with `CASCADE`. **Never point it at a database containing valuable data.** |
| Browser | `npm run build && npx playwright test` | Chromium user journeys against running/built apps. Install the browser with `npx playwright install chromium`, configure local environment variables, migrate and seed a disposable development database first. The Playwright config may reuse existing local servers. |

The root GitHub Actions workflow runs lint, unit tests, builds and serverless checks. It does not run integration or browser tests. A passing basic workflow does not verify real payment, email, storage, deployment, concurrency or security behavior. Add focused tests when changing these paths and document what was not exercised.

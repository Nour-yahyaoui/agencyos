# Contributing to AgencyOS

Thank you for helping improve AgencyOS. Please read this guide and the [Code of Conduct](CODE_OF_CONDUCT.md) before participating. Contributions submitted for inclusion are subject to the [Apache License 2.0](LICENSE), including its contribution terms. Only submit work you have the right to contribute and identify any third-party material and applicable licenses.

## Before you start

- For a substantial feature or breaking change, open an issue first to discuss the problem and approach.
- Report security vulnerabilities privately using the [security policy](SECURITY.md), not public issues or pull requests.
- Never include secrets, real customer data, payment information, or private logs in an issue, test fixture, or pull request.
- Keep changes focused and explain trade-offs. Do not fabricate test results or deployment claims.

## Development setup

The npm workspace is in `agencyos/`. You need Node.js 20.19 or newer, npm, and PostgreSQL; see the [local quickstart](agencyos/README.md#4-quickstart-local-no-docker) and [testing guide](agencyos/docs/TESTING.md) for details. From the repository root:

```sh
cd agencyos
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# Configure local database URLs and distinct JWT secrets in .env.
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Use dedicated development and test databases. Review seed scripts and migration targets before running them; do not use production data or credentials. Some integrations require separate provider configuration.

## Making a change

1. Open an issue where appropriate, then work in a focused branch or fork.
2. Follow the existing TypeScript, NestJS and Next.js patterns. Keep tenant authorization on the server; hiding UI controls is not authorization.
3. Add or update tests for behavior, permissions and tenant boundaries. For data model changes, commit and review a Prisma migration; regenerate the OpenAPI document when the API surface changes. Sync the serverless API copy after shared API changes.
4. Update relevant documentation. For UI changes, consider loading, empty, error, accessibility and provider-unavailable states.
5. Open a pull request using the template. Explain the change, risks and any migration or rollout needs. List actual checks and results, including anything you could not run. Include screenshots when helpful.

Conventional commit prefixes such as `feat:`, `fix:`, `docs:` and `test:` are encouraged. Review is based on correctness, security, clarity and maintainability; automated checks alone do not establish production readiness.

## Checks

Run from `agencyos/`:

```sh
npm run lint
npm run build
npm run test
npm run typecheck -w @agencyos/api-serverless
npm run check:sync -w @agencyos/api-serverless
npm run test:integration    # requires a separate test PostgreSQL database
npx playwright test         # requires the configured databases and built applications
```

See the [testing guide](agencyos/docs/TESTING.md) for prerequisites and limits. The root GitHub Actions workflow runs basic checks, not the PostgreSQL integration or browser suites. For changes affecting authorization, database behavior, payments, uploads or user journeys, run the applicable deeper tests and disclose any gaps.

## Review and communication

Be respectful, respond constructively to feedback, and keep discussions on the relevant issue or pull request. Maintainers may request changes or decline contributions; submitting a pull request does not guarantee acceptance or a response time.

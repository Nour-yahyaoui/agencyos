# Security policy

## Reporting a vulnerability

Please **do not open a public issue or pull request** for an undisclosed vulnerability. If available, use [GitHub private vulnerability reporting](https://github.com/Nour-yahyaoui/agencyos/security/advisories/new) (Security → Report a vulnerability). If that option is unavailable, contact the repository owner privately through their [GitHub profile](https://github.com/Nour-yahyaoui) to arrange a secure reporting channel.

Include affected versions or commit, impact, minimal reproduction steps, relevant account roles and tenant context, and any suggested mitigation. Do not send credentials, personal data or production secrets. Please allow time for investigation and coordination before public disclosure. Responses and fixes are best effort; no response-time SLA is currently offered.

## Supported versions

Security fixes are intended for the current default branch. Older commits and deployments are not automatically updated; operators must evaluate and apply fixes themselves. No long-term support or guaranteed patch schedule is currently offered.

## Operational security

AgencyOS handles tenant data and integrates with third-party services. Before deploying, assess tenant isolation and authorization, session and CSRF controls, secrets, database access, webhook verification, backups, monitoring and provider configuration for your environment. Use separate development and production resources and never seed demo accounts in production without an explicit review. See the [audit notes](agencyos/docs/security/audit-2026-11-07.md) and [deployment guide](agencyos/docs/DEPLOYMENT.md) for known limitations and precautions.

A security policy, tests or CI do not constitute an external audit, certification or guarantee of security.

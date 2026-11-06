/**
 * Production verification against the live Vercel deployments.
 *
 *   node scripts/verify-production.mjs \
 *     --api https://agencyos-api-kappa.vercel.app \
 *     --web https://agencyos-web-beryl.vercel.app
 *
 * Reads the demo credentials from the environment (DEMO_EMAIL / DEMO_PASSWORD) and the
 * cron secret from CRON_SECRET. Nothing is written to the repository. The script creates
 * one throwaway client and deletes it again, so the seeded demo data is left untouched.
 */
import { createHmac, randomUUID } from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, i, arr) => {
  if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
  return acc;
}, []));

const API = (args.api ?? 'https://agencyos-api-kappa.vercel.app').replace(/\/$/, '');
const WEB = (args.web ?? 'https://agencyos-web-beryl.vercel.app').replace(/\/$/, '');
const EMAIL = process.env.DEMO_EMAIL ?? 'owner@agencyos.dev';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'DemoPass123!';

const jar = new Map();
let csrf = '';
let orgId = '';
const results = [];

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const idx = pair.indexOf('=');
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value === '') jar.delete(name); else jar.set(name, value);
    if (name === 'agencyos_csrf') csrf = decodeURIComponent(value);
  }
}

async function call(base, path, { method = 'GET', body, headers = {}, auth = true, origin = true } = {}) {
  const h = {};
  if (auth && jar.size) h.cookie = cookieHeader();
  if (origin) h.origin = WEB;
  if (orgId) h['x-organization-id'] = orgId;
  if (method !== 'GET' && csrf && !headers.authorization) h['x-csrf-token'] = csrf;
  Object.assign(h, headers); // explicit headers win (used to probe the guards)
  let payload;
  if (body !== undefined && !(body instanceof Uint8Array) && typeof body !== 'string') {
    payload = JSON.stringify(body);
    h['content-type'] = 'application/json';
  } else payload = body;
  const res = await fetch(`${base}${path}`, { method, headers: h, body: payload, redirect: 'manual' });
  storeCookies(res);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: res.status, json, text, headers: res.headers };
}

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

// 1. API readiness (public, no auth)
{
  const r = await call(API, '/api/v1/health/ready', { auth: false, origin: false });
  check('API /health/ready', r.status === 200 && r.json?.database === 'up', `${r.status} ${r.text.slice(0, 80)}`);
}

// 2. OpenAPI document is served by the Nest app (proves the catch-all reaches every depth)
{
  const r = await call(API, '/api/docs-json', { auth: false, origin: false });
  const paths = r.json?.paths ? Object.keys(r.json.paths).length : 0;
  check('API /docs-json (OpenAPI)', r.status === 200 && paths > 50, `${paths} paths`);
}

// 3. Login through the API origin
{
  const r = await call(API, '/api/v1/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD }, auth: false });
  check('API login sets first-party cookies', r.status === 200 && jar.has('agencyos_access') && jar.has('agencyos_refresh') && !!csrf,
    `${r.status}; cookies=${[...jar.keys()].join(',')}`);
}

// 4. Session is readable
{
  const r = await call(API, '/api/v1/auth/me');
  check('API /auth/me', r.status === 200 && r.json?.email === EMAIL, `${r.status} ${r.json?.email ?? ''}`);
}

// 5. Organization scope
{
  const r = await call(API, '/api/v1/organizations');
  const items = r.json?.data ?? r.json ?? [];
  orgId = Array.isArray(items) ? items[0]?.id : '';
  check('API /organizations', r.status === 200 && !!orgId, orgId);
}

// 6. Tenant isolation: a foreign org id must be rejected
{
  const r = await call(API, '/api/v1/analytics/dashboard', { headers: { 'x-organization-id': 'cm0000000000000000000000' } });
  check('API rejects a foreign organization id', r.status === 403 || r.status === 404, `${r.status}`);
}

// 7. Dashboard KPIs
{
  const r = await call(API, '/api/v1/analytics/dashboard');
  check('API /analytics/dashboard', r.status === 200 && typeof r.json?.kpis?.revenue === 'number',
    `revenue=${r.json?.kpis?.revenue} outstanding=${r.json?.kpis?.outstanding}`);
}

// 7b. Paginated lists: Vercel injects the route capture as `?path=...`; the handler must strip it.
{
  const r = await call(API, '/api/v1/projects');
  check('API /projects (paginated list, route-capture param stripped)', r.status === 200 && Array.isArray(r.json?.data), `${r.status} ${r.text.slice(0, 90)}`);
  const c = await call(API, '/api/v1/clients');
  check('API /clients (paginated list)', c.status === 200 && Array.isArray(c.json?.data), `${c.status}`);
}

// 8. CSRF: a mutation without the header must fail
{
  const r = await call(API, '/api/v1/clients', { method: 'POST', body: { name: 'CSRF probe' }, headers: { 'x-csrf-token': '' } });
  check('API blocks mutations without x-csrf-token', r.status === 403, `${r.status}`);
}

// 9. A real mutation with the CSRF header, then cleanup
let createdId = '';
{
  const r = await call(API, '/api/v1/clients', { method: 'POST', body: { name: `Production probe ${randomUUID().slice(0, 8)}`, company: 'Verification' } });
  createdId = r.json?.id ?? '';
  check('API creates a client (CSRF accepted)', r.status === 201 && !!createdId, `${r.status}`);
}
if (createdId) {
  const r = await call(API, `/api/v1/clients/${createdId}`, { method: 'DELETE' });
  check('API deletes the probe client', r.status === 200 || r.status === 204, `${r.status}`);
}

// 10. Cron endpoint is secret-gated
{
  const r = await call(API, '/api/cron/reminders', { auth: false, origin: false });
  check('API cron rejects a call without the secret', r.status === 401, `${r.status}`);
  if (process.env.CRON_SECRET) {
    const ok = await call(API, '/api/cron/reminders', { auth: false, origin: false, headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    check('API cron accepts the secret', ok.status === 200 || ok.status === 201, `${ok.status} ${ok.text.slice(0, 80)}`);
  }
}

// 11. Stripe webhook signature verification (no Stripe key configured -> the endpoint must
//     still validate the signature before touching the database).
{
  const payload = JSON.stringify({ id: `evt_verify_${randomUUID().slice(0, 8)}`, type: 'checkout.session.completed', data: { object: {} } });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret) {
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
    const r = await call(API, '/api/v1/billing/webhooks/stripe', { method: 'POST', body: payload, auth: false, origin: false, headers: { 'content-type': 'application/json', 'stripe-signature': `t=${ts},v1=${sig}` } });
    check('API Stripe webhook verifies a valid signature', r.status === 201 || r.status === 200, `${r.status} ${r.text.slice(0, 90)}`);
  }
  const bad = await call(API, '/api/v1/billing/webhooks/stripe', { method: 'POST', body: payload, auth: false, origin: false, headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' } });
  const stripeConfigured = !!secret;
  check(stripeConfigured ? 'API Stripe webhook rejects a tampered signature' : 'API Stripe webhook is explicitly unavailable without a key',
    stripeConfigured ? bad.status === 400 : bad.status === 503, `${bad.status} ${bad.text.slice(0, 90)}`);
}

// 12. The web origin proxies to the API (same-site cookies, no CORS)
{
  const r = await call(WEB, '/api/v1/health/ready', { auth: false, origin: false });
  check('Web origin proxies /api/v1 to the API', r.status === 200 && r.json?.database === 'up', `${r.status} ${r.text.slice(0, 80)}`);
}

// 13. The web app serves the login page
{
  const r = await call(WEB, '/login', { auth: false, origin: false });
  check('Web /login renders', r.status === 200 && r.text.includes('<html'), `${r.status}`);
}

// 14. Login through the web origin (the path the browser actually uses)
{
  jar.clear(); csrf = ''; orgId = '';
  const r = await call(WEB, '/api/v1/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD }, auth: false });
  check('Web-origin login sets cookies', r.status === 200 && jar.has('agencyos_access'), `${r.status}`);
  const me = await call(WEB, '/api/v1/auth/me');
  check('Web-origin /auth/me', me.status === 200 && me.json?.email === EMAIL, `${me.status}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed against production.`);
if (failed.length) { console.log('Failed:', failed.map((f) => f.name).join('; ')); process.exitCode = 1; }

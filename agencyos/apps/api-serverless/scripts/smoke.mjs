/**
 * Local rehearsal of the Vercel Node runtime before deploying.
 * Builds the function, then serves it through an HTTP server that reproduces the platform's
 * awkward behaviour: the request stream is consumed first and the original bytes are only
 * replayed through data/end listeners, with a lazy JSON `req.body` getter installed.
 *
 * Run: npm run smoke   (uses DATABASE_URL from the repo .env)
 */
import { createServer } from 'http';
import { once } from 'events';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHmac, randomUUID } from 'crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
process.env.VERCEL = '1';
process.env.NODE_ENV = 'development';
process.env.CRON_SECRET ||= 'smoke-cron-secret';
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_smoke_test_secret';
process.env.STRIPE_SECRET_KEY ||= 'sk_test_smoke_local_only';

const mod = await import('../dist/api/[...path].js');
const handler = mod.default?.default ?? mod.default;

const server = createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks);
    // Vercel-shaped request: stream already ended, bytes replayed, lazy parsed body.
    const listeners = { data: [], end: [], error: [] };
    const fake = Object.assign(Object.create(Object.getPrototypeOf(req)), req, {
      on(ev, fn) { (listeners[ev] ||= []).push(fn); return this; },
      once(ev, fn) { (listeners[ev] ||= []).push(fn); return this; },
    });
    Object.defineProperty(fake, 'readableEnded', { configurable: true, get: () => true });
    // The platform pre-parses the query string into an own `req.query` property.
    const qIdx = (req.url || '').indexOf('?');
    if (qIdx > -1) fake.query = Object.fromEntries(new URLSearchParams(req.url.slice(qIdx + 1)));
    Object.defineProperty(fake, 'body', { configurable: true, get: () => (raw.length ? JSON.parse(raw.toString('utf8')) : undefined) });
    const result = handler(fake, res);
    setImmediate(() => { for (const fn of listeners.data) fn(raw); for (const fn of listeners.end) fn(); });
    Promise.resolve(result).catch((e) => { console.error(e); res.statusCode = 500; res.end('{}'); });
  });
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const health = await fetch(`${base}/api/v1/health/ready`).then((r) => r.json());
check('GET /health/ready', health.status === 'ok' || health.database === 'up', JSON.stringify(health));

const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@agencyos.dev', password: 'DemoPass123!' }) });
const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]);
const session = await login.json();
check('POST /auth/login (raw body replayed through Express)', login.status === 200 && !!session.user, `status ${login.status}`);

const cookie = cookies.join('; ');
const csrf = /agencyos_csrf=([^;]+)/.exec(cookie)?.[1];
const orgs = await fetch(`${base}/api/v1/organizations`, { headers: { cookie } }).then((r) => r.json());
const org = (Array.isArray(orgs) ? orgs : orgs.data)[0].id;
const me = await fetch(`${base}/api/v1/auth/me`, { headers: { cookie } }).then((r) => r.json());
check('GET /auth/me with HTTP-only cookies', me.email === 'owner@agencyos.dev', JSON.stringify(me).slice(0, 80));

const denied = await fetch(`${base}/api/v1/clients`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-organization-id': org }, body: JSON.stringify({ name: 'CSRF probe' }) });
check('POST without x-csrf-token is rejected', denied.status === 403, `status ${denied.status}`);

const created = await fetch(`${base}/api/v1/clients`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrf), 'x-organization-id': org, origin: 'http://localhost:3000' }, body: JSON.stringify({ name: `Serverless smoke ${randomUUID().slice(0, 8)}` }) });
const client = await created.json();
check('POST /clients with CSRF token (body parsed once, correctly)', created.status === 201, `status ${created.status} ${JSON.stringify(client).slice(0,200)}`);
if (created.status === 201) await fetch(`${base}/api/v1/clients/${client.id}`, { method: 'DELETE', headers: { cookie, 'x-csrf-token': decodeURIComponent(csrf), 'x-organization-id': org, origin: 'http://localhost:3000' } });

// multipart/form-data goes through multer, which needs a real stream.
const form = new FormData();
form.append('file', new Blob([`serverless upload ${new Date().toISOString()}\n`], { type: 'text/plain' }), 'serverless-smoke.txt');
const upload = await fetch(`${base}/api/v1/documents/upload`, { method: 'POST', headers: { cookie, 'x-csrf-token': decodeURIComponent(csrf), 'x-organization-id': org, origin: 'http://localhost:3000' }, body: form, signal: AbortSignal.timeout(20000) });
const uploadText = await upload.text();
let doc = {}; try { doc = JSON.parse(uploadText); } catch { console.log('UPLOAD NON-JSON RESPONSE:', uploadText.slice(0, 600)); }
check('POST /documents/upload (multipart through multer)', upload.status === 201, `status ${upload.status} ${JSON.stringify(doc).slice(0, 120)}`);
if (upload.status === 201) {
  const dl = await fetch(`${base}/api/v1/documents/${doc.id}/download`, { headers: { cookie, 'x-organization-id': org } });
  check('GET /documents/:id/download returns the stored bytes', dl.status === 200 && (await dl.text()).startsWith('serverless upload'), `status ${dl.status}`);
  await fetch(`${base}/api/v1/documents/${doc.id}`, { method: 'DELETE', headers: { cookie, 'x-csrf-token': decodeURIComponent(csrf), 'x-organization-id': org, origin: 'http://localhost:3000' } });
}

// Stripe signs the exact bytes, including this deliberate whitespace.
const payload = `{\n  "id": "evt_smoke_${randomUUID().slice(0, 8)}",  "object": "event",\n  "type": "checkout.session.completed",\n  "data": { "object": { "id": "cs_smoke", "metadata": {}, "amount_total": 100 } }\n}`;
const t = Math.floor(Date.now() / 1000);
const sig = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest('hex');
const hook = await fetch(`${base}/api/v1/billing/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${sig}` }, body: payload });
const hookBody = await hook.json();
check('Stripe webhook signature verifies on the raw replayed bytes', hook.status < 300 && hookBody.received === true, `status ${hook.status} ${JSON.stringify(hookBody).slice(0, 120)}`);

const badSig = await fetch(`${base}/api/v1/billing/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${'0'.repeat(64)}` }, body: payload });
check('Tampered Stripe signature is rejected', badSig.status === 400, `status ${badSig.status}`);

const cronUnauth = await fetch(`${base}/api/cron/reminders`);
check('Cron endpoint requires the shared secret', cronUnauth.status === 401, `status ${cronUnauth.status}`);
const cron = await fetch(`${base}/api/cron/reminders`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }).then((r) => r.json());
check('Cron endpoint runs the reminder job', typeof cron.created === 'number', JSON.stringify(cron));

const docs = await fetch(`${base}/api/docs-json`).then((r) => r.json());
check('OpenAPI document is served', Object.keys(docs.paths ?? {}).length > 60, `${Object.keys(docs.paths ?? {}).length} paths`);

// Regression: Vercel fills the dynamic route capture into the query string (`?path=v1/projects`
// for the rewrite, `?...path=` for the native catch-all). The handler must strip that artifact,
// otherwise every paginated list dies in ValidationPipe with "property path should not exist".
const injected = await fetch(`${base}/api/v1/projects?path=v1%2Fprojects`, { headers: { cookie, 'x-organization-id': org } });
const injectedBody = await injected.json();
check('Vercel route-capture query param is stripped (paginated lists work)', injected.status === 200 && Array.isArray(injectedBody.data), `status ${injected.status} ${JSON.stringify(injectedBody).slice(0, 120)}`);

// Regression: query filters must be declared on the bound DTO, or forbidNonWhitelisted rejects
// them ("property status should not exist") even though the controller reads them.
const filtered = await fetch(`${base}/api/v1/tasks?status=TODO&limit=5`, { headers: { cookie, 'x-organization-id': org } });
const filteredBody = await filtered.json();
check('GET /tasks?status=TODO (query filters accepted)', filtered.status === 200 && Array.isArray(filteredBody.data), `status ${filtered.status}`);

console.log(`\n${pass} passed, ${fail} failed`);
server.close();
process.exit(fail ? 1 : 0);

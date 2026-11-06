import type { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import type { Express } from 'express';
import { createApp } from '../runtime/bootstrap';

/**
 * Vercel function entrypoint (catch-all).
 *
 * Two platform details are handled here rather than in the domain code:
 *
 * 1. Cold starts: the Nest application is created once per container and reused by every
 *    warm invocation. A failed bootstrap clears the cache so the next request retries.
 *
 * 2. Request bodies: Vercel's Node helper consumes the request stream and exposes a lazy
 *    `req.body` getter that JSON.parses it. Re-serialising that object would break Stripe
 *    signature verification (the HMAC covers the exact bytes) and would leave multer with
 *    an empty stream. So we never touch `req.body`: we read the original bytes that the
 *    runtime replays through the `data`/`end` listeners and hand Express a fresh readable
 *    request. Every middleware — body-parser, cookie-parser, multer — then behaves exactly
 *    as it does on the long-running server.
 */

let cached: Promise<Express> | undefined;

function getApp(): Promise<Express> {
  if (!cached) cached = createApp().catch((error) => { cached = undefined; throw error; });
  return cached;
}

function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const hasBody = req.headers['transfer-encoding'] !== undefined || Number(req.headers['content-length'] ?? 0) > 0;
  if (!hasBody) return Promise.resolve(Buffer.alloc(0));

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks)); } };
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.once('end', finish);
    req.once('error', (error) => { if (!settled) { settled = true; reject(error); } });
    // Safety net: if the platform already ended the stream without replaying it, fail fast
    // instead of hanging until the function times out.
    if ((req as unknown as Readable).readableEnded) setTimeout(finish, 250).unref?.();
  });
}

/**
 * multer/busboy need a readable stream, but the platform already consumed the original one.
 * Express re-points the request prototype at its own `app.request`, so inherited properties
 * are not enough: every HTTP field has to be an own property of the replayed request.
 * We copy them, then re-initialise just the stream state around the original bytes.
 */
function replayRequest(req: IncomingMessage, raw: Buffer): IncomingMessage {
  const child = Object.create(Object.getPrototypeOf(req)) as IncomingMessage;
  Object.assign(child, req);
  const target = child as unknown as Record<string, unknown>;
  // The platform may install its own `on`/`once` wrappers as own properties; drop them so the
  // replayed request uses the real EventEmitter methods against its own listener table.
  for (const key of ['on', 'once', 'off', 'addListener', 'removeListener', 'removeAllListeners', 'emit', 'prependListener', 'prependOnceListener', 'listeners', 'rawListeners', 'listenerCount', 'eventNames']) delete target[key];
  target._events = Object.create(null);
  target._eventsCount = 0;
  Readable.call(child, { read() {} });
  const stream = child as unknown as Readable;
  // Feed the bytes after the middleware chain has attached its readers.
  setImmediate(() => { if (raw.length) stream.push(raw); stream.push(null); });
  target.rawBody = raw;
  target.originalUrl = req.url;
  return child;
}

/**
 * Vercel fills a dynamic route's capture group into the query string: the catch-all receives
 * `?...path=v1/projects` and the `/api/:path*` rewrite receives `?path=v1/projects`. Those are
 * routing artifacts, not API inputs, and the global ValidationPipe (forbidNonWhitelisted) would
 * reject every paginated list with "property path should not exist". Strip them, but only when
 * the value is exactly the captured route tail, so a genuine query parameter is never touched.
 */
function stripPlatformRouteParams(req: IncomingMessage): void {
  const url = req.url ?? '/';
  const q = url.indexOf('?');
  if (q === -1) return;
  const pathname = url.slice(0, q);
  const params = new URLSearchParams(url.slice(q + 1));
  const tail = pathname.replace(/^\/api\//, '');
  let changed = false;
  for (const key of ['path', '...path']) {
    const value = params.get(key);
    if (value === null) continue;
    if (value === tail || value === decodeURIComponent(tail)) { params.delete(key); changed = true; }
  }
  if (changed) {
    const qs = params.toString();
    req.url = pathname + (qs ? `?${qs}` : '');
  }

  // The Vercel Node bridge ALSO pre-parses the query into an own `req.query` property, which
  // shadows Express' lazy getter. Cleaning `req.url` alone is therefore not enough: the object
  // has to be cleaned too, or ValidationPipe still sees the routing artifact.
  const target = req as unknown as Record<string, unknown>;
  const query = target.query;
  if (!query || typeof query !== 'object') return;
  const cleaned = { ...(query as Record<string, unknown>) };
  let queryChanged = false;
  for (const key of ['path', '...path']) {
    const value = cleaned[key];
    if (typeof value === 'string' && (value === tail || value === decodeURIComponent(tail))) {
      delete cleaned[key];
      queryChanged = true;
    }
  }
  if (queryChanged) {
    Object.defineProperty(req, 'query', { value: cleaned, writable: true, configurable: true, enumerable: true });
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    stripPlatformRouteParams(req);
    const app = await getApp();
    const raw = await readRawBody(req);
    const contentType = String(req.headers['content-type'] ?? '');
    if (contentType.startsWith('multipart/')) {
      // multer/busboy need a real stream: hand Express a replayed request.
      app(replayRequest(req, raw), res);
      return;
    }
    // Everything else: keep the platform's original request object (guards, IP tracking and
    // Express internals rely on it) and mark the body as already parsed so body-parser skips it.
    const target = req as unknown as Record<string, unknown>;
    target.rawBody = raw;
    let parsed: unknown = {};
    if (raw.length && contentType.includes('application/json')) parsed = JSON.parse(raw.toString('utf8'));
    else if (raw.length && contentType.includes('application/x-www-form-urlencoded')) parsed = Object.fromEntries(new URLSearchParams(raw.toString('utf8')));
    Object.defineProperty(req, 'body', { value: parsed, writable: true, configurable: true, enumerable: true });
    target._body = true;
    app(req, res);
  } catch (error) {
    // Never leak internals; the structured API error shape is produced by the Nest filter
    // for everything that reaches the application.
    console.error('[agencyos] serverless bootstrap failed', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ statusCode: 500, code: 'BOOTSTRAP_FAILED', message: 'The API failed to start. Check the deployment environment variables.' }));
    }
  }
}

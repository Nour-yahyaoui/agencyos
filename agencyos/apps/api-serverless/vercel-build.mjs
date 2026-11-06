/**
 * Vercel build step.
 *
 * Normal path (git integration, or `vercel deploy` from this folder): the sources are already
 * on disk, so this only generates the Prisma client.
 *
 * Connector path: the Arena Vercel connector uploads a handful of small files per call, which
 * is not enough for a 73-file Nest application. For that path the source tree is staged in the
 * project's own Neon database (table `_agencyos_deploy_source`) and materialised here, verified
 * against a SHA-256 pinned in this file. No third-party host, no extra credentials: the build
 * uses the DATABASE_URL the deployment already has. The staging row is dropped after deploy.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import pg from 'pg';

const SOURCE_ID = 'api-serverless-v1';
const SOURCE_SHA256 = 'ba12185d7cdd7e64201b0799b1bc60501c86e60c887503e3b9eb72a71f829d2a';

async function materialise() {
  // Drop Prisma/pgBouncer-specific query parameters; node-postgres only needs the endpoint,
  // and TLS certificate verification stays on.
  const url = new URL(process.env.DATABASE_URL);
  url.search = '';
  const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT payload, sha256 FROM _agencyos_deploy_source WHERE id = $1', [SOURCE_ID]);
    if (!rows.length) throw new Error(`No staged source row '${SOURCE_ID}'. Deploy from a checkout instead.`);
    const { payload, sha256 } = rows[0];
    const actual = createHash('sha256').update(payload).digest('hex');
    if (actual !== SOURCE_SHA256 || sha256 !== SOURCE_SHA256) throw new Error(`Source checksum mismatch: expected ${SOURCE_SHA256}, got ${actual}`);
    const files = JSON.parse(payload);
    for (const [rel, contents] of Object.entries(files)) {
      const target = normalize(join(process.cwd(), rel));
      if (!target.startsWith(process.cwd())) throw new Error(`Refusing to write outside the project: ${rel}`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    console.log(`Materialised ${Object.keys(files).length} source files (sha256 verified).`);
  } finally {
    await client.end();
  }
}

if (!existsSync('prisma/schema.prisma')) await materialise();
execFileSync('npx', ['prisma', 'generate', '--schema', 'prisma/schema.prisma'], { stdio: 'inherit' });

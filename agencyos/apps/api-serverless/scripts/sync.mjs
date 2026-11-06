#!/usr/bin/env node
/**
 * apps/api/src is the single source of truth for domain code.
 * This script materialises it inside the serverless package so the folder is a
 * self-contained, independently deployable Vercel project (Vercel's file tracing
 * cannot follow imports outside the project root).
 *
 *   node scripts/sync.mjs           # refresh the copy
 *   node scripts/sync.mjs --check   # CI: fail if the copy drifted
 *
 * Excluded: main.ts (long-running bootstrap) and *.spec.ts (unit tests).
 */
import { cpSync, rmSync, mkdirSync, readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const api = resolve(pkg, '../api');
const check = process.argv.includes('--check');

const walk = (dir, base = dir) => readdirSync(dir).flatMap((entry) => {
  const full = join(dir, entry);
  return statSync(full).isDirectory() ? walk(full, base) : [relative(base, full)];
});
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

const jobs = [
  { from: join(api, 'src'), to: join(pkg, 'src'), filter: (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'main.ts' },
  { from: join(api, 'prisma'), to: join(pkg, 'prisma'), filter: (f) => f.endsWith('.prisma') || f.endsWith('.sql') || f.endsWith('.toml') },
];

let drifted = [];
for (const job of jobs) {
  const files = walk(job.from).filter(job.filter);
  if (!check) { rmSync(job.to, { recursive: true, force: true }); mkdirSync(job.to, { recursive: true }); }
  for (const file of files) {
    const src = join(job.from, file);
    const dest = join(job.to, file);
    if (check) {
      if (!existsSync(dest) || hash(src) !== hash(dest)) drifted.push(relative(pkg, dest));
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(src, dest);
    }
  }
  if (check && existsSync(job.to)) {
    for (const file of walk(job.to)) if (!files.includes(file)) drifted.push(`${relative(pkg, join(job.to, file))} (stale)`);
  }
}

if (check) {
  if (drifted.length) { console.error('Serverless copy is out of date:\n' + drifted.join('\n')); process.exit(1); }
  console.log('Serverless copy matches apps/api.');
} else {
  console.log(`Synced domain code from apps/api into ${relative(resolve(pkg, '../..'), pkg)}.`);
}

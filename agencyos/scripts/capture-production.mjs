/**
 * Captures real browser screenshots of the LIVE production deployment.
 *
 *   node scripts/capture-production.mjs [--url https://agencyos-web-beryl.vercel.app]
 *
 * Requires Playwright + chromium (already installed in this workspace). Screenshots land in
 * docs/screenshots/production/. Every image is a real Chromium render of the deployed app
 * talking to the deployed API and the Neon database — no mocks, no local server.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const argUrl = process.argv.indexOf('--url');
const BASE = (argUrl > -1 ? process.argv[argUrl + 1] : 'https://agencyos-web-beryl.vercel.app').replace(/\/$/, '');
const OUT = 'docs/screenshots/production';
mkdirSync(OUT, { recursive: true });

const PASSWORD = process.env.DEMO_PASSWORD ?? 'DemoPass123!';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(45000);

const shots = [];
async function shot(name, path, { waitFor, fullPage = false } = {}) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  if (waitFor) await page.waitForSelector(waitFor, { state: 'visible' }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(900); // let charts finish animating
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage });
  shots.push(file);
  console.log(`captured ${file}  (${page.url()})`);
}

async function login(email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/(dashboard|portal|admin)/, { timeout: 45000 }).catch(() => {}),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
  await page.waitForLoadState('networkidle').catch(() => {});
}

// ---- Owner / agency staff -------------------------------------------------------------
await login('owner@agencyos.dev');
await shot('01-owner-dashboard', '/dashboard', { waitFor: 'text=Active projects' });
await shot('02-projects', '/projects', { waitFor: 'h1' });

// Open the first project to reach the Kanban board.
await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => {});
const firstProject = page.locator('a[href^="/projects/"]').first();
if (await firstProject.count()) {
  await firstProject.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/03-kanban-board.png` });
  shots.push(`${OUT}/03-kanban-board.png`);
  console.log(`captured ${OUT}/03-kanban-board.png  (${page.url()})`);
}

await shot('04-clients', '/clients', { waitFor: 'h1' });
await shot('05-analytics', '/analytics', { waitFor: 'h1' });
await shot('06-billing', '/billing', { waitFor: 'h1' });
await shot('07-support', '/support', { waitFor: 'h1' });
await shot('08-assistant-unavailable', '/assistant', { waitFor: 'h1' });

// ---- Client portal --------------------------------------------------------------------
await context.clearCookies();
await login('client@agencyos.dev');
await shot('09-client-portal', '/portal', { waitFor: 'h1' });

// ---- Platform admin -------------------------------------------------------------------
await context.clearCookies();
await login('admin@agencyos.dev');
await shot('10-platform-admin', '/admin', { waitFor: 'h1' });

await browser.close();
console.log(`\n${shots.length} production screenshots written to ${OUT}/`);

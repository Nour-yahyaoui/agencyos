/**
 * Demo *activity* seed — synthetic "everyday traffic" for the demo workspace.
 *
 * The deterministic base seed (`prisma/seed.ts`) creates the demo organization,
 * accounts and a handful of records. This script layers ~1,000+ additional,
 * clearly-labelled synthetic rows on top (clients, projects, tasks, comments,
 * invoices, payments, notifications, audit events — spread over the past ~4
 * months) so the demo environment looks like a working agency instead of an
 * empty shell.
 *
 * Rules it follows:
 *  - Development/demo only: refuses to run with NODE_ENV=production.
 *  - All data is fictional (example.com domains, invented companies/people).
 *  - Every row carries a `demo-activity-*` primary key or marker; re-running
 *    the script deletes and re-creates exactly those rows. Nothing created by
 *    `seed.ts` or by real usage is touched.
 *  - Payment/webhook rows use `demo_*` provider ids and are marked
 *    `metadata: { seed: true, synthetic: true }` — never live Stripe data.
 *
 * Usage (after `npm run db:seed`):
 *   npm run db:seed:activity
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'DemoPass123!';
const NOW = Date.now();
const DAY = 86_400_000;
const WINDOW_DAYS = 120; // ~4 months of activity
const ID = (kind: string, seq: number | string) => `demo-activity-${kind}-${seq}`;
const PREFIX = 'demo-activity-';

// Deterministic PRNG so re-runs produce the same dataset.
let state = 20261107;
function rnd(): number {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
/** A timestamp uniformly spread between `maxBackDays` and `minBackDays` ago (defaults: whole window). */
const ago = (maxBackDays = WINDOW_DAYS, minBackDays = 0) =>
  new Date(NOW - (minBackDays + rnd() * (maxBackDays - minBackDays)) * DAY);
const clampToPast = (d: Date) => (d.getTime() > NOW ? new Date(NOW - int(1, 18) * 3_600_000) : d);
const daysFromNow = (n: number) => new Date(NOW + n * DAY);

const COMPANIES: ReadonlyArray<{ name: string; slug: string }> = [
  { name: 'Lumen Labs', slug: 'lumenlabs' },
  { name: 'Harbor & Finch', slug: 'harborfinch' },
  { name: 'Copper Canyon Outdoors', slug: 'coppercanyon' },
  { name: 'Fernhill Analytics', slug: 'fernhill' },
  { name: 'Blue Cedar Robotics', slug: 'bluecedar' },
  { name: 'Northwind Bakery Co', slug: 'northwindbakery' },
  { name: 'Atlas Freight', slug: 'atlasfreight' },
  { name: 'Willow Creek Resorts', slug: 'willowcreek' },
  { name: 'Beacon Hill Legal', slug: 'beaconhill' },
  { name: 'Juniper Software', slug: 'junipersoft' },
  { name: 'Marble & Main', slug: 'marblemain' },
  { name: 'Riverstone Fintech', slug: 'riverstone' },
  { name: 'Golden Hour Studios', slug: 'goldenhour' },
  { name: 'Pine Harbor Logistics', slug: 'pineharbor' },
  { name: 'Sage & Sparrow', slug: 'sagesparrow' },
  { name: 'Brightpath Education', slug: 'brightpath' },
  { name: 'Ironwood Capital', slug: 'ironwoodcap' },
  { name: 'Cedar Gate Properties', slug: 'cedargate' },
  { name: 'Moss & Meridian', slug: 'mossmeridian' },
  { name: 'Volt Mobility', slug: 'voltmobility' },
  { name: 'Prairie Bloom Farms', slug: 'prairiebloom' },
  { name: 'Silverline Media', slug: 'silverlinemedia' },
  { name: 'Oak & Olive Interiors', slug: 'oakolive' },
  { name: 'True North Insurance', slug: 'truenorthins' },
  { name: 'Koa Marine', slug: 'koamarine' },
  { name: 'Aurora Skincare', slug: 'auroraskincare' },
  { name: 'Driftline Travel', slug: 'driftline' },
  { name: 'Harvest Moon Foods', slug: 'harvestmoon' },
];

const FIRST_NAMES = ['Dana', 'Marcus', 'Priya', 'Elena', 'Tom', 'Aisha', 'Lucas', 'Marta', 'Owen', 'Nina', 'Jonas', 'Leila', 'Theo', 'Ines', 'Rafael', 'Clara', 'Andre', 'Maya', 'Julian', 'Sara', 'Dev', 'Alicia', 'Bruno', 'Farah'];
const LAST_NAMES = ['Kowalski', 'Bennett', 'Silva', 'Moreau', 'Lindqvist', 'Haddad', 'Costa', 'Novak', 'Ferrari', 'Kim', 'Meyer', 'Dubois', 'Santos', 'Larsen', 'Weber', 'Rocha', 'Fischer', 'Alami', 'Pereira', 'Keller'];
const JOB_TITLES = ['VP Product', 'Engineering Lead', 'Operations Director', 'Head of Growth', 'Founder', 'Marketing Manager', 'CTO', 'Project Sponsor', 'IT Manager', 'Chief of Staff'];
const TASK_TITLES = [
  'Wire up analytics dashboard', 'Refactor onboarding flow', 'Write API contract tests', 'Polish mobile navigation', 'Set up staging environment',
  'Design empty states', 'Migrate billing webhook handler', 'Fix race condition in sync', 'Add CSV export pagination', 'Review accessibility labels',
  'Optimize hero image payloads', 'Draft release notes', 'Triage support backlog', 'Add rate limiting to login', 'Instrument error reporting',
  'Update design tokens', 'Load test checkout endpoint', 'Simplify permission checks', 'Document deploy runbook', 'Rotate staging secrets',
  'Backfill invoice PDFs', 'Tighten CSP headers', 'Rebuild search indexer', 'Split notification workers', 'Improve empty-cart copy',
  'Add optimistic UI to Kanban', 'Cache organization settings', 'Verify Stripe webhook retries', 'Plan sprint 14 scope', 'Regression pass on portal',
];
const TICKET_SUBJECTS: Array<[string, string]> = [
  ['Export button hangs on large reports', 'CSV export spins forever on reports over ~8k rows.'],
  ['SAML SSO for client portal', 'We need SAML SSO scoped for company-wide rollout.'],
  ['Invoice PDF missing logo', 'The logo renders on screen but not in downloaded PDFs.'],
  ['Task notifications delayed', 'Deadline reminders arrive hours late for some members.'],
  ['Budget vs actuals report request', 'Can we get a monthly budget burn export for our board?'],
  ['Permission issue on documents', 'Two teammates cannot open the shared brand folder.'],
  ['Wrong timezone on deadlines', 'Due dates shift by one day for our EU office.'],
  ['Add custom fields to tasks', 'We need 2 extra fields: squad and external ticket id.'],
  ['Portal login loop on Safari', 'Sign-in works on Chrome but loops back to /login on Safari.'],
  ['Payment receipt email wording', 'Receipt email says "subscription" but we are project-based.'],
  ['Milestone dates not syncing', 'Milestone due date changes do not reflect in calendar feed.'],
  ['Quarterly access review', 'Please remove two departed contractors from the workspace.'],
];
const COMMENT_BODIES = [
  'Picked this up today, should have a first pass by tomorrow.',
  'Can we get eyes on the edge cases here before merging?',
  'Reproduced locally — it is the same pagination bug as last sprint.',
  'Client approved the direction in yesterday’s call, proceeding.',
  'Blocked on credentials for the staging bucket, following up.',
  'Nice — this drops the page weight by ~30%.',
  'Let’s split this into a follow-up rather than expanding scope.',
  'Verified on staging, looks good to ship.',
  'I left a couple of notes on the PR, nothing blocking.',
  'Moving to review — appreciate a second pair of eyes.',
  'Reminder: finance wants this before the month-end close.',
  'Pushed a fix and a regression test to cover it.',
];
const AUDIT_ACTIONS: Array<[string, string]> = [
  ['task.created', 'Task'], ['task.moved', 'Task'], ['task.completed', 'Task'],
  ['comment.added', 'Comment'], ['client.created', 'Client'], ['client.updated', 'Client'],
  ['project.created', 'Project'], ['project.status_changed', 'Project'],
  ['invoice.created', 'Invoice'], ['invoice.sent', 'Invoice'], ['invoice.paid', 'Invoice'],
  ['ticket.created', 'SupportTicket'], ['ticket.replied', 'SupportTicket'], ['ticket.resolved', 'SupportTicket'],
  ['document.uploaded', 'Document'], ['milestone.completed', 'Milestone'], ['member.invited', 'Invitation'],
];
const DOC_NAMES = ['Brand guidelines.pdf', 'SOW — Phase 1.pdf', 'Content model v3.pdf', 'Analytics plan.pdf', 'Security questionnaire.pdf', 'Roadmap 2026.pdf', 'Launch checklist.pdf', 'Architecture notes.pdf', 'Monthly report.pdf', 'Copy deck.pdf'];
const LINE_ITEMS = ['Sprint implementation', 'Design system', 'Discovery workshop', 'Monthly retainer', 'QA & hardening', 'API integration', 'Content migration', 'Performance audit', 'Support hours', 'Milestone delivery'];

function personName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function cleanup() {
  await prisma.notification.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.auditEvent.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.comment.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.payment.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.invoice.deleteMany({ where: { id: { startsWith: PREFIX } } }); // items cascade
  await prisma.taskDependency.deleteMany({ where: { taskId: { startsWith: PREFIX } } });
  await prisma.task.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.milestone.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.project.deleteMany({ where: { id: { startsWith: PREFIX } } }); // members cascade
  await prisma.supportTicket.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.document.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.invitation.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.membership.deleteMany({ where: { userId: { startsWith: PREFIX } } });
  await prisma.contact.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.client.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.webhookEvent.deleteMany({ where: { eventId: { startsWith: 'demo-activity-wh-' } } });
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to run demo activity seed in production');

  const org = await prisma.organization.findUnique({ where: { slug: 'northstar-studio' } });
  if (!org) throw new Error('Demo organization "northstar-studio" not found — run `npm run db:seed` first.');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const baseUsers = await prisma.user.findMany({ where: { email: { in: ['owner@agencyos.dev', 'manager@agencyos.dev', 'dev@agencyos.dev', 'dev2@agencyos.dev', 'client@agencyos.dev'] } } });
  const base = Object.fromEntries(baseUsers.map((u) => [u.email.split('@')[0], u])) as Record<string, (typeof baseUsers)[number]>;
  if (!base.owner || !base.manager || !base.dev || !base.dev2 || !base.client) throw new Error('Base demo users missing — run `npm run db:seed` first.');

  await cleanup();

  // --- 1. Synthetic staff (4) ---------------------------------------------
  const staffDefs = [
    { key: 'sofia', email: 'sofia@agencyos.dev', name: 'Sofia Almeida', role: 'MANAGER' as const },
    { key: 'liam', email: 'liam@agencyos.dev', name: 'Liam O’Connor', role: 'DEVELOPER' as const },
    { key: 'nina', email: 'nina@agencyos.dev', name: 'Nina Petrova', role: 'DEVELOPER' as const },
    { key: 'omar', email: 'omar@agencyos.dev', name: 'Omar Haddad', role: 'DEVELOPER' as const },
  ];
  const staff: Record<string, { id: string }> = {};
  let staffSeq = 0;
  for (const s of staffDefs) {
    const id = ID('user', `staff-${staffSeq++}`);
    await prisma.user.create({ data: { id, email: s.email, name: s.name, passwordHash, createdAt: ago(200, 90) } });
    await prisma.membership.create({ data: { organizationId: org.id, userId: id, role: s.role } });
    staff[s.key] = { id };
  }
  const staffIds = [base.owner.id, base.manager.id, base.dev.id, base.dev2.id, ...Object.values(staff).map((s) => s.id)];
  const deliveryIds = [base.dev.id, base.dev2.id, ...Object.values(staff).map((s) => s.id)];

  // --- 2. Clients + contacts (+ portal logins for 8) ----------------------
  const clients: Array<{ id: string; slug: string; company: string }> = [];
  const portalUserIds: string[] = [];
  let invoiceSeq = 200;
  let clientSeq = 0;
  for (const c of COMPANIES) {
    const seq = clientSeq++;
    const id = ID('client', seq);
    const createdAt = ago(WINDOW_DAYS, 20);
    const status = pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ONBOARDING', 'ONBOARDING', 'LEAD'] as const);
    await prisma.client.create({
      data: {
        id,
        organizationId: org.id,
        name: c.name,
        company: `${c.name} Ltd.`,
        status,
        website: `https://${c.slug}.example.com`,
        notes: `Fictional demo client (${c.name}). Prefers async updates and a weekly written summary.`,
        accountManagerId: chance(0.7) ? base.manager.id : staff.sofia.id,
        createdAt,
        onboardingSteps: [
          { key: 'discovery', label: 'Discovery call completed', done: true },
          { key: 'contract', label: 'Contract signed', done: true },
          { key: 'portal', label: 'Client portal access sent', done: true },
          { key: 'kickoff', label: 'Project kickoff scheduled', done: status !== 'LEAD' },
        ],
      },
    });
    // 1-2 contacts per client
    const contactCount = int(1, 2);
    for (let i = 0; i < contactCount; i++) {
      const isPrimary = i === 0;
      const contactName = personName();
      await prisma.contact.create({
        data: {
          id: ID('contact', `${seq}-${i}`),
          clientId: id,
          name: contactName,
          email: `${slugify(contactName)}@${c.slug}.example.com`,
          jobTitle: pick(JOB_TITLES),
          isPrimary,
          createdAt,
        },
      });
      // Portal login for the primary contact of ~8 clients
      if (isPrimary && portalUserIds.length < 8 && chance(0.5)) {
        const portalId = ID('user', `portal-${seq}`);
        await prisma.user.create({ data: { id: portalId, email: `${slugify(contactName)}@${c.slug}.example.com`, name: contactName, passwordHash, createdAt } });
        await prisma.membership.create({ data: { organizationId: org.id, userId: portalId, role: 'CLIENT', clientId: id } });
        portalUserIds.push(portalId);
      }
    }
    clients.push({ id, slug: c.slug, company: c.name });
  }

  // --- 3. Projects, members, milestones, tasks -----------------------------
  const createdTasks: Array<{ id: string; projectId: string; createdAt: Date }> = [];
  const createdProjects: Array<{ id: string; clientId: string; createdAt: Date; status: string }> = [];
  const createdMilestones: Array<{ id: string }> = [];
  let projectSeq = 0;
  let taskSeq = 0;
  let milestoneSeq = 0;
  for (const client of clients) {
    const projectCount = int(1, 2);
    for (let pi = 0; pi < projectCount; pi++) {
      const projectId = ID('project', projectSeq++);
      const projectCreated = ago(WINDOW_DAYS, 15);
      const status = pick(['COMPLETED', 'COMPLETED', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PLANNED', 'ON_HOLD'] as const);
      const duration = int(30, 95);
      const startDate = projectCreated;
      const dueDate = new Date(startDate.getTime() + duration * DAY);
      await prisma.project.create({
        data: {
          id: projectId,
          organizationId: org.id,
          clientId: client.id,
          name: pick(['Platform rebuild', 'Customer portal', 'Mobile MVP', 'Design system rollout', 'Commerce experience', 'Data platform', 'Marketing site', 'Internal tools', 'Client onboarding revamp', 'Analytics suite']) + ` — ${client.company}`,
          description: 'Synthetic demo project generated for everyday-traffic realism.',
          status,
          budget: int(15, 120) * 1000,
          currency: 'USD',
          startDate,
          dueDate,
          createdAt: projectCreated,
        },
      });
      const memberSet = new Set<string>([base.owner.id, base.manager.id, ...[pick(deliveryIds), pick(deliveryIds)]]);
      for (const userId of memberSet) {
        await prisma.projectMember.create({ data: { id: ID('pm', `${projectId}-${userId.slice(-6)}`), projectId, userId, createdAt: projectCreated } });
      }
      // Milestones
      const milestoneCount = int(1, 3);
      const milestoneIds: string[] = [];
      for (let mi = 0; mi < milestoneCount; mi++) {
        const milestoneId = ID('milestone', milestoneSeq++);
        const milestoneDue = new Date(startDate.getTime() + ((mi + 1) / (milestoneCount + 0.5)) * duration * DAY);
        const done = milestoneDue.getTime() < NOW && (status === 'COMPLETED' || chance(0.6));
        await prisma.milestone.create({
          data: {
            id: milestoneId,
            organizationId: org.id,
            projectId,
            name: pick(['Discovery & scoping', 'Design approval', 'Beta release', 'Content freeze', 'Production launch', 'Handover & training']),
            dueDate: milestoneDue,
            completedAt: done ? clampToPast(new Date(milestoneDue.getTime() - int(0, 6) * DAY)) : null,
            createdAt: projectCreated,
          },
        });
        milestoneIds.push(milestoneId);
        createdMilestones.push({ id: milestoneId });
      }
      // Tasks
      const taskCount = int(6, 11);
      for (let ti = 0; ti < taskCount; ti++) {
        const id = ID('task', taskSeq++);
        const createdAt = new Date(Math.min(NOW, projectCreated.getTime() + int(0, 30) * DAY));
        const doneRatio = status === 'COMPLETED' ? 0.9 : status === 'ON_HOLD' ? 0.25 : 0.45;
        const statusValue = chance(doneRatio)
          ? 'DONE'
          : pick(['BACKLOG', 'TODO', 'TODO', 'IN_PROGRESS', 'IN_PROGRESS', 'REVIEW'] as const);
        const taskDue = new Date(createdAt.getTime() + int(3, 28) * DAY);
        await prisma.task.create({
          data: {
            id,
            organizationId: org.id,
            projectId,
            milestoneId: milestoneIds.length && chance(0.6) ? pick(milestoneIds) : null,
            title: pick(TASK_TITLES),
            status: statusValue,
            priority: pick(['LOW', 'MEDIUM', 'MEDIUM', 'MEDIUM', 'HIGH', 'HIGH', 'URGENT'] as const),
            assigneeId: pick(deliveryIds),
            dueDate: taskDue,
            position: ti,
            estimatedHours: pick([2, 4, 6, 8, 8, 16, 24, 32]),
            completedAt: statusValue === 'DONE' ? clampToPast(new Date(createdAt.getTime() + int(1, 12) * DAY)) : null,
            createdAt,
          },
        });
        createdTasks.push({ id, projectId, createdAt });
      }
      createdProjects.push({ id: projectId, clientId: client.id, createdAt: projectCreated, status });
    }
  }

  // --- 4. Support tickets ---------------------------------------------------
  const createdTickets: Array<{ id: string; clientId: string; createdAt: Date }> = [];
  const allClientIds = clients.map((c) => c.id);
  for (let i = 0; i < TICKET_SUBJECTS.length; i++) {
    const [subject, description] = TICKET_SUBJECTS[i];
    const clientId = pick(allClientIds);
    const createdAt = ago(WINDOW_DAYS, 1);
    const status = pick(['RESOLVED', 'CLOSED', 'CLOSED', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] as const);
    const id = ID('ticket', i);
    await prisma.supportTicket.create({
      data: {
        id,
        organizationId: org.id,
        clientId,
        subject,
        description,
        status,
        priority: pick(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT'] as const),
        createdById: chance(0.6) ? (portalUserIds.length ? pick(portalUserIds) : base.client.id) : base.manager.id,
        assigneeId: chance(0.8) ? pick(deliveryIds) : null,
        createdAt,
      },
    });
    createdTickets.push({ id, clientId, createdAt });
  }

  // --- 5. Comments (tasks + tickets) ----------------------------------------
  let commentSeq = 0;
  const commentAuthors = [...staffIds, ...portalUserIds, base.client.id];
  for (const task of createdTasks) {
    if (!chance(0.35)) continue;
    const n = int(1, 2);
    for (let i = 0; i < n; i++) {
      await prisma.comment.create({
        data: {
          id: ID('comment', commentSeq++),
          organizationId: org.id,
          taskId: task.id,
          authorId: pick(commentAuthors),
          body: pick(COMMENT_BODIES),
          createdAt: new Date(Math.min(NOW - int(0, 48) * 3_600_000, task.createdAt.getTime() + int(1, 20) * DAY)),
        },
      });
    }
  }
  for (const ticket of createdTickets) {
    const n = int(1, 3);
    for (let i = 0; i < n; i++) {
      await prisma.comment.create({
        data: {
          id: ID('comment', commentSeq++),
          organizationId: org.id,
          ticketId: ticket.id,
          authorId: i % 2 === 0 ? pick(deliveryIds) : pick(commentAuthors),
          body: pick(COMMENT_BODIES),
          createdAt: new Date(Math.min(NOW - int(0, 48) * 3_600_000, ticket.createdAt.getTime() + int(1, 10) * DAY)),
        },
      });
    }
  }

  // --- 6. Documents (metadata only; files are not uploaded) ------------------
  for (let i = 0; i < DOC_NAMES.length; i++) {
    const clientId = pick(allClientIds);
    await prisma.document.create({
      data: {
        id: ID('doc', i),
        organizationId: org.id,
        clientId,
        name: DOC_NAMES[i],
        mimeType: 'application/pdf',
        sizeBytes: int(80_000, 4_500_000),
        storageKey: `demo-activity/${slugify(DOC_NAMES[i])}-${i}.pdf`,
        provider: 'LOCAL',
        uploadedById: pick(staffIds),
        createdAt: ago(WINDOW_DAYS, 1),
      },
    });
  }

  // --- 7. Invoices + items + payments ----------------------------------------
  const createdInvoices: Array<{ id: string; total: number; status: string }> = [];
  let invoiceCount = 0;
  for (const client of clients) {
    const n = int(1, 2);
    for (let i = 0; i < n; i++) {
      const issueDate = ago(WINDOW_DAYS, 5);
      const ageDays = (NOW - issueDate.getTime()) / DAY;
      const status =
        ageDays > 45 ? pick(['PAID', 'PAID', 'PAID', 'PAID', 'OVERDUE'] as const)
        : ageDays > 15 ? pick(['PAID', 'PAID', 'PAID', 'SENT', 'OVERDUE'] as const)
        : pick(['SENT', 'SENT', 'PAID', 'DRAFT'] as const);
      const id = ID('invoice', invoiceCount);
      const number = `INV-2026-${String(invoiceSeq++).padStart(4, '0')}`;
      const itemCount = int(2, 4);
      const items = Array.from({ length: itemCount }, () => {
        const quantity = int(1, 3);
        const unitPrice = pick([1500, 2500, 4000, 6000, 8000, 12000]);
        return { description: pick(LINE_ITEMS), quantity, unitPrice, amount: quantity * unitPrice };
      });
      const subtotal = items.reduce((s, it) => s + it.amount, 0);
      const taxRate = 8;
      const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
      const total = subtotal + taxAmount;
      const paidAt = status === 'PAID' ? clampToPast(new Date(issueDate.getTime() + int(2, 12) * DAY)) : null;
      const projectForInvoice = createdProjects.find((p) => p.clientId === client.id && p.createdAt <= issueDate);
      await prisma.invoice.create({
        data: {
          id,
          organizationId: org.id,
          clientId: client.id,
          projectId: projectForInvoice?.id ?? null,
          number,
          status,
          currency: 'USD',
          subtotal,
          taxRate,
          taxAmount,
          total,
          issueDate,
          dueDate: new Date(issueDate.getTime() + 14 * DAY),
          paidAt,
          notes: 'Demo invoice generated for activity realism. Payment due within 14 days.',
          createdAt: issueDate,
          items: { create: items },
        },
      });
      if (status === 'PAID' && paidAt) {
        await prisma.payment.create({
          data: {
            id: ID('payment', invoiceCount),
            organizationId: org.id,
            invoiceId: id,
            amount: total,
            currency: 'USD',
            status: 'SUCCEEDED',
            provider: 'stripe',
            providerPaymentId: `demo_pi_${invoiceCount}`,
            providerEventId: `demo_evt_${invoiceCount}`,
            createdAt: paidAt,
            metadata: { seed: true, synthetic: true, note: 'Deterministic demo payment; not a live Stripe transaction.' },
          },
        });
      } else if (status === 'OVERDUE' && chance(0.3)) {
        await prisma.payment.create({
          data: {
            id: ID('payment', invoiceCount),
            organizationId: org.id,
            invoiceId: id,
            amount: total,
            currency: 'USD',
            status: 'FAILED',
            provider: 'stripe',
            providerEventId: `demo_evt_fail_${invoiceCount}`,
            createdAt: new Date(issueDate.getTime() + int(3, 14) * DAY),
            metadata: { seed: true, synthetic: true },
          },
        });
      }
      createdInvoices.push({ id, total, status });
      invoiceCount++;
    }
  }

  // Webhook ledger (processed Stripe events)
  for (let i = 0; i < 12; i++) {
    await prisma.webhookEvent.create({
      data: {
        provider: 'stripe',
        eventId: `demo-activity-wh-${i}`,
        eventType: pick(['payment_intent.succeeded', 'invoice.paid', 'checkout.session.completed', 'payment_intent.payment_failed']),
        processedAt: ago(WINDOW_DAYS, 0),
      },
    });
  }

  // --- 8. Notifications --------------------------------------------------------
  const notificationTypes = ['PAYMENT', 'DEADLINE', 'PROJECT_ACTIVITY', 'SUPPORT', 'GENERAL'] as const;
  const notifTemplates: Record<(typeof notificationTypes)[number], Array<{ title: string; body: string; link: string }>> = {
    PAYMENT: [
      { title: 'Payment received', body: 'A client invoice was marked paid.', link: '/billing' },
      { title: 'Invoice overdue', body: 'An invoice passed its due date without payment.', link: '/billing' },
    ],
    DEADLINE: [
      { title: 'Deadline approaching', body: 'A task assigned to you is due soon.', link: '/tasks' },
      { title: 'Milestone due this week', body: 'A milestone on an active project is due soon.', link: '/projects' },
    ],
    PROJECT_ACTIVITY: [
      { title: 'New comment on your task', body: 'A teammate left an update on a task you follow.', link: '/projects' },
      { title: 'Task moved to review', body: 'A task was moved into review.', link: '/projects' },
    ],
    SUPPORT: [
      { title: 'Ticket updated', body: 'A support ticket changed status.', link: '/support' },
      { title: 'New support reply', body: 'A reply was posted on a support ticket.', link: '/support' },
    ],
    GENERAL: [
      { title: 'Weekly summary ready', body: 'Your agency summary for last week is ready to view.', link: '/analytics' },
      { title: 'Document uploaded', body: 'A new document was added to a client workspace.', link: '/documents' },
    ],
  };
  const notifReceivers = [...staffIds, ...portalUserIds, base.client.id];
  const NOTIF_COUNT = 170;
  const notifRows = Array.from({ length: NOTIF_COUNT }, (_, i) => {
    const type = pick(notificationTypes);
    const template = pick(notifTemplates[type]);
    const createdAt = ago(WINDOW_DAYS, 0);
    const read = chance(0.62);
    return {
      id: ID('notif', i),
      organizationId: org.id,
      userId: pick(notifReceivers),
      type,
      title: template.title,
      body: template.body,
      link: template.link,
      dedupeKey: `demo-activity-notif-${i}`,
      readAt: read ? clampToPast(new Date(createdAt.getTime() + int(1, 48) * 3_600_000)) : null,
      createdAt,
    };
  });
  await prisma.notification.createMany({ data: notifRows });

  // --- 9. Audit events -----------------------------------------------------------
  const entityPools: Record<string, string[]> = {
    Task: createdTasks.map((t) => t.id),
    Comment: [],
    Client: allClientIds,
    Project: createdProjects.map((p) => p.id),
    Invoice: createdInvoices.map((i) => i.id),
    SupportTicket: createdTickets.map((t) => t.id),
    Document: [],
    Milestone: createdMilestones.map((m) => m.id),
    Invitation: [],
  };
  const entityFallback: Record<string, string> = {
    Comment: createdTickets[0]?.id ?? allClientIds[0],
    Document: allClientIds[0],
    Invitation: allClientIds[0],
  };
  const AUDIT_COUNT = 240;
  const auditRows = Array.from({ length: AUDIT_COUNT }, (_, i) => {
    const [action, entityType] = pick(AUDIT_ACTIONS);
    const pool = entityPools[entityType]?.length ? entityPools[entityType] : [entityFallback[entityType] ?? allClientIds[0]];
    return {
      id: ID('audit', i),
      organizationId: org.id,
      actorId: pick(notifReceivers),
      action,
      entityType,
      entityId: pick(pool),
      metadata: { seed: true, synthetic: true },
      createdAt: ago(WINDOW_DAYS, 0),
    };
  });
  await prisma.auditEvent.createMany({ data: auditRows });

  // --- 10. Invitations ------------------------------------------------------------
  for (let i = 0; i < 6; i++) {
    const email = `${pick(FIRST_NAMES).toLowerCase()}.${pick(LAST_NAMES).toLowerCase()}@${pick(COMPANIES).slug}.example.com`;
    const expiresAt = i < 3 ? daysFromNow(int(3, 14)) : new Date(NOW - int(2, 30) * DAY);
    const accepted = i >= 3 && i < 5;
    await prisma.invitation.create({
      data: {
        id: ID('invite', i),
        organizationId: org.id,
        email,
        role: pick(['DEVELOPER', 'MANAGER', 'CLIENT'] as const),
        tokenHash: `demo-activity-token-hash-${i}`,
        expiresAt,
        acceptedAt: accepted ? new Date(NOW - int(1, 20) * DAY) : null,
        createdAt: new Date(expiresAt.getTime() - 14 * DAY),
      },
    });
  }

  // --- Summary ----------------------------------------------------------------------
  const counts = {
    clients: await prisma.client.count({ where: { id: { startsWith: PREFIX } } }),
    contacts: await prisma.contact.count({ where: { id: { startsWith: PREFIX } } }),
    users: await prisma.user.count({ where: { id: { startsWith: PREFIX } } }),
    projects: await prisma.project.count({ where: { id: { startsWith: PREFIX } } }),
    milestones: await prisma.milestone.count({ where: { id: { startsWith: PREFIX } } }),
    tasks: await prisma.task.count({ where: { id: { startsWith: PREFIX } } }),
    tickets: await prisma.supportTicket.count({ where: { id: { startsWith: PREFIX } } }),
    comments: await prisma.comment.count({ where: { id: { startsWith: PREFIX } } }),
    documents: await prisma.document.count({ where: { id: { startsWith: PREFIX } } }),
    invoices: await prisma.invoice.count({ where: { id: { startsWith: PREFIX } } }),
    payments: await prisma.payment.count({ where: { id: { startsWith: PREFIX } } }),
    notifications: await prisma.notification.count({ where: { id: { startsWith: PREFIX } } }),
    auditEvents: await prisma.auditEvent.count({ where: { id: { startsWith: PREFIX } } }),
    invitations: await prisma.invitation.count({ where: { id: { startsWith: PREFIX } } }),
    webhookEvents: await prisma.webhookEvent.count({ where: { eventId: { startsWith: 'demo-activity-wh-' } } }),
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(JSON.stringify({ seeded: true, scope: 'demo-activity', organization: org.slug, windowDays: WINDOW_DAYS, totalRows: total, counts, note: 'All synthetic demo data (example.com domains). Safe to delete: every row uses demo-activity-* ids.' }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

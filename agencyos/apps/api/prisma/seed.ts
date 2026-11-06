import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'DemoPass123!';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to run demo seed in production');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const days = (n: number) => new Date(Date.now() + n * 86400000);

  const org = await prisma.organization.upsert({
    where: { slug: 'northstar-studio' },
    update: {},
    create: { name: 'Northstar Studio', slug: 'northstar-studio', description: 'A product engineering agency delivering web platforms for ambitious teams.', subscription: { create: { plan: 'starter', status: 'TRIALING', seatLimit: 10 } } },
  });

  const users = [
    { email: 'owner@agencyos.dev', name: 'Nour Yahyaoui', role: 'OWNER' as const },
    { email: 'manager@agencyos.dev', name: 'Maya Chen', role: 'MANAGER' as const },
    { email: 'dev@agencyos.dev', name: 'Alex Rivera', role: 'DEVELOPER' as const },
    { email: 'dev2@agencyos.dev', name: 'Sam Okafor', role: 'DEVELOPER' as const },
    { email: 'client@agencyos.dev', name: 'Jordan Lee', role: 'CLIENT' as const },
    { email: 'admin@agencyos.dev', name: 'Platform Admin', role: 'OWNER' as const, platformRole: 'SUPER_ADMIN' as const },
  ];
  const created: Record<string, any> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({ where: { email: u.email }, update: { name: u.name }, create: { email: u.email, name: u.name, passwordHash, platformRole: u.platformRole ?? 'USER' } });
    created[u.role === 'CLIENT' ? 'client' : u.email.split('@')[0]] = user;
    if (u.email !== 'client@agencyos.dev') await prisma.membership.upsert({ where: { organizationId_userId: { organizationId: org.id, userId: user.id } }, update: { role: u.role }, create: { organizationId: org.id, userId: user.id, role: u.role } });
  }

  const acme = await prisma.client.upsert({ where: { id: 'seed-client-acme' }, update: {}, create: { id: 'seed-client-acme', organizationId: org.id, name: 'Acme Robotics', company: 'Acme Robotics Inc.', status: 'ACTIVE', website: 'https://acme.example.com', notes: 'Series A robotics company. Primary contact prefers weekly async updates.', accountManagerId: created.manager.id, onboardingSteps: [{ key: 'discovery', label: 'Discovery call completed', done: true }, { key: 'contract', label: 'Contract signed', done: true }, { key: 'portal', label: 'Client portal access sent', done: true }, { key: 'kickoff', label: 'Project kickoff scheduled', done: true }], contacts: { create: [{ name: 'Jordan Lee', email: 'jordan@acme.example.com', jobTitle: 'VP Product', isPrimary: true }, { name: 'Priya Patel', email: 'priya@acme.example.com', jobTitle: 'Engineering Lead' }] } } });
  const blue = await prisma.client.upsert({ where: { id: 'seed-client-blue' }, update: {}, create: { id: 'seed-client-blue', organizationId: org.id, name: 'Bluewave Health', company: 'Bluewave Health Ltd.', status: 'ONBOARDING', website: 'https://bluewave.example.com', accountManagerId: created.manager.id, onboardingSteps: [{ key: 'discovery', label: 'Discovery call completed', done: true }, { key: 'contract', label: 'Contract signed', done: true }, { key: 'portal', label: 'Client portal access sent', done: false }, { key: 'kickoff', label: 'Project kickoff scheduled', done: false }], contacts: { create: [{ name: 'Elena García', email: 'elena@bluewave.example.com', isPrimary: true }] } } });
  await prisma.membership.upsert({ where: { organizationId_userId: { organizationId: org.id, userId: created.client.id } }, update: { clientId: acme.id, role: 'CLIENT' }, create: { organizationId: org.id, userId: created.client.id, role: 'CLIENT', clientId: acme.id } });

  const projectData = [
    { id: 'seed-project-portal', name: 'Customer Portal v2', clientId: acme.id, status: 'ACTIVE' as const, budget: 48000, due: 24, desc: 'Rebuild the customer portal with self-serve onboarding, billing, and usage analytics.' },
    { id: 'seed-project-mobile', name: 'Field Ops Mobile App', clientId: acme.id, status: 'ACTIVE' as const, budget: 62000, due: 45, desc: 'Cross-platform field operations app for technicians with offline-first workflows.' },
    { id: 'seed-project-brand', name: 'Marketing Site Refresh', clientId: blue.id, status: 'PLANNED' as const, budget: 18000, due: 30, desc: 'New marketing site, CMS integration, and conversion-focused landing pages.' },
    { id: 'seed-project-data', name: 'Data Warehouse Migration', clientId: acme.id, status: 'ON_HOLD' as const, budget: 35000, due: -5, desc: 'Migrate legacy reporting into a modern warehouse with dbt models and dashboards.' },
  ];
  const projects: Record<string, any> = {};
  for (const p of projectData) {
    const project = await prisma.project.upsert({ where: { id: p.id }, update: {}, create: { id: p.id, organizationId: org.id, clientId: p.clientId, name: p.name, description: p.desc, status: p.status, budget: p.budget, currency: 'USD', startDate: days(-30), dueDate: days(p.due), members: { create: [{ userId: created.owner.id }, { userId: created.manager.id }, { userId: created.dev.id }, { userId: created.dev2.id }] } } });
    projects[p.id] = project;
  }

  const milestoneDefs = [
    { id: 'seed-ms-discovery', projectId: 'seed-project-portal', name: 'Discovery & architecture', due: -10, done: true },
    { id: 'seed-ms-beta', projectId: 'seed-project-portal', name: 'Beta release', due: 10, done: false },
    { id: 'seed-ms-launch', projectId: 'seed-project-portal', name: 'Production launch', due: 24, done: false },
    { id: 'seed-ms-mobile-proto', projectId: 'seed-project-mobile', name: 'Interactive prototype', due: 14, done: false },
    { id: 'seed-ms-mobile-beta', projectId: 'seed-project-mobile', name: 'Field beta', due: 35, done: false },
    { id: 'seed-ms-brand-wire', projectId: 'seed-project-brand', name: 'Wireframes approved', due: 12, done: false },
  ];
  for (const m of milestoneDefs) await prisma.milestone.upsert({ where: { id: m.id }, update: {}, create: { id: m.id, organizationId: org.id, projectId: m.projectId, name: m.name, dueDate: days(m.due), completedAt: m.done ? days(m.due) : null } });

  const taskDefs = [
    ['seed-project-portal', 'Finalize information architecture', 'DONE', 'HIGH', 'dev', -12, 'seed-ms-discovery'],
    ['seed-project-portal', 'Design system and component library', 'DONE', 'MEDIUM', 'dev2', -8, 'seed-ms-discovery'],
    ['seed-project-portal', 'Implement authentication flows', 'DONE', 'URGENT', 'dev', -5, 'seed-ms-beta'],
    ['seed-project-portal', 'Build dashboard analytics widgets', 'IN_PROGRESS', 'HIGH', 'dev', 3, 'seed-ms-beta'],
    ['seed-project-portal', 'Stripe billing integration', 'IN_PROGRESS', 'URGENT', 'dev2', 5, 'seed-ms-beta'],
    ['seed-project-portal', 'Client onboarding wizard', 'REVIEW', 'MEDIUM', 'dev', 2, 'seed-ms-beta'],
    ['seed-project-portal', 'Accessibility audit and fixes', 'TODO', 'HIGH', 'dev2', 8, 'seed-ms-launch'],
    ['seed-project-portal', 'Load testing and performance budget', 'BACKLOG', 'MEDIUM', 'dev', 15, 'seed-ms-launch'],
    ['seed-project-portal', 'Legacy data import script', 'TODO', 'HIGH', 'dev2', -2, 'seed-ms-beta'],
    ['seed-project-mobile', 'Offline sync architecture', 'IN_PROGRESS', 'URGENT', 'dev', 6, 'seed-ms-mobile-proto'],
    ['seed-project-mobile', 'Technician job list UI', 'TODO', 'MEDIUM', 'dev2', 10, 'seed-ms-mobile-proto'],
    ['seed-project-mobile', 'Push notification service', 'BACKLOG', 'LOW', 'dev', 20, 'seed-ms-mobile-beta'],
    ['seed-project-mobile', 'App store submission checklist', 'BACKLOG', 'MEDIUM', 'manager', 40, 'seed-ms-mobile-beta'],
    ['seed-project-brand', 'Stakeholder interviews', 'DONE', 'MEDIUM', 'manager', -3, 'seed-ms-brand-wire'],
    ['seed-project-brand', 'Wireframes and content model', 'TODO', 'HIGH', 'dev2', 9, 'seed-ms-brand-wire'],
    ['seed-project-data', 'Schema inventory', 'DONE', 'MEDIUM', 'dev', -20, null],
    ['seed-project-data', 'Migration runbook', 'TODO', 'HIGH', 'dev', -5, null],
  ] as const;
  const tasks: Record<string, any> = {};
  let pos = 0;
  for (const [projectId, title, status, priority, assignee, due, milestoneId] of taskDefs) {
    const id = `seed-task-${pos++}`;
    const task = await prisma.task.upsert({ where: { id }, update: {}, create: { id, organizationId: org.id, projectId, title, status, priority, assigneeId: created[assignee].id, dueDate: days(due), milestoneId, position: pos, completedAt: status === 'DONE' ? days(due) : null, estimatedHours: 4 + (pos % 5) * 4 } });
    tasks[title] = task;
  }
  await prisma.taskDependency.upsert({ where: { taskId_prerequisiteId: { taskId: tasks['Stripe billing integration'].id, prerequisiteId: tasks['Implement authentication flows'].id } }, update: {}, create: { taskId: tasks['Stripe billing integration'].id, prerequisiteId: tasks['Implement authentication flows'].id } });
  await prisma.taskDependency.upsert({ where: { taskId_prerequisiteId: { taskId: tasks['Load testing and performance budget'].id, prerequisiteId: tasks['Build dashboard analytics widgets'].id } }, update: {}, create: { taskId: tasks['Load testing and performance budget'].id, prerequisiteId: tasks['Build dashboard analytics widgets'].id } });

  const ticketDefs = [
    { id: 'seed-ticket-1', clientId: acme.id, subject: 'Unable to export usage report', description: 'The CSV export button returns a spinner for reports over 10k rows. This blocks our monthly finance review.', status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, assignee: 'dev' },
    { id: 'seed-ticket-2', clientId: acme.id, subject: 'Add SSO to client portal', description: 'We need SAML SSO before company-wide rollout. Can you scope this for the next sprint?', status: 'OPEN' as const, priority: 'MEDIUM' as const, assignee: null },
    { id: 'seed-ticket-3', clientId: blue.id, subject: 'Brand assets and CMS access', description: 'Please share the CMS staging URL and confirm which brand assets you still need from our team.', status: 'WAITING_CLIENT' as const, priority: 'LOW' as const, assignee: 'manager' },
  ];
  for (const t of ticketDefs) await prisma.supportTicket.upsert({ where: { id: t.id }, update: {}, create: { id: t.id, organizationId: org.id, clientId: t.clientId, subject: t.subject, description: t.description, status: t.status, priority: t.priority, createdById: t.clientId === acme.id ? created.client.id : created.manager.id, assigneeId: t.assignee ? created[t.assignee].id : null } });
  await prisma.comment.createMany({ data: [{ organizationId: org.id, ticketId: 'seed-ticket-1', authorId: created.dev.id, body: 'Reproduced on staging. The export query needs pagination; working on a streaming CSV response.' }, { organizationId: org.id, ticketId: 'seed-ticket-1', authorId: created.client.id, body: 'Thanks — finance needs this by Friday if possible.' }, { organizationId: org.id, taskId: tasks['Build dashboard analytics widgets'].id, authorId: created.dev.id, body: 'Revenue chart is wired to real payment data. Adding outstanding invoice breakdown next.' }], skipDuplicates: true });

  const invoiceDefs = [
    { id: 'seed-inv-1', number: 'INV-2026-0001', clientId: acme.id, projectId: 'seed-project-portal', status: 'PAID' as const, due: -10, items: [['Discovery and architecture', 1, 12000], ['Design system foundation', 1, 8000]], paidDays: -12 },
    { id: 'seed-inv-2', number: 'INV-2026-0002', clientId: acme.id, projectId: 'seed-project-portal', status: 'SENT' as const, due: 7, items: [['Beta milestone payment', 1, 16000]], paidDays: null },
    { id: 'seed-inv-3', number: 'INV-2026-0003', clientId: acme.id, projectId: 'seed-project-mobile', status: 'OVERDUE' as const, due: -6, items: [['Mobile app kickoff', 1, 20000]], paidDays: null },
    { id: 'seed-inv-4', number: 'INV-2026-0004', clientId: blue.id, projectId: 'seed-project-brand', status: 'DRAFT' as const, due: 20, items: [['Website refresh deposit', 1, 6000]], paidDays: null },
  ];
  for (const inv of invoiceDefs) {
    const subtotal = inv.items.reduce((s, [, q, p]) => s + Number(q) * Number(p), 0);
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const invoice = await prisma.invoice.upsert({ where: { id: inv.id }, update: {}, create: { id: inv.id, organizationId: org.id, clientId: inv.clientId, projectId: inv.projectId, number: inv.number, status: inv.status, currency: 'USD', subtotal, taxRate: 8, taxAmount: tax, total: subtotal + tax, dueDate: days(inv.due), paidAt: inv.paidDays ? days(inv.paidDays) : null, notes: 'Payment due within 14 days. Thank you for your business.', items: { create: inv.items.map(([description, quantity, unitPrice]) => ({ description: String(description), quantity: Number(quantity), unitPrice: Number(unitPrice), amount: Number(quantity) * Number(unitPrice) })) } } });
    if (inv.status === 'PAID') await prisma.payment.upsert({ where: { providerPaymentId: `seed_pi_${inv.id}` }, update: {}, create: { organizationId: org.id, invoiceId: invoice.id, amount: subtotal + tax, currency: 'USD', status: 'SUCCEEDED', provider: 'stripe', providerPaymentId: `seed_pi_${inv.id}`, providerEventId: `seed_evt_${inv.id}`, createdAt: days(inv.paidDays!), metadata: { seed: true, note: 'Deterministic development payment record; not a live Stripe transaction.' } } });
  }

  await prisma.notification.createMany({ data: [
    { organizationId: org.id, userId: created.owner.id, type: 'PAYMENT', title: 'Payment received: INV-2026-0001', body: 'Acme Robotics paid USD 21,600.00.', link: '/billing/seed-inv-1', dedupeKey: 'seed-paid-1' },
    { organizationId: org.id, userId: created.owner.id, type: 'DEADLINE', title: 'Deadline approaching: Legacy data import script', body: 'This task is overdue in Customer Portal v2.', link: '/projects/seed-project-portal', dedupeKey: 'seed-deadline-1' },
    { organizationId: org.id, userId: created.dev.id, type: 'PROJECT_ACTIVITY', title: 'New comment on Build dashboard analytics widgets', body: 'Revenue chart is wired to real payment data.', link: '/projects/seed-project-portal', dedupeKey: 'seed-comment-1' },
    { organizationId: org.id, userId: created.client.id, type: 'SUPPORT', title: 'Ticket updated: Unable to export usage report', body: 'Status is now in progress.', link: '/support/seed-ticket-1', dedupeKey: 'seed-ticket-update-1' },
  ], skipDuplicates: true });

  await prisma.auditEvent.createMany({ data: [
    { organizationId: org.id, actorId: created.owner.id, action: 'organization.created', entityType: 'Organization', entityId: org.id, createdAt: days(-45) },
    { organizationId: org.id, actorId: created.manager.id, action: 'client.created', entityType: 'Client', entityId: acme.id, metadata: { name: 'Acme Robotics' }, createdAt: days(-40) },
    { organizationId: org.id, actorId: created.owner.id, action: 'project.created', entityType: 'Project', entityId: 'seed-project-portal', metadata: { clientId: acme.id }, createdAt: days(-35) },
    { organizationId: org.id, actorId: created.dev.id, action: 'task.moved', entityType: 'Task', entityId: tasks['Build dashboard analytics widgets'].id, metadata: { projectId: 'seed-project-portal', from: 'TODO', to: 'IN_PROGRESS' }, createdAt: days(-2) },
    { organizationId: org.id, actorId: created.client.id, action: 'ticket.created', entityType: 'SupportTicket', entityId: 'seed-ticket-1', metadata: { clientId: acme.id }, createdAt: days(-3) },
  ] });

  // Second organization proves tenant isolation in development and tests.
  const otherOrg = await prisma.organization.upsert({ where: { slug: 'other-agency' }, update: {}, create: { name: 'Other Agency', slug: 'other-agency', subscription: { create: {} } } });
  const otherOwner = await prisma.user.upsert({ where: { email: 'other@agencyos.dev' }, update: {}, create: { email: 'other@agencyos.dev', name: 'Other Owner', passwordHash } });
  await prisma.membership.upsert({ where: { organizationId_userId: { organizationId: otherOrg.id, userId: otherOwner.id } }, update: {}, create: { organizationId: otherOrg.id, userId: otherOwner.id, role: 'OWNER' } });
  await prisma.client.upsert({ where: { id: 'seed-client-other' }, update: {}, create: { id: 'seed-client-other', organizationId: otherOrg.id, name: 'Confidential Other Client', status: 'ACTIVE' } });

  console.log(JSON.stringify({ seeded: true, organization: org.slug, users: users.map((u) => u.email), password: DEMO_PASSWORD, note: 'Development data only. Payment records are marked as seed data, not live transactions.' }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

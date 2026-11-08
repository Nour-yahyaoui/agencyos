/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma/Stripe test doubles */
import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { ClientQueryDto, CreateClientDto } from '../clients/dto';
import { TicketQueryDto } from '../support/dto';
import { CreateInvoiceDto } from '../billing/dto';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { NotificationService } from '../notifications/notifications.service';
import { UsersController } from '../users/users.controller';
import { AdminController } from '../admin/admin.controller';
import { MembershipsController } from '../memberships/memberships.controller';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { currencyExponent, fromMinorUnits, toMinorUnits } from './utils/money';
import { sha256 } from './utils/security';
import * as bcrypt from 'bcryptjs';
import { of } from 'rxjs';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } });
const owner = { organizationId: 'org-a', userId: 'u1', role: 'OWNER' as const, clientId: null };

describe('currency minor units', () => {
  it('uses the currency exponent Stripe expects', () => {
    expect(currencyExponent('usd')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('TND')).toBe(3);
    expect(toMinorUnits('1000.00', 'USD')).toBe(100000);
    expect(toMinorUnits('1000.00', 'JPY')).toBe(1000); // was 100000: a hundredfold overcharge
    expect(toMinorUnits('12.34', 'KWD')).toBe(12340); // three decimals, multiple of ten
    expect(fromMinorUnits(1000, 'JPY')).toBe(1000);
    expect(fromMinorUnits(12340, 'TND')).toBe(12.34);
  });
});

describe('query DTOs', () => {
  it('accepts the status filter for clients and tickets (previously rejected with 400)', async () => {
    await expect(pipe.transform({ page: '1', status: 'ACTIVE' }, { type: 'query', metatype: ClientQueryDto })).resolves.toMatchObject({ page: 1, status: 'ACTIVE' });
    await expect(pipe.transform({ status: 'OPEN' }, { type: 'query', metatype: TicketQueryDto })).resolves.toMatchObject({ status: 'OPEN' });
  });
  it('rejects invalid enum values instead of passing them to Prisma (500)', async () => {
    await expect(pipe.transform({ status: 'NOPE' }, { type: 'query', metatype: ClientQueryDto })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('requires an http(s) client website', async () => {
    for (const website of ['javascript:1', 'example.com', 'ftp://example.com']) {
      await expect(pipe.transform({ name: 'Acme', website }, { type: 'body', metatype: CreateClientDto })).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(pipe.transform({ name: 'Acme', website: 'https://acme.test' }, { type: 'body', metatype: CreateClientDto })).resolves.toBeDefined();
  });
  it('validates invoice currency codes', async () => {
    const base = { clientId: 'c', dueDate: '2026-12-01', items: [{ description: 'x', quantity: 1, unitPrice: 1 }] };
    await expect(pipe.transform({ ...base, currency: '$$$' }, { type: 'body', metatype: CreateInvoiceDto })).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ ...base, currency: 'eur' }, { type: 'body', metatype: CreateInvoiceDto })).resolves.toBeDefined();
  });
});

describe('billing', () => {
  const invoice = { id: 'inv', number: 'INV-1', status: 'SENT', currency: 'JPY', total: new Prisma.Decimal(1000), payments: [] };
  it('charges zero-decimal currencies in whole units', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'cs_1', url: 'https://checkout' });
    const prisma = { invoice: { findFirst: jest.fn().mockResolvedValue(invoice), update: jest.fn() } };
    const service = new BillingService(prisma as any, { getOrThrow: () => 'https://app.test' } as any, { getStripe: () => ({ checkout: { sessions: { create } } }) } as any, { record: jest.fn() } as any, {} as any);
    await service.createCheckout({ ...owner, role: 'CLIENT', clientId: 'c' }, 'inv');
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(1000);
  });
  function webhook(session: object, inv: object = invoice) {
    const tx = { webhookEvent: { createMany: jest.fn().mockResolvedValue({ count: 1 }) }, invoice: { findUnique: jest.fn().mockResolvedValue({ ...inv, organizationId: 'org-a' }), update: jest.fn() }, payment: { upsert: jest.fn() }, auditEvent: { create: jest.fn() } };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx), invoice: { findUniqueOrThrow: jest.fn().mockResolvedValue({ ...inv, organizationId: 'org-a', client: { name: 'Acme' } }) } };
    const event = { id: 'evt', type: 'checkout.session.completed', data: { object: { id: 'cs', payment_status: 'paid', metadata: { invoiceId: 'inv', organizationId: 'org-a' }, payment_intent: 'pi', ...session } } };
    const service = new BillingService(prisma as any, { get: () => 'whsec' } as any, { getStripe: () => ({ webhooks: { constructEvent: () => event } }) } as any, {} as any, { notifyRoles: jest.fn() } as any);
    return { tx, run: () => service.handleStripeWebhook('sig', Buffer.from('{}')) };
  }
  it('matches webhook amounts in minor units and records the real amount', async () => {
    const { tx, run } = webhook({ amount_total: 1000, currency: 'jpy' });
    await expect(run()).resolves.toMatchObject({ paid: true });
    expect(tx.payment.upsert.mock.calls[0][0].create.amount).toBe(1000);
  });
  it('rejects webhook currency or amount mismatches', async () => {
    await expect(webhook({ amount_total: 1000, currency: 'usd' }).run()).rejects.toThrow('currency mismatch');
    await expect(webhook({ amount_total: 999, currency: 'jpy' }).run()).rejects.toThrow('amount mismatch');
  });
  it('upserts failed payments instead of create().catch() inside the transaction', async () => {
    const tx = { webhookEvent: { createMany: jest.fn().mockResolvedValue({ count: 1 }) }, invoice: { findUnique: jest.fn().mockResolvedValue({ id: 'inv', organizationId: 'org-a', total: 10, currency: 'USD' }) }, payment: { upsert: jest.fn(), create: jest.fn() } };
    const event = { id: 'evt2', type: 'payment_intent.payment_failed', data: { object: { id: 'pi_1', metadata: { invoiceId: 'inv' } } } };
    const service = new BillingService({ $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } as any, { get: () => 'whsec' } as any, { getStripe: () => ({ webhooks: { constructEvent: () => event } }) } as any, {} as any, {} as any);
    await expect(service.handleStripeWebhook('sig', Buffer.from('{}'))).resolves.toMatchObject({ failed: true });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.payment.upsert.mock.calls[0][0].where).toEqual({ providerPaymentId: 'pi_1' });
  });
  it('retries the invoice number on a unique collision', async () => {
    const collision = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' });
    const $transaction = jest.fn().mockRejectedValueOnce(collision).mockResolvedValueOnce({ id: 'inv' });
    const prisma = { client: { findFirst: jest.fn().mockResolvedValue({ id: 'c' }) }, invoice: { count: jest.fn().mockResolvedValue(3) }, $transaction };
    const service = new BillingService(prisma as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.create(owner, { clientId: 'c', dueDate: '2026-12-01', items: [{ description: 'x', quantity: 1, unitPrice: 5 }] })).resolves.toEqual({ id: 'inv' });
    expect($transaction).toHaveBeenCalledTimes(2);
  });
});

describe('tasks', () => {
  const projects = { assertAccess: jest.fn().mockResolvedValue({}), projectWhere: () => ({}) } as unknown as ProjectsService;
  it('enforces prerequisites when a task is completed through PATCH', async () => {
    const prisma = { task: { findFirst: jest.fn().mockResolvedValue({ id: 't', projectId: 'p', status: 'TODO', priority: 'MEDIUM', assigneeId: null, milestoneId: null, dueDate: null }), update: jest.fn() }, taskDependency: { count: jest.fn().mockResolvedValue(1) } };
    const service = new TasksService(prisma as any, projects, {} as any, {} as any);
    await expect(service.update(owner, 't', { projectId: 'p', title: 'Task', status: 'DONE' })).rejects.toThrow('unfinished prerequisites');
    expect(prisma.task.update).not.toHaveBeenCalled();
  });
  it('detects cycles from a single dependency query', async () => {
    const findMany = jest.fn().mockResolvedValue([{ taskId: 'b', prerequisiteId: 'a' }, { taskId: 'c', prerequisiteId: 'b' }]);
    const prisma = { task: { findFirst: jest.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id, projectId: 'p' })) }, taskDependency: { findMany, upsert: jest.fn() } };
    const service = new TasksService(prisma as any, projects, {} as any, {} as any);
    // a <- b <- c ; making a depend on c closes the loop.
    await expect(service.addDependency(owner, 'a', 'c')).rejects.toThrow('cycle');
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});

describe('projects', () => {
  it('computes list progress from grouped counts instead of loading tasks', async () => {
    const groupBy = jest.fn().mockResolvedValueOnce([{ projectId: 'p1', status: 'DONE', _count: { _all: 3 } }, { projectId: 'p1', status: 'TODO', _count: { _all: 1 } }]).mockResolvedValueOnce([{ projectId: 'p1', _count: { _all: 1 } }]);
    const findMany = jest.fn().mockResolvedValue([{ id: 'p1', name: 'P' }, { id: 'p2', name: 'Empty' }]);
    const service = new ProjectsService({ project: { findMany, count: jest.fn().mockResolvedValue(2) }, task: { groupBy } } as any, {} as any, {} as any);
    const result = await service.list(owner, { page: 1, limit: 20, skip: 0 });
    expect(findMany.mock.calls[0][0].include).not.toHaveProperty('tasks');
    expect(result.data).toEqual([{ id: 'p1', name: 'P', progress: 75, taskCount: 4, doneCount: 3, overdueCount: 1 }, { id: 'p2', name: 'Empty', progress: 0, taskCount: 0, doneCount: 0, overdueCount: 0 }]);
  });
  it('queries project activity directly rather than filtering the latest org events', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new ProjectsService({ project: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) }, auditEvent: { findMany } } as any, {} as any, {} as any);
    await service.activity(owner, 'p1');
    expect(findMany.mock.calls[0][0].where).toEqual({ organizationId: 'org-a', OR: [{ entityId: 'p1' }, { metadata: { path: ['projectId'], equals: 'p1' } }] });
  });
});

describe('deadline reminders', () => {
  it('bounds the scan window and skips already-sent reminders with one lookup', async () => {
    const due = new Date(Date.now() + 3600000);
    const day = due.toISOString().slice(0, 10);
    const tasks = [{ id: 't1', title: 'A', organizationId: 'o', projectId: 'p', assigneeId: 'u1', dueDate: due, project: { name: 'P' } }, { id: 't2', title: 'B', organizationId: 'o', projectId: 'p', assigneeId: 'u2', dueDate: due, project: { name: 'P' } }];
    const prisma = { task: { findMany: jest.fn().mockResolvedValue(tasks) }, notification: { findMany: jest.fn().mockResolvedValue([{ userId: 'u1', dedupeKey: `deadline:t1:${day}` }]), count: jest.fn(), upsert: jest.fn().mockResolvedValue({}) }, user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new NotificationService(prisma as any, {} as any);
    await expect(service.deadlineReminders()).resolves.toEqual({ candidates: 2, created: 1 });
    expect(prisma.task.findMany.mock.calls[0][0].where.dueDate.gte).toBeInstanceOf(Date);
    expect(prisma.notification.count).not.toHaveBeenCalled();
    expect(prisma.notification.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('sessions and accounts', () => {
  it('revokes other refresh sessions and reset links when the password changes', async () => {
    const passwordHash = await bcrypt.hash('OldPassword1', 4);
    const prisma = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'u1', passwordHash }), update: jest.fn().mockReturnValue('user-update') },
      refreshSession: { findUnique: jest.fn().mockResolvedValue({ id: 'current', userId: 'u1' }), updateMany: jest.fn().mockReturnValue('revoke') },
      passwordResetToken: { updateMany: jest.fn().mockReturnValue('reset') },
      $transaction: jest.fn().mockResolvedValue([{ id: 'u1' }]),
    };
    const controller = new UsersController(prisma as any);
    await controller.update({ id: 'u1' } as any, { password: 'NewPassword1', currentPassword: 'OldPassword1' }, { cookies: { agencyos_refresh: 'rt' } } as any);
    expect(prisma.refreshSession.findUnique).toHaveBeenCalledWith({ where: { tokenHash: sha256('rt') }, select: { id: true, userId: true } });
    expect(prisma.refreshSession.updateMany.mock.calls[0][0].where).toEqual({ userId: 'u1', revokedAt: null, id: { not: 'current' } });
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(['user-update', 'revoke', 'reset']);
  });
  it('prevents administrators from demoting or deactivating themselves', async () => {
    const prisma = { user: { update: jest.fn() } };
    const controller = new AdminController(prisma as any, {} as any);
    await expect(controller.updateUser({ id: 'admin' } as any, 'admin', { isActive: false })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.updateUser({ id: 'admin' } as any, 'admin', { platformRole: 'USER' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('enforces the seat limit and clears the client link when promoting a client member', async () => {
    const prisma = { membership: { findFirst: jest.fn().mockResolvedValue({ id: 'm', role: 'CLIENT', clientId: 'c' }), count: jest.fn().mockResolvedValue(10), update: jest.fn().mockResolvedValue({}) }, subscription: { findUnique: jest.fn().mockResolvedValue({ seatLimit: 10 }) } };
    const controller = new MembershipsController(prisma as any, {} as any, { record: jest.fn() } as any, {} as any, {} as any);
    await expect(controller.updateRole(owner, 'm', { role: 'DEVELOPER' })).rejects.toThrow('Seat limit');
    prisma.membership.count.mockResolvedValue(2);
    await controller.updateRole(owner, 'm', { role: 'DEVELOPER' });
    expect(prisma.membership.update).toHaveBeenCalledWith({ where: { id: 'm' }, data: { role: 'DEVELOPER', clientId: null } });
  });
});

describe('request ids', () => {
  it('only echoes short, simple client-supplied request ids', () => {
    const interceptor = new LoggingInterceptor();
    const run = (id: unknown) => { const req: any = { headers: { 'x-request-id': id } }; const res = { setHeader: jest.fn(), statusCode: 200 }; interceptor.intercept({ switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as any, { handle: () => of(null) }); return req.requestId; };
    expect(run('abc-123')).toBe('abc-123');
    expect(run('x'.repeat(500))).not.toBe('x'.repeat(500));
    expect(run('<script>')).not.toBe('<script>');
  });
});

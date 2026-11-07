import { ForbiddenException, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OrgGuard } from './guards/org.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { BillingService } from '../billing/billing.service';
import { ClientsController } from '../clients/clients.controller';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notifications/notifications.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { sha256 } from './utils/security';

const ctx = (request: object) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;
const scope = { organizationId: 'org-a', userId: 'u1', role: 'CLIENT' as const, clientId: 'client-a' };

describe('security regressions', () => {
  it('rejects mismatched organization path and header before querying membership', async () => {
    const findUnique = jest.fn();
    const guard = new OrgGuard({ membership: { findUnique } } as any);
    await expect(guard.canActivate(ctx({ headers: { 'x-organization-id': 'org-a' }, params: { orgId: 'org-b' }, user: { id: 'u1' } }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('permits a matching organization and checks membership for the path', async () => {
    const findUnique = jest.fn().mockResolvedValue({ organizationId: 'org-a' });
    const guard = new OrgGuard({ membership: { findUnique } } as any);
    await expect(guard.canActivate(ctx({ headers: { 'x-organization-id': 'org-a' }, params: { orgId: 'org-a' }, user: { id: 'u1' } }))).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({ where: { organizationId_userId: { organizationId: 'org-a', userId: 'u1' } } });
  });
  it('rejects malformed CSRF tokens without a timingSafeEqual length exception', () => {
    const guard = new CsrfGuard({ getOrThrow: () => 'https://app.test' } as any);
    expect(() => guard.canActivate(ctx({ method: 'POST', authMethod: 'cookie', cookies: { agencyos_csrf: 'é' }, headers: { 'x-csrf-token': 'a' } }))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx({ method: 'POST', authMethod: 'cookie', cookies: { agencyos_csrf: 'token' }, headers: { 'x-csrf-token': 'token' } }))).toBe(true);
  });
  it('rejects cross-origin public sign-in before a session exists', () => {
    const guard = new CsrfGuard({ getOrThrow: () => 'https://app.test' } as any);
    expect(() => guard.canActivate(ctx({ method: 'POST', originalUrl: '/api/v1/auth/login', cookies: {}, headers: { origin: 'https://evil.test' } }))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx({ method: 'POST', originalUrl: '/api/v1/auth/login', cookies: {}, headers: { origin: 'https://app.test' } }))).toBe(true);
  });
  it('intersects invoice filters with the client and non-draft restrictions', async () => {
    const findMany = jest.fn().mockResolvedValue([]); const count = jest.fn().mockResolvedValue(0);
    const service = new BillingService({ invoice: { findMany, count } } as any, {} as any, {} as any, {} as any, {} as any);
    await service.list(scope, { page: 1, limit: 10, skip: 0, status: 'DRAFT', clientId: 'client-b' });
    expect(findMany.mock.calls[0][0].where).toEqual({ AND: [{ organizationId: 'org-a', clientId: 'client-a', status: { not: 'DRAFT' }, AND: [{ status: 'DRAFT' }] }, { clientId: 'client-b' }] });
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
  });
  it('rejects cross-tenant invoice updates', async () => {
    const prisma = { invoice: { findFirst: jest.fn().mockResolvedValue({ id: 'i', status: 'DRAFT' }) }, client: { findFirst: jest.fn().mockResolvedValue(null) }, $transaction: jest.fn() };
    const service = new BillingService(prisma as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.update({ ...scope, role: 'OWNER' }, 'i', { clientId: 'foreign', dueDate: '2026-11-10', items: [{ description: 'x', quantity: 1, unitPrice: 1 }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('scopes client details and excludes internal notes and draft invoices', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'client-a', notes: 'private', invoices: [] });
    const controller = new ClientsController({ client: { findFirst } } as any, {} as any);
    const result = await controller.get(scope, 'client-a');
    expect(result).not.toHaveProperty('notes');
    expect(findFirst.mock.calls[0][0].where).toEqual({ AND: [{ id: 'client-a' }, { organizationId: 'org-a', id: 'client-a' }] });
    expect(findFirst.mock.calls[0][0].include.invoices.where).toEqual({ status: { not: 'DRAFT' } });
    findFirst.mockResolvedValueOnce(null);
    await expect(controller.get(scope, 'client-b')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('returns the same production recovery response for existing and unknown users', async () => {
    const findUnique = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'u1', email: 'u@example.com' });
    const prisma = { user: { findUnique }, passwordResetToken: { create: jest.fn() } };
    const config = { get: () => 'production', getOrThrow: () => 'https://app.test' };
    const service = new AuthService(prisma as any, {} as any, config as any, { sendEmail: jest.fn().mockResolvedValue(true) } as any, { record: jest.fn() } as any);
    expect(await service.forgotPassword('unknown@example.com')).toEqual(await service.forgotPassword('u@example.com'));
  });
  it('revokes the refresh family if an atomic token claim loses a race', async () => {
    const updateMany = jest.fn().mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    const tx = { refreshSession: { updateMany } };
    const prisma = { refreshSession: { findUnique: jest.fn().mockResolvedValue({ id: 's', userId: 'u', familyId: 'f', tokenHash: sha256('token'), expiresAt: new Date(Date.now() + 60000) }) }, $transaction: (fn: any) => fn(tx) };
    const service = new AuthService(prisma as any, { verifyAsync: jest.fn().mockResolvedValue({ type: 'refresh', sid: 's', sub: 'u', family: 'f' }) } as any, { getOrThrow: () => 'secret' } as any, {} as any, {} as any);
    await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany.mock.calls[1][0].where).toEqual({ familyId: 'f', revokedAt: null });
  });
  it('does not change a password when the recovery token was already claimed', async () => {
    const userUpdate = jest.fn();
    const tx = { passwordResetToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }, user: { update: userUpdate }, refreshSession: { updateMany: jest.fn() } };
    const prisma = { passwordResetToken: { findUnique: jest.fn().mockResolvedValue({ id: 'r', userId: 'u', usedAt: null, expiresAt: new Date(Date.now() + 60000) }) }, $transaction: (fn: any) => fn(tx) };
    const service = new AuthService(prisma as any, {} as any, {} as any, {} as any, {} as any);
    await expect(service.resetPassword('token', 'NewPassword123')).rejects.toBeInstanceOf(BadRequestException);
    expect(userUpdate).not.toHaveBeenCalled();
  });
  it('scopes manually triggered reminders to an organization', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new NotificationService({ task: { findMany } } as any, {} as any);
    await service.deadlineReminders('org-a');
    expect(findMany.mock.calls[0][0].where.organizationId).toBe('org-a');
  });
  it('rejects sibling-directory traversal in local storage', async () => {
    const service = new IntegrationsService({ get: () => undefined } as any);
    await expect(service.getFile('../storage-other/secret')).rejects.toThrow('Invalid storage key');
    await expect(service.deleteFile('../storage-other/secret')).rejects.toThrow('Invalid storage key');
  });
});

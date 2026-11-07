import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('Notifications');
  constructor(private prisma: PrismaService, private integrations: IntegrationsService) {}

  async notify(input: { organizationId: string; userId: string; type?: NotificationType; title: string; body: string; link?: string; dedupeKey?: string; email?: boolean }) {
    const notification = await this.prisma.notification.upsert({
      where: { userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey ?? `evt-${Date.now()}-${Math.random()}` } },
      create: { organizationId: input.organizationId, userId: input.userId, type: input.type ?? 'GENERAL', title: input.title, body: input.body, link: input.link, dedupeKey: input.dedupeKey ?? null },
      update: {},
    });
    if (input.email) {
      const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
      if (user) {
        const escapedBody = input.body.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
        await this.integrations.sendEmail(user.email, input.title, `<p>${escapedBody}</p>`);
      }
    }
    return notification;
  }

  async notifyRoles(organizationId: string, roles: ('OWNER' | 'MANAGER')[], input: { type?: NotificationType; title: string; body: string; link?: string; dedupeKey?: string; email?: boolean }) {
    const members = await this.prisma.membership.findMany({ where: { organizationId, role: { in: roles } }, select: { userId: true } });
    await Promise.all(members.map((m) => this.notify({ organizationId, userId: m.userId, ...input, dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${m.userId}` : undefined })));
  }

  async list(organizationId: string, userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({ where: { organizationId, userId, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  async markRead(organizationId: string, userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, organizationId, userId }, data: { readAt: new Date() } });
    return { updated: result.count };
  }
  async markAllRead(organizationId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({ where: { organizationId, userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  /**
   * In-process scheduler for the long-running server. Serverless containers have no reliable
   * long-lived timers, so on Vercel this is a no-op and Vercel Cron calls /api/cron/reminders,
   * which invokes deadlineReminders() directly.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledDeadlineReminders() {
    if (process.env.VERCEL) return { created: 0, skipped: 'serverless-cron-disabled' };
    return this.deadlineReminders();
  }

  async deadlineReminders(organizationId?: string) {
    const soon = new Date(Date.now() + 48 * 3600000);
    const tasks = await this.prisma.task.findMany({ where: { ...(organizationId ? { organizationId } : {}), status: { not: 'DONE' }, dueDate: { not: null, lte: soon }, assigneeId: { not: null } }, include: { project: { select: { name: true } } } });
    let created = 0;
    for (const t of tasks) {
      const day = t.dueDate!.toISOString().slice(0, 10);
      const before = await this.prisma.notification.count({ where: { userId: t.assigneeId!, dedupeKey: `deadline:${t.id}:${day}` } });
      if (before) continue;
      await this.notify({ organizationId: t.organizationId, userId: t.assigneeId!, type: 'DEADLINE', title: `Deadline approaching: ${t.title}`, body: `"${t.title}" in ${t.project.name} is due ${t.dueDate!.toISOString().slice(0, 10)}.`, link: `/projects/${t.projectId}`, dedupeKey: `deadline:${t.id}:${day}`, email: true });
      if (!before) created++;
    }
    this.logger.log(JSON.stringify({ event: 'deadline_reminders', candidates: tasks.length, created }));
    return { candidates: tasks.length, created };
  }
}

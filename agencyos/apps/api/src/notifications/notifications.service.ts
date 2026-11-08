import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';

/** Overdue tasks older than this are not re-scanned on every run. */
const REMINDER_LOOKBACK_DAYS = 14;
const REMINDER_BATCH_LIMIT = 2000;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('Notifications');
  constructor(private prisma: PrismaService, private integrations: IntegrationsService) {}

  async notify(input: { organizationId: string; userId: string; type?: NotificationType; title: string; body: string; link?: string; dedupeKey?: string; email?: boolean }) {
    const data = { organizationId: input.organizationId, userId: input.userId, type: input.type ?? 'GENERAL', title: input.title, body: input.body, link: input.link, dedupeKey: input.dedupeKey ?? null };
    const notification = input.dedupeKey
      ? await this.prisma.notification.upsert({ where: { userId_dedupeKey: { userId: input.userId, dedupeKey: input.dedupeKey } }, create: data, update: {} })
      : await this.prisma.notification.create({ data });
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

  /**
   * Reminds assignees about tasks due within 48 hours (and recently overdue ones). The candidate
   * window has a lower bound so the job does not rescan every task that has ever been overdue on
   * every run, and already-sent reminders are excluded with one query instead of one per task.
   */
  async deadlineReminders(organizationId?: string) {
    const now = Date.now();
    const soon = new Date(now + 48 * 3600000);
    const since = new Date(now - REMINDER_LOOKBACK_DAYS * 86400000);
    const tasks = await this.prisma.task.findMany({ where: { ...(organizationId ? { organizationId } : {}), status: { not: 'DONE' }, dueDate: { gte: since, lte: soon }, assigneeId: { not: null } }, select: { id: true, title: true, organizationId: true, projectId: true, assigneeId: true, dueDate: true, project: { select: { name: true } } }, orderBy: { dueDate: 'asc' }, take: REMINDER_BATCH_LIMIT });
    const keyOf = (t: (typeof tasks)[number]) => `deadline:${t.id}:${t.dueDate!.toISOString().slice(0, 10)}`;
    const existing = tasks.length ? await this.prisma.notification.findMany({ where: { dedupeKey: { in: tasks.map(keyOf) } }, select: { userId: true, dedupeKey: true } }) : [];
    const sent = new Set(existing.map((n) => `${n.userId}|${n.dedupeKey}`));
    const pending = tasks.filter((t) => !sent.has(`${t.assigneeId}|${keyOf(t)}`));
    let created = 0;
    // Small concurrent batches: each reminder may also send an e-mail.
    for (let i = 0; i < pending.length; i += 10) {
      await Promise.all(pending.slice(i, i + 10).map(async (t) => {
        const day = t.dueDate!.toISOString().slice(0, 10);
        await this.notify({ organizationId: t.organizationId, userId: t.assigneeId!, type: 'DEADLINE', title: `Deadline approaching: ${t.title}`, body: `"${t.title}" in ${t.project.name} is due ${day}.`, link: `/projects/${t.projectId}`, dedupeKey: keyOf(t), email: true });
        created++;
      }));
    }
    this.logger.log(JSON.stringify({ event: 'deadline_reminders', candidates: tasks.length, created }));
    return { candidates: tasks.length, created };
  }
}

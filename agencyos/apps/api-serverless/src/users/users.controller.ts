import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from '../auth/dto';
import * as bcrypt from 'bcryptjs';
import { BadRequestException } from '@nestjs/common';
import { sha256 } from '../common/utils/security';
@ApiTags('Users') @ApiBearerAuth() @Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}
  @Get('me') me(@CurrentUser() user: AuthUser) { return this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, name: true, platformRole: true, createdAt: true } }); }
  @Patch('me') async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto, @Req() req: Request) {
    const data: { name?: string; passwordHash?: string } = {};
    if (dto.name) data.name = dto.name;
    if (!dto.password) return this.prisma.user.update({ where: { id: user.id }, data, select: { id: true, email: true, name: true } });
    const current = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!dto.currentPassword || !(await bcrypt.compare(dto.currentPassword, current.passwordHash))) throw new BadRequestException('Current password is incorrect');
    data.passwordHash = await bcrypt.hash(dto.password, 12);
    // A password change must sign out every other device (e.g. a stolen session) and invalidate
    // outstanding recovery links. The session making this request is kept.
    const refresh = req.cookies?.agencyos_refresh;
    const keep = typeof refresh === 'string' && refresh ? await this.prisma.refreshSession.findUnique({ where: { tokenHash: sha256(refresh) }, select: { id: true, userId: true } }) : null;
    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data, select: { id: true, email: true, name: true } }),
      this.prisma.refreshSession.updateMany({ where: { userId: user.id, revokedAt: null, ...(keep?.userId === user.id ? { id: { not: keep.id } } : {}) }, data: { revokedAt: now } }),
      this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
    ]);
    return updated;
  }
}

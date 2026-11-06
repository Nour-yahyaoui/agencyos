import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from '../auth/dto';
import * as bcrypt from 'bcryptjs';
import { BadRequestException } from '@nestjs/common';
@ApiTags('Users') @ApiBearerAuth() @Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}
  @Get('me') me(@CurrentUser() user: AuthUser) { return this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, name: true, platformRole: true, createdAt: true } }); }
  @Patch('me') async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.password) {
      const current = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!dto.currentPassword || !(await bcrypt.compare(dto.currentPassword, current.passwordHash))) throw new BadRequestException('Current password is incorrect');
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    return this.prisma.user.update({ where: { id: user.id }, data, select: { id: true, email: true, name: true } });
  }
}

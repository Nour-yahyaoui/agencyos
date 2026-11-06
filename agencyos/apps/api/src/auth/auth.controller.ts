import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AcceptInvitationDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth') @Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private config: ConfigService) {}
  private setCookies(res: Response, session: { accessToken: string; refreshToken: string; csrfToken: string }) {
    const secure = this.config.get<boolean>('COOKIE_SECURE') ?? false;
    const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
    res.cookie('agencyos_access', session.accessToken, { ...base, maxAge: this.config.get<number>('ACCESS_TOKEN_TTL_SECONDS')! * 1000 });
    res.cookie('agencyos_refresh', session.refreshToken, { ...base, maxAge: this.config.get<number>('REFRESH_TOKEN_TTL_SECONDS')! * 1000 });
    res.cookie('agencyos_csrf', session.csrfToken, { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: this.config.get<number>('REFRESH_TOKEN_TTL_SECONDS')! * 1000 });
  }
  private clearCookies(res: Response) { for (const n of ['agencyos_access', 'agencyos_refresh', 'agencyos_csrf']) res.clearCookie(n, { path: '/' }); }
  private payload(s: any) { return { user: s.user, accessToken: s.accessToken, expiresIn: s.expiresIn, csrfToken: s.csrfToken }; }

  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) { const s = await this.auth.register(dto); this.setCookies(res, s); return this.payload(s); }

  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @HttpCode(200) @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) { const s = await this.auth.login(dto); this.setCookies(res, s); return this.payload(s); }

  @Public() @Throttle({ default: { limit: 20, ttl: 60000 } }) @HttpCode(200) @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) { const s = await this.auth.refresh(req.cookies?.agencyos_refresh); this.setCookies(res, s); return this.payload(s); }

  @Public() @HttpCode(200) @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { await this.auth.logout(req.cookies?.agencyos_refresh); this.clearCookies(res); return { message: 'Signed out' }; }

  @ApiBearerAuth() @Get('me') me(@CurrentUser() user: AuthUser) { return this.auth.me(user.id); }

  @Public() @Throttle({ default: { limit: 5, ttl: 60000 } }) @HttpCode(200) @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto.email); }

  @Public() @Throttle({ default: { limit: 5, ttl: 60000 } }) @HttpCode(200) @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto.token, dto.password); }

  @Public() @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post('accept-invitation')
  async accept(@Body() dto: AcceptInvitationDto, @Res({ passthrough: true }) res: Response) { const s = await this.auth.acceptInvitation(dto); this.setCookies(res, s); return this.payload(s); }
}

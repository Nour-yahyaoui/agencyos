import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty() @IsString() @Length(2, 80) name: string;
  @ApiProperty() @IsEmail() @MaxLength(254) email: string;
  @ApiProperty({ minLength: 10 }) @IsString() @MinLength(10) @MaxLength(128) @Matches(/[A-Za-z]/, { message: 'password must contain a letter' }) @Matches(/[0-9]/, { message: 'password must contain a number' }) password: string;
  @ApiProperty() @IsString() @Length(2, 80) organizationName: string;
}
export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(1) password: string;
}
export class ForgotPasswordDto { @ApiProperty() @IsEmail() email: string; }
export class ResetPasswordDto {
  @ApiProperty() @IsString() @MinLength(20) token: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(128) @Matches(/[A-Za-z]/) @Matches(/[0-9]/) password: string;
}
export class UpdateProfileDto {
  @ApiPropertyOptional() @IsString() @Length(2, 80) @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @MinLength(10) @MaxLength(128) @Matches(/[A-Za-z]/) @Matches(/[0-9]/) @IsOptional() password?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() currentPassword?: string;
}
export class AcceptInvitationDto {
  @ApiProperty() @IsString() @MinLength(20) token: string;
  @ApiPropertyOptional() @IsString() @Length(2, 80) @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @MinLength(10) @MaxLength(128) @Matches(/[A-Za-z]/) @Matches(/[0-9]/) @IsOptional() password?: string;
}
export class InviteMemberDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: ['MANAGER', 'DEVELOPER', 'CLIENT'] }) @IsIn(['MANAGER', 'DEVELOPER', 'CLIENT']) role: 'MANAGER' | 'DEVELOPER' | 'CLIENT';
  @ApiPropertyOptional() @IsString() @IsOptional() clientId?: string;
}
export const roleValues = Object.values(MemberRole);

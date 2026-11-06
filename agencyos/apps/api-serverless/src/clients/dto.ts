import { IsArray, IsEmail, IsIn, IsOptional, IsString, IsUrl, Length, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class ContactDto { @ApiProperty() @IsString() @Length(1, 80) name: string; @ApiProperty() @IsEmail() email: string; @ApiPropertyOptional() @IsString() @IsOptional() phone?: string; @ApiPropertyOptional() @IsString() @IsOptional() jobTitle?: string; @ApiPropertyOptional() @IsOptional() isPrimary?: boolean; }
export class CreateClientDto {
  @ApiProperty() @IsString() @Length(2, 100) name: string;
  @ApiPropertyOptional() @IsString() @MaxLength(100) @IsOptional() company?: string;
  @ApiPropertyOptional() @IsUrl({ require_tld: false }) @IsOptional() website?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(2000) @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() accountManagerId?: string;
  @ApiPropertyOptional({ type: [ContactDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => ContactDto) @IsOptional() contacts?: ContactDto[];
}
export class UpdateClientDto extends CreateClientDto { @ApiPropertyOptional({ enum: ['LEAD', 'ONBOARDING', 'ACTIVE', 'ARCHIVED'] }) @IsIn(['LEAD', 'ONBOARDING', 'ACTIVE', 'ARCHIVED']) @IsOptional() status?: 'LEAD' | 'ONBOARDING' | 'ACTIVE' | 'ARCHIVED'; }
export class OnboardingDto { @ApiProperty({ type: [Object] }) @IsArray() steps: { key: string; label: string; done: boolean }[]; }

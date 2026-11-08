import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUrl, Length, MaxLength, ValidateNested } from 'class-validator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class ContactDto { @ApiProperty() @IsString() @Length(1, 80) name: string; @ApiProperty() @IsEmail() email: string; @ApiPropertyOptional() @IsString() @MaxLength(40) @IsOptional() phone?: string; @ApiPropertyOptional() @IsString() @MaxLength(100) @IsOptional() jobTitle?: string; @ApiPropertyOptional() @IsBoolean() @IsOptional() isPrimary?: boolean; }
export class CreateClientDto {
  @ApiProperty() @IsString() @Length(2, 100) name: string;
  @ApiPropertyOptional() @IsString() @MaxLength(100) @IsOptional() company?: string;
  @ApiPropertyOptional() @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }) @MaxLength(300) @IsOptional() website?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(2000) @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() accountManagerId?: string;
  @ApiPropertyOptional({ type: [ContactDto] }) @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ContactDto) @IsOptional() contacts?: ContactDto[];
}
export class UpdateClientDto extends CreateClientDto { @ApiPropertyOptional({ enum: ['LEAD', 'ONBOARDING', 'ACTIVE', 'ARCHIVED'] }) @IsIn(['LEAD', 'ONBOARDING', 'ACTIVE', 'ARCHIVED']) @IsOptional() status?: 'LEAD' | 'ONBOARDING' | 'ACTIVE' | 'ARCHIVED'; }
export class OnboardingStepDto { @ApiProperty() @IsString() @Length(1, 40) key: string; @ApiProperty() @IsString() @Length(1, 120) label: string; @ApiProperty() @IsBoolean() done: boolean; }
export class OnboardingDto { @ApiProperty({ type: [OnboardingStepDto] }) @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => OnboardingStepDto) steps: OnboardingStepDto[]; }

/**
 * Query filters for `GET /clients`. Every accepted query parameter must be declared on the DTO
 * bound by `@Query()` because the global ValidationPipe uses forbidNonWhitelisted; a separate
 * `@Query('status')` made every status-filtered request fail with "property status should not exist".
 */
export class ClientQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['LEAD', 'ONBOARDING', 'ACTIVE', 'ARCHIVED'] }) @IsIn(['LEAD', 'ONBOARDING', 'ACTIVE', 'ARCHIVED']) @IsOptional() status?: 'LEAD' | 'ONBOARDING' | 'ACTIVE' | 'ARCHIVED';
}

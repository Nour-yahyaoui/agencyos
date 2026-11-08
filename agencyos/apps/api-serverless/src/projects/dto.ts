import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
export class CreateProjectDto {
  @ApiProperty() @IsString() @Length(2, 120) name: string;
  @ApiProperty() @IsString() clientId: string;
  @ApiPropertyOptional() @IsString() @MaxLength(3000) @IsOptional() description?: string;
  @ApiPropertyOptional() @Type(() => Number) @IsNumber() @Min(0) @IsOptional() budget?: number;
  @ApiPropertyOptional() @IsString() @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code' }) @IsOptional() currency?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() dueDate?: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsString({ each: true }) @IsOptional() memberIds?: string[];
}
export class UpdateProjectDto extends CreateProjectDto { @ApiPropertyOptional({ enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] }) @IsIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']) @IsOptional() status?: any; }
export class ProjectMemberDto { @ApiProperty() @IsString() userId: string; }

/** Query filters for `GET /projects`; see the note on TaskQueryDto about forbidNonWhitelisted. */
export class ProjectQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] }) @IsIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']) @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() clientId?: string;
}

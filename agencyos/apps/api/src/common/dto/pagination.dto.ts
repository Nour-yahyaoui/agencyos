import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @ApiPropertyOptional({ default: 20 }) @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 20;
  @ApiPropertyOptional() @IsString() @MaxLength(200) @IsOptional() q?: string;
  get skip() { return (this.page - 1) * this.limit; }
}
export class SortDto extends PaginationDto {
  @ApiPropertyOptional({ default: 'createdAt' }) @IsString() @IsOptional() sortBy = 'createdAt';
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' }) @IsIn(['asc', 'desc']) @IsOptional() sortOrder: 'asc' | 'desc' = 'desc';
}
export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return { data, meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

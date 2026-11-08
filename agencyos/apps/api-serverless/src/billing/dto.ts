import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
export class InvoiceItemDto { @ApiProperty() @IsString() @Length(1, 200) description: string; @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) quantity: number; @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9_999_999_999) unitPrice: number; }
export class CreateInvoiceDto {
  @ApiProperty() @IsString() clientId: string;
  @ApiPropertyOptional() @IsString() @IsOptional() projectId?: string;
  @ApiProperty() @IsDateString() dueDate: string;
  @ApiPropertyOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) @IsOptional() taxRate?: number;
  @ApiPropertyOptional() @IsString() @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code' }) @IsOptional() currency?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(2000) @IsOptional() notes?: string;
  @ApiProperty({ type: [InvoiceItemDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => InvoiceItemDto) items: InvoiceItemDto[];
}
export class UpdateInvoiceDto extends CreateInvoiceDto { @ApiPropertyOptional({ enum: ['DRAFT', 'SENT', 'VOID'] }) @IsIn(['DRAFT', 'SENT', 'VOID']) @IsOptional() status?: any; }

/** Query filters for `GET /billing/invoices`; see the note on TaskQueryDto about forbidNonWhitelisted. */
export class InvoiceQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['DRAFT', 'SENT', 'PAID', 'VOID', 'OVERDUE'] }) @IsIn(['DRAFT', 'SENT', 'PAID', 'VOID', 'OVERDUE']) @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() clientId?: string;
}
